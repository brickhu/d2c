# Step 1 — Project Survey & Functional Diagnosis (DIAGNOSIS)

**Input:** Design link or screenshot + status script JSON output
**Output:** Diagnostic report (in chat) with conflict resolution **or** rejection message
**Status:** Wait for user confirmation before Step 2, or terminate

## Prerequisite: Status Script

Before entering Step 1, the status script MUST have been run (this is handled
automatically by the Smart Entry Flow in SKILL.md, or by `/d2c init` /
`/d2c update`):

```bash
node <skill-dir>/scripts/d2c-status.js <design-url>
```

Use the JSON output (`project`, `state`, `backups`, `conflicts`) as the source
of truth for project state. **Do not manually re-scan the directory** unless
the script output is unavailable (e.g., screenshot input with no URL).

If the entry action is **update** or **sync**, skip to the relevant guide
(`guides/UPDATE.md` or `guides/SYNC.md`). The rest of this guide applies to
**init** (fresh runs).

## 1a. Input Type Detection

- **Figma URL** (`https://www.figma.com/file/xxx/...` or
  `https://www.figma.com/design/xxx/...`) → extract `file_key`
- **Screenshot/design image** → use multimodal vision
- Future: Penpot, Sketch URL support
- **Init without link** → read URL from `.d2c/DESIGN.md` if present, otherwise prompt user

## 1b. Project Profile (from status script)

The `project` object from the script output gives you the Project Profile:

- `project.isEmpty` — true if directory has no relevant files
- `project.detectedFramework` — next/vite/nuxt/etc. or null
- `project.detectedLanguage` — typescript/javascript or null
- `project.detectedStyling` — tailwind/styled-components/etc. or null
- `project.detectedPackageManager` — npm/pnpm/yarn/bun or null
- `project.detectedDeploy` — vercel/docker/etc. or null
- `project.existingComponents` — list of component files found
- `project.dependencies` — top-level deps from package.json

Use this profile to pre-fill assumptions. If any field is `null`, it will be
decided in Step 3 (Q&A).

If a **context switch** was detected (`conflicts.contextSwitch === true`),
inform the user: the new design URL differs from the stored one, the existing
`.d2c/` will be backed up to `.d2c.bak/` after confirmation. Perform the backup
after the user confirms in 1g.

If an **orphan backup** was detected (`conflicts.orphanBackup === true`), the
user has already chosen how to handle it during the Smart Entry Flow. If they
chose "restore", rename `.d2c.bak/` → `.d2c/` and follow Resume Rules in
SKILL.md.

## 1c. Design Data Source Selection

Applies only to **Figma URL** inputs. Choose the data source by priority:

```
Priority 1 — Figma MCP (zero config, Agent level)
────────────────────────────────────────────────────
  Use tools/list (or attempt to call figma_getFile / figma_getNode /
  figma_getImage) to check if a Figma MCP is installed. If it responds
  successfully, use MCP output as the data source — no Token, no export,
  no file download needed.

Priority 2 — figma-to-json plugin (user exports .fig file)
────────────────────────────────────────────────────────────
  If no MCP, suggest the user install the figma-to-json plugin
  (https://github.com/yagudaev/figma-to-json), open the design in Figma
  Desktop, run the plugin, and export a .fig file.
  
  Then pass the .fig file to d2c-fetch.js (Layer 2 below).
  No Token, no MCP setup — only a one-time plugin install.

Priority 3 — d2c-fetch.js script (Node.js CLI)
────────────────────────────────────────────────
  Fallback: run the fetch script with the input URL and optional Token.
  See 1d for details.

Priority 4 — Screenshot (last resort)
──────────────────────────────────────
  No MCP, no plugin, no Token → take screenshots. D2C falls back to
  multimodal vision for type validation and layout analysis.
```

Use AskUserQuestion to confirm Plugin export (Priority 2) or request Token
(Priority 3) if the user hasn't provided one. Do not silently attempt all
paths — one at a time, with user awareness.

## 1d. Fetch Design Data

Run the design data fetcher script with the input design (for Priority 3 and
Priority 2 after .fig export):

```bash
node <skill-dir>/scripts/d2c-fetch.js <input> [--token <pat>]
```

For Priority 1 (MCP), no script is needed — the Agent calls MCP tools directly
and formats the output to match the same JSON schema expected by the rest of
the pipeline.

The script auto-detects the input type (Figma URL / `.fig` file / `.sketch` file /
image screenshot) and normalizes all outputs to the same JSON structure:

| Output field | Purpose |
|-------------|---------|
| `source` | Input type, URL or file path |
| `project` | `name` and `pages` list |
| `nodes` | Layer tree (id, name, type, boundingBox, fills, effects, children) |
| `styles` | Extracted `colors`, `typography`, `spacing`, `radius`, `shadows` |
| `assets` | Image/animation nodes with id, name, format, bounds |
| `thumbnail` | Base64 preview image |
| `error` | Error message if the fetch failed |
| `meta.warnings` | Soft warnings (e.g., optional dep not installed) |

**For Figma URLs (when falling back to script — Priority 3):**

The script's Token resolution chain:
1. **`--token <pat>`** CLI参数 → 优先级最高
2. **`FIGMA_TOKEN`** 环境变量 → 自动兜底（用户 export 一次后无需每次传参）
3. **两者皆无** → 脚本返回 `error` 字段

When the script returns an error because no token was found:

> 方案A：**Prompt 用户提供 Token**
>
> The PAT is the **D2C operator's own token**, not the design file owner's.
> The file must be shared (viewer or above) with the token owner's Figma account.
> Token is used only for the current session, never persisted to disk.
>
> 使用 AskUserQuestion 询问用户是否愿意生成 Token，并提供清晰的获取路径：
> ```
> Figma URL 需要 Personal Access Token 才能获取设计数据。
> Token 生成很简单（1分钟）：
>   1. 打开 https://www.figma.com/settings
>   2. 找到 "Personal Access Tokens" → "Generate new token"
>   3. 选择 file_content:read 权限，复制 Token
>   4. 确保设计稿已共享给当前 Figma 账号
>
>   传入方式:
>     node d2c-fetch.js <url> --token figd_xxxxx
>     或 export FIGMA_TOKEN=figd_xxxxx（一次设置，后续自动）
>
>   愿意生成 Token 来获取完整数据吗？还是用截图方案？
> ```
>
> 方案B：**截图替代（无需 Token）**
>
> If the user doesn't want to set up a Token, they can take screenshots of the
> design and pass them to the script. D2C will fall back to multimodal vision
> analysis in Step 1e (Type Validation) — less detailed but zero setup.

**For `.fig` / `.sketch` files:**
- The script unzips the file and decodes the internal format.
- Full decoding requires optional dependencies (`kiwi-schema` for `.fig`,
  `@sketch-hq/sketch-file` for `.sketch`). If not installed, partial data
  (meta + images + thumbnail) is still returned with a warning.

**For image / screenshot input:**
- The script returns the image as a base64 thumbnail and basic metadata.
- Visual analysis (Step 1e type validation) must be done via multimodal vision
  on the screenshot.

Parse the script's stdout JSON output directly. **Do not manually call the
Figma REST API or inspect the file structure.**

## 1e. Type Validation & Rejection

| Outcome | Action |
|---------|--------|
| ✅ Clearly Web / iOS / Android / Desktop | Continue to 1f (Mismatch Detection) |
| ⚠️ Ambiguous signals | AskUserQuestion for confirmation |
| ❌ Not one of the four types, or unparseable | Execute rejection, terminate |

Rejection output (no files created):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  D2C Type Validation Failed ⛔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Design title: {title/filename}

🔍 Analysis:
  This design does not appear to be a supported application type:
  {list of evidence}

❌ D2C supports: Web, iOS, Android, Desktop applications only.
  Detected as: {type}. Process terminated.

💡 Suggestions:
  • If this is an application design, confirm its platform and retry.
  • For non-application assets, describe your request directly.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 1f. Design vs. Project Mismatch Detection

Compare the validated design type against the Project Profile from 1b. A
mismatch exists when:

| Design type | Project signal | Mismatch? |
|-------------|---------------|-----------|
| iOS / Android | Next.js / Vite / web framework detected | ⚠️ Yes — mobile design in web project |
| Desktop | Mobile-sized frames, no window chrome | ⚠️ Yes |
| Web | React Native / Flutter / Xcode / Android project files | ⚠️ Yes — web design in mobile project |
| Any type | Major framework/styling mismatch implied by design components | ⚠️ Case-by-case |

If `project.isEmpty` or no framework was detected, skip this check — there is
nothing to mismatch against.

When a mismatch is detected, present:

```
⚠️  D2C Design-Project Mismatch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Design type:  {design_type}
  Project type: {detected_project_type}
  Evidence:     {specific files/signals}

  The design appears to be for {design_type}, but this directory
  contains an existing {detected_project_type} project.

  How would you like to proceed?
  1. Adapt code to design — restructure project to match
     (may involve significant changes to existing setup)
  2. Adapt design to project — implement the design's visual
     style within the existing {detected_project_type} platform
  3. Proceed anyway — flag as risk, I'll handle it manually
  4. Cancel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Wait for the user's choice and note it in the diagnostic report under "Key
Decisions". Never silently resolve a mismatch.

## 1g. Diagnostic Report

Generate the diagnostic report incorporating project profile and any conflict
resolutions:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  D2C Diagnostic Report — {Project Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project name: {from design}
📱 Application type: {Web App / iOS / Android / Desktop}
🎯 Product positioning: {audience, problem solved}

📂 Project Survey:
  • Directory: {empty / existing project}
  • Framework: {detected or "to be decided in Step 3"}
  • Language: {detected or "to be decided"}
  • Styling: {detected or "to be decided"}
  • Package manager: {detected or "to be decided"}
  • Deploy: {detected or "to be decided"}
  • Existing components: {count and summary, or "none"}
  • D2C state: {none / fresh init / context switch (backup pending) / orphan backup resolved}

⚠️  Conflicts resolved: {none / Type B mismatch → option chosen / context switch noted}

🔍 Core features:
  • {feature 1}

📄 Feature list:
  1. {feature 1}

📐 Page structure:
  • {page 1}: {layout overview}

🎨 Visual style:
  • Color direction: {primary/secondary}
  • Component complexity: {simple / medium / complex}
  • Motion requirements: {none / subtle / complex}

🖼️ Image assets:
  • {icon name} — SVG, 24x24, navigation
  • {illustration} — PNG, 400x300, empty state
  • {background} — JPG, page background

🎬 Animation assets:
  • {anim name} — fadeIn 0.3s ease, button hover
  • {anim name} — path draw 1.5s, logo intro
  ... (M animation nodes total)

⚠️ Risk notes: {potential issues + unresolved mismatch risks if "proceed anyway"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 1h. Request Confirmation

Use AskUserQuestion to confirm or adjust. Create `.d2c/` directory if it
doesn't exist, then write `.d2c/STATE.md`:

```markdown
# D2C Workflow

## Current Step: 1 — DIAGNOSIS (awaiting confirmation)
## Design URL: {url}
## Entry Action: init

## Project Meta
- Name: {name}
- Type: {design_type}
- Confirmed: false

## Project Survey Results (from d2c-status.js)
- Directory state: {empty / existing}
- Detected framework: {value}
- Detected language: {value}
- Detected styling: {value}
- Detected package manager: {value}
- Detected deploy: {value}
- Existing components: {summary}

## Conflict Resolutions
- Context switch: {yes/no, backup to be performed after confirmation}
- Design-project mismatch (Type B): {decision or "none"}
- Orphan backup: {decision or "none"}

## Step History
- [x] Status script executed
- [x] 1a: Input type detection
- [x] 1b: Project profile loaded from script
- [x] 1c: Design data source selected — {MCP / plugin / script / screenshot}
- [x] 1d: Design data fetched (including asset scan)
- [x] 1e: Type validation — passed ({type})
- [x] 1f: Mismatch detection — {no conflicts / resolved}
- [x] 1g: Diagnostic report generated
- [ ] 1h: ⏳ Awaiting user confirmation
```

## After Completion

After user confirmation:
1. If context switch was detected: rotate existing `.d2c.bak/` → `.d2c.bak.old/` (if present), move current `.d2c/` → `.d2c.bak/`, create fresh `.d2c/`
2. If orphan backup restore was chosen: rename `.d2c.bak/` → `.d2c/`, resume per Resume Rules in SKILL.md (skip Step 2 if DESIGN.md already exists)
3. Read `guides/STEP_2_TOKENS.md` and proceed to **Step 2**
