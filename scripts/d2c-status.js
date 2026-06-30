#!/usr/bin/env node
/**
 * d2c-status.js — Project & D2C state detector
 *
 * Usage:  node d2c-status.js [design-url]
 * Output: JSON to stdout
 *
 * Scans the current working directory for:
 *   1. Existing project files (framework, language, styling, etc.)
 *   2. D2C state directories (.d2c/, .d2c.bak/, .d2c.restart.bak*)
 *   3. Contents of .d2c/STATE.md and .d2c/DESIGN.md
 *
 * Determines which commands (init/update/sync) are available and whether
 * the selection menu can be skipped entirely (empty directory).
 */

import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const inputDesignUrl = process.argv[2] || null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function readdirSafe(p) {
  try { return fs.readdirSync(p); } catch { return []; }
}

function globD2dBackups() {
  const all = readdirSafe(cwd);
  return all.filter(name =>
    name === '.d2c.bak' ||
    name.startsWith('.d2c.restart.bak')
  );
}

// ── Project detection ───────────────────────────────────────────────────────

function detectProject() {
  const files = new Set(readdirSafe(cwd));

  // Package manager
  let pkgManager = null;
  if (files.has('pnpm-lock.yaml')) pkgManager = 'pnpm';
  else if (files.has('bun.lockb') || files.has('bun.lock')) pkgManager = 'bun';
  else if (files.has('yarn.lock')) pkgManager = 'yarn';
  else if (files.has('package-lock.json')) pkgManager = 'npm';
  else if (files.has('package.json')) pkgManager = 'npm'; // default for npm projects

  // Package.json contents
  const pkgJsonPath = path.join(cwd, 'package.json');
  let pkgJson = null;
  if (exists(pkgJsonPath)) {
    try { pkgJson = JSON.parse(readFileSafe(pkgJsonPath)); } catch { pkgJson = null; }
  }
  const deps = { ...(pkgJson?.dependencies || {}), ...(pkgJson?.devDependencies || {}) };

  // Framework
  let framework = null;
  if (files.has('next.config.js') || files.has('next.config.mjs') || files.has('next.config.ts')) framework = 'next';
  else if (exists(path.join(cwd, 'nuxt.config.ts')) || exists(path.join(cwd, 'nuxt.config.js'))) framework = 'nuxt';
  else if (files.has('vite.config.ts') || files.has('vite.config.js')) framework = 'vite';
  else if (files.has('svelte.config.js')) framework = 'svelte';
  else if (files.has('angular.json')) framework = 'angular';
  else if (deps['react-native']) framework = 'react-native';
  else if (files.has('pubspec.yaml')) framework = 'flutter';
  else if (pkgJson && deps['next']) framework = 'next';
  else if (pkgJson && deps['nuxt']) framework = 'nuxt';
  else if (pkgJson && (deps['vite'] || deps['@vitejs/plugin-react'])) framework = 'vite';

  // Language
  let language = null;
  if (files.has('tsconfig.json')) language = 'typescript';
  else if (pkgJson && deps['typescript']) language = 'typescript';
  else {
    // Check if any .ts/.tsx files exist at top level src/
    const srcDir = path.join(cwd, 'src');
    if (isDir(srcDir)) {
      const hasTs = readdirSafe(srcDir).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      if (hasTs) language = 'typescript';
    }
    if (!language && (files.has('jsconfig.json') || pkgJson)) language = 'javascript';
  }

  // Styling
  let styling = null;
  if (files.has('tailwind.config.js') || files.has('tailwind.config.ts') || deps['tailwindcss']) styling = 'tailwind';
  else if (deps['styled-components']) styling = 'styled-components';
  else if (deps['@pandacss/dev']) styling = 'pandacss';
  else if (exists(path.join(cwd, 'postcss.config.js'))) styling = 'postcss';
  else {
    // Check for CSS modules
    const srcDir = path.join(cwd, 'src');
    const checkDir = isDir(srcDir) ? srcDir : cwd;
    const hasCssModule = readdirSafe(checkDir).some(f => f.endsWith('.module.css') || f.endsWith('.module.scss'));
    if (hasCssModule) styling = 'css-modules';
  }

  // Deploy
  let deploy = null;
  if (files.has('vercel.json')) deploy = 'vercel';
  else if (files.has('netlify.toml')) deploy = 'netlify';
  else if (files.has('wrangler.toml')) deploy = 'cloudflare-pages';
  else if (files.has('railway.json')) deploy = 'railway';
  else if (files.has('Dockerfile')) deploy = 'docker';
  if (isDir(path.join(cwd, '.github', 'workflows')) && !deploy) deploy = 'github-actions';

  // Source layout
  const hasSrcDir = isDir(path.join(cwd, 'src'));
  const hasAppDir = isDir(path.join(cwd, 'app')) || isDir(path.join(cwd, 'src', 'app'));
  const hasPagesDir = isDir(path.join(cwd, 'pages')) || isDir(path.join(cwd, 'src', 'pages'));

  // Existing components (quick scan)
  const existingComponents = [];
  const compDirs = [
    path.join(cwd, 'components'),
    path.join(cwd, 'src', 'components'),
  ];
  for (const dir of compDirs) {
    if (isDir(dir)) {
      scanComponents(dir, '', existingComponents);
      if (existingComponents.length > 20) break; // cap it
    }
  }

  // Is the directory effectively empty? (no project files, no .d2c)
  const relevantFiles = readdirSafe(cwd).filter(f => !f.startsWith('.d2c') && f !== '.git' && f !== 'node_modules');
  const isEmpty = relevantFiles.length === 0;

  return {
    isEmpty,
    hasPackageJson: files.has('package.json'),
    detectedFramework: framework,
    detectedLanguage: language,
    detectedStyling: styling,
    detectedPackageManager: pkgManager,
    detectedDeploy: deploy,
    hasSrcDir,
    hasAppDir,
    hasPagesDir,
    existingComponents,
    dependencies: Object.keys(deps).slice(0, 30), // cap for readability
  };
}

function scanComponents(dir, prefix, result) {
  const entries = readdirSafe(dir);
  for (const entry of entries) {
    if (result.length > 30) return;
    const full = path.join(dir, entry);
    if (isDir(full)) {
      scanComponents(full, path.join(prefix, entry), result);
    } else if (/\.(tsx|jsx|vue|svelte)$/.test(entry)) {
      result.push(path.join(prefix, entry));
    }
  }
}

// ── D2C state detection ─────────────────────────────────────────────────────

function parseStepFromState(content) {
  if (!content) return null;
  const match = content.match(/Current Step:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseDesignUrlFromDesign(content) {
  if (!content) return null;
  const match = content.match(/Design URL:\s*(https?:\/\/\S+)/i);
  if (match) return match[1].trim();
  // Also try "> Source:" or "url:" patterns
  const match2 = content.match(/(?:Source|URL):\s*(https?:\/\/\S+)/i);
  return match2 ? match2[1].trim() : null;
}

function detectState() {
  const d2cDir = path.join(cwd, '.d2c');
  const hasD2cDir = isDir(d2cDir);

  let hasStateFile = false;
  let hasDesignFile = false;
  let currentStep = null;
  let storedDesignUrl = null;

  if (hasD2cDir) {
    const stateContent = readFileSafe(path.join(d2cDir, 'STATE.md'));
    hasStateFile = stateContent !== null;
    currentStep = parseStepFromState(stateContent);

    const designContent = readFileSafe(path.join(d2cDir, 'DESIGN.md'));
    hasDesignFile = designContent !== null;
    storedDesignUrl = parseDesignUrlFromDesign(designContent);
  }

  const sameDesign = inputDesignUrl && storedDesignUrl
    ? normalizeUrl(inputDesignUrl) === normalizeUrl(storedDesignUrl)
    : null;

  const isResume = hasD2cDir && hasStateFile && sameDesign === true;

  return {
    hasD2cDir,
    hasStateFile,
    hasDesignFile,
    currentStep,
    storedDesignUrl,
    inputDesignUrl,
    sameDesign,
    isResume,
  };
}

function normalizeUrl(url) {
  if (!url) return '';
  // Strip trailing slashes, query params, hash for comparison
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    let pathname = u.pathname.replace(/\/+$/, '');
    // Normalize Figma URLs: /file/xxx/name and /design/xxx/name are same file
    pathname = pathname.replace(/^\/(file|design)\//, '/file/');
    return u.origin + pathname;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

// ── Backup detection ────────────────────────────────────────────────────────

function detectBackups() {
  const backupDirs = globD2dBackups();
  return {
    hasBak: backupDirs.includes('.d2c.bak'),
    hasRestartBak: backupDirs.some(d => d.startsWith('.d2c.restart.bak')),
    restartBakCount: backupDirs.filter(d => d.startsWith('.d2c.restart.bak')).length,
    backupDirs,
    // Orphan backup: .d2c.bak exists but no active .d2c/
    hasOrphanBackup: backupDirs.includes('.d2c.bak') && !isDir(path.join(cwd, '.d2c')),
  };
}

// ── Option availability ─────────────────────────────────────────────────────

function determineOptions(project, state, backups) {
  const options = {
    init: { available: false, label: '', reason: '', recommended: false },
    update: { available: false, label: '', reason: '', recommended: false },
    sync: { available: false, label: '', reason: '', recommended: false },
  };

  // init: always available except when... actually init is always available
  // It means "start a fresh 7-step D2C run"
  options.init.available = true;

  if (state.isResume) {
    // Has active state for same design → resume/update path
    options.init.label = 'Init (discard progress, start over from Step 1)';
    options.init.reason = `Active D2C state found at Step ${state.currentStep}. Init will back up current state and restart.`;

    options.update.available = true;
    options.update.label = 'Update (resume or iterate on the current design)';
    options.update.reason = `Active D2C state at Step ${state.currentStep} with matching design URL. Resuming from here.`;
    options.update.recommended = true;

    options.sync.available = state.hasDesignFile;
    options.sync.label = 'Sync (push style changes back to Figma)';
    options.sync.reason = state.hasDesignFile
      ? 'DESIGN.md exists — can sync token/color changes back to Figma.'
      : 'No DESIGN.md found — Sync requires a prior completed run.';
  } else if (state.hasD2cDir && state.sameDesign === false && inputDesignUrl) {
    // Different design URL → context switch
    options.init.label = 'Init (new design — current state will be backed up)';
    options.init.reason = 'The provided design URL differs from the stored one. Init will back up the current state and start fresh.';
    options.init.recommended = true;

    options.update.available = false;
    options.update.label = 'Update (not available — different design)';
    options.update.reason = 'The provided design URL does not match the stored design. Use Init to switch designs.';

    options.sync.available = false;
    options.sync.label = 'Sync (not available — different design)';
    options.sync.reason = 'Sync requires the same design URL as stored in DESIGN.md.';
  } else if (backups.hasOrphanBackup) {
    // No active state but backup exists
    options.init.label = 'Init (start fresh — backup will be preserved)';
    options.init.reason = 'No active .d2c/ directory found, but a backup exists. Starting fresh will keep the backup intact.';
    options.init.recommended = true;

    options.update.available = false;
    options.update.label = 'Update (not available — no active state)';
    options.update.reason = 'No active D2C state to update. Use Init to start, or restore from backup manually.';

    options.sync.available = false;
    options.sync.label = 'Sync (not available — no active state)';
    options.sync.reason = 'Sync requires an active .d2c/DESIGN.md.';
  } else if (project.isEmpty) {
    // Empty directory — skip menu, go straight to init
    options.init.label = 'Init (start new project)';
    options.init.reason = 'Empty directory — starting a fresh project from scratch.';
    options.init.recommended = true;

    options.update.available = false;
    options.update.label = 'Update (not available)';
    options.update.reason = 'No existing D2C state.';

    options.sync.available = false;
    options.sync.label = 'Sync (not available)';
    options.sync.reason = 'No existing D2C state.';
  } else {
    // Existing project, no D2C state
    options.init.label = `Init (introduce D2C into this ${project.detectedFramework || 'existing'} project)`;
    options.init.reason = project.hasPackageJson
      ? `Existing project detected${project.detectedFramework ? ` (${project.detectedFramework})` : ''}. D2C will adapt to existing conventions.`
      : 'Existing files detected but no package.json. D2C will scaffold around them.';
    options.init.recommended = true;

    options.update.available = false;
    options.update.label = 'Update (not available — no prior D2C state)';
    options.update.reason = 'Run Init first to establish D2C state for this project.';

    options.sync.available = false;
    options.sync.label = 'Sync (not available — no prior D2C state)';
    options.sync.reason = 'Run Init first and complete at least Step 2 to generate DESIGN.md.';
  }

  return options;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const project = detectProject();
  const state = detectState();
  const backups = detectBackups();
  const options = determineOptions(project, state, backups);

  // Can we skip the selection menu?
  // Skip when there is exactly ONE reasonable action, i.e.:
  //   - init is available AND update is NOT available AND sync is NOT available
  //     (meaning no active state, no orphan backup, no context switch — fresh start)
  //   - This covers: empty directory, existing project without D2C state,
  //     context switch (only init makes sense, but we still need to warn about backup).
  // Do NOT skip when:
  //   - Resume case (init/update/sync all available → user must choose)
  //   - Orphan backup (need to ask: restore / fresh / delete)
  const availableCount = [options.init.available, options.update.available, options.sync.available].filter(Boolean).length;
  const onlyOneOption = availableCount === 1;

  // Context switch: only init is available, but we should still show a
  // confirmation warning (not a full menu) so the user knows their old state
  // will be backed up.
  const isContextSwitch = state.hasD2cDir && state.sameDesign === false && inputDesignUrl !== null;
  const isOrphanBackup = backups.hasOrphanBackup;

  const skipMenu = onlyOneOption && !isContextSwitch && !isOrphanBackup;
  const showWarning = isContextSwitch || isOrphanBackup; // simple confirmation, not full menu

  // Auto-select action when skipping menu
  let autoAction = null;
  if (skipMenu) {
    autoAction = 'init';
  }

  const result = {
    cwd,
    timestamp: new Date().toISOString(),
    project,
    state,
    backups,
    options,
    skipMenu,
    showWarning,
    warningType: isContextSwitch ? 'context_switch' : (isOrphanBackup ? 'orphan_backup' : null),
    autoAction,
    availableCount,
    conflicts: {
      orphanBackup: backups.hasOrphanBackup,
      contextSwitch: isContextSwitch,
      resumeExisting: state.isResume,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
