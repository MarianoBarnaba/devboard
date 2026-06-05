import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = resolve(join(__dirname, '..'));
const claudeMdPath = join(parentDir, 'CLAUDE.md');
const projectsFilePath = join(__dirname, '.devboard-projects');
const portFilePath = join(__dirname, '.devboard-port');

// --- Port assignment ---
const existingPaths = existsSync(projectsFilePath)
  ? readFileSync(projectsFilePath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  : [];

const usedPorts = existingPaths
  .map(p => join(p, 'devboard', '.devboard-port'))
  .filter(f => existsSync(f))
  .map(f => parseInt(readFileSync(f, 'utf8').trim(), 10))
  .filter(n => !isNaN(n));

let assignedPort = 5173;
while (usedPorts.includes(assignedPort)) assignedPort++;

writeFileSync(portFilePath, String(assignedPort), 'utf8');
console.log(`Assigned port ${assignedPort} to this devboard instance.`);

// --- Per-project config (drives the isolated localStorage key in App.jsx) ---
// projectName = name of the parent project folder (e.g. "crateforge", "mailboard").
// Written WITHOUT a BOM (Node's utf8) so the browser's fetch().json() parses cleanly.
const projectName = basename(parentDir);
const configFilePath = join(__dirname, '.devboard-config.json');
writeFileSync(configFilePath, JSON.stringify({ projectName }, null, 2) + '\n', 'utf8');
console.log(`Wrote .devboard-config.json (projectName: "${projectName}").`);

// --- Injected CLAUDE.md block ---
// Cross-platform: all paths are RELATIVE to the parent project root (the folder
// that contains ./devboard). Launch instructions branch on the host OS.
const devboardBlock = `
## Devboard

This project has a kanban board at ./devboard/src/App.jsx.
Start it by saying: "open devboard"
Preferred port for this instance: ${assignedPort} (Vite auto-increments if it is taken).

RULE: When the user says "open devboard", "start devboard", or "launch devboard":
- You MUST start the dev server yourself, do not ask the user to do it
- All paths are relative to this project root; the board lives in ./devboard
- First check node_modules exists in the devboard folder:
  - Windows (PowerShell): Test-Path ".\\devboard\\node_modules"
  - macOS/Linux: test -d ./devboard/node_modules
- If it is missing, run \`npm install\` inside ./devboard first
- Then launch the dev server detached, writing Vite's output to a log so the ACTUAL
  port can be read back (strictPort is false, so it may auto-increment past ${assignedPort}):
  - Windows (PowerShell):
    Start-Process powershell -ArgumentList '-NoExit','-Command','cd .\\devboard; npm run dev 2>&1 | Tee-Object -FilePath $env:TEMP\\devboard-dev.log'
  - macOS (Terminal window):
    osascript -e "tell app \\"Terminal\\" to do script \\"cd '$PWD/devboard' && npm run dev | tee /tmp/devboard-dev.log\\""
  - macOS/Linux (headless/detached):
    (cd devboard && nohup npm run dev > /tmp/devboard-dev.log 2>&1 &)
- After launching, read the ACTUAL port from the log (do not assume ${assignedPort}).
  Strip ANSI colour codes (ESC[...m) first, then match "localhost:<port>":
  - Windows: (Get-Content $env:TEMP\\devboard-dev.log) -replace '\\x1b\\[[0-9;]*m','' | Select-String 'localhost:(\\d+)' | Select-Object -Last 1
  - macOS/Linux: sed -r 's/\\x1b\\[[0-9;]*m//g' /tmp/devboard-dev.log | grep -oE 'localhost:[0-9]+' | tail -1
- Report it: "Devboard is running at http://localhost:<port>"
- Do NOT open the browser — just tell the user the URL
- Do NOT fall back to asking the user to run anything

When the user says "close devboard" or "stop devboard":
1. Determine the actual port (parse the log above, or use the URL you reported)
2. Find the PID:
   - Windows: netstat -ano | findstr :<port>
   - macOS/Linux: lsof -ti tcp:<port>
3. Kill it:
   - Windows: Stop-Process -Id <PID> -Force
   - macOS/Linux: kill <PID>

When the user asks to update the board, or when we complete or start a task:
1. Read ./devboard/src/App.jsx
2. Update the relevant cards (move columns, add, edit, or delete cards)
3. Save the file
4. Tell the user what changed on the board

Keep the board in sync with any roadmap or task tracking files in this project.
Never ask the user to copy/paste anything manually. Always edit files directly.

The board updates automatically every time it starts via git pull inside npm run dev.
`;

// --- Inject into parent CLAUDE.md ---
if (!existsSync(claudeMdPath)) {
  writeFileSync(claudeMdPath, devboardBlock.trimStart(), 'utf8');
  console.log(`Created ${claudeMdPath} with devboard instructions.`);
} else {
  const contents = readFileSync(claudeMdPath, 'utf8');
  if (contents.includes('## Devboard')) {
    console.log(`Skipped: ${claudeMdPath} already contains a ## Devboard section.`);
  } else {
    writeFileSync(claudeMdPath, contents + devboardBlock, 'utf8');
    console.log(`Appended devboard instructions to ${claudeMdPath}.`);
  }
}

// --- Run npm install in devboard folder ---
try {
  execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
  console.log('npm install completed successfully.');
} catch {
  console.error('npm install failed — run it manually in the devboard folder.');
}

// --- Register parent project path in .devboard-projects ---
if (existingPaths.includes(parentDir)) {
  console.log(`Skipped: ${parentDir} is already registered in .devboard-projects.`);
} else {
  const updated = [...existingPaths, parentDir].join('\n') + '\n';
  writeFileSync(projectsFilePath, updated, 'utf8');
  console.log(`Registered ${parentDir} in .devboard-projects for auto-sync.`);
}
