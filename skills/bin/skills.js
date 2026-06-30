#!/usr/bin/env node

/**
 * skills — AI Coding Skill Installer
 *
 * Usage:
 *   npx skills add <npm-package-name>        Install skill from npm registry
 *   npx skills add <github-repo-url>         Install skill from GitHub
 *   npx skills --help                        Show help
 *   npx skills --version                     Show version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const pkg = require(path.join(__dirname, '..', 'package.json'));

// ── Helpers ──

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skills-'));
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// ── Determine install target directory ──

function detectTarget() {
  const cwd = process.cwd();

  // Check for TRAE IDE (project-level)
  const traeProject = path.join(cwd, '.trae', 'skills');
  if (fs.existsSync(path.join(cwd, '.trae'))) {
    return { dir: traeProject, label: 'TRAE (project)' };
  }

  // Check for TRAE CLI (project-level)
  const traeCliProject = path.join(cwd, '.traecli', 'skills');
  if (fs.existsSync(path.join(cwd, '.traecli'))) {
    return { dir: traeCliProject, label: 'TRAE CLI (project)' };
  }

  // Check for .clinerules (Claude Code)
  if (fs.existsSync(path.join(cwd, '.clinerules'))) {
    return { dir: cwd, label: 'Claude Code' };
  }

  // Check for .cursorrules (Cursor)
  if (fs.existsSync(path.join(cwd, '.cursorrules'))) {
    return { dir: cwd, label: 'Cursor' };
  }

  // Fallback: use all possible target dirs
  const targets = [
    { dir: traeProject, label: '.trae/skills/' },
    { dir: traeCliProject, label: '.traecli/skills/' },
    { dir: cwd, label: 'project root (AGENTS.md)' },
  ];

  return targets;
}

// ── Extract skill name from source ──

function parseSkillName(source) {
  // GitHub URL: https://github.com/user/repo → repo
  const ghMatch = source.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (ghMatch) return ghMatch[2];
  // npm name: d2c → d2c
  return source.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

// ── Find skill files in a directory ──

function findSkillFiles(dir) {
  const skillDir = dir;
  const files = fs.readdirSync(skillDir, { withFileTypes: true });
  const found = [];

  for (const entry of files) {
    if (entry.name === 'SKILL.md') {
      found.push(path.join(skillDir, entry.name));
    } else if (entry.name === 'guides' && entry.isDirectory()) {
      found.push(path.join(skillDir, entry.name));
    } else if (entry.name === 'scripts' && entry.isDirectory()) {
      found.push(path.join(skillDir, entry.name));
    }
  }

  // If SKILL.md not at root, check subdirs
  if (!found.some(f => f.endsWith('SKILL.md'))) {
    for (const entry of files) {
      if (entry.isDirectory()) {
        const sub = path.join(skillDir, entry.name);
        if (fs.existsSync(path.join(sub, 'SKILL.md'))) {
          found.push(sub);
          // Also copy subdir's guides/scripts if present
          for (const subEntry of fs.readdirSync(sub, { withFileTypes: true })) {
            if ((subEntry.name === 'guides' || subEntry.name === 'scripts') && subEntry.isDirectory()) {
              found.push(path.join(sub, subEntry.name));
            }
          }
        }
      }
    }
  }

  return found;
}

// ── Install skill ──

function installSkill(source, targetDir) {
  const skillName = parseSkillName(source);
  const finalTarget = path.join(targetDir, skillName);

  // Check for existing installation
  if (fs.existsSync(finalTarget)) {
    console.log(`⚠️  Skill "${skillName}" already exists at ${finalTarget}`);
    try {
      run(`rm -rf "${finalTarget}"`, { silent: true });
      console.log(`   Removed existing installation. Reinstalling...`);
    } catch {
      console.error(`   Please remove it manually: rm -rf "${finalTarget}"`);
      process.exit(1);
    }
  }

  const temp = tmpDir();
  let packageDir;

  try {
    // Determine source type and download
    const isGitHub = source.includes('github.com') || source.includes('://');

    if (isGitHub) {
      // GitHub URL mode
      const repoUrl = source.endsWith('.git') ? source : `${source}.git`;
      console.log(`📦 Cloning ${source}...`);
      run(`git clone --depth 1 "${repoUrl}" "${path.join(temp, 'repo')}"`, { silent: true });
      packageDir = path.join(temp, 'repo');
    } else {
      // npm registry mode
      console.log(`📦 Downloading "${source}" from npm...`);
      run(`npm pack "${source}" --pack-destination "${temp}"`, { silent: true });

      // Find the tarball
      const tarball = fs.readdirSync(temp).find(f => f.endsWith('.tgz'));
      if (!tarball) {
        console.error(`   Error: No tarball found for "${source}"`);
        process.exit(1);
      }

      // Extract
      const extractDir = path.join(temp, 'extracted');
      fs.mkdirSync(extractDir);
      run(`tar -xzf "${path.join(temp, tarball)}" -C "${extractDir}"`, { silent: true });
      packageDir = path.join(extractDir, 'package');
    }

    // Find skill files
    const skillFiles = findSkillFiles(packageDir);

    if (skillFiles.length === 0) {
      console.error(`   Error: No SKILL.md found in "${source}". This package does not contain a valid skill.`);
      process.exit(1);
    }

    // Copy to target
    console.log(`   Installing to ${finalTarget}...`);
    fs.mkdirSync(finalTarget, { recursive: true });

    // Copy all found files preserving structure
    for (const filePath of skillFiles) {
      const relPath = path.relative(packageDir, filePath);
      const dst = path.join(finalTarget, relPath);
      if (fs.statSync(filePath).isDirectory()) {
        copyRecursive(filePath, dst);
      } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(filePath, dst);
      }
    }

    // Also copy SKILL.md from root if not already copied (subdir case)
    if (!fs.existsSync(path.join(finalTarget, 'SKILL.md'))) {
      const rootSkill = path.join(packageDir, 'SKILL.md');
      if (fs.existsSync(rootSkill)) {
        fs.copyFileSync(rootSkill, path.join(finalTarget, 'SKILL.md'));
      }
    }

    // Install npm dependencies if scripts/package.json exists
    const scriptsPkg = path.join(finalTarget, 'scripts', 'package.json');
    if (fs.existsSync(scriptsPkg)) {
      console.log(`   Installing script dependencies...`);
      run(`npm install`, { cwd: path.join(finalTarget, 'scripts'), silent: true });
    }

    console.log(`\n✅ Skill "${skillName}" installed to ${finalTarget}`);
    console.log(`   Ready to use! Restart your AI tool if needed.`);

  } finally {
    rmrf(temp);
  }
}

// ── Detect target and install ──

function add(source) {
  if (!source) {
    console.error('Error: Missing source. Usage: npx skills add <package-name-or-github-url>');
    process.exit(1);
  }

  console.log(`🔍 Detecting project...`);
  const targets = detectTarget();

  // If single target was found, use it
  if (!Array.isArray(targets)) {
    console.log(`   Found: ${targets.label}`);
    console.log('');
    installSkill(source, targets.dir);
    return;
  }

  // Multiple targets — ask user or use best guess
  console.log(`   Available targets:`);
  for (let i = 0; i < targets.length; i++) {
    const exists = fs.existsSync(path.dirname(targets[i].dir));
    console.log(`   ${i + 1}. ${targets[i].label} ${exists ? '(exists)' : ''}`);
  }

  // Prefer first existing target, or create .trae/skills/
  const existingTarget = targets.find(t => fs.existsSync(path.dirname(t.dir)));
  const bestTarget = existingTarget || targets[0];

  fs.mkdirSync(bestTarget.dir, { recursive: true });
  console.log(`   Using: ${bestTarget.label}`);
  console.log('');

  installSkill(source, bestTarget.dir);
}

// ── CLI Router ──

const cmd = process.argv[2];
const arg = process.argv[3];

function showHelp() {
  console.log(`
  skills v${pkg.version} — AI Coding Skill Installer

  Install any AI coding skill with one command.

  Usage:
    npx skills add <npm-package>          Install from npm registry
      Example:  npx skills add design2context
      
    npx skills add <github-repo-url>      Install from GitHub
      Example:  npx skills add https://github.com/brickhu/d2c

    npx skills --version                  Show version
    npx skills --help                     Show this help
  `);
}

if (!cmd || cmd === '--help') {
  showHelp();
} else if (cmd === '--version') {
  console.log(pkg.version);
} else if (cmd === 'add') {
  add(arg);
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Run `npx skills --help` for usage.');
  process.exit(1);
}