# Design Data Fetching (MCP-first, zero-token)

Design data is fetched at Step 1 using a **priority chain** that prioritizes
zero-config, zero-token channels. The Agent **never** asks the user for a
Figma Personal Access Token — MCP replaces that entirely.

```
Priority 1 — Figma MCP (zero config, zero token)
─────────────────────────────────────────────────
  Use tools/list (or attempt to call figma_getFile / figma_getNode /
  figma_getImage) to check if a Figma MCP is installed. If it responds
  successfully, use MCP output directly — richer data, no token, no export.

Priority 2 — MCP auto-setup (one click, 5 seconds)
──────────────────────────────────────────────────
  If no Figma MCP is detected, run the auto-setup script:

  ```bash
  node <skill-dir>/scripts/d2c-mcp-setup.js
  ```

  The script auto-detects which code harness is running (TRAE / Claude
  Code / Cursor / Windsurf) and writes the MCP config to the correct file.
  The Agent then uses AskUserQuestion to confirm:

  > "Figma MCP is not configured. I can add it automatically for you.
  >  Target: {harness_name} → {config_path}
  >  After setup, restart your harness and re-run `/d2c`.
  > 
  >  Proceed with auto-configuration?"

  If the user confirms: run the script (without --dry-run), then tell
  them to restart the harness and re-run `/d2c`. Do NOT proceed to
  Priority 3 — MCP is the best path.
  If the user declines: proceed to Priority 3.

  If the script detects no harness (`action: "no_harness_detected"`),
  fall back to manual instructions — show the user which JSON to add.

Priority 3 — Plugin export (.fig file, no token)
──────────────────────────────────────────────────
  If MCP setup is not possible (e.g., restricted environment), suggest the
  figma-to-json plugin (https://github.com/yagudaev/figma-to-json). User
  opens the design in Figma Desktop, runs the plugin, exports a .fig file.
  Then pass the file to d2c-fetch.js (no token needed).

Priority 4 — Screenshot (last resort, multimodal vision)
──────────────────────────────────────────────────────────
  No MCP, no plugin → take screenshots of the design. D2C falls back to
  multimodal vision for type validation and layout analysis. Less detailed
  but zero setup.

The script `scripts/d2c-fetch.js` handles Priority 3 (.fig/.sketch files) and
Priority 4 (screenshots):

```bash
node <skill-dir>/scripts/d2c-fetch.js <input> [--token <pat>]
```

| Output field | Purpose |
|-------------|---------|
| `source` | Input type, URL or file path |
| `project` | `name` and `pages` list |
| `nodes` | Layer tree with bounding box, fills, effects |
| `styles` | Extracted `colors`, `typography`, `spacing`, `radius`, `shadows` |
| `assets` | Image/animation manifests |
| `thumbnail` | Base64 preview for visual analysis |
| `error` / `meta.warnings` | Failure or soft warning details |

**Never ask the user for a Figma Personal Access Token.** MCP replaces it
entirely. The token-based fallback (`--token`) is only available as an
undocumented escape hatch for environments where MCP and plugin are both
unavailable.