# Agent Handoff

面向 AI 编程工具（Claude Code、Codex 等）的通用项目治理模板：
统一规则入口、长期知识、共享技能库与研发治理规则，供新项目一键初始化。

模板不预设业务、技术栈或部署平台，不携带具体项目的历史，也不包含自动调度或跨工具并发能力。

新项目默认获得行为治理规则、任务契约样例与 Git Diff 范围检查器，见 [研发治理](docs/AI-GOVERNANCE.md)。
初始化不导入本模板的任务历史；CI 检查命令和主分支保护由新项目按实际情况接入，不批量更新现有项目。

## 一键初始化

进入你的项目文件夹，运行：

```bash
curl -fsSL https://raw.githubusercontent.com/timorpic/agent-handoff/HEAD/scripts/bootstrap.sh | bash
```

需要 Bash、curl、tar 和常见系统工具，初始化不依赖 Git 或 Node.js。
始终初始化当前目录，已有同名文件会导致停止；已有 README.md 保留，不影响安装其他文件。
没有 README.md 时生成空白项目说明，不把本页复制进项目。

也可以先下载脚本，预览后初始化：

```bash
curl -fsSL https://raw.githubusercontent.com/timorpic/agent-handoff/HEAD/scripts/bootstrap.sh -o /tmp/agent-handoff-bootstrap.sh
bash /tmp/agent-handoff-bootstrap.sh --dry-run
bash /tmp/agent-handoff-bootstrap.sh
```

初始化后填写项目需求和说明，未知信息保留待填写。

## 模板提供什么

- 统一规则入口：根 [AGENTS.md](AGENTS.md) 是唯一规则入口，详细规则在
  [docs/AGENT-RULES.md](docs/AGENT-RULES.md)（开发、质量、安全、图标、Release、长期知识）。
- 长期知识：[MEMORY.md](MEMORY.md) 记录项目长期事实与已确认决策。
- 共享技能库：根目录 [skills/](skills/README.md) 提供代码审查、重构、发版等工作流，
  供各客户端按需读取。
- 研发治理：任务契约与 PR 范围检查，见 [docs/AI-GOVERNANCE.md](docs/AI-GOVERNANCE.md)。
- 初始化工具：`scripts/bootstrap.sh`（纯 Shell）与 `scripts/init.mjs`（零依赖 Node 生成器），
  以及只读一致性自检 `scripts/check-docs.sh`。

模板不包含任务接力能力：不提供跨工具交接协议、活动任务上下文或检查点机制；
多客户端共用同一套规则文件，工具切换由用户手动完成。

## 通过 Agent 接入

在目标项目中打开编程工具，按实际情况复制下面对应的提示词。

### 新项目：首次初始化

```text
请使用 https://github.com/timorpic/agent-handoff，为当前新项目完成首次初始化。

先确认当前项目根目录和已有文件，读取适用的上层及本地规则。
将模板下载到临时目录，核对后初始化当前项目。

要求：
1. 只引入通用规则、工具入口、共享工作流和研发治理规则，不导入模板仓库的身份、维护历史、测试结果或其他项目的信息。
2. 保留已有文件和未提交修改；遇到同名文件先核对，不直接覆盖。项目已有 README.md 时保留，没有时生成空白项目说明。
3. 项目标识根据当前项目核实并统一填写；业务目标、技术栈、架构、部署等未知信息保留待填写，不自行编造。
4. 采用统一规则入口，客户端入口只引用；不增加自动调度或跨工具并发。
5. 核对文件引用、技能链接、忽略规则和实际客户端入口，执行适用检查。
6. 不提交、不推送、不发布。完成后说明生成内容、验证结果和仍需填写的信息。

在上述范围内直接完成，只有影响项目事实或已有内容的关键歧义才向我确认。
```

### 现有项目：核对并合并规则

```text
请参考 https://github.com/timorpic/agent-handoff，检查并补齐当前项目的统一规则入口、共享技能与研发治理。

先确认当前项目根目录，读取适用规则、长期记忆和相关文档，检查 Git 修改状态。
将参考模板下载到临时目录，先对照现有实现，再做最小必要改动，不整套覆盖或重新初始化。

要求：
1. 以当前项目已确认的需求和有效记录为依据；参考模板只作为改进来源，不自动替换项目约定。
2. 优先复用现有规则入口、记忆、脚本及工作流。已有等效能力时保留，不创建重复文件或平行事实来源。
3. 保留 README、业务代码、项目身份、历史决策及用户未提交修改。
4. 不导入模板仓库的身份、维护历史、测试结果或其他项目的信息。
5. 统一规则入口和记录职责；客户端入口只引用。合并 .gitignore 时保留业务规则，避免忽略正式文档与共享技能。
6. 不增加自动调度或跨工具并发，不因接入模板而扩大提交、发布或其他外部操作授权。
7. 先简要说明现有能力、缺口及拟修改范围，再在已授权范围内完成补齐，执行适用验证并更新相关记录。
8. 不提交、不推送、不发布。完成后列出实际改动、验证结果、未验证项和剩余问题。

兼容性或记录归属存在关键冲突时向我确认；其余按最小改动原则直接完成。
```

## 使用与说明

- [初始化说明与文件职责](docs/INITIALIZATION.md)
- [客户端接入](docs/MULTI-AGENT.md)
- [规则入口](AGENTS.md)与[详细规则](docs/AGENT-RULES.md)
- [共享工作流](skills/README.md)
- [研发治理](docs/AI-GOVERNANCE.md)
- [统一 Git 标准](docs/AGENT-RULES.md#9-git)与[项目 CI 和仓库设置](docs/DEVELOPMENT.md#github-actions-与仓库设置)

新项目按文档/模板工具、配置脚本、静态网站或应用软件选择流程；默认采用短期任务分支、规范化 Commit/PR 标题、PR 审查与 Squash merge，不默认套用软件发布模型。
初始化只分发 PR 模板，不提供或生成目标项目 CI；目标项目自行维护 CI 并核实远程主分支保护。
模板自身的检查仅由本仓库 GitHub Actions 执行，不分发到目标项目。

本 README 只介绍模板自身；项目 README 的空白样板是 [README.project.md](README.project.md)。
