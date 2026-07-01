# Step 4 — Coding Standards & Component Mapping (SPEC)

**Input:** DESIGN.md + AGENTS.md + design + Project Survey results
**Output:** `.d2c/SPEC.md` (frontend component tree + API contracts + data models)

## 4a. Directory Structure

Check the Project Survey results from `.d2c/STATE.md` to determine how to
approach the directory structure.

**If the directory is empty (no existing project):**
Derive best-practice structure from the chosen tech stack in AGENTS.md.

Examples:

```
# Next.js App Router
project/
├── app/ (routes: (auth), (dashboard), api/)
├── components/ (ui/, shared/, features/)
├── lib/ (utils.ts, constants.ts)
├── hooks/
└── types/

# Vite + React SPA
project/
├── src/
│   ├── components/ (ui/, shared/, pages/)
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   └── types/
└── public/

# Monorepo (full-stack)
project/
├── apps/ (web/, api/)
├── packages/ (shared/, ui/)
└── package.json

# Standalone Backend (Node.js)
project/
├── src/
│   ├── routes/ (auth/, users/, payments/)
│   ├── middleware/ (auth.ts, validation.ts, error.ts)
│   ├── services/ (authService.ts, paymentService.ts)
│   ├── models/ (User.ts, Order.ts)
│   ├── db/ (migrations/, schema.prisma)
│   └── utils/ (validators.ts, helpers.ts)
├── tests/ (unit/, integration/)
└── Dockerfile

# Standalone Backend (Go)
project/
├── cmd/ (server/)
├── internal/
│   ├── handler/ (auth.go, user.go)
│   ├── service/ (auth.go, payment.go)
│   ├── repository/ (user.go)
│   ├── model/ (user.go, order.go)
│   └── middleware/ (auth.go)
├── migrations/
├── pkg/ (shared utilities)
├── go.mod
└── Dockerfile
```

**If an existing project was detected:**
Read the current project tree (LS at the project root, then key subdirectories).
Align with existing conventions. Append new components/pages to existing
directories rather than restructuring. If the survey noted a Type B conflict
resolution ("adapt code to design"), propose structural changes in the SPEC
and flag them for user confirmation.

**If this is an Update (incremental design iteration):**
Do not regenerate directory structure — only update the component tree.

## 4b. Component Tree Mapping

Map all design components as a tree:

```
Component Tree
├── Layout
│   ├── Sidebar (Logo, NavItem, UserInfo)
│   └── MainArea (TopBar, PageContent)
├── Pages
│   ├── Dashboard (StatsCard, RecentActivityTable)
│   └── Settings (ProfileForm, PreferencesPanel)
└── Shared (Button, Input, Card, Modal, Dropdown)
```

Annotate each component with:
- State management needs (local / global / server)
- Props interface summary
- Figma node IDs (if available)
- **Existing/reused components** (mapped to files found during the project survey)

**Animation nodes** get `[ANIM]` prefix with animation type and trigger
(auto-play / hover / scroll).

**For existing projects:** Cross-reference detected components (from
`components/ui/`, etc.) with design components. Mark matches as `[REUSE]` and
new components as `[NEW]`.

## 4b2. Service Layer & Data Models

Map all backend services, API endpoints, and data models implied by the design.
Even if the design only shows UI, the features imply backend structure:

```
Service Architecture
├── API Gateway / Router
│   ├── /api/auth/* (login, register, logout, refresh)
│   ├── /api/users/* (profile, settings, preferences)
│   ├── /api/dashboard/* (stats, activity feed)
│   └── /api/payments/* (checkout, invoices, webhooks)
├── Service Layer
│   ├── AuthService (JWT, session, OAuth)
│   ├── UserService (CRUD, preferences)
│   ├── DashboardService (aggregation, caching)
│   └── PaymentService (Stripe integration, webhooks)
├── Data Layer
│   ├── Models: User, Order, Payment, Session, AuditLog
│   ├── Relations: User 1:N Order, Order 1:1 Payment
│   └── Indexes: email (unique), userId (FK), orderStatus
└── External Integrations
    ├── Stripe (payments)
    ├── SendGrid (emails)
    └── S3 / R2 (file storage)
```

Annotate each service with:
- REST endpoints (method, path, request/response schema)
- Auth requirements (public / authenticated / admin)
- Data model references
- External service dependencies

## 4b3. API Contracts (Schema-Level)

For each endpoint identified in 4b2, expand into a **full contract** with
request/response schemas, status codes, and error format. Derive field types
from the design's form fields, table columns, and detail views.

```yaml
### Auth Endpoints

POST /api/auth/login
  Summary:      User login
  Auth:         Public
  Rate limit:   5/min per IP
  Request body:
    email:      string(required, email format, max 255 chars)
    password:   string(required, min 8 chars)
  Success (200):
    token:      string (JWT, expires 7d)
    user:
      id:       UUID
      name:     string
      email:    string
      avatar:   string (URL or null)
  Errors:
    400:        { code: "VALIDATION_ERROR", message: "...", fields: [...] }
    401:        { code: "INVALID_CREDENTIALS", message: "Email or password incorrect" }
    429:        { code: "RATE_LIMITED", message: "Too many attempts", retryAfter: 120 }
    500:        { code: "INTERNAL_ERROR", message: "Something went wrong" }

POST /api/auth/register
  Summary:      Create account
  Auth:         Public
  Request body:
    name:       string(required, 2-50 chars)
    email:      string(required, email format, unique)
    password:   string(required, min 8, must contain number + uppercase)
  Success (201):  { token: string, user: User }

### User Endpoints

GET /api/users/me
  Summary:      Get current user profile
  Auth:         Required (Bearer token)
  Success (200):  { user: User }
  Errors:
    401:        { code: "UNAUTHORIZED", message: "Invalid or expired token" }

PATCH /api/users/me
  Summary:      Update profile
  Auth:         Required
  Request:      { name?: string, avatar?: string (URL) }
  Success (200):  { user: User }
```

**Derivation rules:**
- Request fields come from **form inputs** in the design (labels, placeholders,
  input types)
- Response fields come from **data display** (table columns, detail cards,
  dashboard widgets)
- Error states come from **validation messages** shown in the design (red
  borders, inline error labels, toast notifications)
- Auth requirements come from **page access patterns** (login gate shows →
  public; only after login → authenticated; admin panel → admin)

**For existing projects:** Read existing API code or OpenAPI specs if available.
Pre-fill contracts and flag deviations for user confirmation.

**If this is an Update:** Append new endpoints. Mark unchanged ones as
"Unchanged from v{N}."

## 4b4. Component State Patterns

Design files invest significant effort in non-default states (loading spinners,
empty state illustrations, error toasts, skeleton screens). These states MUST
be extracted and documented — otherwise Code Agents will only implement the
"happy path" and miss all the edge cases the designer intended.

Scan every component in the tree against the design for these state variants:

```markdown
## State Patterns

### {Component Name}

| State | Visual Treatment | Trigger | Implementation Notes |
|-------|-----------------|---------|---------------------|
| Default | {as designed — color, layout} | Normal render | Main component export |
| **Loading** | {skeleton / spinner / shimmer} | Data fetching starts | Show immediately, no delay |
| **Empty** | {"No {items}" illustration + CTA button} | Array/query returns [] | Center in container |
| **Error** | {inline alert + retry button} | API returns 4xx/5xx | Position at top of component, call retry on click |
| **Hover** | {background shift, underline} | Mouse enters | CSS :hover, no JS |
| **Active** | {color inversion, subtle scale} | Click / tap | Pressed state, 100ms duration |
| **Disabled** | {opacity 0.4, cursor not-allowed} | Form invalid / action unavailable | Prevent interaction |
| **Skeleton** | {pulse animation, gray blocks} | Loading (alternative) | Match content shape, shimmer width=60%/80%/40% |
```

Apply this pattern to **every component with dynamic data** — tables, cards,
detail panels, dashboards, profile pages. Components that are purely visual
(logo, icon, layout wrapper) skip this analysis.

**How to detect states from the design:**
- Component variant layers (Figma variants named "loading", "empty", "error")
- Overlay frames above components (error toasts, success banners)
- Screenshot pages that show non-default content
- Component switching (login form → spinner → dashboard indicates auth flow states)
- Prototype interactions that reveal alternate states

**For existing projects:** Add only states that the design introduces beyond
what existing components already handle. Mark existing states as `[EXISTING]`.

## 4b5. Database Schema

From the data models in 4b2 and the forms/tables in the design, expand each
model with **full field definitions, constraints, indexes, and migrations
strategy.**

```yaml
--- Models ---

User:
  Table:        users
  Fields:
    id:           UUID (pk, default: gen_random_uuid())
    email:        string(255, not null, unique)
    name:         string(100, not null)
    passwordHash: string(255, not null)
    avatarUrl:    string(500, nullable)
    role:         enum(user|admin, default: user)
    createdAt:    datetime(not null, default: now())
    updatedAt:    datetime(not null, auto-update)
  Indexes:
    - idx_users_email (unique) on email
    - idx_users_role on role
  Relations:
    - hasMany: Order (via userId)

Order:
  Table:        orders
  Fields:
    id:           UUID (pk)
    userId:       UUID (fk → users.id, not null)
    status:       enum(pending|confirmed|shipped|delivered|cancelled|refunded)
    totalAmount:  decimal(10, 2, not null)
    currency:     string(3, default: "USD")
    shippingAddress: jsonb
    paidAt:       datetime, nullable
    createdAt:    datetime
    updatedAt:    datetime
  Indexes:
    - idx_orders_userId on userId
    - idx_orders_status on status
  Relations:
    - belongsTo: User
    - hasMany: OrderItem

OrderItem:
  Table:        order_items
  Fields:
    id:           UUID (pk)
    orderId:      UUID (fk → orders.id, not null)
    productName:  string(200, not null)
    quantity:     integer(not null, min: 1)
    unitPrice:    decimal(10, 2, not null)
  Relations:
    - belongsTo: Order
```

**Derivation rules:**
- Fields come from **form labels** (label=field name), **table columns**
  (column=field name + data type hint), **detail view labels**
- Types come from **input types** (password field → string hash, number input
  → integer/decimal, email input → string with email constraint)
- Nullability comes from **required markers** (asterisk = not null, optional
  label = nullable)
- Relations come from **UI patterns** (dropdown selects from related data,
  detail page showing parent + children)
- Indexes come from **search/filter features** (search by email → unique
  index, filter by status → index on status)

**Enum extraction from design:**
- Dropdown/select with fixed options → enum
- Status badges with distinct colors → enum
- Tab navigation over distinct states → enum
- Radio button group → enum

## 4c. Coding Constraints

| Category | Rules |
|----------|-------|
| **Naming** | PascalCase for components, camelCase for utils, kebab-case for dirs |
| **Imports** | Absolute imports preferred (`@/components/ui/Button`) — align with existing `tsconfig.json` paths if project exists |
| **Components** | One file per component, named export + default export, Props interface at top |
| **Style** | **ZERO hard-coded values.** Every color, font-size, spacing, radius, and shadow MUST reference a token from `.d2c/DESIGN.md` (the token source of truth). See Token Adoption rules below. |
| **Quality** | TypeScript strict (if TS is used), max 200 lines per component, logic in hooks/lib not in components, input validation required |
| **Existing conventions** | If project exists, match existing patterns (file naming, export style, folder depth) |

## 4d. Token Adoption — Mandatory Rules

`.d2c/DESIGN.md` is generated in **Step 2** and is the **single source of truth** for all visual design tokens. The Agent MUST read this file at the start of code generation to know what values are available. During code generation, the Agent derives `tokens.css` / `tokens.ts` from DESIGN.md as needed.

### Hard rules (never violate):

| # | Rule | Why |
|---|------|-----|
| 1 | **Zero hex/rgba literals in component styles.** Every color must reference `var(--color-*)` or `tokens.colors.*` | Any hard-coded color silently diverges from the design system |
| 2 | **Zero px/rem literals for spacing, font-size, radius.** Every value must use `var(--spacing-*)`, `var(--font-size-*)`, `var(--radius-*)` or their TS equivalents | Ensures spacing rhythm is consistent with the design |
| 3 | **Typography must use tokens.** `font-family` → `var(--font-family-sans)`, `font-weight` → `var(--font-weight-*)`, `line-height` → `var(--line-height-*)` | Without this, text renders differently than designed |
| 4 | **Shadows must use tokens.** `box-shadow` → `var(--shadow-*)` | Shadow values are subtle; hard-coding mistranslates them |
| 5 | **Existing token files are READ-ONLY.** Never modify `styles/tokens.css` or `styles/tokens.ts` during code generation. If a value is missing, add it as a new token in `.d2c/DESIGN.md`; re-derived token files will pick it up. | Modifying token files per-component leads to token drift |
| 6 | **Every generated component file must be scanned for literal violations before being marked as complete.** | Automated post-generation check |

### Allowed exceptions (must be confirmed with user):

- **Third-party library overrides** (e.g., a chart library that requires specific
  color formats). Always add a code comment explaining why.
- **Semantic exceptions** (e.g., a brand-required color that doesn't exist in the
  design). Add a new token to `.d2c/DESIGN.md` rather than hard-coding.
- **Custom animations** involving `@keyframes` with specific color/position values
  can use literals inside `@keyframes` blocks, but the property values that
  reference them must be token-based.

### Token usage patterns by framework

**CSS / Tailwind:**
```css
/* ✅ CORRECT: Token references */
.button {
  background: var(--color-primary);
  color: var(--color-white);
  border-radius: var(--radius-md);
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
  box-shadow: var(--shadow-sm);
}

/* ❌ WRONG: Hard-coded values */
.button {
  background: #6366f1;
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
```

**Tailwind classes (via tailwind.config.ts extension):**
```tsx
// ✅ CORRECT: Token-mapped Tailwind classes
<Button className="bg-primary text-white rounded-md px-4 py-2 text-sm shadow-sm" />

// ❌ WRONG: Arbitrary values in Tailwind
<Button className="bg-[#6366f1] text-white rounded-[8px] px-[16px] py-[8px]" />
```

**React inline styles / styled-components:**
```tsx
// ✅ CORRECT: TS token reference
import { colors, radius, spacing } from '@/styles/tokens';
<Button style={{ background: colors.primary, borderRadius: radius.md, padding: `${spacing[2]} ${spacing[4]}` }} />

// ❌ WRONG: Inline literals
<Button style={{ background: '#6366f1', borderRadius: '8px', padding: '8px 16px' }} />
```

## 4e. Testing Strategy Section

Append a testing strategy section to `.d2c/SPEC.md`. This section is populated
from decisions made in Step 3 (Gap Q&A) and provides the foundation for
PLAYBOOK.md test plan and future `/d2c test` execution.

```markdown
## Testing Strategy

### Unit Tests
- **Framework:** {Vitest / Jest / other}
- **Scope (Frontend):** Every component in the component tree, all custom hooks
- **Scope (Backend):** API handlers, service functions, middleware, utility functions
- **Pattern:** describe/it blocks, render → assert → cleanup
- **Mock strategy:** Mock external API calls, keep component internals real

### Integration Tests
- **Framework:** {Vitest + MSW / Cypress Component Test / other}
- **Scope (Frontend):** Data fetching flows, form submission → validation → success/error
- **Scope (Backend):** API endpoint chaining, database CRUD operations, auth flow
- **Key flows to test:**
  - {Flow 1}: {description}
  - {Flow 2}: {description}

### E2E Tests
- **Framework:** {Playwright / Cypress / other}
- **Scope (Full-stack):** Critical user journeys spanning frontend → API → database
- **Key journeys:**
  - {Journey 1}: Login → Dashboard → Logout
  - {Journey 2}: Browse → Add to cart → Checkout

### Coverage Target
- **Goal:** {coverage percentage, e.g., "80% line coverage"}
- **Gate:** CI pipeline fails below threshold
```

## 4f. Error Handling Strategy

Define a global error handling strategy that applies across frontend and
backend. Errors in a design may be implicit (red borders on invalid form
fields, toast notifications, error pages) — expand them into a coherent system.

### Backend Error Format (unified)

```yaml
# Every API error response follows this shape:
API Error Envelope:
  code:         string   # Machine-readable: "VALIDATION_ERROR", "NOT_FOUND", "RATE_LIMITED"
  message:      string   # Human-readable, localized
  details?:     object   # Per-field errors for validation failures
  requestId?:   string   # Correlation ID for debugging
  
# HTTP Status Code conventions:
  200: Success
  201: Created (POST resources)
  400: Validation error / bad request
  401: Unauthenticated
  403: Forbidden (authenticated but no permission)
  404: Resource not found
  409: Conflict (duplicate, stale data)
  429: Rate limited
  500: Internal server error
```

### Frontend Error Handling

```yaml
Error Boundary (global):
  - Wrap root layout in <ErrorBoundary>
  - Catch uncaught render errors → show fallback UI (from design)
  - Log to {Sentry / Datadog}

API Error Handling (per-component):
  - 4xx:   Show inline error message near the trigger (from design's error states)
  - 5xx:   Show retry-able error toast (from design's toast/alert components)
  - 429:   Show cooldown timer + disable submit button
  - Network: Show "Connection lost" banner with auto-retry (exponential backoff)

Form Validation:
  - Client-side:   Validate on blur + submit (rules from 4b3 API contracts)
  - Server-side:   Return validation errors in apiError.details format
  - Display:       Map field-level errors from response to input components
```

### Logging & Monitoring

- **Error tracking:** {Sentry / Datadog / custom} — configured in AGENTS.md
- **API logging:** Structured JSON logs (requestId, method, path, status, duration)
- **Client logging:** Console.error → transport to logging endpoint (avoid PII)

## 4g. Accessibility & Security Baselines

Define cross-cutting constraints that every component implementation must
satisfy. These are not design-derived but are **inferred** from the component
type and platform conventions.

### Accessibility Rules (inferred from component type)

| Component Type | Required A11y | Derivation |
|---------------|--------------|------------|
| Modal / Dialog | `role="dialog"`, `aria-modal="true"`, focus trap, `Escape` to close, `aria-labelledby` heading | UI pattern is always modals |
| Navigation | `role="navigation"`, `aria-current="page"` on active item, keyboard nav (arrow keys) | Interactive nav element |
| Dropdown / Select | `aria-expanded`, `aria-haspopup="listbox"`, keyboard selection | Expandable list pattern |
| Form inputs | `aria-invalid` on error, `aria-describedby` for hints, `for`/`id` label association | Form data entry |
| Tab panel | `role="tablist"`, `role="tab"`, `aria-selected`, keyboard arrow navigation | Tab switching UI |
| Toast / Alert | `role="alert"`, `aria-live="polite"` | Dynamic notification |
| Skeleton / Loading | `aria-busy="true"` on container | Content being loaded |
| Data table | `<th>` with `scope`, `aria-sort` on sortable columns, keyboard navigation | Tabular data display |

If the project already has an a11y baseline, align with it. If not, propose
this as the default and ask for confirmation in Step 3 (Gap Q&A).

### Security Baselines (inferred from feature type)

```yaml
General (all apps):
  - CORS: restrict to deployment origin(s)
  - Input validation: sanitize all user input server-side (never trust client)
  - Rate limiting: apply per-IP and per-user for auth endpoints
  - CSP: Content-Security-Policy header in production
  - HTTPS: enforced by deployment platform

Auth-required apps (forms, user accounts):
  - Password: min 8 chars, bcrypt hash (cost factor 12)
  - Tokens: JWT with 7d expiry, refresh token rotation
  - Session: httpOnly + secure + sameSite cookies
  - CSRF: token-based protection on state-changing endpoints

Payment apps (Stripe / billing):
  - Webhook signature verification (required, no exceptions)
  - PCI compliance: never store raw card data (use Stripe Elements)

File upload apps:
  - File type validation (whitelist, not extension-based)
  - File size limit (configurable per upload endpoint)
  - Virus scan or CDN-level sanitization
  - No direct file path exposure in API responses
```

**Note:** Security baselines are **templates**. The actual config is applied
at Steps 6-7 (code generation and deployment). SPEC.md documents the
requirements; the implementation happens later.

### Skill Recommendation Check

After security and a11y baselines are documented, check for complementary
skills. See the **Skill Interoperability** section in SKILL.md for the full
protocol.

**Quick check:**

```bash
ls .trae/skills/ 2>/dev/null || ls .traecli/skills/ 2>/dev/null
```

| Skill | For | Install Command |
|-------|-----|-----------------|
| `trailofbits-security` | 30+ security audit rules (CodeQL/Semgrep, OWASP Top 10) | `git clone https://github.com/trailofbits/skills ~/.agents/skills/trailofbits-security` |
| `code-reviewer` (Google) | Code quality review across all dimensions | `npx skills add google-gemini/gemini-cli --skill code-reviewer` |
| `web-design-guidelines` (Vercel) | Design + accessibility audit for generated UI | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines` |

For each uninstalled skill, use AskUserQuestion:
```json
{ "header": "Install", "question": "Install {skill-name}? {description}", "options": [
  { "label": "Install", "description": "{install-command}" },
  { "label": "Skip", "description": "Don't install this skill" }
]}
```

## After Completion

Use AskUserQuestion to confirm the SPEC.md output:

```json
{ "header": "Confirm", "question": "SPEC.md is ready. Review and confirm?", "options": [
  { "label": "Confirm & Continue", "description": "Proceed to Step 5 — Assets, Plan & Playbook" },
  { "label": "Modify", "description": "I want to adjust the spec" },
  { "label": "Cancel", "description": "Abort D2C" }
]}
```

On confirm, update `.d2c/STATE.md` to mark Step 4 complete. Then update the
todo list: mark Step 4 complete, set Step 5 to in_progress. Read
`guides/STEP_5_INIT.md` and proceed to Step 5.
