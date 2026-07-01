# Smart Entry Flow

**Step 0:** Initialize the todo list immediately (see `guides/workflow.md`).

The entry flow has two branches based on input type:

## Branch A — Design Input

Input is a Figma URL, file path, or screenshot.
Run `scripts/d2c-status.js <design-url>` and branch on the result:

1. **`skipMenu: true` + `autoAction: "init"`** — Empty directory or existing
   project without D2C state. Silently proceed to Step 1 (init flow). Briefly
   note the detected project state so the user knows what was found.

2. **`showWarning: true` + `warningType: "context_switch"`** — The provided
   design differs from the stored one. Use AskUserQuestion:
   ```json
   { "header": "Context Switch", "question": "New design detected. Backup current .d2c/ → .d2c.bak/?", "options": [
     { "label": "Backup & Start Fresh", "description": "Save current context, start new D2C run" },
     { "label": "Cancel", "description": "Keep current context, abort" }
   ]}
   ```

3. **`showWarning: true` + `warningType: "orphan_backup"`** — `.d2c.bak/`
   exists but no active `.d2c/`. Use AskUserQuestion:
   ```json
   { "header": "Restore", "question": "Found backup .d2c.bak/. What would you like to do?", "options": [
     { "label": "Restore & Resume", "description": "Restore backup, continue from where you left off" },
     { "label": "Start Fresh (Keep Backup)", "description": "New D2C run, keep backup for reference" },
     { "label": "Start Fresh (Delete Backup)", "description": "New D2C run, discard old backup" },
     { "label": "Cancel", "description": "Do nothing" }
   ]}
   ```

4. **`availableCount >= 2`** (resume case — init/update/sync all available) —
   Use AskUserQuestion with the `recommended` option marked:
   ```json
   { "header": "Action", "question": "Existing D2C state found. What do you want to do?", "options": [
     { "label": "Update Design (Recommended)", "description": "Resume from step {current}, iterate on design" },
     { "label": "Start Fresh", "description": "Backup current .d2c/ and start over" },
     { "label": "Sync to Figma", "description": "Push style changes back to Figma" }
   ]}
   ```

After the user's choice, dispatch:
- **init** → read `guides/init.md` (steps 1-3 for backup/cleanup), then proceed to Step 1
- **update** → read `guides/update.md`, then resume from the recorded step per Resume Rules
- **sync** → read `guides/sync.md` and execute

## Website Input

If `inputType` is `website`: Insert todo "Crawl website → crawled.json", then use AskUserQuestion:
```json
{ "header": "Website", "question": "This is a website URL. I'll crawl it to extract design tokens. Continue?", "options": [
  { "label": "Crawl & Analyze", "description": "Crawl {url}, extract tokens, DOM, screenshots" },
  { "label": "Cancel", "description": "Do nothing" }
]}
```
On confirm, follow `guides/website-input.md`. After crawling, feed into Step 3.

## Branch B — Natural Language Input

Input is NOT a known command, NOT a design input, NOT a website URL, AND
`.d2c/STATE.md` exists. Route to context modification mode.

Read `guides/context-modify.md` and follow its workflow.

If `.d2c/STATE.md` does NOT exist and input is unrecognizable, use AskUserQuestion:
```json
{ "header": "Start", "question": "No D2C project found. How would you like to start?", "options": [
  { "label": "Start New Project", "description": "Provide a Figma URL, screenshot, or website URL" },
  { "label": "Cancel", "description": "Do nothing" }
]}
```