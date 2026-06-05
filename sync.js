import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Cross-platform sync check. Reads the list of registered project paths from
// .devboard-projects (one absolute path per line, written by setup.js) and
// confirms each one still has a devboard folder. Pure path.join() — no
// hardcoded separators — so it runs identically on Windows and macOS/Linux.
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectsFilePath = join(__dirname, '.devboard-projects');

if (!existsSync(projectsFilePath)) {
  console.log('No .devboard-projects file found — nothing to sync.');
  process.exit(0);
}

const projects = readFileSync(projectsFilePath, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

if (projects.length === 0) {
  console.log('.devboard-projects is empty — nothing to sync.');
  process.exit(0);
}

let ok = 0;
let missing = 0;

for (const projectPath of projects) {
  const devboardPath = join(projectPath, 'devboard');
  if (existsSync(devboardPath)) {
    console.log(`✓ ${projectPath}`);
    ok++;
  } else {
    console.error(`✗ ${projectPath} (no devboard folder at ${devboardPath})`);
    missing++;
  }
}

console.log(`\nSync check complete: ${ok} ok, ${missing} missing of ${projects.length} project(s).`);
process.exit(missing > 0 ? 1 : 0);
