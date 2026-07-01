# Website Input — Crawling a Live Website

**Input:** A website URL
**Output:** Crawled design tokens + DOM structure + screenshots (JSON, feeds into Step 2)

When the user provides a website URL instead of a design file, D2C crawls the
live website to extract the same design tokens and component structure that
would normally come from a Figma file.

## Workflow

```
User: /d2c https://example.com
  │
  ▼
Step 1: Detection
  ├─ d2c-status.js detects: website URL (not a design file)
  ├─ Agent confirms: "This is a website URL. I'll crawl it to extract
  │   design tokens and component structure. Continue?"
  └─ On confirm → proceed to crawl
  │
  ▼
Crawl: scripts/d2c-crawl.js
  ├─ Launch headless Chromium
  ├─ Navigate to URL
  ├─ Extract: colors, typography, spacing, shadows, radius
  ├─ Extract: DOM tree (component hierarchy)
  ├─ Extract: images, SVGs, fonts
  ├─ Screenshots: Desktop (1280×900), Tablet (768×1024), Mobile (375×812)
  └─ Output: crawled.json
  │
  ▼
Step 2: DESIGN.md
  └─ Feed crawled.json into Step 2 token extraction guide
     (same as design file output)
  │
  ▼
Steps 3-5: Normal flow
  └─ AGENTS.md → SPEC.md → PLAN.md → PLAYBOOK.md
```

## Prerequisites

The crawl script requires Playwright. The Agent checks and installs it if needed:

```bash
cd <skill-dir>/scripts
npm install
npx playwright install chromium
```

If the install fails (e.g., no network), the Agent falls back to MCP browser
tools (`integrated_browser`) for manual crawling.

## What the Crawler Extracts

| Category | What | How |
|----------|------|-----|
| **Colors** | Top 20 text colors, top 20 background colors | `getComputedStyle()` on all elements, sorted by frequency |
| **Typography** | Font families, font sizes, font weights, line heights | `getComputedStyle()` on h1-h6, p, span, a, button, input |
| **Spacing** | Gap values, padding, margin from flex/grid layouts | `getComputedStyle()` on elements with gap/padding/margin |
| **Radius** | Border-radius values in use | `getComputedStyle()` across all elements |
| **Shadows** | Box-shadow values in use | `getComputedStyle()` across all elements |
| **DOM Structure** | Hierarchical component tree (max depth 8, max 30 children per node) | `document.body` recursive traversal |
| **Assets** | Images (src, alt, dimensions), SVGs, background images | `querySelectorAll('img[src]')`, `querySelectorAll('svg')` |
| **Screenshots** | Desktop / Tablet / Mobile viewport captures | `page.screenshot()` at 3 viewport sizes |
| **Breakpoints** | CSS media query breakpoints | Scanning `document.styleSheets` for `min-width`/`max-width` |

## Output Format

The crawler outputs JSON matching the D2C fetch format, so Step 2 can consume
it the same way as design file data:

```json
{
  "source": "https://example.com",
  "sourceType": "website",
  "project": { "name": "Page Title", "url": "...", "pages": [...] },
  "tokens": {
    "colors": { "text": [...], "background": [...] },
    "typography": { "fonts": [...], "fontSizes": [...], "fontWeights": [...], "lineHeights": [...] },
    "spacing": [...],
    "radius": [...],
    "shadows": [...]
  },
  "dom": { "tag": "body", "children": [...] },
  "assets": { "images": [...], "svgs": [...], "fonts": [...] },
  "screenshots": {
    "desktop": { "viewport": { "width": 1280, "height": 900 }, "label": "Desktop (1280×900)" },
    "tablet": { "viewport": { "width": 768, "height": 1024 }, "label": "Tablet (768×1024)" },
    "mobile": { "viewport": { "width": 375, "height": 812 }, "label": "Mobile (375×812)" }
  },
  "responsive": { "breakpoints": [...], "viewports": {...} },
  "meta": { "crawledAt": "...", "tool": "d2c-crawl v1.0" }
}
```

## Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| JavaScript-heavy SPAs | May miss dynamically rendered content | Crawler waits for `networkidle` + 2s extra delay |
| Cross-origin CSS | `@media` queries in external stylesheets are inaccessible | Detected breakpoints from inline/media queries only |
| Authenticated pages | Behind login walls cannot be crawled | User must provide a public URL or screenshot |
| Infinite scroll | Only above-the-fold content captured | Captures initial viewport; user can specify `#section` hash |
| Shadow DOM | Web component internals not extracted | Records top-level component, notes shadow DOM usage |

## Fallback: MCP Browser Crawling

If Playwright cannot be installed, the Agent uses `integrated_browser` MCP tools
to manually crawl the page:

1. `browser_navigate` → open the URL
2. `browser_snapshot` → get page structure
3. `browser_take_screenshot` → capture at desktop/tablet/mobile
4. `browser_evaluate` → run `getComputedStyle()` extraction scripts
5. Assemble the JSON manually

## Agent Instructions

When the user provides a website URL:

1. **Run `d2c-status.js`** — it will detect the URL is a website, not a design file
2. **Confirm with user** — "I'll crawl this website to extract its design tokens and component structure"
3. **Check Playwright:**
   ```bash
   cd <skill-dir>/scripts && node -e "require('playwright')" 2>/dev/null && echo "OK" || echo "NEED_INSTALL"
   ```
4. **If NEED_INSTALL:** install and try again, or fall back to MCP browser
5. **Run the crawl:**
   ```bash
   node <skill-dir>/scripts/d2c-crawl.js "https://example.com" --output .d2c/crawled.json
   ```
6. **Feed `crawled.json` into Step 3** — follow `guides/STEP_3_DESIGN.md` using the crawled data as input
7. **Proceed normally** through Steps 3-5