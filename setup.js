import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = resolve(join(__dirname, '..'));
const claudeMdPath = join(parentDir, 'CLAUDE.md');
const projectsFilePath = join(__dirname, '.devboard-projects');

const devboardBlock = `
## Devboard

This project has a kanban board at ./devboard/src/App.jsx.
Start it by saying: "open devboard"

When the user says "open devboard":
1. Use PowerShell
2. Run: Set-Location ".\devboard"; npm run dev
3. Tell the user to open http://localhost:5173
4. Run as foreground process, not background

When the user says "close devboard" or "stop devboard":
1. Kill the process running on port 5173

When the user asks to update the board, or when we complete or start a task:
1. Read ./devboard/src/App.jsx
2. Update the relevant cards (move columns, add, edit, or delete cards)
3. Save the file
4. Tell the user what changed on the board

Keep the board in sync with any roadmap or task tracking files in this project.
Never ask the user to copy/paste anything manually. Always edit files directly.

To get the latest devboard: git submodule update --remote devboard
`;

// Inject into parent CLAUDE.md
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

// Register parent project path in .devboard-projects
const existingPaths = existsSync(projectsFilePath)
  ? readFileSync(projectsFilePath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  : [];

if (existingPaths.includes(parentDir)) {
  console.log(`Skipped: ${parentDir} is already registered in .devboard-projects.`);
} else {
  const updated = [...existingPaths, parentDir].join('\n') + '\n';
  writeFileSync(projectsFilePath, updated, 'utf8');
  console.log(`Registered ${parentDir} in .devboard-projects for auto-sync.`);
}
