#!/usr/bin/env node

/**
 * @file d2c-crawl.js — 网站 DOM 爬取与设计令牌提取
 *
 * 输入一个 URL，自动:
 *   1. 启动无头浏览器打开网页
 *   2. 提取所有计算样式（颜色、字体、间距、阴影、圆角）
 *   3. 提取 DOM 结构与语义化组件层级
 *   4. 多视口截图（Desktop / Tablet / Mobile）
 *   5. 提取图片、SVG、字体等资源
 *   6. 检测响应式断点
 *   7. 输出统一的标准 JSON 格式，可直接输入 Step 2
 *
 * 用法:
 *   node scripts/d2c-crawl.js <url> [--output <path>]
 *
 * 前置依赖:
 *   cd scripts && npm install && npx playwright install chromium
 *
 * Node 18+，Playwright 作为可选依赖。
 *
 * @module d2c-crawl
 */

// ──────────────────────────────────────────────
// 原生 Node.js 模块
// ──────────────────────────────────────────────
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────
// 解析命令行参数
// ──────────────────────────────────────────────
const args = process.argv.slice(2);
let url = null;
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' && i + 1 < args.length) {
    outputPath = args[++i];
  } else if (!url && (args[i].startsWith('http://') || args[i].startsWith('https://'))) {
    url = args[i];
  }
}

if (!url) {
  console.error('Usage: node d2c-crawl.js <url> [--output <path>]');
  console.error('Example: node d2c-crawl.js https://example.com --output crawled.json');
  process.exit(1);
}

// 规范化 URL
if (!url.startsWith('http://') && !url.startsWith('https://')) {
  url = 'https://' + url;
}

// ──────────────────────────────────────────────
// 视口配置
// ──────────────────────────────────────────────
const VIEWPORTS = {
  mobile: { width: 375, height: 812, label: 'Mobile (375×812)', device: 'iPhone 13' },
  tablet: { width: 768, height: 1024, label: 'Tablet (768×1024)', device: 'iPad' },
  desktop: { width: 1280, height: 900, label: 'Desktop (1280×900)', device: 'Desktop' },
};

// ──────────────────────────────────────────────
// 主函数
// ──────────────────────────────────────────────
async function main() {
  let browser;
  try {
    const { chromium } = await import('playwright');
    console.error(`[d2c-crawl] Launching headless browser for: ${url}`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) D2C-Crawler/1.0',
      viewport: { width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height },
    });

    const page = await context.newPage();

    // 导航到目标页面
    console.error('[d2c-crawl] Navigating...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待页面完全加载
    await page.waitForTimeout(2000);

    const title = await page.title();
    const pageUrl = page.url();

    // ──────────────────────────────────────────
    // 1. 提取设计令牌
    // ──────────────────────────────────────────
    console.error('[d2c-crawl] Extracting design tokens...');

    const tokens = await page.evaluate(() => {
      // ── 颜色系统 ──
      const colorSet = new Set();
      const colorUsage = {};

      // 提取所有元素的 computed color/background-color
      const allEls = document.querySelectorAll('body, body *');
      const colorCounts = {};
      const bgColorCounts = {};

      const normalizeColor = (c) => {
        if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return null;
        // 转换为标准 hex
        const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
          if (a === 0) return null;
          if (a === 1) {
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          }
          return `rgba(${r},${g},${b},${a})`;
        }
        return c;
      };

      const elSample = [];
      const maxSample = 200;
      for (const el of allEls) {
        if (elSample.length >= maxSample) break;
        const style = getComputedStyle(el);
        const color = normalizeColor(style.color);
        const bg = normalizeColor(style.backgroundColor);

        if (color) {
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        }
        if (bg) {
          bgColorCounts[bg] = (bgColorCounts[bg] || 0) + 1;
        }
        elSample.push(el);
      }

      // 按频率排序取前 20 个颜色
      const sortByCount = (obj) =>
        Object.entries(obj)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([c]) => c);

      const textColors = sortByCount(colorCounts);
      const bgColors = sortByCount(bgColorCounts);

      // ── 排版 ──
      const fonts = new Set();
      const fontSizes = new Set();
      const fontWeights = new Set();
      const lineHeights = new Set();

      const bodyStyle = getComputedStyle(document.body);
      const bodyFont = bodyStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      fonts.add(bodyFont);

      const headingEls = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
      const textEls = document.querySelectorAll('p,span,a,li,div,button,input,textarea,label');

      for (const el of headingEls) {
        const s = getComputedStyle(el);
        fontSizes.add(parseFloat(s.fontSize));
        fontWeights.add(s.fontWeight);
        lineHeights.add(parseFloat(s.lineHeight));
        const f = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        if (f) fonts.add(f);
      }

      for (const el of textEls) {
        const s = getComputedStyle(el);
        const fs = parseFloat(s.fontSize);
        if (fs > 0 && fs < 200) fontSizes.add(fs);
        fontWeights.add(s.fontWeight);
        const lh = parseFloat(s.lineHeight);
        if (lh > 0 && lh < 200) lineHeights.add(lh);
      }

      // ── 间距 ──
      const spacingSet = new Set();
      const gapEls = document.querySelectorAll('[style*="gap"], .flex, .grid, [class*="gap"], [class*="space"]');
      for (const el of gapEls) {
        const s = getComputedStyle(el);
        const gap = parseFloat(s.gap || s.rowGap || s.columnGap);
        const pad = [
          parseFloat(s.paddingTop), parseFloat(s.paddingRight),
          parseFloat(s.paddingBottom), parseFloat(s.paddingLeft),
        ];
        const margin = [
          parseFloat(s.marginTop), parseFloat(s.marginRight),
          parseFloat(s.marginBottom), parseFloat(s.marginLeft),
        ];
        if (gap > 0 && gap < 500) spacingSet.add(gap);
        pad.forEach(p => { if (p > 0 && p < 500) spacingSet.add(p); });
        margin.forEach(m => { if (m > 0 && m < 500) spacingSet.add(m); });
      }

      // ── 圆角 ──
      const radiusSet = new Set();
      for (const el of elSample) {
        const s = getComputedStyle(el);
        const r = parseFloat(s.borderRadius);
        if (r > 0 && r < 200) radiusSet.add(r);
      }

      // ── 阴影 ──
      const shadowSet = new Set();
      for (const el of elSample) {
        const s = getComputedStyle(el);
        const shadow = s.boxShadow;
        if (shadow && shadow !== 'none' && shadow.length < 300) {
          shadowSet.add(shadow);
        }
      }

      return {
        colors: { text: textColors, background: bgColors },
        typography: {
          fonts: [...fonts].slice(0, 10),
          fontSizes: [...fontSizes].sort((a, b) => a - b),
          fontWeights: [...fontWeights].sort((a, b) => a - b),
          lineHeights: [...lineHeights].sort((a, b) => a - b),
        },
        spacing: [...spacingSet].sort((a, b) => a - b),
        radius: [...radiusSet].sort((a, b) => a - b),
        shadows: [...shadowSet],
      };
    });

    // ──────────────────────────────────────────
    // 2. 提取 DOM 结构
    // ──────────────────────────────────────────
    console.error('[d2c-crawl] Extracting DOM structure...');

    const dom = await page.evaluate(() => {
      const MAX_DEPTH = 8;
      const MAX_CHILDREN = 30;

      function buildTree(el, depth = 0) {
        if (depth > MAX_DEPTH) return null;
        const tag = el.tagName?.toLowerCase() || 'unknown';
        const id = el.id || undefined;
        const classes = el.className && typeof el.className === 'string'
          ? el.className.split(/\s+/).filter(Boolean).slice(0, 10)
          : [];

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0 && depth > 1) return null;

        const style = getComputedStyle(el);
        const node = {
          tag,
          id,
          classes,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          },
          style: {
            display: style.display,
            position: style.position,
            flexDirection: style.display.includes('flex') ? style.flexDirection : undefined,
            gap: style.gap !== 'normal' ? style.gap : undefined,
            padding: style.padding,
            margin: style.margin,
          },
          text: (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'p' || tag === 'a' || tag === 'button' || tag === 'span')
            ? (el.textContent?.trim().slice(0, 100) || undefined)
            : undefined,
          children: [],
        };

        // 语义化元素
        const semantic = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'form'];
        if (semantic.includes(tag)) node.semantic = true;

        // 只取前 MAX_CHILDREN 个子元素
        const children = Array.from(el.children).slice(0, MAX_CHILDREN);
        for (const child of children) {
          const childNode = buildTree(child, depth + 1);
          if (childNode) node.children.push(childNode);
        }

        return node;
      }

      return buildTree(document.body);
    });

    // ──────────────────────────────────────────
    // 3. 提取资源
    // ──────────────────────────────────────────
    console.error('[d2c-crawl] Extracting assets...');

    const assets = await page.evaluate(() => {
      const images = [];
      const svgs = [];
      const fonts = [];

      // 图片
      const imgs = document.querySelectorAll('img[src]');
      imgs.forEach(img => {
        const src = img.src || img.getAttribute('src');
        const alt = img.alt || '';
        const rect = img.getBoundingClientRect();
        if (src && rect.width > 0 && rect.height > 0) {
          images.push({
            src: src.startsWith('data:') ? src.slice(0, 60) + '...' : src,
            alt,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            aspectRatio: (rect.width / rect.height).toFixed(2),
            type: src.startsWith('data:image/svg') ? 'svg' : 'image',
          });
        }
      });

      // 内联 SVG
      const svgEls = document.querySelectorAll('svg');
      svgEls.forEach(svg => {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svgs.push({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            class: svg.className?.baseVal || '',
          });
        }
      });

      // 背景图片
      const bgEls = document.querySelectorAll('[style*="background-image"], [style*="background:"]');
      bgEls.forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
          images.push({
            src: bg.slice(0, 100),
            type: 'background',
            width: Math.round(el.getBoundingClientRect().width),
            height: Math.round(el.getBoundingClientRect().height),
          });
        }
      });

      return { images, svgs, fonts };
    });

    // ──────────────────────────────────────────
    // 4. 多视口截图（仅取缩略图 base64）
    // ──────────────────────────────────────────
    console.error('[d2c-crawl] Taking screenshots at multiple viewports...');

    const screenshots = {};
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 60,
        fullPage: false,
      });
      screenshots[name] = {
        viewport: { width: vp.width, height: vp.height },
        label: vp.label,
        base64: screenshot.toString('base64'),
      };
      console.error(`[d2c-crawl]   ${vp.label}: ${(screenshot.length / 1024).toFixed(1)} KB`);
    }

    // ──────────────────────────────────────────
    // 5. 响应式断点检测
    // ──────────────────────────────────────────
    console.error('[d2c-crawl] Detecting responsive breakpoints...');

    const mediaQueries = await page.evaluate(() => {
      const breakpoints = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.media) {
              const text = rule.media.mediaText;
              const minMatch = text.match(/min-width:\s*(\d+)px/);
              const maxMatch = text.match(/max-width:\s*(\d+)px/);
              if (minMatch || maxMatch) {
                breakpoints.push({
                  raw: text,
                  minWidth: minMatch ? parseInt(minMatch[1]) : null,
                  maxWidth: maxMatch ? parseInt(maxMatch[1]) : null,
                });
              }
            }
          }
        } catch (e) {
          // 跨域 CSS 无法访问
        }
      }
      return breakpoints;
    });

    // ──────────────────────────────────────────
    // 6. 组装输出
    // ──────────────────────────────────────────
    const result = {
      source: url,
      sourceType: 'website',
      project: {
        name: title || basename(url) || url,
        url: pageUrl,
        pages: [{ url: pageUrl, title }],
      },
      tokens: {
        colors: tokens.colors,
        typography: tokens.typography,
        spacing: tokens.spacing,
        radius: tokens.radius,
        shadows: tokens.shadows,
      },
      dom: dom,
      assets: {
        images: assets.images.slice(0, 50),
        svgs: assets.svgs.slice(0, 20),
        fonts: assets.fonts.slice(0, 10),
      },
      screenshots,
      responsive: {
        breakpoints: mediaQueries,
        viewports: Object.fromEntries(
          Object.entries(VIEWPORTS).map(([k, v]) => [k, { width: v.width, height: v.height, label: v.label }])
        ),
      },
      meta: {
        crawledAt: new Date().toISOString(),
        tool: 'd2c-crawl v1.0',
        nodeVersion: process.version,
      },
    };

    // ──────────────────────────────────────────
    // 7. 输出
    // ──────────────────────────────────────────
    const json = JSON.stringify(result, null, 2);

    if (outputPath) {
      writeFileSync(outputPath, json, 'utf-8');
      console.error(`[d2c-crawl] Output written to: ${outputPath}`);
    }

    // 输出到 stdout（不含截图 base64，太大）
    const { screenshots: _, ...resultWithoutScreenshots } = result;
    resultWithoutScreenshots.screenshots = {};
    Object.entries(screenshots).forEach(([k, v]) => {
      resultWithoutScreenshots.screenshots[k] = {
        viewport: v.viewport,
        label: v.label,
        base64: `[${v.base64.length} chars]`,
      };
    });

    console.log(JSON.stringify(resultWithoutScreenshots, null, 2));

    // 缩略图单独写入文件
    if (outputPath) {
      const thumbDir = join(dirname(outputPath), 'screenshots');
      mkdirSync(thumbDir, { recursive: true });
      for (const [name, shot] of Object.entries(screenshots)) {
        const thumbPath = join(thumbDir, `${name}.jpg`);
        const buf = Buffer.from(shot.base64, 'base64');
        writeFileSync(thumbPath, buf);
        console.error(`[d2c-crawl] Screenshot saved: ${thumbPath} (${(buf.length / 1024).toFixed(1)} KB)`);
      }
    }

    return result;
  } catch (err) {
    console.error(`[d2c-crawl] Error: ${err.message}`);
    console.log(JSON.stringify({
      source: url,
      sourceType: 'website',
      error: err.message,
      meta: { crawledAt: new Date().toISOString(), tool: 'd2c-crawl v1.0' },
    }, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

main();