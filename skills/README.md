# skills

> Install AI coding skills with one command.
>
> `npx skills add design2context`
>
> `npx skills add https://github.com/brickhu/d2c`

## Usage

```bash
# Install from npm registry
npx skills add design2context

# Install from GitHub
npx skills add https://github.com/brickhu/d2c
```

## How it works

`skills` detects which AI coding tool you're using (TRAE, Claude Code, Cursor)
by scanning project files, then installs the skill to the correct directory.

| Tool | Target directory |
|------|-----------------|
| TRAE IDE | `.trae/skills/<name>/` |
| TRAE CLI | `.traecli/skills/<name>/` |
| Claude Code | Project root (AGENTS.md) |
| Cursor | Project root (.cursorrules) |

## License

MIT