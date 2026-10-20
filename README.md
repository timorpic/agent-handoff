# 项目名称

> 待初始化。仅填写当前项目已核实的信息。
> 模板初始化与人工接力使用方法见 [初始化说明](docs/INITIALIZATION.md)。

## 项目简介

<!-- 项目解决的问题、目标用户和主要能力。需求主记录见 docs/PROJECT-SPEC.md。 -->

待填写。

## 技术栈

<!-- 简要列出已采用的技术，不预设框架、数据库或部署平台。 -->

待填写。

## 快速开始

- 环境要求：待填写。
- 安装命令：待填写。
- 必要配置：待填写变量名及安全获取方式，不写凭据。
- 启动命令：待填写。
- 验证命令：待填写。
- 详细开发流程：[DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## 多 Agent 接入

本仓库不绑定单一工具，规则入口只有一个：

| 客户端 | 入口 |
| :--- | :--- |
| Codex / OpenCode / DeepSeek Harness | 直接读取 [AGENTS.md](AGENTS.md) |
| Claude Code | [CLAUDE.md](CLAUDE.md) 指向同一入口，可整体替换为指向 AGENTS.md 的符号链接 |
| Antigravity / Gemini | `.gemini/antigravity/skills` 指向根目录 `skills/`，入口文件按平台核实 |

- 规则正文：[AGENT-RULES.md](docs/AGENT-RULES.md)（按章读取，不全文注入）。
- 共享工作流：[skills/](skills/)（Codex 等不支持项目级技能的客户端按入口步骤按需读取）。
- 接入细节、客户端映射与避坑：[MULTI-AGENT.md](docs/MULTI-AGENT.md)。
- 新建项目骨架：`node scripts/init.mjs --target <目录>`。

## 文档入口

- [模板文件树与初始化说明](docs/INITIALIZATION.md#模板文件树)

- [需求与验收](docs/PROJECT-SPEC.md)
- [系统架构](docs/ARCHITECTURE.md)
- [开发流程](docs/DEVELOPMENT.md)
- [部署与回滚](docs/DEPLOYMENT.md)
- [视觉与交互规范](DESIGN.md)（无 UI 时不适用）
- [任务计划](TODO.md)
- [版本记录](CHANGELOG.md)
- [规则入口](AGENTS.md) / [详细工作规则](docs/AGENT-RULES.md)
- [多 Agent 接入](docs/MULTI-AGENT.md)
- [共享技能库](skills/README.md)
- [长期知识](MEMORY.md)
- [人工接力协议](HANDOFF.md)
- [人工使用提示词](PROMPTS.md)
- [工具适配入口](adapters/ENTRY.md)（按需复制）
- [当前任务](.handoff/CONTEXT.md) / [执行现场](.handoff/CHECKPOINT.md)（如存在；新克隆中缺失属预期）

## 许可证

待项目确认后填写，不默认指定。
