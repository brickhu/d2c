# Init Mode — Start Fresh

**Trigger:** `/d2c init [new-design-link]` or selecting "Init" from the Step 1 menu.

Init starts a **fresh 7-step D2C run** in the current directory. It is the
canonical entry point: whether you're starting a brand-new project from an
empty directory, introducing D2C into an existing codebase, or discarding
prior D2C progress to begin again — Init handles all of them.

If no design link is provided and `.d2c/DESIGN.md` exists, Init reuses the
stored URL. If neither exists, prompt the user for a design link or screenshot.

## Execution Flow

### 1. Backup Existing State (if present)

If `.d2c/` exists:

1. Rotate any existing `.d2c.restart.bak/` → `.d2c.restart.bak.old/` (and `.old`
   → `.old.2`, etc., up to 3 rotations).
2. Move the current `.d2c/` → `.d2c.restart.bak/`.
3. Inform the user: "Previous state backed up to `.d2c.restart.bak/`."

**Confirm all filesystem moves with the user** via AskUserQuestion before
executing them.

### 2. Clean Generated Code (if any, confirm with user)

If the project contains D2C-generated code (infer from PLAN.md or from
components not present in source control / not created before `.d2c/` existed):

Present a checklist of what can be cleaned:

| Category | Default |
|----------|---------|
| `.d2c/` state directory | ✅ Clean (already backed up) |
| `PLAN.md` | ✅ Clean |
| Generated components in `components/` or `src/components/` | ⚠️ Ask per directory |
| Downloaded assets in `public/images/` | ⚠️ Ask |
| Scaffolding files (`package.json`, `tsconfig.json`, etc.) | ❌ Preserve |
| `node_modules/` | ❌ Preserve |
| User-authored code | ❌ Never touch |

**Never delete user-authored code.** Only clean files that D2C itself
generated. When in doubt, preserve.

If the directory is empty (no project files at all), skip this step.

### 3. Enter Standard Workflow at Step 1

After cleanup:

1. Run `node <skill-dir>/scripts/d2c-status.js <design-url>` to get fresh state.
2. Read `guides/STEP_1_DIAGNOSIS.md` and execute Step 1 (Project Survey &
   Functional Diagnosis).

## Backup Rotation Chain

After multiple Inits, the project root may contain:

```
.d2c/                    ← current active state
.d2c.restart.bak/        ← most recent pre-init state
.d2c.restart.bak.old/    ← previous backup
.d2c.restart.bak.old.2/  ← oldest (rotated out on next Init)
```

Backups beyond `.old.2` are deleted during rotation (warn the user first).

## Difference from `/d2c <url>` (without explicit init)

Running `/d2c <url>` runs the status script and presents a menu where Init is
one option. Running `/d2c init` explicitly:

- Skips the menu and goes directly into Init flow
- Is the way to force a fresh start when you don't want Update/Sync
- Will still ask about backup and cleanup before proceeding
