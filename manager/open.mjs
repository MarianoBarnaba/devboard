// Opens the manager UI in the default browser, cross-platform (npm run manager).
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const html = fileURLToPath(new URL('./index.html', import.meta.url));
const cmd = process.platform === 'win32' ? `start "" "${html}"`
  : process.platform === 'darwin' ? `open "${html}"`
  : `xdg-open "${html}"`;
exec(cmd);
console.log(`Opening ${html}`);
