# Devboard

This is a portable kanban board app for tracking project progress.
Current version: 0.5.0

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
Add a script called sync.js at the root of devboard that does the following:
- Reads the list of known project paths from a file called .devboard-projects (one path per line)
- For each path, runs: git submodule update --remote devboard
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

When the user says "open devboard", "start devboard", or "launch devboard":
- DO NOT tell the user to run a command themselves
- First check if a devboard is already running by checking if port 5173
  (or 5174, 5175) is in use with:
  netstat -ano | findstr :5173
- If a devboard process is already running on any of those ports, tell the user
  "Devboard is already running at http://localhost:[port]" and do not start a new one
- If no devboard is running, start it with:
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '.\devboard'; npm run dev"
- Vite will auto-select an available port if 5173 is taken — read the terminal
  output to confirm which port it started on and tell the user
  "Devboard is running at http://localhost:[port]"

When the user says "close devboard" or "stop devboard":
1. Find the PID using: netstat -ano | findstr :5173
2. Kill it with: Stop-Process -Id [PID] -Force

### Sync behavior
After every `git push` from the devboard repo, a post-push hook automatically runs
`git submodule update --remote devboard` in each project listed in .devboard-projects,
keeping all linked projects up to date.

Collaborators who don't have the hook can sync manually:
```
git submodule update --remote devboard
```
