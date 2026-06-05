import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const portFile = join(__dirname, '.devboard-port')
const port = existsSync(portFile) ? parseInt(readFileSync(portFile, 'utf8').trim(), 10) : 5173

export default defineConfig({
  plugins: [react()],
  // strictPort: false → if `port` is already taken, Vite auto-increments
  // (5173 → 5174 → …) instead of crashing. The `.devboard-port` value is the
  // preferred starting port; the actual port is printed to the terminal on start.
  server: { port, strictPort: false },
})
