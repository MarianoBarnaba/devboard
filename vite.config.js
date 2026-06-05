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
  server: { port, strictPort: true },
})
