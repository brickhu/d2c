# D2D — Design2Deploy

> **Design-driven AI development pipeline. From design to deploy, diagnose first.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

D2D is a 7-step workflow that transforms design files into deployed applications.
It acts as a senior full-stack architect — diagnosing, aligning, and planning
before writing a single line of code.

**Core principle:** *Diagnose before you build. No blind coding.*

Five operation modes for every stage of a project's lifecycle:

| Mode | Trigger | When to use |
|------|---------|-------------|
| **Greenfield** (from scratch) | `/d2d <design>` + empty directory | New project, full 7 steps |
| **Brownfield** (existing project) | `/d2d <design>` + existing project | Add a new design to an existing codebase |
| **Update** (design iteration) | `/d2d update [new-link]` | The same design evolved — incremental diff |
| **Restart** (full reset) | `/d2d restart [new-link]` | Throw away generated code, start over |
| **Sync** (feed back to Figma) | `/d2d sync` | Push CSS variables and style changes back to Figma |

The first two modes auto-detect; Update, Restart, and Sync are explicit commands.

## Installation

### As a Claude Skill

1. Go to the [D2D GitHub repository](https://github.com/brickhu/d2d)
2. Copy the contents of [SKILL.md](https://raw.githubusercontent.com/brickhu/d2d/main/SKILL.md)
3. Save it as a skill (use `/save-skill` in Claude Desktop or the skill management UI)

Once installed:

```
/d2d https://www.figma.com/design/xxx/MyDesign
/d2d [upload screenshot]
```

### As a System Prompt (Claude Code, Cursor, Windsurf, any Agent)

Copy the contents of `SKILL.md` into:
- `CLAUDE.md` (Claude Code)
- `.cursorrules` (Cursor)
- `.windsurfrules` (Windsurf)
- Or directly into your agent's system prompt

Any agent with multimodal vision and tool-calling support can run D2D.

## How It Works

```
Step 1 🔍 DIAGNOSIS    —— Scan design + detect project mode → diagnostic report
Step 2 🎨 TOKENS       —— Extract Design Tokens → .d2d/DESIGN.md (includes design URL)
Step 3 🏗️ ARCHITECTURE —— Tech stack Q&A (Brownfield reads existing project first) → .d2d/AGENTS.md
Step 4 📐 SPEC         —— Directory structure + component tree + coding constraints → .d2d/SPEC.md
Step 5 ⚡ INIT          —— Scaffold (Greenfield only) + asset download + PLAN.md
Step 6 💻 CODE          —— Implement per PLAN.md, step-by-step with confirmation
Step 7 🚀 DEPLOY        —— CI/CD config + build verification + README
```

- Each step waits for user confirmation before proceeding
- Step 1 validates the design type — only **Web, iOS, Android, Desktop** are
  accepted. Posters, logos, illustrations, and print layouts are rejected
  with a clear explanation
- DESIGN.md records the source design URL for post-D2D traceability
- All documents auto-detect the user's language (English, Chinese, Japanese,
  etc.) — technical identifiers stay in English

## Data Access Priority

D2D fetches design data through three tiers, starting with the most convenient:

```
1️⃣ Figma MCP (preferred) — zero-config if the Figma plugin is installed
2️⃣ Figma REST API (fallback) — requires a Personal Access Token
3️⃣ Multimodal vision (last resort) — screenshot analysis, no credentials
```

## Generated Artifacts

| File | Contents |
|------|----------|
| `.d2d/DESIGN.md` | Design tokens + design URL (colors, typography, spacing, shadows) |
| `.d2d/AGENTS.md` | Tech stack decisions & ADRs |
| `.d2d/SPEC.md` | Component tree, directory structure, coding constraints |
| `.d2d/ASSETS.md` | Image & animation asset manifest with local paths |
| `PLAN.md` | Atomic development task list |

## Agent Compatibility

| Agent | Method |
|-------|--------|
| Claude Desktop | ✅ Native skill, `/d2d` trigger |
| Claude Code | ✅ `CLAUDE.md` |
| Cursor | ✅ `.cursorrules` |
| Windsurf | ✅ `.windsurfrules` |
| Any MCP-compatible agent | ✅ System prompt or MCP tool |

## License

MIT
