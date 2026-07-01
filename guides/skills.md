# Skill Interoperability

D2C can recommend and invoke complementary AI coding skills during the
workflow. At key decision points, the Agent should check the project's
installed skills and suggest relevant ones to enhance the output.

## How to Discover Installed Skills

The Agent checks the following directories for installed skills:

| Tool | Skill Directory |
|------|----------------|
| TRAE IDE | `.trae/skills/` |
| TRAE CLI | `.traecli/skills/` |
| Claude Code | Look for `.clinerules` or `CLAUDE.md` references |
| Cursor | Look for `.cursorrules` references |

List the directory contents to see which skills are available:

```bash
ls .trae/skills/ 2>/dev/null || ls .traecli/skills/ 2>/dev/null
```

## Recommendation Triggers

At each of these points, pause and check for complementary skills:

| Trigger | When | Recommended Skills | Install Command |
|---------|------|-------------------|-----------------|
| **Step 4 — Architecture** | Tech stack decided (frontend framework chosen) | `frontend-design` (Anthropic) — premium UI quality. `frontend-react-best-practices` — React code quality rules. `web-design-guidelines` (Vercel) — design + a11y audit. `huashu-design` — design generation from text. | `npx skills add anthropics/skills --skill frontend-design` / `npx skills add vercel-labs/agent-skills --skill web-design-guidelines` / `npx skills add alchaincyf/huashu-design` |
| **Step 5 — SPEC** | Security & a11y baselines section | `trailofbits-security` — 30+ security audit skills (CodeQL/Semgrep, OWASP Top 10). `code-reviewer` (Google) — code quality review. | `git clone https://github.com/trailofbits/skills ~/.agents/skills/trailofbits-security` / `npx skills add google-gemini/gemini-cli --skill code-reviewer` |
| **C1 — Code** | Before code generation | `webapp-testing` (Anthropic) — Playwright E2E tests. `finishing-a-development-branch` — pre-merge test gate. `design-taste-frontend` — UI quality audit. | `npx skills add anthropics/skills --skill webapp-testing` / `npx skills add obra/superpowers --skill finishing-a-development-branch` |

## Recommendation Protocol

When a trigger point is reached:

1. **Check installed skills** — list the skill directory
2. **Match against the trigger table** above — identify relevant skills
3. **For each match found (installed):** ask the user if they want to invoke it
   > "I see `webapp-testing` is installed. Would you like to generate E2E tests
   > with it after code generation?"
4. **For each match NOT found:** suggest installation with the exact command
   > "Tip: `frontend-design` (Anthropic) can improve UI quality of generated
   > code. Install it with:
   > `npx skills add anthropics/skills --skill frontend-design`"
5. **Wait for user confirmation** before invoking or proceeding

## General Install Format

```
npx skills add <owner/repo>               # GitHub shorthand
npx skills add <owner/repo> --skill <name> # Multi-skill repo, pick one
npx skills add https://github.com/<owner>/<repo>  # Full URL
```

> **Note:** D2C itself is installed the same way: `npx skills add brickhu/d2c`