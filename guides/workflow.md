# Todo-Driven Workflow (MANDATORY)

D2C uses TodoWrite to display progress as a structured task list. After every
step, the Agent updates the todo list — this is **mandatory** so the user can
see where they are at a glance.

**When to update todos:**
- **Step started** → Set status to `in_progress`
- **Step completed** → Set status to `completed`, include summary of what was done
- **New sub-tasks discovered** → Add them (e.g., MCP setup, skill recommendations)

**Standard todo list for a fresh D2C run:**

```json
[
  { "id": "1", "content": "Step 1: Project Overview → OVERVIEW.md", "status": "in_progress", "priority": "high" },
  { "id": "2", "content": "Step 2: Business Requirements → PRD.md", "status": "pending", "priority": "high" },
  { "id": "3", "content": "Step 3: Design System → DESIGN.md", "status": "pending", "priority": "high" },
  { "id": "4", "content": "Step 4: Architecture → ARC.md", "status": "pending", "priority": "high" },
  { "id": "5", "content": "Step 5: Development Spec → SPEC.md", "status": "pending", "priority": "high" },
  { "id": "6", "content": "Generate AGENTS.md + PLAN.md + README.md", "status": "pending", "priority": "medium" }
]
```

**Dynamically inserted sub-tasks** (when a trigger is hit):

| Trigger | Inserted Todo |
|---------|--------------|
| MCP not configured | `"Configure Figma MCP (auto-setup)"` |
| Website URL input | `"Crawl website → crawled.json"` |
| Skill recommendation | `"Install {skill-name} (optional)"` |
| Conflict detected | `"Resolve design vs. project conflict"` |

**Completion summary:** When all Phase 1 tasks are done, use the summary field
to list what was generated. Then ask the user if they want to proceed to Phase 2
(code generation) — use AskUserQuestion, not free text.