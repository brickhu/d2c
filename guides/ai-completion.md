# AI Completion — Filling Design Gaps

Design files naturally miss information that a full project needs. D2C uses an
**AI-propose, user-confirm** pattern to fill these gaps:

## What Design Covers vs. What Needs Completion

| Covered by design | Needs AI Completion + User Confirmation |
|------------------|----------------------------------------|
| Colors, spacing, typography, radius | Environment variables (API keys, service URLs) |
| Component layout and states | Backend services (auth provider, database) |
| Form fields, table columns, detail views | **API contract schemas** (request/response body, status codes) |
| Data entities (users, orders, products) | **Database schema** (field types, constraints, indexes, migrations) |
| Loading spinners, empty illustrations, error toasts | **Component state patterns** (loading/empty/error for each dynamic component) |
| Page structure and navigation | Testing framework (Vitest / Jest / Playwright) |
| Visual interactions and animations | CI/CD pipeline choices |
| Icon and image assets | Error monitoring and logging |
| Breakpoint indications | Data fetching strategy (REST / GraphQL / tRPC) |
| Modal/nav/dropdown UI patterns | **Accessibility rules** (focus trap, aria-current, aria-expanded) |
| Auth forms, file upload, payment pages | **Security baselines** (CORS, CSP, bcrypt, CSRF) |
| Content structure | State management library |

## How AI Completion Works

At each step where design data is insufficient, the Agent:

1. **Detects the gap** — "The design shows a login form but provides no API
   endpoint structure. The form implies username+password auth."
2. **Proposes a default** — "Based on your Next.js stack, I recommend
   NextAuth.js for authentication with credentials provider. This aligns with
   server-side rendering and gives you session management out of the box."
3. **Offers alternatives** — "Alternatives: Clerk (managed, faster setup) or
   Lucia (lightweight, unopinionated)."
4. **Asks for confirmation** — "Shall I proceed with NextAuth.js? Or prefer one
   of the alternatives?"

The user can accept the recommendation, choose an alternative, or provide their
own answer. All confirmed decisions are recorded in the generated context files
for traceability.

This pattern applies to decisions surfaced in Step 4 (Architecture Q&A), Step 5
(Testing strategy in SPEC), and the post-5-step (Execution plan in README).