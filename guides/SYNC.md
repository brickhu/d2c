# Sync Mode — Feed Changes Back to Figma

**Trigger:** `/d2c sync`

Reverse of Update — push component changes, CSS variable updates, and style
adjustments back to the Figma design file.

## Prerequisite Check

| Condition | Result |
|-----------|--------|
| Figma URL + write access | ✅ Sync executes |
| Figma URL + read-only token | ❌ "Token lacks write permission" |
| Screenshot source | ❌ "Screenshot source cannot be synced back" |

## Step A: Scan Code Changes

Compare current code against `.d2c/DESIGN.md` and `.d2c/SPEC.md`:

- **CSS variable changes** — Added/modified/deleted custom properties
- **Component structure changes** — New components, Prop changes, renames
- **Token drift** — Color/spacing values in code that deviate from DESIGN.md

## Step B: Generate Sync Proposal

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  D2C Sync Proposal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 Changes to push to Figma:

  CSS Variables:
    • --color-primary: #1a1a2e → #16213e
    • --radius-lg: 8px → 12px
    • +--color-accent: #e94560

  Components:
    • Button: padding 12px 24px → 16px 32px
    • +DatePicker: new component, push to library?

Change types:
  ✅ Auto-sync (CSS variables, color tokens)
  ⚠️ Manual review needed (component structure)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step C: Write to Figma

Use the Figma API (`PUT /v1/files/{key}`) or an MCP write tool.

| Can sync | Cannot sync |
|----------|-------------|
| Fill colors | Code logic |
| Stroke colors/width | Layout structure |
| Corner radius | Adding/deleting pages |
| Type scale/weight | Interaction behavior |
| Spacing values | Image/asset replacement |
| Shadow effects | |

## Step D: Update DESIGN.md

After a successful sync, update the token values in `.d2c/DESIGN.md` to match
Figma, and record the sync timestamp.
