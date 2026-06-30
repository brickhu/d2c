# Step 5 — Scaffold, Assets, Plan & Playbook (INIT)

**Input:** SPEC.md + AGENTS.md
**Output:** Scaffold + local image/animation assets + `ASSETS.md` + `PLAN.md` + **`.d2c/PLAYBOOK.md`**

## 5a. Scaffolding

Check the Project Survey results from `.d2c/STATE.md`:

**If the directory is empty (no existing project):**
Run the scaffolding command confirmed via AskUserQuestion, based on the
framework chosen in AGENTS.md:

| Stack | Command |
|-------|---------|
| Next.js (full-stack) | `npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` |
| Vite + React (frontend only) | `npm create vite@latest ./ -- --template react-ts` |
| Node.js + Express (backend only) | `npm init -y && npm install express typescript @types/node` |
| Go backend | `go mod init {project} && mkdir -p cmd internal` |

**If an existing project was detected:**
**Skip scaffolding.** Do not run any init commands that would overwrite existing
files. Only create missing helper directories (see 5b).

**If this is an Update (via `/d2c update`):**
**Skip scaffolding.**

## 5b. Helper Directories

For full-stack projects (frontend + backend in one repo):

```bash
mkdir -p src/components/ui src/components/shared src/components/features \
         src/hooks src/lib src/types \
         src/server/routes src/server/services src/server/middleware src/server/models
```

For Next.js App Router (full-stack, backend via API routes):

```bash
mkdir -p components/ui components/shared components/features lib hooks types \
         app/api/auth app/api/users app/api/payments lib/server models services
```

For standalone backend:

```bash
mkdir -p src/routes src/services src/middleware src/models src/db/migrations tests/unit tests/integration
```

## 5c. Image & Animation Asset Download ⭐

Download all image and animation nodes identified in Step 1.

### 5c-1. Asset Directory

| Framework | Directory |
|-----------|-----------|
| Next.js | `public/images/{project}/` or `public/assets/` |
| Vite / CRA | `public/images/` |
| Static sites | `assets/images/` or `static/images/` |
| iOS | `Assets.xcassets/` |
| Android | `res/drawable/` or `res/mipmap/` |

### 5c-2. Get Asset URLs

**Option A — Figma MCP:** Use `figma_getImage({file_key, ids: [...], format: "svg"})`.

**Option B — REST API:**
```
GET https://api.figma.com/v1/images/{file_key}?ids={ids}&format=svg
Headers: X-Figma-Token: {token}
```

**SVG-first** for icons and simple graphics. Photos use PNG/JPG.

**Animation assets:** Export as **animated SVG** (SMIL or CSS animation).
Figma Motion and third-party plugins (SVGator, Animate SVG) generate animated
SVGs.

### 5c-3. Naming & Download

```bash
# Static: {page/component}_{description}.{svg|png}
# sidebar_logo.svg, dashboard_chart_placeholder.png

# Animation: {page/component}_{description}_anim.svg
# hero_intro_anim.svg, loading_spinner_anim.svg

curl -s -o public/images/hero_intro_anim.svg \
  "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/xxx"
```

**Rules:** lowercase + underscores, prefix with page/component, `_anim.svg`
suffix for animations, never use Figma node IDs as filenames.

### 5c-4. Generate ASSETS.md

```markdown
# Assets — {Project Name}

> Auto-downloaded from Figma | {timestamp}
> Total files: N

| Filename | Node ID | Type | Format | Size | Animation | Purpose | Local path |
|----------|---------|------|--------|------|-----------|---------|------------|
| sidebar_logo.svg | 123:456 | image | SVG | 120x32 | — | Sidebar logo | public/images/sidebar_logo.svg |
| hero_intro_anim.svg | 234:567 | animation | SVG | 800x400 | fadeIn 0.3s ease | Logo intro | public/images/hero_intro_anim.svg |
```

**Update mode:** Only download new/changed resources. Append incrementally.

## 5d. Generate PLAN.md

Break into atomic, independently compilable tasks (15-45 min each). The plan
should cover three areas to match the PLAYBOOK: **implementation, testing,
and deployment readiness**.

```
Plan Structure:
Implementation tasks — Frontend:
  ├─ Phase A: Design system infrastructure (Token config → atomic components)
  ├─ Phase B: Layout & routing (Layout → page skeletons)
  └─ Phase C: Pages & business logic (components → data connections)

Implementation tasks — Backend:
  ├─ Phase D: API & services (auth, crud, middleware)
  ├─ Phase E: Data layer (database schema, models, migrations)
  └─ Phase F: External integrations (payments, email, storage)

Testing tasks:
  ├─ Phase G: Frontend tests (component → integration → E2E)
  ├─ Phase H: Backend tests (API → service → integration)
  └─ Phase I: Full-stack E2E tests (critical user paths)

Deployment tasks:
  └─ Phase J: Deployment readiness (CI/CD config → build verification)
```

Label each task with its phase prefix so the PLAYBOOK can reference them:
`[A-01]`, `[B-03]`, `[D-02]`, etc.

**Update mode:** Append as **《Design v{number} Increment》** section.

## 5e. Generate PLAYBOOK.md — Execution Roadmap

Generate `.d2c/PLAYBOOK.md` — the single handoff document that tells the user
(or a Code Agent) exactly what to do after context generation completes. This
is the bridge between **context** and **execution**.

### PLAYBOOK Structure

```markdown
# Execution Playbook — {Project Name}

> Auto-generated by D2C — Design2Context
> Generated at: {timestamp}
> Design source: {design URL or file path}

## Prerequisites

### Environment Variables

| Variable | Description | Where to Get | Status |
|----------|-------------|-------------|--------|
| NEXT_PUBLIC_API_URL | Backend API base URL | Your backend provider | ⚠️ Needs setup |
| DATABASE_URL | PostgreSQL connection string | Railway / Supabase | ⚠️ Needs setup |

If any env vars are uncertain, flag with `[Pending: verify]`.

### External Services

| Service | Purpose | Setup Steps |
|---------|---------|-------------|
| Auth provider (NextAuth.js) | User authentication | `npx auth secret` → add env vars |
| Stripe | Payment processing | Create Stripe account → get API keys |

## Execution Phases

The phases are organized by architecture layer. See PLAN.md for exact ordering.

### Frontend Implementation (via `/d2c code`)

| Phase | Tasks | Est. Time | Depends On |
|-------|-------|-----------|------------|
| A — Design System | [A-01] Init tokens → [A-02] Button component → ... | ~2h | None |
| B — Layout | [B-01] Sidebar → [B-02] TopBar → ... | ~3h | Phase A |
| C — Pages | [C-01] Dashboard → [C-02] Settings → ... | ~4h | Phase B |

### Backend Implementation (via `/d2c code`)

| Phase | Tasks | Est. Time | Depends On |
|-------|-------|-----------|------------|
| D — API & Services | [D-01] Auth routes → [D-02] CRUD endpoints → ... | ~3h | Scaffold |
| E — Data Layer | [E-01] Schema → [E-02] Migrations → [E-03] Models → ... | ~2h | Phase D |
| F — Integrations | [F-01] Payment webhook → [F-02] Email service → ... | ~2h | Phase E |

### Testing (via `/d2c test`)

| Task | Scope | Framework |
|------|-------|-----------|
| Frontend unit | Each component + custom hooks | Vitest |
| Backend unit | API handlers, services, middleware | Vitest / Go test |
| Integration | API endpoint chaining + database CRUD | Supertest / MSW |
| E2E | Login → dashboard → settings flow (full-stack) | Playwright |

### Deployment (via `/d2c deploy`)

| Step | What to Do |
|------|-----------|
| 1. Frontend platform | Create Vercel project, connect Git repo |
| 2. Backend platform | Deploy API server (Railway / Fly.io / Docker) |
| 3. Database setup | Provision database, run migrations |
| 4. Environment config | Add env vars in all dashboards |
| 5. CI/CD | GitHub Actions deploy workflow (auto-created) |
| 6. Domain | Configure custom domains (optional) |

## Quick Start

```bash
# 1. Set up env vars (see Prerequisites above)
# 2. Implement the app
/d2c code
# 3. Write tests
/d2c test
# 4. Deploy
/d2c deploy
```

### Data Sources for the PLAYBOOK

Read from AGENTS.md and SPEC.md to populate:

- **Environment Variables:** From Step 3e Gap Q&A results
- **Testing Strategy:** From SPEC.md testing strategy section
- **Implementation phases:** From PLAN.md task list, organized by dependency
- **Deployment steps:** From AGENTS.md deployment target
- **External services:** From Step 3e Gap Q&A results

## 5f. Generate .env.example

Generate a `.env.example` file at the project root from the env vars confirmed
in Step 3 Gap Q&A. This file serves as the **developer onboarding reference** —
anyone cloning the project knows exactly what to configure.

```bash
# {Project Name} — Environment Variables
# Copy this file to .env and fill in the values.
# Auto-generated by D2C — {timestamp}

# ── Backend API ──
# Base URL of the API server
NEXT_PUBLIC_API_URL=http://localhost:3001
# ── Database ──
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/{project}
# ── Authentication ──
# JWT signing secret (run `openssl rand -base64 32` to generate)
AUTH_SECRET=
# ── External Services ──
# Stripe publishable key (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_KEY=
# Stripe secret key
STRIPE_SECRET_KEY=
```

**Rules:**
- Use placeholder values (`your-key-here`, `http://localhost:...`) — never real
  secrets
- Comment every variable with a one-line description
- Group variables by category with section headers (`# ── Database ──`)
- Mark variables that come from external services with their source comment
- If a `.env.example` already exists (existing project), append new variables
  with a `# D2C added` comment marker
- If no env vars were identified (static site without backend), skip this step

### Update Mode

If this is an Update (design iteration), append a `## Increment: Design v{number}`
section to PLAYBOOK.md rather than replacing it. Reference unchanged phases
with "No changes from v{number}."

## After Completion

Update `.d2c/STATE.md`, then present the PLAYBOOK.md summary to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  D2C Context Generation Complete — {Project Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All context files generated:
  • Design tokens   → styles/tokens.css + styles/tokens.ts
  • Design spec     → .d2c/DESIGN.md
  • Project index   → AGENTS.md
  • Component spec  → .d2c/SPEC.md (UI tree + API contracts + DB schema + state patterns)
  • Task plan       → PLAN.md ({N} tasks)
  • Playbook        → .d2c/PLAYBOOK.md
  • Env template    → .env.example

🧩 Context coverage:
  • Frontend UI     → Components, states, tokens, a11y
  • Backend API     → Endpoints, contracts, error format, auth
  • Data            → Schema, migrations, relations, indexes
  • Infrastructure  → Deployment, env vars, security baselines

📋 Next steps (see PLAYBOOK.md for details):
  1. Set up environment variables listed in Prerequisites
  2. Run `/d2c code`   → Start implementation
  3. Run `/d2c test`   → Generate test suites
  4. Run `/d2c deploy` → Set up deployment

Context files are ready. What would you like to do?
  (A) Review the playbook first
  (B) Run `/d2c code` to start implementing
  (C) Stop here — I'll use the context with another tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Wait for user decision before proceeding.
