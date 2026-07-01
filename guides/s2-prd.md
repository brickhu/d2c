# Step 2 — Business Requirements & Workflow (PRD)

**Input:** OVERVIEW.md + design data
**Output:** `.d2c/PRD.md` — business goals, user flows, feature scope, page structure
**Decision:** AskUserQuestion confirmation before Step 3

## 2a. Extract Business Goals

From the design (and OVERVIEW.md), infer the business goals:

| Goal | Inferred from | Example |
|------|--------------|---------|
| User Acquisition | Landing pages, signup flows, onboarding | "Convert visitors to registered users" |
| Engagement | Feed, notifications, social features | "Increase daily active usage" |
| Revenue | Checkout, pricing, subscription | "Drive product purchases" |
| Retention | Settings, history, profile | "Keep users returning" |
| Efficiency | Admin panels, dashboards, automation | "Reduce manual work for operators" |

Use AskUserQuestion if the business goals are unclear:
```json
{ "header": "Goals", "question": "What is the primary business goal of this app?", "options": [
  { "label": "User Acquisition", "description": "Signups, onboarding, growth" },
  { "label": "Revenue", "description": "Checkout, payments, subscriptions" },
  { "label": "Engagement", "description": "Content, social, interactions" },
  { "label": "Efficiency", "description": "Admin, automation, dashboards" }
]}
```

## 2b. Map Feature Scope

From the design pages and components, derive the feature list:

| Feature | Pages | Priority | Evidence |
|---------|-------|----------|----------|
| Auth | Login, Register, Forgot Password | Must Have | Dedicated auth pages in design |
| Dashboard | Home, Analytics | Must Have | Main screen with charts |
| Search | Search page + nav bar | Could Have | Search icon in nav, but no dedicated page |

For each inferred feature, note the evidence from the design. Mark features as:
- **Must Have** — explicit pages in design, core flow
- **Should Have** — implied by design elements, partial pages
- **Could Have** — only hinted at (e.g., icon in nav but no page)
- **Won't Have** (this version) — explicitly excluded

## 2c. Map User Flows

From the page structure and navigation, derive key user flows:

```
Flow 1: User Registration
  Landing Page → Sign Up → Verify Email → Onboarding → Dashboard

Flow 2: Core Usage
  Login → Dashboard → Browse Items → View Detail → Add to Cart → Checkout

Flow 3: Account Management
  Dashboard → Settings → Edit Profile → Save
```

If prototype interactions are available (from MCP data), enrich with actual
transition triggers. Otherwise, infer from navigation patterns.

## 2d. Map Page Structure

List all pages in the design with their layout overview:

| Page | Layout | Key Components | Notes |
|------|--------|---------------|-------|
| Landing | Hero + Features + CTA | Hero image, headline, CTA button | Single scroll |
| Dashboard | Sidebar + Content | Charts, cards, table | Responsive grid |
| Settings | Form layout | Text inputs, toggles, save button | Tabs or sections |

## 2e. Define Success Criteria

Derive measurable success criteria from the business goals:

| Goal | Success Metric | Target |
|------|---------------|--------|
| User Acquisition | Signup conversion rate | > 5% of visitors |
| Engagement | DAU/MAU ratio | > 40% |
| Revenue | Average order value | > $50 |

If no metrics are inferable from the design, leave as placeholders for user
to fill in.

## 2f. Write PRD.md

Format template:

```markdown
# {Project Name} — Product Requirements & Business Flow

> Auto-extracted by D2C
> Design URL: {full url}
> Generated at: {timestamp}

## Business Goals

| Goal | Description | Success Metric |
|------|------------|----------------|
| {goal 1} | {description} | {metric} |

## Feature Scope

### Must Have
| Feature | Pages | Description |
|---------|-------|-------------|
| {feature} | {pages} | {description} |

### Should Have
| Feature | Pages | Description |
|---------|-------|-------------|

### Could Have
| Feature | Pages | Description |
|---------|-------|-------------|

## User Flows

```
Flow 1: {flow name}
  {page 1} → {page 2} → {page 3}
```

## Page Structure

| Page | Layout | Key Components | Notes |
|------|--------|---------------|-------|

## Success Criteria

| Goal | Metric | Target |
|------|--------|--------|
```

## 2g. Confirm with User

Use AskUserQuestion:

```json
{ "header": "Confirm", "question": "PRD.md is ready. Review and confirm?", "options": [
  { "label": "Confirm & Continue", "description": "Proceed to Step 3 — Design System & Tokens" },
  { "label": "Modify", "description": "I want to adjust business requirements" },
  { "label": "Cancel", "description": "Abort D2C" }
]}
```

## After Completion

On confirm:
1. Write `.d2c/PRD.md`
2. Update `.d2c/STATE.md`: current step = 2, completed = true
3. Update todo list: mark Step 2 complete, set Step 3 to in_progress
4. Read `guides/s3-design.md` and proceed to Step 3