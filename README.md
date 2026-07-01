# D2C — Design2Context

> Translate design files or live websites into structured full-stack AI development context.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="#readme">English</a> · <a href="README_cn.md">中文</a>
</p>

**D2C is a Design-to-Context workflow** — it translates visual design files into structured full-stack development context. Design tokens, API contracts, data models, component state patterns, and execution plans are extracted from your design and organized into context files that Code Agents (Claude Code, Cursor, Windsurf, or TRAE) consume to generate design-aligned full-stack code.

---

## Table of Contents

- [Install](#install)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [What D2C Generates](#what-d2c-generates)
- [Commands](#commands)
- [How It Works](#how-it-works)
- [Workflow Example](#workflow-example)
- [Agent Compatibility](#agent-compatibility)
- [AI Completion — Filling Design Gaps](#ai-completion--filling-design-gaps)
- [FAQ / Troubleshooting](#faq--troubleshooting)
- [License](#license)

---

## Install

D2C is distributed as an AI skill package on npm. Install it with the `skills` CLI in one command:

```bash
# Install from GitHub (recommended)
npx skills add brickhu/d2c

# Install with full GitHub URL
npx skills add https://github.com/brickhu/d2c
```

The `skills` CLI automatically detects your AI coding tool environment and places the skill files in the correct directory:

> **💡 Tip:** The `skills` installer is a zero-dependency CLI tool. If you haven't used it before, `npx` will download and cache it automatically — no global install needed.

---

## Requirements

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| **Node.js** | >= 18 | Required for helper scripts (`d2c-status.js`, `d2c-fetch.js`) |
| **AI Coding Tool** | Any | Claude Code, Cursor, Windsurf, TRAE IDE / CLI |
| **Figma MCP** | Recommended | Zero-token Figma access — D2C guides you through setup if missing |

---

## Quick Start

```bash
# 1. Install D2C
npx skills add brickhu/d2c

# 2. Go to your project directory
cd my-project

# 3. Ask your AI coding tool:
#    /d2c <your-figma-link-or-screenshot-or-website-url>
#    e.g. /d2c https://stripe.com/pricing

# 4. Follow the guided 5-step workflow — D2C generates full-stack context
#    covering UI → API → Data → Infrastructure

# 5. Refine anytime:
#    /d2c use snake_case for all API responses
#    /d2c add Sentry for error tracking

# 6. Generate code when ready:
#    /d2c code  → implement per plan
#    /d2c test  → generate test suites
#    /d2c deploy→ prepare deployment
```

---

## What D2C Generates

After processing a design, D2C produces these context files in your project:

| File | What it contains | Step |
|------|-----------------|------|
| `.d2c/OVERVIEW.md` | Project name, type, purpose, audience, meta, design source URL | Step 1 |
| `.d2c/PRD.md` | Business goals, feature scope, user flows, page structure, success criteria | Step 2 |
| `.d2c/DESIGN.md` | Design tokens, components, animation, constraints, responsive breakpoints. Documentation only. | Step 3 |
| `.d2c/ARC.md` | Frontend + backend tech stack, deployment strategy, architecture decisions. Keep it simple. | Step 4 |
| `.d2c/SPEC.md` | File structure, env vars, API contracts, component tree, coding constraints, testing strategy | Step 5 |
| `AGENTS.md` | Project context index (root) — auto-detected by AI coding tools | Post-5-step |
| `.d2c/AGENTS_bak.md` | D2C resume copy | Post-5-step |
| `PLAN.md` | Atomic development task list (code → test → deploy) | Post-5-step |
| `README.md` | Execution roadmap — env vars, phases, handoff guide | Post-5-step |

**Coverage dimension:** Full-stack — frontend UI, backend API, data models, infrastructure.

---

## Commands

All commands are used **inside your AI coding tool's chat** after D2C is installed:

| Command | What it does |
|---------|-------------|
| `/d2c <design>` | **Smart entry** — auto-detects input type (design, website, command) and routes to crawl/init/update/start |
| `/d2c <anything>` | **Context modification** — any natural language refines existing context |
| `/d2c code` | Execute implementation per PLAN.md |
| `/d2c test` | Generate test suites |
| `/d2c deploy` | Prepare deployment |
| `/d2c init [link]` | Force a fresh start (backup existing state, re-enter Step 1) |
| `/d2c update [link]` | Iterate on current design (resume or incremental diff) |
| `/d2c sync` | Push token changes back to Figma |

---

## How It Works

```
/d2c <input>
  │
  ├─ detect: Figma URL / website URL / image / file
  │
  ├─ Step 1: OVERVIEW.md — project meta
  ├─ Step 2: PRD.md — business requirements
  ├─ Step 3: DESIGN.md — design system & tokens
  ├─ Step 4: ARC.md — architecture & tech stack
  ├─ Step 5: SPEC.md — development spec & constraints
  │
  └─ Post-5-step: AGENTS.md + PLAN.md + README.md + ASSETS.md
```

---

## Workflow Example

Here's what a complete D2C session looks like from start to finish:

```bash
# ── 1. Install ──
npx skills add brickhu/d2c

# ── 2. Start a project ──
cd ~/Projects/dashboard-app

# ── 3. Process a design (inside your AI tool) ──
> Input: /d2c https://figma.com/file/abc123

# D2C detects: empty project → auto-enters Step 1

# ── 4. Go through 5 guided steps (AI asks, you answer) ──
# Step 1: Project overview → .d2c/OVERVIEW.md (meta, type, audience)
# Step 2: Business requirements → .d2c/PRD.md (goals, features, flows)
# Step 3: Design system → .d2c/DESIGN.md (tokens, components, animation)
# Step 4: Architecture → .d2c/ARC.md (tech stack, deployment)
# Step 5: Development spec → .d2c/SPEC.md (file structure, env vars, API)

# ── 5. Context complete! Modify anytime ──
> /d2c use MongoDB instead of PostgreSQL
> /d2c add Stripe webhook endpoint
> /d2c lock the layout components (don't touch them)

# ── 6. Generate code ──
> /d2c code     → implements the full-stack app
> /d2c test     → writes unit + integration + E2E tests
> /d2c deploy   → sets up CI/CD and deployment config
```

---

## Agent Compatibility

D2C's output context files follow standard conventions recognized by all major AI coding tools:

- **Claude Code** — auto-detects `AGENTS.md`, `PLAN.md`, `.clinerules`
- **Cursor** — reads `.cursorrules`
- **Windsurf** — auto-loads `AGENTS.md`
- **TRAE IDE / CLI** — loads via installed skill

No additional configuration is needed. After \`npx skills add brickhu/d2c\`, the context files are placed where your AI tool already looks.

---

## AI Completion — Filling Design Gaps

Design files cannot specify everything a full-stack project needs. D2C uses an **AI-propose, user-confirm** pattern for every decision the design cannot inform. The AI recommends a default with reasoning, offers alternatives, and asks for confirmation.

| Covered by design | Needs AI Completion |
|------------------|-------------------|
| Colors, typography, spacing | Environment variables |
| Form fields, table columns | API contract schemas |
| Data entities | Database schema, ORM choice |
| Loading spinners, empty states | Component state patterns |
| Modals, nav, dropdowns | Accessibility rules |
| Auth forms, file upload | Security baselines |

---

## FAQ / Troubleshooting

### \`npx skills add brickhu/d2c\` fails with ENOENT?

Ensure Node.js >= 18 is installed:

```bash
node --version
```

### The AI tool doesn't see D2C after install?

Restart your AI coding tool after installation. Skills are loaded on startup.

### D2C can't connect to Figma?

Try the **plugin path** instead: open the design in the Figma desktop app, run the "Export as .fig" plugin, and pass the file directly:

```bash
# Inside your AI tool:
/d2c path/to/design.fig
```

This bypasses both MCP and REST API — no tokens needed.

### Can I use D2C to reverse-engineer an existing website?

Yes. Pass the website URL directly: `/d2c https://example.com`. D2C crawls the live site, extracts design tokens, colors, typography, spacing, and DOM structure, then generates the same context files as a design file would.

### Can I use D2C without a Figma design?

Yes. D2C accepts screenshots, exported images, `.sketch` files, and `.fig` files. Any visual design representation works as input.

### Does D2C generate code?

Only when asked. By default D2C stops after producing context files (Phase 1). Code generation (`/d2c code`) is a separate, user-triggered step.

### Can I use D2C in an existing project?

Yes. D2C detects existing projects and adapts: it reads your current config files, pre-fills tech stack decisions, and only asks about missing information.

---

## License

MIT — see [LICENSE](LICENSE)

Copyright © 2026 fei