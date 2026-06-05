# Devboard

This is a portable kanban board app for tracking project progress.
Current version: 0.5.2

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

Also create the .devboard-projects file with this first entry:
F:\GitHub\CrateForge

Add .devboard-projects to .gitignore so project paths aren't committed 
(they're machine-specific).

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
- First check if node_modules exists in the devboard folder:
  Test-Path ".\devboard\node_modules"
- If node_modules is missing, run npm install first:
  Start-Process powershell -ArgumentList "-NoExit -Command `"cd F:\github\mailboard\devboard; npm install`"" -Wait
- Then launch it in a separate window, teeing Vite's output to a log file so the
  actual port can be read back (strictPort is false, so Vite may auto-increment
  past 5173 if it is taken):
  Start-Process powershell -ArgumentList "-NoExit -Command `"cd F:\github\mailboard\devboard; npm run dev 2>&1 | Tee-Object -FilePath `$env:TEMP\devboard-dev.log`""
- If the project path is different, use the path of the current project's devboard folder
- After launching, read the actual port from the log instead of assuming 5173.
  Wait briefly for Vite to boot, then parse the "Local:" line it prints:
  Start-Sleep -Seconds 3; Select-String -Path "$env:TEMP\devboard-dev.log" -Pattern "Local:\s+http://localhost:(\d+)" | Select-Object -Last 1
  The captured group is the real port. If the log has no match yet, wait and re-check.
- Report that actual port, e.g.: "Devboard is running at http://localhost:<port>"
- Do NOT open the browser — just tell the user the URL
- Do NOT fall back to asking the user to run anything

When the user says "close devboard" or "stop devboard":
1. Find the actual port first (parse the log as above, or check the URL you reported)
2. Find the PID using: netstat -ano | findstr :<port>
3. Kill it with: Stop-Process -Id [PID] -Force

### Sync behavior
The board updates automatically every time it starts — `npm run dev` runs `git pull`
before launching Vite, so the latest version is always fetched on startup.

No manual sync step is needed. Just run the board and it stays up to date.
