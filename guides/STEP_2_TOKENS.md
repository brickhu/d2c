# Step 2 — Extract Design Tokens (TOKENS)

**Input:** Design details + confirmed diagnostic report
**Output:** `.d2c/DESIGN.md` (tokens + constraints) + `styles/tokens.css` + `styles/tokens.ts`

## 2a. Extract Tokens from Design Data

Read the `styles`, `nodes`, and `assets` from the design data JSON (fetched in
Step 1d). Extract the following specifications:

| Category | Source in design data | What to extract |
|----------|----------------------|----------------|
| **Color system** | `styles.colors` + node fills | Primary, secondary, neutral, semantic (success/warning/error/info), background, surface, border |
| **Typography** | `styles.typography` + text node styles | Font sizes in use, weights (Regular/Medium/Semibold/Bold), line heights, letter spacing, font family |
| **Spacing & sizing** | Node bounding boxes + Auto Layout gaps | Gap values (4/8/12/16/24/32px...), max content width, grid columns/gutter, margin/padding patterns |
| **Radius & shadows** | `styles.radius` + `styles.shadows` + node cornerRadius | Button/card/input corner radii, elevation/shadow levels |
| **Icon & image style** | `assets` + node fills | Icon style (line/fill), stroke width, image aspect ratios |
| **Animation spec** | Node effects + prototype data (from MCP) | Duration, easing functions, animation types (if present) |
| **Design constraints** | Component variants/sets, Auto Layout properties, prototype interactions, node constraints (resize mode), component boolean properties | Interaction states (hover/active/disabled), responsive behavior (hug/fill/fixed), component size variants, layout alignment, show/hide conditions, navigation patterns, empty/error/loading states, content limits (max lines, truncation) |

Cross-reference with the design source JSON's `nodes` to verify values are
actually used in the design (not just available in the library).

## 2b. Generate DESIGN.md (Documentation)

Include the source design URL at the top for post-D2C traceability:

```markdown
# Design System — {Project Name}

> Auto-extracted from Figma design
> Design URL: https://www.figma.com/design/{file_key}/{slug}
> Extracted at: {timestamp}
```

Organize tokens by category with CSS custom property format:

```css
/* Brand colors */
--color-primary: #...;
--color-primary-hover: #...;
--color-secondary: #...;

/* Neutral palette */
--color-neutral-900: #...;
--color-neutral-700: #...;
--color-neutral-100: #...;

/* Semantic colors */
--color-success: #...;
--color-error: #...;
--color-warning: #...;
--color-info: #...;
```

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
| Card | default / hover | Hover: shadow-md, translateY(-2) | — |

### Responsive & Layout
| Rule | Behavior | Source |
|------|----------|--------|
| Sidebar width | Fixed 240px desktop, collapsible to icon-only on tablet | Auto Layout: fixed width |
| Content area | Fill remaining width, max-width 1200px centered | Parent constraints: fill |
| Card grid | 4 cols desktop → 2 cols tablet → 1 col mobile | Auto Layout wrap |
| Button sizing | min-height 40px, text + 16px horizontal padding | Auto Layout: hug content |
| Form width | Full-width on mobile, max 480px centered on desktop | Constraints: fill parent |

### Interaction Patterns
| Trigger | Effect | Duration / Easing |
|---------|--------|-------------------|
| Hover card | Elevate shadow + slight translateY | 0.2s ease-out |
| Click button | Scale down momentarily | 0.1s ease-in |
| Page transition | Fade in content | 0.3s ease |
| Form submit | Show loading spinner in button, disable input | Per component |

### Content Rules
| Rule | Applies To | Details |
|------|-----------|---------|
| Text truncation | Card titles, table cells | Single line, ellipsis overflow |
| Max lines | Article previews | 3 lines, then "Read more" |
| Empty state | Tables, lists, search results | Illustration + message + CTA button |
| Error state | Forms, data fetching | Inline error message + retry action |
| Image aspect ratio | Cards, hero sections | 16:9 for cards, 21:9 for hero |
| Icon sizing | Navigation, buttons, cards | 24x24 for nav, 16x16 inline, 20x20 in buttons |

### Accessibility Constraints
| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Touch target | 44x44 px | Buttons, icon-only controls |
| Color contrast | 4.5:1 normal text, 3:1 large text | Verify primary on white |
| Focus indicator | 2px outline + 2px offset | Visible on all interactive elements |
```

Extract each constraint from concrete design evidence:
- **Component States**: Detect using Figma component variants (default variant,
  hover variant, disabled variant, etc.) and prototype interaction triggers.
- **Responsive & Layout**: Read Auto Layout properties (padding, item spacing,
  resizing mode: Hug / Fill / Fixed), node constraints, and breakpoint variants.
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

## 2c. Generate Runtime Token Files (SINGLE SOURCE OF TRUTH)

This is the critical step that makes tokens enforceable. Token values from
DESIGN.md **MUST** be materialized as real code files that the build system
and components can import/reference. Without this, no constraint in later
steps can enforce token usage.

### File 1 — `styles/tokens.css`

Write CSS custom properties in a dedicated token file. Detect the existing
project structure:
- If `src/` directory exists → `src/styles/tokens.css`
- If no `src/` → `styles/tokens.css`
- If the project has an existing CSS entry point (e.g., `app/globals.css`,
  `src/index.css`), add an `@import` of tokens.css there

```css
/* ══════════════════════════════════════════
   D2C Design Tokens — Auto-generated from design
   File: styles/tokens.css
   ══════════════════════════════════════════ */

:root {
  /* Brand colors */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-primary-light: #e0e7ff;
  --color-secondary: #ec4899;
  --color-secondary-hover: #db2777;

  /* Neutral palette */
  --color-neutral-900: #0f172a;
  --color-neutral-700: #334155;
  --color-neutral-500: #64748b;
  --color-neutral-300: #cbd5e1;
  --color-neutral-100: #f1f5f9;
  --color-white: #ffffff;

  /* Semantic colors */
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  /* Typography */
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

**Naming convention:** Use `--{category}-{modifier}` kebab-case, matching
actual CSS custom property standards. Each variable name should be intuitive
enough to use in code without cross-referencing the design spec.

### File 2 — `styles/tokens.ts`

Generate a TypeScript/JavaScript token export for environments that need
programmatic access (styled-components, theme objects, inline styles):

```ts
/**
 * D2C Design Tokens — Auto-generated from design
 * File: styles/tokens.ts
 */
export const colors = {
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primaryLight: '#e0e7ff',
  secondary: '#ec4899',
  secondaryHover: '#db2777',
  neutral900: '#0f172a',
  neutral700: '#334155',
  neutral500: '#64748b',
  neutral300: '#cbd5e1',
  neutral100: '#f1f5f9',
  white: '#ffffff',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export const typography = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem' },
  fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
} as const;

export const spacing = { 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 6: '1.5rem', 8: '2rem', 12: '3rem', 16: '4rem' } as const;

export const radius = { sm: '0.25rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', full: '9999px' } as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
} as const;
```

### Framework-Specific Integration (when applicable)

If the project uses Tailwind CSS (detected in Step 1b survey), also generate a
`tailwind.config.ts` extension block. This is done in Step 5 (after scaffolding
for new projects), but the token values from this step are the source:

```
tailwind.config.ts → theme.extend.colors / fontSize / spacing / borderRadius / boxShadow
```

Mark `styles/tokens.css` and `styles/tokens.ts` as READ-ONLY for the rest of
the pipeline — never modify them after Step 2. If a design iteration (Update
mode) changes tokens, re-generate the token files entirely and diff the
changes.

## Update Mode

When in Update mode, generate `DESIGN.diff.md` first listing
added/modified/deleted tokens. Merge into DESIGN.md and regenerate token
files only after user confirmation. Preserve old values as comments in
tokens.css.

## After Completion

Update `.d2c/STATE.md` to mark Step 2 complete, then read
`guides/STEP_3_ARCHITECTURE.md` and proceed to **Step 3**.