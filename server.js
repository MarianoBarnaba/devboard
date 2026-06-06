// Devboard dev server — wraps Vite so every instance can register itself in a
// central registry and expose a small manager API (see manager/index.html).
// Launched by `npm run dev`; vite.config.js (port, plugins) is picked up as usual.
import { createServer } from 'vite';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmdirSync, renameSync, statSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const startedAt = new Date().toISOString();

// ---- Project identity (same resolution order as the app itself) ----
function readProjectName() {
  for (const f of [
    join(__dirname, 'public', 'devboard-config.json'),
    join(__dirname, '.devboard-config.json'), // legacy pre-0.7.1 location
  ]) {
    try {
      const n = JSON.parse(readFileSync(f, 'utf8')).projectName;
      if (typeof n === 'string' && n.trim()) return n.trim();
    } catch {}
  }
  return basename(resolve(join(__dirname, '..')));
}
const projectName = readProjectName();

// ---- Central registry, shared by ALL devboard instances on this machine ----
// Lives in the home directory (not a hardcoded drive path) so clones work on
// any machine/OS. Override with the DEVBOARD_REGISTRY env var if needed.
const registryPath = process.env.DEVBOARD_REGISTRY || join(homedir(), '.devboard-registry.json');
const lockDir = registryPath + '.lock';

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// mkdir is atomic on every platform, so a directory works as a mutex across
// processes. Locks older than 5s are stolen (a crashed process left them).
function withRegistryLock(fn) {
  const deadline = Date.now() + 5000;
  for (;;) {
    try { mkdirSync(lockDir); break; }
    catch {
      try {
        if (Date.now() - statSync(lockDir).mtimeMs > 5000) { rmdirSync(lockDir); continue; }
      } catch {}
      if (Date.now() > deadline) throw new Error(`Could not acquire registry lock: ${lockDir}`);
      sleepSync(50);
    }
  }
  try { return fn(); }
  finally { try { rmdirSync(lockDir); } catch {} }
}

function readRegistry() {
  try {
    const reg = JSON.parse(readFileSync(registryPath, 'utf8'));
    if (reg && Array.isArray(reg.instances)) return reg;
  } catch {}
  return { instances: [] };
}

// Write-to-temp + rename so readers never see a half-written file.
function writeRegistry(reg) {
  const tmp = registryPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(reg, null, 2) + '\n', 'utf8');
  renameSync(tmp, registryPath);
}

const isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function register(port) {
  withRegistryLock(() => {
    const reg = readRegistry();
    // Drop our own stale rows, anything squatting on our port, and entries
    // whose process is dead (force-killed instances never deregister).
    reg.instances = reg.instances.filter(i => i.pid !== process.pid && i.port !== port && isAlive(i.pid));
    reg.instances.push({ projectName, port, path: __dirname, pid: process.pid, startedAt });
    writeRegistry(reg);
  });
}

function deregister() {
  try {
    withRegistryLock(() => {
      const reg = readRegistry();
      reg.instances = reg.instances.filter(i => i.pid !== process.pid);
      writeRegistry(reg);
    });
  } catch {} // never let cleanup throw during exit
}

// ---- Manager API (consumed by manager/index.html, which runs on file://) ----
let actualPort = null;

function managerApi(server) {
  return (req, res, next) => {
    const route = req.url.split('?')[0];
    if (!route.startsWith('/api/manager/')) return next();
    // The manager page is opened from disk (origin "null"), so CORS must be
    // wide open and DELETE needs its preflight answered.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && route === '/api/manager/info') {
      return res.end(JSON.stringify({ projectName, port: actualPort, path: __dirname, pid: process.pid, startedAt }));
    }
    if (req.method === 'GET' && route === '/api/manager/registry') {
      return res.end(JSON.stringify(readRegistry()));
    }
    if (req.method === 'DELETE' && route === '/api/manager/stop') {
      res.end(JSON.stringify({ stopping: true, projectName, port: actualPort }));
      console.log(`\n[devboard] stop requested via manager — shutting down "${projectName}" (:${actualPort})`);
      // Let the response flush, then close gracefully; the exit hook deregisters.
      setTimeout(async () => {
        try { await server.close(); } finally { process.exit(0); }
      }, 100);
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  };
}

// ---- Boot ----
const server = await createServer({
  root: __dirname,
  // Vite's built-in CORS middleware answers preflights before ours can, and its
  // default origin whitelist rejects the manager page (file:// => origin "null"),
  // which silently breaks the DELETE /api/manager/stop preflight. Disable it and
  // handle CORS only for /api/manager/* in managerApi — app routes then have no
  // CORS headers at all (same-origin only), tighter than Vite's default.
  server: { cors: false },
  plugins: [{
    name: 'devboard-manager-api',
    configureServer(s) { s.middlewares.use(managerApi(s)); },
  }],
});
await server.listen();
actualPort = server.httpServer.address().port;

try { register(actualPort); }
catch (e) { console.warn(`[devboard] could not register in ${registryPath}: ${e.message}`); }

process.on('exit', deregister);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => process.exit(0));
}

server.printUrls();
console.log(`  [devboard] "${projectName}" registered on port ${actualPort} (registry: ${registryPath})`);
