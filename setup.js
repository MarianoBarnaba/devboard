import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
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

// --- Injected CLAUDE.md block ---
const devboardBlock = `
## Devboard

This project has a kanban board at ./devboard/src/App.jsx.
Start it by saying: "open devboard"

RULE: When the user says "open devboard", "start devboard", or "launch devboard":
- You MUST start the dev server yourself, do not ask the user to do it
- First check if node_modules exists in the devboard folder:
  Test-Path "${join(parentDir, 'devboard', 'node_modules')}"
- If node_modules is missing, run npm install first:
  Start-Process powershell -ArgumentList "-NoExit -Command \`"cd ${join(parentDir, 'devboard')}; npm install\`"" -Wait
- Then launch it in a separate window:
  Start-Process powershell -ArgumentList "-NoExit -Command \`"cd ${join(parentDir, 'devboard')}; npm run dev\`""
- After running it, say: "Devboard is running at http://localhost:${assignedPort}"
- Do NOT open the browser — just tell the user the URL
- Do NOT fall back to asking the user to run anything

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
