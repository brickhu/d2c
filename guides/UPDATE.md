# Update Mode — Design Iteration

**Trigger:** `/d2c update [new-design-link]`

Used when the same project's design evolves (spacing tweaks, color changes,
icon swaps, new pages). Not automatic — must be explicitly requested.

## Core Behavior

1. Read existing `.d2c/STATE.md` to restore project context
2. Use the new link if provided, otherwise re-fetch from the URL in DESIGN.md
3. Diff old vs. new design, output a change summary
4. **Every change requires user confirmation** — no silent overwrites

## Step Differences

| Step | Update behavior |
|------|----------------|
| **Step 1 (Diagnosis)** | Output a **change diff report** (Token changes + component changes + asset changes) instead of a full diagnosis |
| **Step 2 (Tokens)** | Generate `DESIGN.diff.md` listing added/modified/deleted tokens. Merge into DESIGN.md only after user confirmation; old values remain in comments |
| **Step 3 (Architecture)** | Skip if AGENTS.md exists and tech stack hasn't changed. If the new design adds features, ask whether to update AGENTS.md |
| **Step 4 (SPEC)** | Update the component tree — new components get ✅ markers, matching existing components are reused. Directory structure is not regenerated |
| **Step 5c (Assets)** | Download only new or changed resources. Do not overwrite existing files |
| **Step 5d (PLAN)** | Append incremental tasks to PLAN.md, labeled **《Design v{number} Increment》** |
| **Step 5e (README)** | Append `## Increment: Design v{number}` section to README.md. Reference unchanged phases with "No changes from v{number}" |
| **Step 6 (Code)** | Start with incremental tasks. Existing coded components are unaffected |
| **Step 7 (Deploy)** | Unchanged |

## Change Summary Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  D2C Design Update Report — v1 → v2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Change Summary:
  • Tokens: +3 added, -1 deleted, ~2 modified (spacing adjustments)
  • Components: +2 added (DatePicker, Pagination), -1 deprecated
  • Assets: +4 downloaded, ~2 replaced
  • PLAN: 6 incremental tasks appended

📁 Documents updated:
  ✅ DESIGN.diff.md → merged into DESIGN.md
  ✅ SPEC.md — component tree updated
  ✅ ASSETS.md — incremental sync complete

ℹ️ Next steps:
  • Start incremental coding
  • Or review DESIGN.diff.md to confirm token changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
