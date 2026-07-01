# D2C — Design2Context

> 将设计文件或线上网页转换为结构化的全栈 AI 开发上下文。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="README.md">English</a> · <a href="#readme">中文</a>
</p>

**D2C 是一个把设计稿转换为开发上下文的工作流**——从视觉设计文件中提取设计令牌、全栈架构规范、API 契约、数据模型、组件状态模式和执行计划，组织成 Code Agent（Claude Code、Cursor、Windsurf 或 TRAE）能消费的上下文文件，用于生成与设计对齐的全栈代码。

---

## 目录

- [安装](#安装)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [D2C 生成的产物](#d2c-生成的产物)
- [命令列表](#命令列表)
- [工作原理](#工作原理)
- [完整工作流示例](#完整工作流示例)
- [Agent 兼容性](#agent-兼容性)
- [AI 补全 — 填补设计缺口](#ai-补全--填补设计缺口)
- [常见问题 / 故障排查](#常见问题--故障排查)
- [许可证](#许可证)

---

## 安装

D2C 以 AI skill 包的形式发布在 npm 上。一条命令即可完成安装：

```bash
# 从 GitHub 安装（推荐）
npx skills add brickhu/d2c

# 使用完整 GitHub URL 安装
npx skills add https://github.com/brickhu/d2c
```

`skills` CLI 会自动检测你的 AI 编码工具环境，并将 skill 文件安装到正确的目录：

> **💡 提示：** `skills` 安装器是一个零依赖的 CLI 工具。如果你之前没用过，`npx` 会自动下载并缓存——无需全局安装。

---

## 环境要求

| 要求 | 最低版本 | 说明 |
|------|---------|------|
| **Node.js** | >= 18 | 辅助脚本所需（`d2c-status.js`, `d2c-fetch.js`） |
| **AI 编码工具** | 任意 | Claude Code、Cursor、Windsurf、TRAE IDE / CLI |
| **Figma MCP** | 推荐 | 零 token 的 Figma 访问——D2C 会在缺失时引导你完成配置 |

---

## 快速开始

```bash
# 1. 安装 D2C
npx skills add brickhu/d2c

# 2. 进入你的项目目录
cd my-project

# 3. 在你的 AI 编码工具中输入：
#    /d2c <你的 Figma 链接/截图/网页 URL>
#    例如: /d2c https://stripe.com/pricing

# 4. 按照引导的 5 步工作流操作——D2C 生成全栈上下文
#    覆盖 UI → API → 数据 → 基础设施

# 5. 随时优化：
#    /d2c 所有 API 响应使用 snake_case
#    /d2c 接入 Sentry 错误监控

# 6. 准备好后生成代码：
#    /d2c code   → 按计划实现
#    /d2c test   → 生成测试套件
#    /d2c deploy → 准备部署
```

---

## D2C 生成的产物

处理设计稿后，D2C 在项目中生成以下上下文文件：

| 文件 | 内容 |
|------|------|
| `.d2c/DESIGN.md` | 设计令牌 + 行为约束 + 响应式断点 + 设计源 URL。纯文档。 |
| `.d2c/AGENTS_bak.md` | D2C 续跑/参考用的权威副本 | 步骤三（副本） |
| `.d2c/SPEC.md` | 组件树、API 契约、数据库 Schema、状态模式、测试策略、无障碍/安全基线 |
| `.d2c/ASSETS.md` | 图片与动画资产清单（含本地路径） |
| `PLAN.md` | 原子任务列表（前端 → 后端 → 测试 → 部署） |
| `.d2c/PLAYBOOK.md` | 执行手册——环境变量、实施阶段、部署步骤 |
| `.env.example` | 开发者入门的环境变量模板 |

**覆盖维度：** 全栈——前端 UI、后端 API、数据模型、基础设施。

---

## 命令列表

所有命令在安装 D2C 后，**在你的 AI 编码工具的对话窗口中使用**：

| 命令 | 作用 |
|------|------|
| `/d2c <设计稿>` | **智能入口**——自动检测输入类型（设计稿、网页、命令）并路由到爬取/初始化/更新/开始 |
| `/d2c <任何内容>` | **上下文修改**——任何自然语言都能优化已有上下文 |
| `/d2c code` | 按 PLAN.md 执行代码实现 |
| `/d2c test` | 生成测试套件 |
| `/d2c deploy` | 准备部署 |
| `/d2c init [链接]` | 强制全新开始（备份已有状态，重新进入步骤一） |
| `/d2c update [链接]` | 在当前设计上迭代（恢复或增量对比） |
| `/d2c sync` | 将令牌变更推回 Figma |

---

## 工作原理

```
输入: Figma URL / .fig / 图片 / 网页 URL / 自然语言
           │
           ▼
  ┌───────────────────────────────────────────────┐
  │  阶段一：上下文生成（始终运行）                │
  │                                               │
  │  步骤一 → STATE.md（诊断 + 冲突识别）          │
  │  步骤二 → DESIGN.md（设计令牌 + 约束）          │
  │  步骤三 → AGENTS.md（架构决策）                │
  │  步骤四 → SPEC.md（组件 + API + 数据库 +      │
  │            状态 + 无障碍 + 安全）               │
  │  步骤五 → ASSETS.md + PLAN.md + PLAYBOOK.md   │
  │            + .env.example                      │
  │                                               │
  │  输出：全栈系统上下文                          │
  │  覆盖 UI → API → 数据 → 基础设施              │
  └───────────────────────────────────────────────┘
           │（由用户触发 /d2c code|test|deploy）
           ▼
  ┌───────────────────────────────────────────────┐
  │  阶段二：执行（按需启动）                      │
  │  /d2c code  → 代码实现                        │
  │  /d2c test  → 测试生成                        │
  │  /d2c deploy→ 部署配置                        │
  └───────────────────────────────────────────────┘
           ▲
           └── 随时可以通过以下命令修改上下文
               (/d2c <自然语言>)
```

---

## 完整工作流示例

一个完整的 D2C 使用过程：

```bash
# ── 1. 安装 ──
npx skills add brickhu/d2c

# ── 2. 开始项目 ──
cd ~/Projects/dashboard-app

# ── 3. 处理设计稿（在 AI 工具中）──
> 输入: /d2c https://figma.com/file/abc123

# D2C 检测到：空项目 → 自动进入步骤一

# ── 4. 经历 5 个引导步骤（AI 提问，你回答）──
# 步骤一：项目调查 → 诊断报告
# 步骤二：令牌提取 → DESIGN.md（纯文档）
# 步骤三：架构问答（全栈）→ AGENTS.md
# 步骤四：组件树 + API 契约 + 数据库 Schema → SPEC.md
# 步骤五：资产 + PLAN.md + PLAYBOOK.md + .env.example

# ── 5. 上下文已完成！随时修改 ──
> /d2c 用 MongoDB 代替 PostgreSQL
> /d2c 加 Stripe 支付 webhook 接口
> /d2c 锁定布局组件（不要修改它们）

# ── 6. 生成代码 ──
> /d2c code   → 实现全栈应用
> /d2c test   → 编写单元 + 集成 + E2E 测试
> /d2c deploy → 配置 CI/CD 和部署
```

---

## Agent 兼容性

D2C 输出的上下文文件遵循所有主流 AI 编码工具认可的标准约定：

- **Claude Code** — 自动检测 `AGENTS.md`、`PLAN.md`、`.clinerules`
- **Cursor** — 读取 `.cursorrules`
- **Windsurf** — 自动加载 `AGENTS.md`
- **TRAE IDE / CLI** — 通过已安装的 skill 加载

无需额外配置。`npx skills add brickhu/d2c` 之后，上下文文件已被放置在你的 AI 工具已经会查找的位置。

---

## AI 补全 — 填补设计缺口

设计文件无法指定全栈项目所需的一切信息。D2C 使用 **AI 提议、用户确认** 的模式来处理设计无法告知的每一个决策。AI 会推荐一个带有理由的默认方案，提供备选方案，并请求确认。

| 设计覆盖的内容 | 需要 AI 补全 |
|--------------|-------------|
| 颜色、排版、间距 | 环境变量 |
| 表单字段、表格列 | API 契约 Schema |
| 数据实体 | 数据库 Schema、ORM 选择 |
| 加载动画、空状态 | 组件状态模式 |
| 弹窗、导航、下拉菜单 | 无障碍规则 |
| 登录表单、文件上传 | 安全基线 |

---

## 常见问题 / 故障排查

### `npx skills add brickhu/d2c` 失败并报 ENOENT？

确保已安装 Node.js >= 18：

```bash
node --version
```

### 安装后 AI 工具看不到 D2C？

安装后请重启你的 AI 编码工具。Skills 在启动时加载。

### D2C 无法连接 Figma？

试试**插件路径**：在 Figma 桌面应用中打开设计，运行"导出为 .fig"插件，然后直接传入文件：

```bash
# 在你的 AI 工具中：
/d2c path/to/design.fig
```

这种方式绕过了 MCP 和 REST API——无需令牌。

### 能用 D2C 逆向解析已有网站吗？

可以。直接传入网页 URL：`/d2c https://example.com`。D2C 会爬取网站，提取设计令牌、颜色、字体、间距和 DOM 结构，生成与设计稿相同的上下文文件。

### 没有 Figma 设计稿也能用 D2C 吗？

可以。D2C 接受截图、导出的图片、`.sketch` 文件和 `.fig` 文件。任何视觉设计表现形式都可以作为输入。

### D2C 会生成代码吗？

仅在您要求时才会。默认情况下 D2C 在生成上下文文件（阶段一）后停止。代码生成（`/d2c code`）是一个独立的、由用户触发的步骤。

### 能在现有项目中使用 D2C 吗？

可以。D2C 会检测现有项目并自适应：它会读取你当前的配置文件，预填技术栈决策，仅询问缺失的信息。

---

## 许可证

MIT — 详见 [LICENSE](LICENSE)

Copyright © 2026 fei