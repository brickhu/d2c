# Step 2 — Extract Design Tokens (TOKENS)

**Input:** Design details + confirmed diagnostic report
**Output:** `.d2c/DESIGN.md` (design tokens + constraints, documentation only)

> **Important:** Phase 1 produces documentation only — no code files. All token values are recorded in DESIGN.md. Code files (CSS/TS token exports) are created in Step 6 (Code Generation), if applicable to the target framework.

## 2a. Extract Tokens from Design Data

Read the `styles`, `nodes`, and `assets` from the design data JSON (fetched in
Step 1d). Extract the following specifications:

| Category | Source in design data | What to extract |
|----------|----------------------|----------------|
| **Color system** | `styles.colors` + node fills | Primary, secondary, neutral, semantic (success/warning/error/info), background, surface, border |
| **Typography** | `styles.typography` + text node styles | Font sizes in use, weights (Regular/Medium/Semibold/Bold), line heights, letter spacing, font family |
| **Spacing & sizing** | Node bounding boxes + Auto Layout gaps | Gap values (4/8/12/16/24/32px...), max content width, grid columns/gutter, margin/padding patterns |
| **Breakpoints** | Frame widths, design variants | Desktop/tablet/mobile viewport sizes, target breakpoint values (e.g., 640px / 768px / 1024px / 1280px) |
| **Radius & shadows** | `styles.radius` + `styles.shadows` + node cornerRadius | Button/card/input corner radii, elevation/shadow levels |
| **Icon & image style** | `assets` + node fills | Icon style (line/fill), stroke width, image aspect ratios |
| **Animation spec** | Node effects + prototype data (from MCP) | Duration, easing functions, animation types (if present) |
| **Design constraints** | Component variants/sets, Auto Layout properties, prototype interactions, node constraints (resize mode), component boolean properties | Interaction states (hover/active/disabled), responsive behavior (hug/fill/fixed), component size variants, layout alignment, show/hide conditions, navigation patterns, empty/error/loading states, content limits (max lines, truncation) |

Cross-reference with the design source JSON's `nodes` to verify values are
actually used in the design (not just available in the library).

## 2b. Generate DESIGN.md (Documentation — Single Source of Truth)

Include the source design URL at the top for post-D2C traceability:

```markdown
# Design System — {Project Name}

> Auto-extracted from Figma design
> Design URL: https://www.figma.com/design/{file_key}/{slug}
> Extracted at: {timestamp}
> Design type: Web Application / iOS / Android / Desktop
```

### Token Values Section

Organize all extracted tokens by category. Use CSS custom property naming
convention for clarity — these names will be used in code during Phase 2:

```markdown
## Color System

| Token Name | Value | Usage |
|-----------|-------|-------|
| `--color-primary` | `#6366f1` | Primary brand, CTA backgrounds |
| `--color-primary-hover` | `#4f46e5` | Primary hover state |
| `--color-primary-light` | `#e0e7ff` | Light primary for backgrounds, badges |
| `--color-secondary` | `#ec4899` | Accent/secondary brand |
| `--color-neutral-900` | `#0f172a` | Heading text |
| `--color-neutral-700` | `#334155` | Body text |
| `--color-neutral-100` | `#f1f5f9` | Page background |
| `--color-success` | `#22c55e` | Success state |
| `--color-error` | `#ef4444` | Error state |

## Typography

| Token Name | Value | Usage |
|-----------|-------|-------|
| `--font-family-sans` | `'Inter', system-ui, sans-serif` | All UI text |
| `--font-size-xs` | `0.75rem` / 12px | Captions, tags |
| `--font-size-sm` | `0.875rem` / 14px | Labels, secondary text |
| `--font-size-base` | `1rem` / 16px | Body text |
| `--font-size-2xl` | `1.5rem` / 24px | Section headings |
| ... | | |
```

> **Web projects:** include responsive breakpoints as viewport tokens:
> `--breakpoint-sm: 640px`, `--breakpoint-md: 768px`, `--breakpoint-lg: 1024px`, `--breakpoint-xl: 1280px`

### Design Constraints Section

Append a dedicated `## Design Constraints` section to DESIGN.md. This section
captures behavioral and structural rules extracted from the design that cannot
be expressed as typed values:

```markdown
## Design Constraints

> Behavioral rules extracted from component variants, auto layout, and prototype data.

### Component States
| Component | States | Visual Indicator | Notes |
|-----------|--------|-----------------|-------|
| Button | default / hover / active / disabled | Hover: bg primary-hover. Active: scale(0.97). Disabled: opacity 0.5 | No loading state in design |
| Input | default / focused / error / disabled | Focus: ring color-primary. Error: border color-error + error message below | Helper text always visible |

### Responsive & Layout
| Rule | Desktop | Tablet | Mobile | Source |
|------|---------|--------|--------|--------|
| Sidebar width | Fixed 240px | Collapsible icon-only | Bottom nav | Auto Layout: fixed width |
| Content area | Fill, max 1200px centered | Fill, max 1200px centered | Full-width | Constraints: fill |
| Card grid | 4 cols | 2 cols | 1 col | Auto Layout wrap |
| Breakpoint | ≥ 1024px | 768–1023px | < 768px | Frame width variants |

### Interaction Patterns
| Trigger | Effect | Duration / Easing |
|---------|--------|-------------------|
| Hover card | Elevate shadow + slight translateY | 0.2s ease-out |
| Page transition | Fade in content | 0.3s ease |

### Content Rules
| Rule | Applies To | Details |
|------|-----------|---------|
| Text truncation | Card titles, table cells | Single line, ellipsis overflow |
| Empty state | Tables, lists | Illustration + message + CTA button |
| Error state | Forms, data fetching | Inline error message + retry action |

### Accessibility Constraints
| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Touch target | 44x44 px | Buttons, icon-only controls |
| Color contrast | 4.5:1 normal text, 3:1 large text | Verify primary on white |
```

Extract each constraint from concrete design evidence:
- **Component States**: Detect using Figma component variants (default variant,
  hover variant, disabled variant, etc.) and prototype interaction triggers.
- **Responsive & Layout**: Read Auto Layout properties (padding, item spacing,
  resizing mode: Hug / Fill / Fixed), node constraints, and breakpoint variants.
  For web projects, derive breakpoints from frame width variants.
- **Interaction Patterns**: Read prototype connections (onClick → navigate,
  whileHover → change property), animation duration/easing.
- **Content Rules**: Inferred from node text overflow settings, component
  structure (empty state = separate variant with illustration), image
  fill/contain properties.
- **Accessibility Constraints**: Derived from touch target sizes in design,
  inferred from component spacing. Flag any that can't be extracted from data.

If specific constraint data is unavailable in the design source (e.g., no
prototype data in static screenshots), flag with `[Pending: verify with
designer]` rather than leaving it blank.

### Web-Specific: Responsive Design Documentation

For **web application / website** designs, include a dedicated responsive
design section in DESIGN.md:

```markdown
## Responsive Design

> Derived from frame width variants and Auto Layout constraints in the design.

### Breakpoints
| Name | Value | Target Devices |
|------|-------|---------------|
| sm | 640px | Small phones |
| md | 768px | Tablets (portrait) |
| lg | 1024px | Tablets (landscape), small laptops |
| xl | 1280px | Desktops |

### Layout Strategy
- **Grid system:** {cols at each breakpoint, gutter width}
- **Content max-width:** {value} centered
- **Navigation:** {desktop sidebar → mobile bottom nav / hamburger}
- **Typography scale:** {fluid or stepped at breakpoints}
```

## Update Mode

When in Update mode, generate `DESIGN.diff.md` first listing
added/modified/deleted tokens. Merge into DESIGN.md only after user
confirmation. Preserve old values for reference.

## After Completion

Use AskUserQuestion to confirm the DESIGN.md output:

```json
{ "header": "Confirm", "question": "DESIGN.md is ready. Review and confirm?", "options": [
  { "label": "Confirm & Continue", "description": "Proceed to Step 3 — Architecture Alignment" },
  { "label": "Modify", "description": "I want to adjust some token values" },
  { "label": "Cancel", "description": "Abort D2C" }
]}
```

If user chooses "Modify", ask what they want to change and update DESIGN.md.
On confirm, update `.d2c/STATE.md` to mark Step 2 complete. Then update the
todo list: mark Step 2 complete, set Step 3 to in_progress. Read
`guides/STEP_3_ARCHITECTURE.md` and proceed to Step 3.