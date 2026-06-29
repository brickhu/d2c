# D2D — Design2Deploy

> **设计驱动的AI开发体系。从设计到部署，诊断先行。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

D2D 是一个由 7 步状态机驱动的设计 → 部署管线。收到设计稿后，它扮演资深全栈架构师的角色，在写任何代码之前先做诊断对齐，最终交付可部署的完整应用。核心原则：**拒绝盲目编码，诊断先行。**

## 安装

> **前提**：解析 Figma 设计稿需要 [Personal Access Token](https://www.figma.com/developers/api#access-tokens)。没有也能用——自动回退到截图分析模式。

### Claude Desktop（推荐）

将 [SKILL.md](./SKILL.md) 保存为技能，之后随时触发：

```
/d2d  https://www.figma.com/design/xxx/MyDesign
/d2d  [上传截图]
```

### Claude Code / Cursor / Windsurf

复制 SKILL.md 内容到 `CLAUDE.md` / `.cursorrules` / `.windsurfrules`。

### 其他 Agent

支持多模态视觉 + 工具调用的 Agent 均可将 SKILL.md 作为系统提示词注入。

## 工作流

```
Step 1 🔍 DIAGNOSIS    —— 扫描设计稿，输出视觉诊断报告，用户确认
Step 2 🎨 TOKENS       —— 提取 Design Tokens → .d2d/DESIGN.md
Step 3 🏗️ ARCHITECTURE —— 逐个问答确定技术栈/数据库/部署/CI/CD → .d2d/AGENT.md
Step 4 📐 SPEC         —— 目录结构 + 组件树 + 编码约束 → .d2d/SPEC.md
Step 5 ⚡ INIT          —— 脚手架 ＋ 原子化任务列表 PLAN.md
Step 6 💻 CODE          —— 按 PLAN.md 逐步编码，每步确认
Step 7 🚀 DEPLOY        —— CI/CD 配置 + 构建验证 + 部署指引
```

- 每步完成后等待用户确认，支持中断恢复（`.d2d/STATE.md`)
- Step 1 自动校验设计稿类型，只支持 **Web / iOS / Android / 桌面应用**，非应用设计明确拒绝
- 因果引导式交互："由于项目需要实时数据，建议 WebSocket，你觉得呢？"

## 产物

| 文件 | 内容 |
|------|------|
| `.d2d/DESIGN.md` | 设计 Token（颜色、字体、间距、阴影） |
| `.d2d/AGENT.md` | 技术栈决策与 ADR |
| `.d2d/SPEC.md` | 组件树、目录结构、编码约束 |
| `PLAN.md` | 原子化开发任务列表 |

## 兼容 Agent

| Agent | 方式 |
|-------|------|
| Claude Desktop | ✅ 原生技能，`/d2d` 触发 |
| Claude Code | ✅ `CLAUDE.md` |
| Cursor | ✅ `.cursorrules` |
| Windsurf | ✅ `.windsurfrules` |
| 任何 MCP 兼容 Agent | ✅ 封装为 MCP 工具或系统提示词 |

## License

MIT
