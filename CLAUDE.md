# Devboard

This is a portable kanban board app for tracking project progress.
Current version: 0.7.0

## Version tracking
- Version format: MAJOR.MINOR.PATCH
  - PATCH (0.5.1) — small fixes, style tweaks
  - MINOR (0.6.0) — new features or views
  - MAJOR (1.0.0) — full redesigns or breaking changes
- Every time we make changes, increment the version number accordingly
- Update the version in three places:
  1. This CLAUDE.md file (the "Current version" line at the top)
  2. The version constant in src/App.jsx (add one if it doesn't exist: const VERSION = "0.5.0")
  3. package.json (the "version" field)

## After every change
Always end your response with a commit summary block like this:

---
📦 Commit summary for devboard vX.X.X:
- [brief bullet of what changed]
- [brief bullet of what changed]
---

The user will copy this as the commit description in GitHub Desktop.

## Auto-update across projects
The board updates automatically every time it starts via git pull inside npm run dev.

The sync.js script does the following:
- Reads the list of known project paths from a file called .devboard-projects (one path per line)
- For each path, confirms the devboard folder is present
- Logs success or failure for each project

Add a "sync" script to package.json:
"sync": "node sync.js"

The .devboard-projects file holds one absolute project path per line (the parent
folder that contains the devboard folder). setup.js appends the current project's
path automatically — do not hardcode a platform-specific path here.

.devboard-projects is in .gitignore so machine-specific paths aren't committed.

## Auto-setup
When this folder is detected inside a project directory, automatically 
add the devboard instructions to the parent project's CLAUDE.md if they 
aren't already there.

## Usage
- App runs with: npm run dev (from this folder)
- Board data is stored in localStorage under the key "devboard-v1"
- Source is in src/App.jsx
- Sync all projects with: npm run sync
- Set up a new project with: npm run setup
  - Injects the ## Devboard block into the parent project's CLAUDE.md
  - Automatically registers the project path in .devboard-projects for auto-sync
  - No manual steps needed — one command does everything

## Updating the board
When the user asks to update the board:
1. Read src/App.jsx (relative to this file's location)
2. Edit the file directly
3. Save it
4. Increment the version (PATCH for fixes, MINOR for features)
5. Update version in CLAUDE.md, src/App.jsx, and package.json
6. End the response with the commit summary block

Never ask the user to copy/paste code manually.

## Commands

RULE: When the user says "open devboard", "start devboard", or "launch devboard":
- You MUST start the dev server yourself, do not ask the user to do it
- All paths are relative to the project root; the board lives in ./devboard. Detect
  the host OS and use the matching commands below.
- First check node_modules exists in the devboard folder:
  - Windows (PowerShell): Test-Path ".\devboard\node_modules"
  - macOS/Linux: test -d ./devboard/node_modules
- If it is missing, run `npm install` inside ./devboard first
- Then launch the dev server detached, teeing Vite's output to a log so the ACTUAL
  port can be read back (strictPort is false, so Vite may auto-increment past 5173):
  - Windows (PowerShell):
    Start-Process powershell -ArgumentList '-NoExit','-Command','cd .\devboard; npm run dev 2>&1 | Tee-Object -FilePath $env:TEMP\devboard-dev.log'
  - macOS (Terminal window):
    osascript -e "tell app \"Terminal\" to do script \"cd '$PWD/devboard' && npm run dev | tee /tmp/devboard-dev.log\""
  - macOS/Linux (headless/detached):
    (cd devboard && nohup npm run dev > /tmp/devboard-dev.log 2>&1 &)
- After launching, read the ACTUAL port from the log instead of assuming 5173. Vite
  wraps the port in ANSI colour codes, so STRIP those (ESC[...m) before matching:
  - Windows: (Get-Content $env:TEMP\devboard-dev.log) -replace '\x1b\[[0-9;]*m','' | Select-String 'localhost:(\d+)' | Select-Object -Last 1
  - macOS/Linux: sed -r 's/\x1b\[[0-9;]*m//g' /tmp/devboard-dev.log | grep -oE 'localhost:[0-9]+' | tail -1
  The captured number is the real port. If the log has no match yet, wait and re-check.
- Report that actual port, e.g.: "Devboard is running at http://localhost:<port>"
- Do NOT open the browser — just tell the user the URL
- Do NOT fall back to asking the user to run anything

When the user says "close devboard" or "stop devboard":
1. Find the actual port first (parse the log as above, or check the URL you reported)
2. Find the PID:
   - Windows: netstat -ano | findstr :<port>
   - macOS/Linux: lsof -ti tcp:<port>
3. Kill it:
   - Windows: Stop-Process -Id <PID> -Force
   - macOS/Linux: kill <PID>

### Sync behavior
The board updates automatically every time it starts — `npm run dev` runs `git pull`
before launching Vite, so the latest version is always fetched on startup.

No manual sync step is needed. Just run the board and it stays up to date.
