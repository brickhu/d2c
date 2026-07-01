# Step 4 — Architecture & Tech Stack (ARC)

**Input:** Diagnostic report + DESIGN.md + Project Survey results (from `.d2c/STATE.md`)
**Output:** `.d2c/ARC.md` (frontend + backend tech stack, deployment strategy, architecture decisions)
**Decision:** AskUserQuestion confirmation before Step 5

## 3a. Adapt to Project State

Read the "Project Survey Results" section from `.d2c/STATE.md` to understand
what already exists in the directory. Your approach adapts accordingly:

**When the directory is empty (no existing project):**
- Run the full Q&A (3c) to determine the complete tech stack.
- No prior constraints — recommend based on design requirements and best
  practices. Use the **AI Completion** pattern (3d) for decisions the design
  cannot inform.
- Also run the Gap Q&A (3e) to cover environment variables, services, and
  testing configuration that the design doesn't specify.

**When an existing project was detected:**
- Before asking any questions, read the key config files identified in the
  survey: `package.json`, `tsconfig.json`, `tailwind.config.js`,
  `next.config.js`, `vite.config.ts`, Dockerfile, `vercel.json`,
  `.github/workflows/`, etc.
- Extract every confirmed tech choice (framework, language, styling, package
  manager, deployment target).
- **Pre-fill** those decisions; only ask questions about items that are
  **missing or ambiguous**.
- Run the Gap Q&A (3e) **only for things not already in the project** — e.g.,
  if `next.config.js` already has env var declarations, skip that question.
- If the survey noted a Type B conflict resolution ("adapt code to design"),
  ask follow-up questions about how to restructure.

**When resuming an existing D2C state (AGENTS.md already exists):**
- Read AGENTS.md first.
- If the design hasn't introduced new architectural needs (no new feature
  types like real-time, auth, etc.), skip Q&A and proceed.
- If new features require new decisions, ask only about the gaps.

## 3b. Feature-Driven Requirements

Cross-reference the diagnostic report's feature list with the table below to
identify technical implications:

| Feature | Technical Impact |
|---------|-----------------|
| Forms/CRUD | Form library + state management |
| Real-time data | WebSocket / SSE |
| Audio/video streaming | WebRTC / HLS |
| Large lists | Virtual scroll + server pagination |
| Auth | JWT / OAuth / Session |
| File upload | Object storage |
| Admin panel | RBAC permissions |
| SEO | SSR / SSG |
| Motion/animation | Animation library (Framer Motion / GSAP / CSS) |

For features not covered above, reason about architectural implications and
raise them during Q&A.

## 3c. Progressive Q&A

Ask one question at a time. Adapt subsequent questions based on previous
answers. Skip any question where the answer is already known from the project
survey or existing configs.

1. Frontend framework? (React / Next.js / Vue / Nuxt / Other)
2. Styling solution? (Tailwind / CSS Modules / styled-components / PandaCSS)
3. Backend needed? (Static / Node.js / Python / Go / Other)
4. Database? (PostgreSQL / MySQL / SQLite / MongoDB / None)
5. Deployment target? (Vercel / Railway / Docker / VPS / Cloudflare Pages)
6. Auth solution? (Clerk / Auth0 / NextAuth.js / Lucia / Self-built JWT)
7. CI/CD preference? (GitHub Actions / GitLab CI / Manual)
8. Package manager? (npm / pnpm / yarn / bun)

When skipping a question because the answer is known, briefly state why:
"Your project already uses pnpm (pnpm-lock.yaml detected), so I'll use that."

## 3d. AI Completion — Proposing Decisions Beyond Design

For every decision the design cannot inform, use the **AI-propose, user-confirm**
pattern. Do not ask open-ended empty questions. Always:

1. **Identify the gap** — "This design shows a dashboard with real-time charts.
   It doesn't specify a data fetching library."
2. **Recommend a default** — "Based on your Next.js stack, I recommend NextAuth.js for authentication with credentials provider. The design's login form suggests email+password with a 3-field registration form — I'll derive the API contract and database schema from those."
3. **Offer alternatives** — "Alternatives: SWR (lighter, Vercel-aligned) or
   raw fetch + custom hooks (most flexible but more boilerplate)."
4. **Ask for confirmation** — "Shall I proceed with TanStack Query and derive the full API contract schema from the design's dashboard charts and data tables?"

### When to Apply This Pattern

| Question category | Example | Why AI can propose |
|------------------|---------|-------------------|
| Testing framework | Vitest, Jest, Playwright | Inferred from framework/language |
| State management | Zustand, Redux, Jotai | Inferred from app complexity |
| Data fetching | TanStack Query, SWR, tRPC | Inferred from feature list |
| Auth solution | NextAuth.js, Clerk, Lucia | Inferred from login forms in design |
| Error monitoring | Sentry, Datadog, custom | Inferred from app type (production app) |
| CSS approach within framework | Tailwind plugins, CSS modules | Inferred from styling choice |
| Component library | shadcn/ui, Radix, MUI | Inferred from existing project deps |
| API architecture | REST, GraphQL, tRPC | Already present — keep |
| API runtime | Express, Fastify, NestJS, Hono | Inferred from language + framework stack |
| ORM / Data layer | Prisma, Drizzle, TypeORM, Mongoose | Inferred from database choice |
| Caching strategy | Redis, in-memory, CDN | Inferred from data access patterns |
| File storage | S3 / R2, Cloudinary, local FS | Inferred from upload features in design |
| Background jobs | Bull, RabbitMQ, Inngest | Inferred from async task needs |

## 3e. Gap Q&A — Environment Variables, Services & Testing

Beyond tech stack, design docs cannot specify operational details. Ask these
questions after the main Q&A (grouped, not one at a time):

**Environment Variables (present as a table, let user fill):**

```
The design implies these env vars will be needed. I've pre-filled guesses:

| Variable | Description | Guessed Value | Status |
|----------|-------------|--------------|--------|
| NEXT_PUBLIC_API_URL | Backend API base | http://localhost:3001 | ⚠️ Guess — confirm |
| DATABASE_URL | PostgreSQL connection | postgresql://user:pass@localhost:5432/db | ⚠️ Guess — confirm |
| AUTH_SECRET | JWT signing secret | (auto-generated in prod) | 🔒 Auto |
```

**Backend Services & Infrastructure:**
- "The design doesn't specify backend services. Based on the features (user
  accounts, real-time data, file uploads), I recommend:
  - **Auth service:** {recommendation} (handles login/register)
  - **API server:** {recommendation} (RESTful endpoints)
  - **Database:** {recommendation} (primary data store)
  - **File storage:** {recommendation} (for uploads)"
- "For the API architecture, does REST + JSON suffice, or do you need GraphQL
  or tRPC?"

Ask: "Should I add any other env vars? Are the guessed values correct?"

**External Services:**
- "Does this project need any external services (Stripe for payments, SendGrid
  for emails, Supabase for backend)? I noticed the design includes a checkout
  page. Shall I configure Stripe?"
- "For monitoring, I recommend Sentry for error tracking. OK?"

**Testing Configuration:**
- "For testing, based on your stack:
  - **Frontend unit:** {Vitest / Jest} for components + hooks
  - **Backend unit:** {Vitest / Jest / Go test} for API handlers and services
  - **Integration:** {Supertest / MSW} for API endpoint testing
  - **E2E:** {Playwright / Cypress} for critical user journeys
  Shall I include this in the test strategy?"

**API Contract Depth:**
- "For the API contracts (request/response schemas), I'll derive field types and
  validation rules from the form fields and data displays in the design. Do you
  want:
  (a) **Full contracts** — each endpoint with exact request body, response
      shape, status codes, and error format (recommended)
  (b) **Light contracts** — just endpoint names and auth requirements
  (c) **Skip API contracts** — I'll document routes only"

**Database Schema:**
- "Based on the design's data entities (users, orders, products), I recommend:
  - {ORM}: {name} — {reason}
  - **Migrations:** {tool} ({manual / automatic})
  - Do you want full field-level schema or just model structure?"

**Error Handling Strategy:**
- "For error handling, I recommend a unified API error envelope
  (code + message + details) across all endpoints, plus a global error
  boundary on the frontend. This keeps error handling consistent.
  OK?"

**Accessibility Baseline:**
- "I'll add accessibility rules to SPEC.md based on component types
  (modals need focus traps, nav needs aria-current, etc.). These are
  inferred from the UI pattern, not from explicit design annotations.
  Should I include the full a11y baseline or skip it?"

Record all confirmed answers in the AGENTS.md Key Decisions section and in
STATE.md for traceability.

## 3f. Generate Root AGENTS.md

Write `AGENTS.md` in the **project root** (not `.d2c/`). This file must be a
**lightweight index** — every AI coding tool (Claude Code, Cursor, Windsurf)
auto-detects this file and loads it as system context, so keep it concise.
Detailed documents live in `.d2c/` and are referenced from here.

```markdown
# {Project Name}

> {one-line description}

## Tech Stack
- **Frontend:** {choice or detected}
- **Styling:** {choice or detected} — use design tokens (see below)
- **State management:** {choice or detected}
- **Backend:** {choice or detected}
- **API:** {choice or detected} (REST / GraphQL / tRPC)
- **Database:** {choice or detected}
- **ORM / Data layer:** {choice or detected}
- **Auth:** {choice or detected}
- **File storage:** {choice or detected}
- **Deploy:** {choice or detected}
- **CI/CD:** {choice or detected}
- **Package manager:** {choice or detected}

## Design Tokens (MANDATORY)
All visual values come from `.d2c/DESIGN.md` — the single source of truth for design tokens. During code generation (Phase 2), the Agent will derive token declarations from DESIGN.md. **No hard-coded colors, spacing,
font-sizes, radius, or shadows.** See `.d2c/DESIGN.md` for the full design
system and behavioral constraints (component states, responsive rules,
interaction patterns).

## Key Decisions
- {ADR-1 title}: {decision}
- {ADR-2 title}: {decision}

## Environment Variables
- {VAR}: {description} — {source/reason}
- {VAR}: {description} — {source/reason}

## Testing Strategy
- **Unit:** {framework} — {scope, e.g., "all components + hooks"}
- **E2E:** {framework} — {scope, e.g., "critical user flows"}
- **Coverage target:** {target, e.g., "80%"}

## System Architecture
- **Frontend:** Component tree and UI rules in `.d2c/SPEC.md`
- **Backend:** API contracts, data models, and service architecture in `.d2c/SPEC.md`
- **Design:** Tokens and constraints in `.d2c/DESIGN.md`
## Constraints
- Design tokens and interaction constraints in `.d2c/DESIGN.md`
- Full-stack quality: TypeScript strict (frontend), typed APIs, validated inputs
- Max 200 lines per component, logic in hooks/lib (frontend) or services/middleware (backend)
```

The root `AGENTS.md` serves as the **entry point** — tools that load it will
see the tech stack, token mandate, and where to find detailed specs. Keep it
under ~40 lines.

Also save an authoritative copy to `.d2c/AGENTS_bak.md` (for resume/reference
during future D2C sessions).

Save tech stack preferences to memory after completion.

## 4g. Skill Recommendation Check

After the tech stack is confirmed, check the project's installed skills and
suggest complementary ones. See the **Skill Interoperability** section in
SKILL.md for the full protocol.

The Agent checks installed skills and uses AskUserQuestion for each recommendation found:

```json
{ "header": "Install", "question": "Install frontend-design (Anthropic)? Premium UI quality, 190K+ installs.", "options": [
  { "label": "Install", "description": "npx skills add anthropics/skills --skill frontend-design" },
  { "label": "Skip", "description": "Don't install this skill" }
]}
```

For each uninstalled skill, show the ask. For installed skills, ask if they want to invoke it.

## After Completion

Use AskUserQuestion to confirm:

```json
{ "header": "Confirm", "question": "AGENTS.md is ready. Review and confirm?", "options": [
  { "label": "Confirm & Continue", "description": "Proceed to Step 5 — Development Spec & Constraints" },
  { "label": "Modify", "description": "I want to change some decisions" },
  { "label": "Cancel", "description": "Abort D2C" }
]}
```

On confirm, update `.d2c/STATE.md` to mark Step 4 complete. Then update the
todo list: mark Step 4 complete, set Step 5 to in_progress. Read
`guides/STEP_5_SPEC.md` and proceed to Step 5.
