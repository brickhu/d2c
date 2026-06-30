#!/usr/bin/env node

/**
 * @file d2c-fetch.js — 设计数据获取脚本
 *
 * 统一处理四种输入源:
 *   1. Figma URL  — 通过 Figma REST API v1 获取
 *   2. .fig 文件  — 解压 ZIP + kiwi-schema 解码（可选依赖）
 *   3. .sketch 文件 — 解压 ZIP + @sketch-hq/sketch-file 解析（可选依赖）
 *   4. 图片截图   — 读取文件信息 + base64 缩略图
 *
 * 所有输入类型输出统一的标准 JSON 格式。
 * Node 18+ 原生 fetch API，零外部依赖即可处理 Figma URL 和图片。
 *
 * @module d2c-fetch
 */

// ──────────────────────────────────────────────
// 原生 Node.js 模块
// ──────────────────────────────────────────────
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// ──────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────

const FIGMA_API_BASE = 'https://api.figma.com/v1';
const FIGMA_URL_PATTERN = /^https?:\/\//;
const FIGMA_FILE_PATTERN = /\/(?:file|design)\/([a-zA-Z0-9_-]+)/;
const ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PK_MAGIC_BYTES = Buffer.from([0x50, 0x4b]);
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

// ──────────────────────────────────────────────
// CLI 参数解析
// ──────────────────────────────────────────────

/**
 * 解析命令行参数。
 * @param {string[]} args - process.argv.slice(2)
 * @returns {{ input: string, token: string|null, outputDir: string|null, verbose: boolean }}
 */
function parseArgs(args) {
  let input = null;
  let token = null;
  let outputDir = null;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--token':
        token = args[++i] ?? null;
        break;
      case '--output-dir':
        outputDir = args[++i] ?? null;
        break;
      case '--verbose':
        verbose = true;
        break;
      default:
        if (input === null && !args[i].startsWith('--')) {
          input = args[i];
        }
    }
  }

  // --help
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (!input) {
    printErrorAndExit('缺少必要参数 <input>。用法: node scripts/d2c-fetch.js <input> [options]');
  }

  // FIGMA_TOKEN 环境变量兜底
  if (token === null && process.env.FIGMA_TOKEN) {
    token = process.env.FIGMA_TOKEN;
    logVerbose('从 FIGMA_TOKEN 环境变量读取 Token');
  }

  return { input, token, outputDir, verbose };
}

/**
 * 打印帮助信息到 stdout。
 */
function printHelp() {
  const help = `
d2c-fetch.js — 设计数据获取脚本

用法:
  node scripts/d2c-fetch.js <input> [options]

<input> (必填):
  Figma URL         https://www.figma.com/design/<key>/<name>
  .fig 文件路径     path/to/file.fig
  .sketch 文件路径  path/to/file.sketch
  图片/截图文件     path/to/screenshot.png

Options:
  --token <pat>     Figma Personal Access Token
                      (仅 Figma URL 需要; 也支持环境变量 FIGMA_TOKEN)
  --output-dir <d>  图片资源保存目录
  --verbose          输出调试信息到 stderr
  --help, -h         显示此帮助信息并退出

Figma Token 获取指引:
  1. 打开 https://www.figma.com/settings
  2. 找到 "Personal Access Tokens" 区域
  3. 点击 "Generate new token"，输入名称
  4. 选择 file_content:read 权限
  5. 复制生成的 Token
  6. 确保设计稿文件已共享给你的 Figma 账号 (viewer 权限即可)
  7. 使用: node scripts/d2c-fetch.js <url> --token <你的token>
     (或 export FIGMA_TOKEN=<你的token>，之后不用再传 --token)

没有 Token 也可以:
   方案1: 安装 figma-to-json 插件 → Figma Desktop 中导出 .fig 文件
          https://github.com/yagudaev/figma-to-json
   方案2: 截图 → node scripts/d2c-fetch.js path/to/screenshot.png
          D2C 会通过多模态视觉分析截图内容。`.trim();
  console.log(help);
}

// ──────────────────────────────────────────────
// 日志工具
// ──────────────────────────────────────────────

/**
 * 向 stderr 输出调试信息（仅在 --verbose 时）。
 * @param {...unknown} msg
 */
function logVerbose(...msg) {
  if (process.argv.includes('--verbose')) {
    console.error('[d2c-fetch]', ...msg);
  }
}

/**
 * 向 stderr 输出普通信息。
 * @param {...unknown} msg
 */
function log(...msg) {
  console.error(...msg);
}

/**
 * 输出错误信息到 stderr 并以非零退出。
 * @param {string} msg
 */
function printErrorAndExit(msg) {
  console.error(`[d2c-fetch 错误] ${msg}`);
  process.exit(1);
}

// ──────────────────────────────────────────────
// 输入类型检测
// ──────────────────────────────────────────────

/**
 * 检测输入的类型。
 * @param {string} input - 用户提供的输入字符串
 * @returns {'figma-url'|'fig'|'sketch'|'image'}
 */
function detectInputType(input) {
  if (FIGMA_URL_PATTERN.test(input)) {
    return 'figma-url';
  }
  const ext = extname(input).toLowerCase();
  if (ext === '.fig') return 'fig';
  if (ext === '.sketch') return 'sketch';
  return 'image';
}

/**
 * 从 Figma URL 中提取 file_key。
 * @param {string} url
 * @returns {string|null}
 */
function extractFigmaFileKey(url) {
  const match = url.match(FIGMA_FILE_PATTERN);
  return match ? match[1] : null;
}

/**
 * 检查文件是否为有效的 ZIP（以 PK 魔术字节开头）。
 * @param {string} filePath
 * @returns {boolean}
 */
function isValidZip(filePath) {
  try {
    const buf = Buffer.alloc(4);
    const fd = readFileSync(filePath);
    return fd.slice(0, 2).equals(ZIP_MAGIC_BYTES.slice(0, 2));
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// 网络请求工具（重试 + 超时）
// ──────────────────────────────────────────────

/**
 * 带超时和重试的 fetch 封装。
 * @param {string} url
 * @param {RequestInit} [options={}]
 * @param {object} [retryOpts={ retries: MAX_RETRIES, delay: RETRY_DELAY_MS }]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}, retryOpts = {}) {
  const { retries = MAX_RETRIES, delay = RETRY_DELAY_MS } = retryOpts;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const mergedOptions = {
    ...options,
    signal: controller.signal,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logVerbose(`fetch (attempt ${attempt + 1}/${retries + 1}): ${url}`);
      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < retries) {
        const wait = delay * Math.pow(2, attempt); // 指数退避
        logVerbose(`请求失败 (${err.message}), ${wait}ms 后重试...`);
        await new Promise((r) => setTimeout(r, wait));
      } else {
        throw new Error(`请求失败 (已重试 ${retries} 次): ${err.message}`);
      }
    }
  }

  // unreachable
  throw new Error('Unexpected: fetchWithRetry exhausted');
}

// ──────────────────────────────────────────────
// ZIP 工具（使用 unzipper）
// ──────────────────────────────────────────────

/**
 * 尝试动态导入 unzipper 并解压 ZIP 文件到内存。
 * @param {string} filePath
 * @returns {Promise<Array<{path: string, buffer: Buffer}>>}
 */
async function extractZip(filePath) {
  let unzipper;
  try {
    unzipper = await import('unzipper');
  } catch {
    throw new Error(
      '缺少依赖 "unzipper" — 请运行 npm install unzipper（已在 package.json 中声明）'
    );
  }

  const entries = [];
  return new Promise((resolve, reject) => {
    readFileSync(filePath)
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        const chunks = [];
        entry.on('data', (chunk) => chunks.push(chunk));
        entry.on('end', () => {
          entries.push({
            path: entry.path,
            type: entry.type, // 'Directory' | 'File'
            buffer: Buffer.concat(chunks),
          });
          entry.autodrain();
        });
      })
      .on('error', (err) => reject(new Error(`ZIP 解压失败: ${err.message}`)))
      .on('close', () => resolve(entries));
  });
}

// ──────────────────────────────────────────────
// Figma URL 处理
// ──────────────────────────────────────────────

/**
 * 通过 Figma REST API 获取文件 JSON。
 * @param {string} fileKey
 * @param {string} token
 * @returns {Promise<object>}
 */
async function fetchFigmaFile(fileKey, token) {
  const url = `${FIGMA_API_BASE}/files/${fileKey}`;
  const response = await fetchWithRetry(url, {
    headers: { 'X-Figma-Token': token },
  });

  if (!response.ok) {
    throw new Error(
      `Figma API 返回 ${response.status} ${response.statusText}: ${await response.text().catch(() => '')}`
    );
  }
  return response.json();
}

/**
 * 获取 Figma 文件内所有图片节点的导出 URL。
 * @param {string} fileKey
 * @param {string[]} nodeIds
 * @param {string} token
 * @param {'svg'|'png'|'jpg'} [format='svg']
 * @returns {Promise<Record<string, string>>} — nodeId → url
 */
async function fetchFigmaImageUrls(fileKey, nodeIds, token, format = 'svg') {
  if (nodeIds.length === 0) return {};

  const idsParam = nodeIds.join(',');
  const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(idsParam)}&format=${format}`;

  const response = await fetchWithRetry(url, {
    headers: { 'X-Figma-Token': token },
  });

  if (!response.ok) {
    logVerbose(`Figma images API 返回 ${response.status}，跳过图片获取`);
    return {};
  }

  const data = await response.json();
  return data.images || {};
}

/**
 * 扁平遍历 Figma 节点树，广度优先收集所有节点。
 * @param {object} figmaDoc - 从 API 返回的完整文档
 * @returns {object[]} — 扁平节点列表
 */
function flattenFigmaNodes(figmaDoc) {
  const nodes = [];
  const traverse = (child, parentId = null) => {
    const node = {
      id: child.id,
      name: child.name || '',
      type: child.type || 'UNKNOWN',
      parentId,
      boundingBox: child.absoluteBoundingBox
        ? {
            x: child.absoluteBoundingBox.x ?? 0,
            y: child.absoluteBoundingBox.y ?? 0,
            width: child.absoluteBoundingBox.width ?? 0,
            height: child.absoluteBoundingBox.height ?? 0,
          }
        : null,
      fills: child.fills || [],
      strokes: child.strokes || [],
      effects: child.effects || [],
      children: [],
    };
    nodes.push(node);

    if (child.children && Array.isArray(child.children)) {
      for (const sub of child.children) {
        const childNode = traverse(sub, child.id);
        node.children.push(childNode.id);
      }
    }
    return node;
  };

  // 文档根节点是 document.children
  const doc = figmaDoc.document;
  if (doc && doc.children) {
    for (const canvas of doc.children) {
      traverse(canvas, doc.id);
    }
  }

  return nodes;
}

/**
 * 从 Figma 文档中提取页面（Canvas）列表。
 * @param {object} figmaDoc
 * @returns {Array<{id: string, name: string, type: string}>}
 */
function extractFigmaPages(figmaDoc) {
  const doc = figmaDoc.document;
  if (!doc || !doc.children) return [];
  return doc.children
    .filter((c) => c.type === 'CANVAS')
    .map((c) => ({ id: c.id, name: c.name || '', type: c.type }));
}

/**
 * 从扁平节点列表中提取颜色样式。
 * @param {object[]} nodes
 * @returns {Array<{name: string, value: string, opacity: number}>}
 */
function extractColors(nodes) {
  const colorMap = new Map();

  for (const node of nodes) {
    if (!node.fills || !Array.isArray(node.fills)) continue;
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.color) {
        const r = Math.round((fill.color.r ?? 0) * 255);
        const g = Math.round((fill.color.g ?? 0) * 255);
        const b = Math.round((fill.color.b ?? 0) * 255);
        const hex =
          '#' +
          [r, g, b]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')
            .toLowerCase();
        const opacity = fill.opacity ?? 1.0;
        const key = `${hex}_${opacity}`;
        if (!colorMap.has(key)) {
          colorMap.set(key, {
            name: fill.color.name || `${hex}`,
            value: hex,
            opacity,
          });
        }
      }
    }
  }

  return Array.from(colorMap.values());
}

/**
 * 从扁平节点列表中提取排版样式。
 * @param {object[]} nodes
 * @returns {Array<{name: string, fontFamily: string, fontSize: number, fontWeight: number, lineHeight: number|string}>}
 */
function extractTypography(nodes) {
  const seen = new Set();
  const typography = [];

  for (const node of nodes) {
    if (!node.style) continue;
    const s = node.style;
    const family = s.fontFamily || 'Unknown';
    const size = s.fontSize || 14;
    const weight = s.fontWeight || 400;
    const lineHeight =
      typeof s.lineHeightPercentFontSize === 'number'
        ? s.lineHeightPercentFontSize / 100
        : s.lineHeightPx
          ? s.lineHeightPx / size
          : 1.5;
    const key = `${family}_${size}_${weight}`;
    if (!seen.has(key)) {
      seen.add(key);
      typography.push({
        name: s.name || `${family} ${size}px`,
        fontFamily: family,
        fontSize: size,
        fontWeight: weight,
        lineHeight: parseFloat(lineHeight.toFixed(2)),
      });
    }
  }

  return typography;
}

/**
 * 从扁平节点列表中提取间距（itemSpacing, primaryAxisAlignItems 等）。
 * @param {object[]} nodes
 * @returns {Array<{name: string, value: number}>}
 */
function extractSpacing(nodes) {
  const seen = new Set();
  const spacing = [];

  for (const node of nodes) {
    const val = node.itemSpacing;
    if (typeof val === 'number' && val > 0) {
      const key = `spacing_${val}`;
      if (!seen.has(key)) {
        seen.add(key);
        spacing.push({ name: `Spacing ${val}px`, value: val });
      }
    }
    // primaryAxisAlignItems / counterAxisAlignItems 也记录
    if (node.primaryAxisAlignItems) {
      // 语义化间距名称
    }
  }

  return spacing;
}

/**
 * 从扁平节点列表中提取圆角。
 * @param {object[]} nodes
 * @returns {Array<{name: string, value: number}>}
 */
function extractRadius(nodes) {
  const seen = new Set();
  const radius = [];

  for (const node of nodes) {
    const r = node.cornerRadius;
    if (typeof r === 'number' && r > 0) {
      const key = `radius_${r}`;
      if (!seen.has(key)) {
        seen.add(key);
        radius.push({ name: `Radius ${r}px`, value: r });
      }
    }
    // rectangleCornerRadii 也可以单独处理
    if (node.rectangleCornerRadii && Array.isArray(node.rectangleCornerRadii)) {
      for (const cr of node.rectangleCornerRadii) {
        if (typeof cr === 'number' && cr > 0) {
          const key = `radius_${cr}`;
          if (!seen.has(key)) {
            seen.add(key);
            radius.push({ name: `Radius ${cr}px`, value: cr });
          }
        }
      }
    }
  }

  return radius;
}

/**
 * 从扁平节点列表中提取阴影（EFFECT 类型）。
 * @param {object[]} nodes
 * @returns {Array<{name: string, value: string}>}
 */
function extractShadows(nodes) {
  const seen = new Set();
  const shadows = [];

  for (const node of nodes) {
    if (!node.effects || !Array.isArray(node.effects)) continue;
    for (const effect of node.effects) {
      if (
        (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') &&
        effect.offset
      ) {
        const r = Math.round((effect.color?.r ?? 0) * 255);
        const g = Math.round((effect.color?.g ?? 0) * 255);
        const b = Math.round((effect.color?.b ?? 0) * 255);
        const hex =
          '#' +
          [r, g, b]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')
            .toLowerCase();
        const cssShadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${hex}`;
        const key = cssShadow;
        if (!seen.has(key)) {
          seen.add(key);
          shadows.push({
            name: effect.type === 'DROP_SHADOW' ? `Drop Shadow ${shadows.length + 1}` : `Inner Shadow ${shadows.length + 1}`,
            value: cssShadow,
          });
        }
      }
    }
  }

  return shadows;
}

/**
 * 从扁平节点列表中提取图片/动画资源信息。
 * @param {object[]} nodes
 * @param {Record<string, string>} imageUrls — nodeId → URL
 * @returns {Array<{id: string, name: string, type: string, format: string, bounds: object|null, url: string|null}>}
 */
function extractAssets(nodes, imageUrls = {}) {
  const assets = [];

  for (const node of nodes) {
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') continue; // 跳过实例/组件

    // 检测是否为图片节点
    const hasImageFill =
      node.fills &&
      Array.isArray(node.fills) &&
      node.fills.some(
        (f) => f.type === 'IMAGE' || f.type === 'IMAGE_FILL' || f.fillType === 'IMAGE'
      );

    if (hasImageFill || node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR') {
      const imgUrl = imageUrls[node.id] || null;
      // 判断格式
      let format = 'svg';
      if (imgUrl) {
        const ext = extname(imgUrl).toLowerCase().replace('.', '');
        if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
          format = ext === 'jpeg' ? 'jpg' : ext;
        }
      }

      assets.push({
        id: node.id,
        name: node.name || '',
        type: node.type === 'VECTOR' ? 'image' : 'image',
        format,
        bounds: node.boundingBox,
        url: imgUrl,
      });
    }
  }

  return assets;
}

/**
 * 处理 Figma URL 输入。
 * @param {string} url - Figma 文件 URL
 * @param {object} opts - { token, outputDir, verbose }
 * @returns {Promise<object>} — 标准输出 JSON
 */
async function processFigmaUrl(url, opts) {
  const fileKey = extractFigmaFileKey(url);
  if (!fileKey) {
    throw new Error(`无法从 URL 中提取 Figma file_key: ${url}`);
  }

  if (!opts.token) {
    throw new Error(
      'Figma URL 需要 Token。可用 --token <pat> 传入，或设置环境变量 FIGMA_TOKEN。\n' +
      '  获取指引: 在 Figma Account Settings → Personal Access Tokens 中生成。\n' +
      '  插件替代: 安装 figma-to-json 插件 (https://github.com/yagudaev/figma-to-json)，\n' +
      '  在 Figma Desktop 中运行并导出 .fig 文件，然后将 .fig 文件传给我。\n' +
      '  截图替代: 不需要 Token，直接传截图文件路径即可。'
    );
  }

  logVerbose(`Figma file_key: ${fileKey}`);

  // 1. 获取文件 JSON
  const figmaDoc = await fetchFigmaFile(fileKey, opts.token);
  logVerbose('Figma 文件 JSON 获取成功');

  // 2. 提取页面列表
  const pages = extractFigmaPages(figmaDoc);
  logVerbose(`页面数量: ${pages.length}`);

  // 3. 扁平遍历节点
  const nodes = flattenFigmaNodes(figmaDoc);
  logVerbose(`节点总数: ${nodes.length}`);

  // 4. 收集所有 IMAGE 节点的 ID，批量获取导出 URL
  const imageNodeIds = nodes
    .filter((n) => {
      const hasImageFill =
        n.fills &&
        Array.isArray(n.fills) &&
        n.fills.some((f) => f.type === 'IMAGE');
      return hasImageFill || n.type === 'RECTANGLE' || n.type === 'VECTOR';
    })
    .map((n) => n.id);

  let imageUrls = {};
  if (imageNodeIds.length > 0) {
    logVerbose(`请求 ${imageNodeIds.length} 个图片节点的导出 URL`);
    imageUrls = await fetchFigmaImageUrls(fileKey, imageNodeIds, opts.token);
  }

  // 5. 提取样式
  const colors = extractColors(nodes);
  const typography = extractTypography(nodes);
  const spacing = extractSpacing(nodes);
  const radius = extractRadius(nodes);
  const shadows = extractShadows(nodes);

  // 6. 提取资源
  const assets = extractAssets(nodes, imageUrls);

  // 7. 获取缩略图
  let thumbnail = null;
  if (figmaDoc.thumbnailUrl) {
    try {
      const thumbResp = await fetchWithRetry(figmaDoc.thumbnailUrl);
      if (thumbResp.ok) {
        const thumbBuf = Buffer.from(await thumbResp.arrayBuffer());
        thumbnail = `data:image/png;base64,${thumbBuf.toString('base64')}`;
      }
    } catch (e) {
      logVerbose(`获取缩略图失败: ${e.message}`);
    }
  }

  return {
    source: { type: 'figma-url', url },
    project: { name: figmaDoc.name || 'Untitled', pages },
    nodes,
    styles: { colors, typography, spacing, radius, shadows },
    assets,
    thumbnail,
    meta: { fetchedAt: new Date().toISOString() },
  };
}

// ──────────────────────────────────────────────
// .fig 文件处理
// ──────────────────────────────────────────────

/**
 * 尝试解码 .fig 文件的 canvas.fig（kiwi-schema）。
 * 这是一个可选功能，依赖不存在时返回半结构数据。
 * @param {Buffer} figBuffer - canvas.fig 的二进制内容
 * @returns {Promise<object|null>}
 */
async function decodeFigCanvas(figBuffer) {
  try {
    const kiwiSchema = await import('kiwi-schema');
    if (typeof kiwiSchema.decode === 'function') {
      return kiwiSchema.decode(figBuffer);
    }
    if (typeof kiwiSchema.default?.decode === 'function') {
      return kiwiSchema.default.decode(figBuffer);
    }
    logVerbose('kiwi-schema 模块没有找到 decode 方法');
    return null;
  } catch (err) {
    logVerbose(`kiwi-schema 动态导入失败: ${err.message}`);
    return null;
  }
}

/**
 * 处理 .fig 文件输入。
 * @param {string} filePath
 * @param {object} opts - { outputDir, verbose }
 * @returns {Promise<object>} — 标准输出 JSON
 */
async function processFigFile(filePath, opts) {
  const fileName = basename(filePath);

  // 1. 验证文件是否为有效的 ZIP
  if (!isValidZip(filePath)) {
    throw new Error(`文件不是有效的 .fig (ZIP) 格式: ${filePath}`);
  }

  // 2. 解压
  logVerbose(`解压 .fig 文件: ${filePath}`);
  const entries = await extractZip(filePath);

  // 查找 meta.json
  const metaEntry = entries.find((e) => e.path === 'meta.json');
  const canvasEntry = entries.find(
    (e) => e.path === 'canvas.fig' || e.path.endsWith('/canvas.fig')
  );
  const imageEntries = entries.filter(
    (e) => e.path.startsWith('images/') && e.type === 'File'
  );

  // 3. 解析 meta.json
  let metaData = {};
  let projectName = fileName.replace(/\.fig$/i, '');
  if (metaEntry) {
    try {
      metaData = JSON.parse(metaEntry.buffer.toString('utf-8'));
      projectName = metaData.name || metaData.document?.name || projectName;
      logVerbose(`meta.json 解析成功`);
    } catch (e) {
      logVerbose(`meta.json 解析失败: ${e.message}`);
    }
  }

  // 4. 尝试解码 canvas.fig
  let decodedCanvas = null;
  let nodes = [];
  let pages = [];
  let styles = { colors: [], typography: [], spacing: [], radius: [], shadows: [] };
  let assets = [];

  if (canvasEntry) {
    decodedCanvas = await decodeFigCanvas(canvasEntry.buffer);
    if (decodedCanvas) {
      logVerbose('canvas.fig 解码成功');
      // 尝试从解码结果中提取节点和样式
      nodes = extractDecodedFigNodes(decodedCanvas);
      pages = extractDecodedFigPages(decodedCanvas, projectName);
      styles = extractDecodedFigStyles(decodedCanvas);
      assets = extractDecodedFigAssets(decodedCanvas);
    } else {
      logVerbose('canvas.fig 解码失败 — kiwi-schema 可能未安装');
      // 返回半结构数据
    }
  } else {
    logVerbose('.fig 文件中未找到 canvas.fig');
  }

  // 5. 处理图片资源
  for (const imgEntry of imageEntries) {
    const imgName = basename(imgEntry.path);
    const imgFormat = extname(imgName).toLowerCase().replace('.', '') || 'png';
    assets.push({
      id: `fig-image-${assets.length + 1}`,
      name: imgName,
      type: 'image',
      format: imgFormat,
      bounds: null,
      url: null, // 嵌入到文件中的图片没有 URL
    });
  }

  // 6. 生成缩略图
  let thumbnail = null;
  if (metaData.thumbnail) {
    try {
      const thumbBuf = Buffer.from(metaData.thumbnail, 'base64');
      thumbnail = `data:image/png;base64,${thumbBuf.toString('base64')}`;
    } catch {
      // 不是 base64 格式
    }
  }

  // 如果没有解码成功，给出提示信息
  const hasWarning = !decodedCanvas;

  const result = {
    source: { type: 'fig', file: filePath },
    project: { name: projectName, pages },
    nodes: nodes.length > 0 ? nodes : [],
    styles: styles.colors.length > 0 ? styles : { colors: [], typography: [], spacing: [], radius: [], shadows: [] },
    assets: assets.length > 0 ? assets : [],
    thumbnail,
    meta: { fetchedAt: new Date().toISOString() },
  };

  if (hasWarning) {
    result._warnings = [
      'canvas.fig 解码失败 — 需要安装 "kiwi-schema" 依赖 (npm install kiwi-schema)。' +
        '返回了 meta.json 基础信息，但节点树和样式数据不可用。',
    ];
  }

  return result;
}

/**
 * 从解码后的 Fig 数据中提取节点（简易 fallback 实现）。
 * kiwi-schema 解码后的结构是二进制反序列化的 Figma 内部格式。
 * 这里做基本的递归遍历。
 * @param {object} data - kiwi-schema 解码后的数据
 * @returns {object[]}
 */
function extractDecodedFigNodes(data) {
  if (!data || typeof data !== 'object') return [];
  const nodes = [];

  function walk(obj, parentId) {
    if (!obj || typeof obj !== 'object') return null;

    const id = obj.id || obj.ID || `node-${nodes.length}`;
    const node = {
      id,
      name: obj.name || obj.NAME || '',
      type: obj.type || obj._type || 'UNKNOWN',
      parentId,
      boundingBox: obj.absoluteBoundingBox || obj.boundingBox || obj.frame || null,
      fills: obj.fills || obj.FILLS || [],
      strokes: obj.strokes || obj.STROKES || [],
      effects: obj.effects || obj.EFFECTS || [],
      children: [],
    };
    nodes.push(node);

    // 递归子节点
    const children = obj.children || obj.CHILDREN || obj.child || obj.layers || [];
    if (Array.isArray(children)) {
      for (const child of children) {
        const childNode = walk(child, id);
        if (childNode) {
          node.children.push(childNode.id);
        }
      }
    }

    return node;
  }

  walk(data, null);
  return nodes;
}

/**
 * 从解码后的 Fig 数据中提取页面列表。
 * @param {object} data
 * @param {string} fallbackName
 * @returns {Array<{id: string, name: string, type: string}>}
 */
function extractDecodedFigPages(data, fallbackName) {
  if (!data) return [{ id: 'page-0', name: fallbackName, type: 'CANVAS' }];
  const children = data.children || data.CHILDREN || data.layers || [];
  if (Array.isArray(children)) {
    const pages = children
      .filter((c) => {
        const type = (c.type || c._type || '').toUpperCase();
        return type === 'CANVAS' || type === 'PAGE' || type === 'DOCUMENT';
      })
      .map((c) => ({
        id: c.id || c.ID || `page-${Math.random().toString(36).slice(2, 8)}`,
        name: c.name || c.NAME || 'Untitled',
        type: c.type || c._type || 'CANVAS',
      }));
    if (pages.length > 0) return pages;
  }
  return [{ id: 'page-0', name: fallbackName, type: 'CANVAS' }];
}

/**
 * 从解码后的 Fig 数据中提取样式（简易实现）。
 * @param {object} data
 * @returns {{ colors: Array, typography: Array, spacing: Array, radius: Array, shadows: Array }}
 */
function extractDecodedFigStyles(data) {
  const nodes = extractDecodedFigNodes(data);
  return {
    colors: extractColors(nodes),
    typography: extractTypography(nodes),
    spacing: extractSpacing(nodes),
    radius: extractRadius(nodes),
    shadows: extractShadows(nodes),
  };
}

/**
 * 从解码后的 Fig 数据中提取资源。
 * @param {object} data
 * @returns {Array}
 */
function extractDecodedFigAssets(data) {
  const nodes = extractDecodedFigNodes(data);
  return extractAssets(nodes, {});
}

// ──────────────────────────────────────────────
// .sketch 文件处理
// ──────────────────────────────────────────────

/**
 * 尝试用 @sketch-hq/sketch-file 解析 .sketch 文件。
 * 这是一个可选功能，依赖不存在时做基本 ZIP 提取。
 * @param {string} filePath
 * @returns {Promise<object|null>}
 */
async function parseWithSketchFile(filePath) {
  try {
    const sketchFile = await import('@sketch-hq/sketch-file');
    if (typeof sketchFile.decode === 'function') {
      return sketchFile.decode(readFileSync(filePath));
    }
    if (typeof sketchFile.default?.decode === 'function') {
      return sketchFile.default.decode(readFileSync(filePath));
    }
    logVerbose('@sketch-hq/sketch-file 模块没有找到 decode 方法');
    return null;
  } catch (err) {
    logVerbose(`@sketch-hq/sketch-file 动态导入失败: ${err.message}`);
    return null;
  }
}

/**
 * 从 Sketch 解析结果提取节点（简易实现）。
 * @param {object} sketchData
 * @returns {object[]}
 */
function extractSketchNodes(sketchData) {
  if (!sketchData || typeof sketchData !== 'object') return [];
  const nodes = [];

  function walk(obj, parentId) {
    if (!obj || typeof obj !== 'object') return null;

    const id = obj.do_objectID || obj.id || `node-${nodes.length}`;
    const name = obj.name || obj.class || '';
    const type = obj._class || obj.type || 'UNKNOWN';

    const node = {
      id,
      name,
      type,
      parentId,
      boundingBox: obj.frame
        ? {
            x: obj.frame.x ?? 0,
            y: obj.frame.y ?? 0,
            width: obj.frame.width ?? 0,
            height: obj.frame.height ?? 0,
          }
        : null,
      fills: Array.isArray(obj.style?.fills) ? obj.style.fills : [],
      strokes: Array.isArray(obj.style?.borders) ? obj.style.borders : [],
      effects: [],
      children: [],
    };
    nodes.push(node);

    const children = obj.layers || obj.groups || obj.children || [];
    if (Array.isArray(children)) {
      for (const child of children) {
        const childNode = walk(child, id);
        if (childNode) {
          node.children.push(childNode.id);
        }
      }
    }

    return node;
  }

  walk(sketchData, null);
  return nodes;
}

/**
 * 从 Sketch 数据中提取 Sketch 特定的颜色（从 assets 中）。
 * @param {object} sketchData
 * @returns {Array<{name: string, value: string, opacity: number}>}
 */
function extractSketchColors(sketchData) {
  const colors = [];
  if (sketchData.assets?.colorAssets && Array.isArray(sketchData.assets.colorAssets)) {
    for (const ca of sketchData.assets.colorAssets) {
      const c = ca.color;
      if (c) {
        const r = Math.round((c.red ?? 0) * 255);
        const g = Math.round((c.green ?? 0) * 255);
        const b = Math.round((c.blue ?? 0) * 255);
        const hex =
          '#' +
          [r, g, b]
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')
            .toLowerCase();
        colors.push({
          name: ca.name || hex,
          value: hex,
          opacity: c.alpha ?? 1.0,
        });
      }
    }
  }
  return colors;
}

/**
 * 从 Sketch 数据中提取排版样式。
 * @param {object} sketchData
 * @returns {Array<{name: string, fontFamily: string, fontSize: number, fontWeight: number, lineHeight: number|string}>}
 */
function extractSketchTypography(sketchData) {
  const seen = new Set();
  const typography = [];

  if (sketchData.assets?.textStyles && Array.isArray(sketchData.assets.textStyles)) {
    for (const ts of sketchData.assets.textStyles) {
      const attrs = ts.encodedAttributes?.textStyle?.attributes || {};
      const font = attrs.MSAttributedStringFontAttribute || {};
      const family = font.fontName?.split('-')[0] || 'Unknown';
      const size = font.size || attrs.fontSize || 14;
      const weight = font.fontName?.match(/\d+$/)
        ? parseInt(font.fontName.match(/\d+$/)[0], 10)
        : 400;
      const key = `${family}_${size}_${weight}`;
      if (!seen.has(key)) {
        seen.add(key);
        typography.push({
          name: ts.name || `${family} ${size}px`,
          fontFamily: family,
          fontSize: size,
          fontWeight: weight,
          lineHeight: 1.5,
        });
      }
    }
  }

  return typography;
}

/**
 * 处理 .sketch 文件输入。
 * @param {string} filePath
 * @param {object} opts - { outputDir, verbose }
 * @returns {Promise<object>} — 标准输出 JSON
 */
async function processSketchFile(filePath, opts) {
  const fileName = basename(filePath);

  // 1. 验证是否为 ZIP
  if (!isValidZip(filePath)) {
    throw new Error(`文件不是有效的 .sketch (ZIP) 格式: ${filePath}`);
  }

  // 2. 尝试用 @sketch-hq/sketch-file 解析
  logVerbose(`尝试使用 @sketch-hq/sketch-file 解析: ${filePath}`);
  const sketchData = await parseWithSketchFile(filePath);

  if (sketchData) {
    logVerbose('sketch-file 解析成功');
    const nodes = extractSketchNodes(sketchData);
    const pages = extractSketchPages(sketchData, fileName);
    const colors = extractSketchColors(sketchData);
    const typography = extractSketchTypography(sketchData);
    const spacing = extractSpacing(nodes);
    const radius = extractRadius(nodes);
    const shadows = extractShadows(nodes);
    const assets = extractAssets(nodes, {});

    // 生成缩略图（Sketch 文档通常没有内嵌缩略图）
    let thumbnail = null;
    if (sketchData.preview) {
      try {
        const thumbBuf = Buffer.from(sketchData.preview, 'base64');
        thumbnail = `data:image/png;base64,${thumbBuf.toString('base64')}`;
      } catch {
        // ignore
      }
    }

    return {
      source: { type: 'sketch', file: filePath },
      project: { name: fileName.replace(/\.sketch$/i, ''), pages },
      nodes,
      styles: { colors, typography, spacing, radius, shadows },
      assets,
      thumbnail,
      meta: { fetchedAt: new Date().toISOString() },
    };
  }

  // 3. 回退：基本 ZIP 提取
  logVerbose('sketch-file 解析失败，回退到基本 ZIP 提取');
  const entries = await extractZip(filePath);

  // 查找关键文件
  const documentJson = entries.find((e) => e.path === 'document.json');
  const metaJson = entries.find((e) => e.path === 'meta.json');
  const userJson = entries.find((e) => e.path === 'user.json');
  const previewEntry = entries.find(
    (e) => e.path === 'preview.png' || e.path === 'preview.jpg'
  );

  let projectName = fileName.replace(/\.sketch$/i, '');
  let pages = [{ id: 'page-0', name: projectName, type: 'PAGE' }];

  // 解析 document.json 获取基本信息
  if (documentJson) {
    try {
      const doc = JSON.parse(documentJson.buffer.toString('utf-8'));
      projectName = doc.name || doc.do_objectID || projectName;
    } catch {
      // ignore
    }
  }

  // 解析 meta.json
  if (metaJson) {
    try {
      const meta = JSON.parse(metaJson.buffer.toString('utf-8'));
      if (meta.pagesAndArtboards) {
        pages = Object.keys(meta.pagesAndArtboards).map((id) => ({
          id,
          name: meta.pagesAndArtboards[id].name || id,
          type: 'PAGE',
        }));
      }
    } catch {
      // ignore
    }
  }

  // 生成缩略图
  let thumbnail = null;
  if (previewEntry) {
    const fmt = previewEntry.path.endsWith('.jpg') ? 'jpeg' : 'png';
    thumbnail = `data:image/${fmt};base64,${previewEntry.buffer.toString('base64')}`;
  }

  return {
    source: { type: 'sketch', file: filePath },
    project: { name: projectName, pages },
    nodes: [],
    styles: { colors: [], typography: [], spacing: [], radius: [], shadows: [] },
    assets: [],
    thumbnail,
    _warnings: [
      'sketch-file 解析失败 — 需要安装 "@sketch-hq/sketch-file" 依赖 (npm install @sketch-hq/sketch-file)。' +
        '已执行基本 ZIP 提取，但节点树和样式数据不可用。',
    ],
    meta: { fetchedAt: new Date().toISOString() },
  };
}

/**
 * 从 Sketch 数据中提取页面列表。
 * @param {object} sketchData
 * @param {string} fallbackName
 * @returns {Array<{id: string, name: string, type: string}>}
 */
function extractSketchPages(sketchData, fallbackName) {
  if (!sketchData) return [{ id: 'page-0', name: fallbackName, type: 'PAGE' }];

  const pages = [];
  const children = sketchData.children || sketchData.layers || [];
  if (Array.isArray(children)) {
    for (const child of children) {
      if (child._class === 'MSImmutablePage' || child._class === 'page' || child.type === 'PAGE') {
        pages.push({
          id: child.do_objectID || child.id || `page-${pages.length}`,
          name: child.name || 'Untitled',
          type: child._class || 'PAGE',
        });
      }
    }
  }

  return pages.length > 0 ? pages : [{ id: 'page-0', name: fallbackName, type: 'PAGE' }];
}

// ──────────────────────────────────────────────
// 图片文件处理
// ──────────────────────────────────────────────

/**
 * 通过扩展名检测图片格式。macOS · Linux 通用，无需外部命令。
 * @param {string} filePath
 * @returns {string} MIME 类型
 */
function detectImageFormat(filePath) {
  const ext = extname(filePath).toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * 处理图片文件输入。
 * @param {string} filePath
 * @param {object} opts - { outputDir, verbose }
 * @returns {Promise<object>} — 标准输出 JSON
 */
async function processImageFile(filePath, opts) {
  const fileName = basename(filePath);

  // 1. 检查文件是否存在
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  // 2. 获取文件信息
  const stats = statSync(filePath);
  const fileSizeBytes = stats.size;

  // 3. 检测格式
  const mimeType = detectImageFormat(filePath);
  const format = mimeType.replace('image/', '');

  logVerbose(`图片格式: ${mimeType}, 大小: ${fileSizeBytes} bytes`);

  // 4. 读取文件并生成 base64 缩略图
  const fileBuffer = readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const thumbnail = `data:${mimeType};base64,${base64}`;

  // 5. 计算文件哈希
  const hash = createHash('sha256').update(fileBuffer).digest('hex').slice(0, 16);

  return {
    source: { type: 'image', file: filePath },
    project: {
      name: fileName,
      pages: [{ id: 'img-0', name: fileName, type: 'IMAGE' }],
    },
    nodes: [],
    styles: { colors: [], typography: [], spacing: [], radius: [], shadows: [] },
    assets: [
      {
        id: `img-${hash}`,
        name: fileName,
        type: 'image',
        format,
        bounds: null,
        url: null,
      },
    ],
    thumbnail,
    meta: {
      fetchedAt: new Date().toISOString(),
      fileSizeBytes,
      mimeType,
      hash,
    },
  };
}

// ──────────────────────────────────────────────
// 主入口
// ──────────────────────────────────────────────

/**
 * 主处理函数：检测输入类型并分发到对应的处理器。
 * @param {string} input - 输入路径或 URL
 * @param {object} options - { token, outputDir, verbose }
 * @returns {Promise<object>} — 标准输出 JSON
 */
async function main(input, options) {
  const inputType = detectInputType(input);
  logVerbose(`检测到输入类型: ${inputType}`);

  let result;

  switch (inputType) {
    case 'figma-url':
      result = await processFigmaUrl(input, options);
      break;
    case 'fig':
      result = await processFigFile(input, options);
      break;
    case 'sketch':
      result = await processSketchFile(input, options);
      break;
    case 'image':
      result = await processImageFile(input, options);
      break;
    default:
      throw new Error(`不支持的输入类型: ${inputType}`);
  }

  return result;
}

/**
 * 程序入口点。
 */
async function entry() {
  const { input, token, outputDir, verbose } = parseArgs(process.argv.slice(2));

  // 确保输出目录存在（如果指定了）
  if (outputDir) {
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    const result = await main(input, { token, outputDir, verbose });

    // 输出标准 JSON 到 stdout
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    // 错误时仍然输出标准 JSON 格式，但带有 error 字段
    const errorResult = {
      source: { type: detectInputType(input), url: input.startsWith('http') ? input : undefined, file: !input.startsWith('http') ? input : undefined },
      project: { name: 'Error', pages: [] },
      nodes: [],
      styles: { colors: [], typography: [], spacing: [], radius: [], shadows: [] },
      assets: [],
      thumbnail: null,
      error: err.message,
      meta: { fetchedAt: new Date().toISOString() },
    };
    process.stdout.write(JSON.stringify(errorResult, null, 2) + '\n');
    process.exit(1);
  }
}

// ──────────────────────────────────────────────
// 启动
// ──────────────────────────────────────────────

entry();