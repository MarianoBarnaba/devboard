import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
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
// Lives in public/ so Vite serves it as a plain static file in dev AND copies it
// into dist on build (dotfiles in the project root are not reliably served).
const projectName = basename(parentDir);
const publicDir = join(__dirname, 'public');
if (!existsSync(publicDir)) mkdirSync(publicDir);
const configFilePath = join(publicDir, 'devboard-config.json');
writeFileSync(configFilePath, JSON.stringify({ projectName }, null, 2) + '\n', 'utf8');
console.log(`Wrote public/devboard-config.json (projectName: "${projectName}").`);

// Remove the legacy pre-0.7.1 dotfile so there is a single source of truth.
const legacyConfigPath = join(__dirname, '.devboard-config.json');
if (existsSync(legacyConfigPath)) {
  unlinkSync(legacyConfigPath);
  console.log('Removed legacy .devboard-config.json from the devboard root.');
}

// --- Seed board cards from the parent project's CLAUDE.md (best effort) ---
// Markdown checkboxes become cards: "- [ ]" → To Do, "- [x]" → Done. Claude
// curates this file afterwards (see the injected block below), so we only
// create it when missing — an existing curated board is never clobbered.
// Gitignored: board data is per-project and must not travel through the repo.
const cardsFilePath = join(publicDir, 'devboard-cards.json');
if (existsSync(cardsFilePath)) {
  console.log('Skipped: public/devboard-cards.json already exists.');
} else {
  const seedCards = [];
  if (existsSync(claudeMdPath)) {
    const md = readFileSync(claudeMdPath, 'utf8');
    const checkbox = /^[ \t]*[-*] \[([ xX])\] +(.+)$/gm;
    let m;
    while ((m = checkbox.exec(md)) !== null) {
      seedCards.push({
        id: `seed-${seedCards.length + 1}`,
        title: m[2].trim(),
        col: m[1] === ' ' ? 'To Do' : 'Done',
        tags: [],
        phase: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
  writeFileSync(cardsFilePath, JSON.stringify(seedCards, null, 2) + '\n', 'utf8');
  console.log(`Wrote public/devboard-cards.json (${seedCards.length} card(s) seeded from CLAUDE.md checkboxes).`);
}

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
2. Prefer the graceful stop endpoint (deregisters from the manager registry):
   - Windows: Invoke-RestMethod -Method Delete -Uri "http://localhost:<port>/api/manager/stop"
   - macOS/Linux: curl -X DELETE http://localhost:<port>/api/manager/stop
3. Only if that fails, kill the process:
   - Windows: netstat -ano | findstr :<port>  then  Stop-Process -Id <PID> -Force
   - macOS/Linux: kill $(lsof -ti tcp:<port>)

When the user says "open manager" or "show running boards":
- Open ./devboard/manager/index.html in the default browser:
  - Windows (PowerShell): Start-Process ".\\devboard\\manager\\index.html"
  - macOS: open ./devboard/manager/index.html
- It lists every running devboard instance with open/stop controls

When the user asks to update the board, or when we complete or start a task:
1. Read ./devboard/public/devboard-cards.json (the per-project board data)
2. Add, edit, move (change "col"), or delete card objects as needed
   - Card shape: { id, title, col, tags, phase, createdAt, updatedAt }
   - col: "Backlog" | "To Do" | "In Progress" | "Review" | "Done"
   - tags: any of ["Feature","Bug","Chore","Design","Infra","Research","Testing"]
   - phase: 1, 2, or 3 (roadmap grouping)
   - ALWAYS set updatedAt to the current Unix time in ms on every card you touch.
     The app merges this file with the user's in-browser edits; the side with
     the newer updatedAt wins, so a stale timestamp means your change is ignored.
3. Save the file — the board picks it up on the next load/refresh
4. Tell the user what changed on the board

If devboard-cards.json is missing or empty, seed it: read this project's
CLAUDE.md and any roadmap/task-tracking files and create cards for the tasks
found there (done work → "Done", current work → "To Do"/"In Progress",
future ideas → "Backlog").

Do NOT edit ./devboard/src/App.jsx to change board content — that file is the
app's shared source code (synced across all projects via git); project cards
in it would leak onto every other project's board.
Never ask the user to copy/paste anything manually. Always edit files directly.

The board updates automatically every time it starts via git pull inside npm run dev.
`;

// --- Inject into parent CLAUDE.md ---
if (!existsSync(claudeMdPath)) {
  writeFileSync(claudeMdPath, devboardBlock.trimStart(), 'utf8');
  console.log(`Created ${claudeMdPath} with devboard instructions.`);
} else {
  const contents = readFileSync(claudeMdPath, 'utf8');
  // Replace an existing ## Devboard section (everything up to the next h2 or
  // EOF) so projects set up with older versions get the current instructions —
  // stale blocks tell Claude to put board content in src/App.jsx, which leaks
  // cards onto every project's board.
  const blockRegex = /\n?## Devboard[\s\S]*?(?=\n## |$)/;
  if (blockRegex.test(contents)) {
    writeFileSync(claudeMdPath, contents.replace(blockRegex, devboardBlock), 'utf8');
    console.log(`Refreshed the ## Devboard section in ${claudeMdPath}.`);
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
