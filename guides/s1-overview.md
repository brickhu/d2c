# Step 1 — Project Overview & Meta (OVERVIEW)

**Input:** Design URL or website URL
**Output:** `.d2c/OVERVIEW.md` — project name, type, purpose, audience, meta
**Decision:** AskUserQuestion confirmation before Step 2

## 1a. Source Type Detection

The design source can be:
- **Figma design file** — Figma URL, .fig export, or screenshot
- **Live website** — URL (already crawled in website-input.md)
- **Sketch file** — .sketch export

Confirm the source type. If unclear, use AskUserQuestion.

## 1b. Extract Core Information

From the design (and multimodal vision for screenshots/websites), extract:

| Section | Content |
|---------|---------|
| **Project Name** | Read from Figma file name, website title, or user input |
| **Application Type** | Web App / iOS App / Android App / Desktop App (ask if ambiguous) |
| **Purpose / Problem Solved** | What does this app do for users? One paragraph |
| **Target Audience** | Who is this app for? (end users, internal, admin, etc.) |
| **Core Value Proposition** | What makes this app different / valuable? |
| **Design Source** | Full URL (Figma / website) |
| **Extracted At** | Timestamp |

## 1c. Resolve Ambiguities with AskUserQuestion

If any of the above is ambiguous from the design, use AskUserQuestion. For example:

```json
{ "header": "Overview", "question": "What is the purpose of this application?", "options": [
  { "label": "Landing page", "description": "Marketing / product introduction" },
  { "label": "Dashboard", "description": "Admin / analytics interface" },
  { "label": "E-commerce", "description": "Product / checkout / payment" }
]}
```

Do NOT proceed until all core fields are clear.

## 1d. Write OVERVIEW.md

Format template:

```markdown
# {Project Name} — Project Overview

> Auto-extracted by D2C from {source type}
> Design URL: {full url}
> Generated at: {timestamp}

## Application Type

{Web App / iOS App / Android App / Desktop App}

## Purpose

{one paragraph: what does this app do, what problem does it solve}

## Target Audience

{who is this app for}

## Core Value Proposition

{what makes this app different / valuable}

## Key Features Inferred

- {feature 1 inferred from design}
- {feature 2 inferred from design}
```

## 1e. Confirm with User

Use AskUserQuestion:

```json
{ "header": "Confirm", "question": "OVERVIEW.md is ready. Review and confirm?", "options": [
  { "label": "Confirm & Continue", "description": "Proceed to Step 2 — PRD & Business Requirements" },
  { "label": "Modify", "description": "I want to change some information" },
  { "label": "Cancel", "description": "Abort D2C" }
]}
```

## After Completion

On confirm:
1. Create `.d2c/` directory if needed
2. Write `.d2c/OVERVIEW.md`
3. Update `.d2c/STATE.md`: current step = 1, completed = true
4. Update todo list: mark Step 1 complete, set Step 2 to in_progress
5. Read `guides/s2-prd.md` and proceed to Step 2