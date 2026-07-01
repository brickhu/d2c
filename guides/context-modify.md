# Context Modification (CUSTOMIZE)

**Trigger:** `/d2c <any natural language statement>` when `.d2c/STATE.md` exists
**Input:** User's natural language change request
**Output:** Modified context files (SPEC.md / DESIGN.md / AGENTS.md / README.md)

## When This Mode Activates

The smart entry flow routes to this mode when ALL of these are true:

1. The input is NOT a known command (`code` / `test` / `deploy` / `init` / `update` / `sync`)
2. The input does NOT look like a design URL, file path, or screenshot
3. `.d2c/STATE.md` exists (project has been initialized with D2C)

If `.d2c/STATE.md` does NOT exist and the input is unrecognizable, ask the user
whether they want to start a new project (`/d2c init`) or provide a design file.

## Workflow

```
User: /d2c all API responses should use snake_case
       │
       ▼
  1. Intent Analysis
     └─ "The user wants to change API response naming convention"
       └─ Relevant files: .d2c/SPEC.md (§4b3 API Contracts), .d2c/AGENTS_bak.md (§Constraints)
       └─ Impact scope: backend code generation, API contract documentation
       └─ Derivation from existing context: SPEC already defines camelCase implicitly
       │
       ▼
  2. AI Proposes Change
     └─ "I understand you want snake_case for API responses.
         Here's what needs to change:
         
         📄 .d2c/SPEC.md §4b3 (API Contracts)
           All response key examples: camelCase → snake_case
           POST /api/auth/login response:  { token, user } → { token, user }
           → Rewrite response schema examples
         
         📄 .d2c/AGENTS_bak.md (§Constraints)
           Add: [C-01] All API responses use snake_case keys — User request
         
         📄 .d2c/SPEC.md §4c (Coding Constraints)
           Add: Backend: JSON response keys in snake_case
         
         Shall I apply these changes?"
       │
       ▼
  3. User Confirms (or provides feedback)
       │
       ▼
  4. Execute Changes
     └─ Read affected files
     └─ Apply modifications
     └─ Update version markers if applicable
     └─ Confirm completion with a summary
```

## Intent-to-File Mapping

The Agent must determine which context file(s) to modify based on the statement.
Use this guide for routing:

| User says... | Likely target file(s) |
|-------------|----------------------|
| "Add/change API naming" | `SPEC.md` §4b3 (API Contracts) + `AGENTS.md` |
| "Add security rule" | `SPEC.md` §4g (Security Baselines) + `AGENTS.md` |
| "Don't touch X directory" | `AGENTS.md` (Constraints) |
| "Add external service" | `AGENTS.md` + `README.md` (External Services) |
| "Change env var" | `README.md` (Prerequisites) + `.env.example` |
| "Add a11y rule" | `SPEC.md` §4g (Accessibility) |
| "Change DB/ORM" | `SPEC.md` §4b5 (DB Schema) + `AGENTS.md` |
| "Add state pattern" | `SPEC.md` §4b4 (State Patterns) |
| "Change token value" | `.d2c/DESIGN.md` (regenerate derived files if needed) |
| "Add testing rule" | `SPEC.md` §4e (Testing Strategy) + `README.md` |
| "Reference external doc" | `AGENTS.md` (lift to root for visibility) |
| "General constraint" | `AGENTS.md` + cross-reference to affected file |

**When uncertain:** Propose the file(s) you think are relevant and explain why.

## Change Rules

### File Coverage Scope

Always consider ALL affected files — a single user request may touch multiple
context documents:

```
User: /d2c use Sentry for error tracking
       │
       ├── AGENTS.md       → Add to Tech Stack: Error tracking: Sentry
       ├── AGENTS.md       → Add to Key Decisions: Sentry as error monitor
       ├── SPEC.md §4f     → Update error handler: "Log to Sentry"
       └── README.md     → Add: Prerequisites: Sentry DSN
```

### Modification Guidelines

1. **Preserve structure.** Never remove existing sections. Add content within
   the existing structure, or append new sections at the end of the relevant
   file using a clear heading hierarchy.

2. **Minimal diff.** Change only what the user's statement directly implies.
   Do not restructure or reformat the file beyond the change scope.

3. **Document provenance.** Every change must be traceable:
   - Add `— User request — {timestamp}` annotation
   - Example in AGENTS.md: `[C-04] All responses use snake_case — User request — 2026-06-30`
   - Example in SPEC.md: `# Added via /d2c modification: 2026-06-30`

4. **AI-propose, user-confirm.** Before writing anything, show the proposed
   changes as a diff summary and ask for confirmation.

5. **No silent overwrites.** If the modification conflicts with existing content,
   flag the conflict and ask for resolution before proceeding.

6. **Cross-reference.** When a change spans multiple files, update all of them
   and note the cross-file impact in your confirmation summary.

### Version Tracking

If the file already has version markers (e.g., `## Increment: Design v{number}`),
append the change as `## Increment: Context v{number+1}` at the document end,
noting the user's statement as the trigger:

```markdown
## Increment: Context v2
- **Trigger:** User request — "all API responses use snake_case"
- **Date:** 2026-06-30
- **Changes:** SPEC.md §4b3 response schema examples rewritten;
  AGENTS.md §Constraints added rule [C-01]
```

## Handling Different Statement Types

### Constraint Addition ("don't touch X", "use Y convention")

Best suited for AGENTS.md §Constraints. Keep the statement visible in the
constraint list so Code Agents can reference it directly.

```
[C-05] Do not modify files under src/lib/ — User request — 2026-06-30
```

### Content Amendment ("add Stripe webhook endpoint", "User model needs phone field")

Best suited for SPEC.md. Update the relevant subsection. If the amended content
conflicts with existing AI-derived content (e.g., user says "use integer IDs"
but SPEC auto-derived UUIDs), flag the conflict and ask.

### Doc Reference ("refer to our internal API style guide at notion.so/...")

Best suited for AGENTS.md. Add a reference at the bottom under a
`## External References` section so Code Agents automatically load it.

```markdown
## External References
- [API Style Guide](https://notion.so/...) — internal API conventions — User added
```

### Tech Stack Change ("use Redis for caching", "switch to tRPC")

Best suited for AGENTS.md + SPEC.md. Update the tech stack entry AND modify
the relevant SPEC section (e.g., adding a caching layer to service architecture).
Flag any downstream dependencies (e.g., "switching to tRPC means removing REST
endpoints").

## Consistency Check

After applying changes, verify:

1. **Cross-file references still valid** — e.g., if AGENTS.md now says "API:
   tRPC", does SPEC.md still reference REST?
2. **No orphan sections** — if a section was removed, are all references to it
   updated?
3. **README.md aligned** — if SPEC testing strategy changed, does README
   testing section match?
4. **Token source intact** — DESIGN.md was not
   accidentally modified (these are token-only files)

## After Completion

Update `.d2c/STATE.md` with a note of the modification (not a full step
transition, just a trace entry). Ask the user if they have more changes, or
if they'd like to proceed with `/d2c code` / `test` / `deploy`.