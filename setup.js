import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

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

// --- Injected CLAUDE.md block ---
const devboardBlock = `
## Devboard

This project has a kanban board at ./devboard/src/App.jsx.
Start it by saying: "open devboard"

When the user says "open devboard":
- DO NOT tell the user to run a command themselves
- First check if devboard is already running:
  netstat -ano | findstr :${assignedPort}
- If already running, tell the user "Devboard is already running at http://localhost:${assignedPort}"
- If not running, start it with:
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '.\\devboard'; npm run dev"
- Tell the user "Devboard is running at http://localhost:${assignedPort}"

When the user says "close devboard" or "stop devboard":
1. Find the PID using: netstat -ano | findstr :${assignedPort}
2. Kill it with: Stop-Process -Id [PID] -Force

When the user asks to update the board, or when we complete or start a task:
1. Read ./devboard/src/App.jsx
2. Update the relevant cards (move columns, add, edit, or delete cards)
3. Save the file
4. Tell the user what changed on the board

Keep the board in sync with any roadmap or task tracking files in this project.
Never ask the user to copy/paste anything manually. Always edit files directly.

To get the latest devboard: git submodule update --remote devboard
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

// --- Register parent project path in .devboard-projects ---
if (existingPaths.includes(parentDir)) {
  console.log(`Skipped: ${parentDir} is already registered in .devboard-projects.`);
} else {
  const updated = [...existingPaths, parentDir].join('\n') + '\n';
  writeFileSync(projectsFilePath, updated, 'utf8');
  console.log(`Registered ${parentDir} in .devboard-projects for auto-sync.`);
}
