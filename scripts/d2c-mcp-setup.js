#!/usr/bin/env node

/**
 * @file d2c-mcp-setup.js — Figma MCP 自动配置脚本
 *
 * 自动检测当前运行的 Code Harness，将 Figma MCP 配置写入对应配置文件。
 * 用户只需确认一次，无需手动编辑 JSON。
 *
 * 用法:
 *   node scripts/d2c-mcp-setup.js              # 自动检测并配置
 *   node scripts/d2c-mcp-setup.js --dry-run    # 仅检测，不写入
 *   node scripts/d2c-mcp-setup.js --force <harness>  # 强制指定 harness
 *
 * 输出: JSON 到 stdout
 *
 * Node 18+
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOME = homedir();
const CWD = process.cwd();

// ── 命令行参数解析 ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceIdx = args.indexOf('--force');
const forceHarness = forceIdx !== -1 ? args[forceIdx + 1] : null;

// ── Harness 定义 ────────────────────────────────────────────────────────────

const FIGMA_MCP_ENTRY = {
  figma: {
    command: 'npx',
    args: ['-y', '@anthropic/figma-mcp'],
  },
};

const HARNESS_DEFS = [
  {
    id: 'trae',
    name: 'TRAE IDE / CLI',
    configPaths: [
      join(CWD, '.trae', 'mcp.json'),
      join(HOME, '.trae', 'mcp.json'),
    ],
    // 优先使用项目级配置，不存在时用 HOME
    preferLocal: true,
    restartHint: 'Restart TRAE and re-run `/d2c <figma-url>`',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    configPaths: [
      join(HOME, '.claude', 'mcp.json'),
      join(CWD, '.claude', 'mcp.json'),
    ],
    preferLocal: false,
    restartHint: 'Restart Claude Code and re-run `/d2c <figma-url>`',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configPaths: [join(CWD, '.cursor', 'mcp.json')],
    preferLocal: false,
    restartHint: 'Restart Cursor and re-run `/d2c <figma-url>`',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configPaths: [join(CWD, '.windsurf', 'mcp.json')],
    preferLocal: false,
    restartHint: 'Restart Windsurf and re-run `/d2c <figma-url>`',
  },
];

// ── 工具函数 ────────────────────────────────────────────────────────────────

function readJsonSafe(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonSafe(filePath, data) {
  const dir = dirname(filePath);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return null; // success
  } catch (err) {
    return err.message;
  }
}

// 检查是否已存在 figma MCP 配置
function hasFigmaMCP(config) {
  if (!config || !config.mcpServers) return false;
  return Object.prototype.hasOwnProperty.call(config.mcpServers, 'figma');
}

// 合并 figma MCP 到现有配置
function mergeFigmaMCP(config) {
  if (!config) {
    return { mcpServers: { ...FIGMA_MCP_ENTRY } };
  }
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  config.mcpServers = { ...config.mcpServers, ...FIGMA_MCP_ENTRY };
  return config;
}

// ── 检测当前 Harness ────────────────────────────────────────────────────────

function detectHarness() {
  if (forceHarness) {
    const h = HARNESS_DEFS.find(d => d.id === forceHarness);
    if (h) return h;
    console.error(`Unknown harness: ${forceHarness}`);
    process.exit(1);
  }

  // 按优先级检测：检查哪个 harness 的配置文件存在
  for (const def of HARNESS_DEFS) {
    for (const p of def.configPaths) {
      if (existsSync(p)) {
        return def;
      }
    }
    // 也检查目录是否存在（即使没有 mcp.json，可能 .trae/ 目录存在）
    for (const p of def.configPaths) {
      const dir = dirname(p);
      if (existsSync(dir)) {
        return def;
      }
    }
  }
  return null;
}

// 确定要写入的配置文件路径
function resolveConfigPath(harness) {
  if (harness.preferLocal) {
    // 优先项目级
    const local = harness.configPaths[0];
    const home = harness.configPaths[1];
    if (existsSync(local) || existsSync(dirname(local))) {
      return local;
    }
    return home;
  }
  // 用第一个存在的路径，或第一个路径
  for (const p of harness.configPaths) {
    if (existsSync(p)) return p;
  }
  return harness.configPaths[0];
}

// ── 主流程 ──────────────────────────────────────────────────────────────────

function main() {
  // 1. 检测 Harness
  const harness = detectHarness();

  if (!harness) {
    const result = {
      success: false,
      action: 'no_harness_detected',
      message: 'No supported code harness detected. Cannot auto-configure MCP.',
      suggestions: [
        'Make sure you are running inside TRAE, Claude Code, Cursor, or Windsurf',
        'Use --force <harness> to specify explicitly: trae, claude, cursor, windsurf',
        'Or manually add the config to your MCP settings',
      ],
      manualConfig: FIGMA_MCP_ENTRY,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // 2. 确定目标文件
  const configPath = resolveConfigPath(harness);
  const existingConfig = readJsonSafe(configPath);

  // 3. 检查是否已存在
  if (hasFigmaMCP(existingConfig)) {
    const result = {
      success: false,
      action: 'already_configured',
      harness: harness.name,
      configPath,
      message: `Figma MCP is already configured in ${configPath}`,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // 4. 预览将要写入的内容
  const newConfig = mergeFigmaMCP(existingConfig);
  const preview = {
    harness: harness.name,
    configPath,
    configExists: existingConfig !== null,
    willAdd: FIGMA_MCP_ENTRY,
    restartHint: harness.restartHint,
  };

  if (dryRun) {
    const result = {
      success: true,
      action: 'dry_run',
      ...preview,
      message: `Dry run — would configure Figma MCP for ${harness.name} at ${configPath}`,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // 5. 写入配置
  const writeErr = writeJsonSafe(configPath, newConfig);

  if (writeErr) {
    const result = {
      success: false,
      action: 'write_failed',
      harness: harness.name,
      configPath,
      error: writeErr,
      manualConfig: FIGMA_MCP_ENTRY,
      message: `Cannot write to ${configPath}: ${writeErr}. Please add the config manually.`,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = {
    success: true,
    action: 'configured',
    ...preview,
    message: `Figma MCP configured for ${harness.name} at ${configPath}`,
  };
  console.log(JSON.stringify(result, null, 2));
}

main();