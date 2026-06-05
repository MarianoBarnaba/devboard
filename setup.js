import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = join(__dirname, '..');
const claudeMdPath = join(parentDir, 'CLAUDE.md');

const devboardBlock = `
## Devboard

This project has a kanban board at ./devboard/src/App.jsx.

When the user asks to update the board, or when we complete or start a task:
1. Read ./devboard/src/App.jsx
2. Update the relevant cards (move columns, add, edit, or delete cards)
3. Save the file
4. Tell the user what changed on the board

To start the board: cd devboard && npm run dev, then open http://localhost:5173

Keep the board in sync with any roadmap or task tracking files in this project.
Never ask the user to copy/paste anything manually. Always edit files directly.
`;

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
