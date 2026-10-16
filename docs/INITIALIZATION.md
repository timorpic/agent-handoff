# 初始化与使用

## 模板文件树

~~~text
项目根目录/
├── AGENTS.md                  # 精简启动入口与必守边界
├── CLAUDE.md                  # Claude Code 统一入口
├── README.md                  # 项目简介与快速开始
├── MEMORY.md                  # 长期知识与决策索引
├── DESIGN.md                  # 视觉与交互规范（无 UI 时不适用）
├── CHANGELOG.md               # 版本变更与升级说明
├── TODO.md                    # 任务计划与依赖
├── HANDOFF.md                 # P0+P1 人工接力协议
├── PROMPTS.md                 # 初始化、交接与恢复提示
├── .handoff/
│   ├── CONTEXT.md             # 活动任务目标与验收入口
│   └── CHECKPOINT.md          # 执行现场、验证与下一步
├── adapters/
│   └── ENTRY.md               # 其他工具可显式使用的统一入口
└── docs/
    ├── INITIALIZATION.md      # 模板初始化与使用说明（本文件）
    ├── AGENT-RULES.md         # 开发、记忆、Release 与接力详细规则
    ├── PROJECT-SPEC.md        # 产品目标、范围与验收
    ├── ARCHITECTURE.md        # 系统架构与模块边界
    ├── DEVELOPMENT.md         # 环境、开发与验证流程
    └── DEPLOYMENT.md          # 构建、部署与回滚
~~~

以上为模板实际包含的文件。组件指南、页面结构、组件注册和 ADR 文档按需建立，
见下文“按需增加的文档”；不预先加入空目录或虚构项目内容。

## 文件职责

| 文件 | 主记录内容 |
| --- | --- |
| README.md | 项目简介、技术栈摘要和快速开始 |
| AGENTS.md | 精简启动入口、必守边界及章节读取路由 |
| docs/AGENT-RULES.md | 开发、质量、安全、图标、Release、长期知识与协作详细规则 |
| CLAUDE.md / adapters/ENTRY.md | 工具入口，引用统一规则 |
| MEMORY.md | 当前有效的长期知识及决策索引 |
| DESIGN.md | 有 UI 的项目采用的视觉与交互规范 |
| CHANGELOG.md | 面向使用者的版本变更和升级说明 |
| TODO.md / 既有 Issue 系统 | 任务计划、依赖及计划状态 |
| docs/PROJECT-SPEC.md | 产品目标、范围、需求与验收 |
| docs/ARCHITECTURE.md | 当前系统架构、模块职责及数据流 |
| docs/DEVELOPMENT.md | 开发环境、验证及贡献流程 |
| docs/DEPLOYMENT.md | 构建、部署、发布验证与回滚 |
| HANDOFF.md | P0+P1 人工接力协议 |
| .handoff/CONTEXT.md | 活动任务目标及正式文档入口 |
| .handoff/CHECKPOINT.md | 执行现场、验证结果和最近下一步 |
| PROMPTS.md | 初始化、交接、接管与恢复提示 |

所有项目事实和任务字段均待初始化。规则中的示例不代表实际项目事实。

## 入口与详细规则

AGENTS.md 是精简启动入口；CLAUDE.md 和 adapters/ENTRY.md 引导工具读取同一入口。
详细工作规则统一保留在 docs/AGENT-RULES.md，章节编号用于稳定引用。
先读取入口规定的基础章节，再按任务补读记忆、图标、发版或接力章节。
已有同一会话内已读且未变化的规则无需重复加载。

入口引用只是读取指令，不会自动把被引用文件全文注入上下文；
执行工具须实际读取所需章节。工具输出被截断时应补读，不能默认为已读完。
入口应持续保持精简，避免添加长篇正文；不通过修改工具全局配置提高限制来代替精简。

## 首次使用

1. 将模板文件及 .handoff 点目录复制到目标项目；已有同名文件先核对并合并，不能直接覆盖。
   在目标项目初始化前，先按下方“模板文件的 Git 跟踪策略”配置并验证忽略规则。
2. 确认目标项目根目录和稳定 project_id，写入 MEMORY；不使用模板目录或下载包名。
3. 按当前项目填写 README、PROJECT-SPEC、ARCHITECTURE 和 DEVELOPMENT；未知信息保留待确认。
   部署流程尚未确定时 DEPLOYMENT 保持空白；没有 UI 时 DESIGN 标明不适用。
4. 只把长期有效且容易遗漏的事实和决策摘要写进 MEMORY，详细依据引用正式文档。
5. 有实际任务后初始化 CONTEXT 和首份 CHECKPOINT；没有任务时保留 draft。
6. 使用工具原生支持的规则入口；Claude Code 使用 CLAUDE.md，支持 AGENTS.md 的工具使用根目录 AGENTS.md。
   入口未加载或工具无对应机制时，可显式使用 adapters/ENTRY.md。
   在实际工具中核实文件已读取，入口未加载时使用 PROMPTS 中的显式提示。

## 模板文件的 Git 跟踪策略

接入目标项目时，以下 18 个模板文件仅保留在本地，不纳入目标项目的 Git 跟踪。
本策略也适用于 README、需求、架构、开发和部署等清单内文档；
目标项目已有同名文件时保留其内容及用户修改，取消跟踪前核对索引差异。
模板源仓库自身继续跟踪这些文件，以便维护和分发，不对源仓库执行此策略。

将以下根目录锚定路径逐项加入目标项目的 `.gitignore`，保留既有规则并避免重复：

~~~gitignore
/AGENTS.md
/CLAUDE.md
/README.md
/MEMORY.md
/HANDOFF.md
/PROMPTS.md
/TODO.md
/DESIGN.md
/CHANGELOG.md
/.handoff/CONTEXT.md
/.handoff/CHECKPOINT.md
/adapters/ENTRY.md
/docs/AGENT-RULES.md
/docs/INITIALIZATION.md
/docs/PROJECT-SPEC.md
/docs/ARCHITECTURE.md
/docs/DEVELOPMENT.md
/docs/DEPLOYMENT.md
~~~

- 不整体忽略 `.handoff/`、`adapters/` 或 `docs/`，不自动扩展到清单外文件。
- 未跟踪的文件只配置忽略；已跟踪的文件使用 `git rm --cached -- <路径>` 取消跟踪，
  命令路径不带开头的 `/`。不得删除本地文件或使用 `-f` 强制丢弃暂存差异。
- 遇到索引与工作区内容冲突时保留现场，说明具体路径及差异，先完成其他可独立操作。
- 配置后逐项核对本地文件仍存在、内容未变，并用 `git ls-files -- <路径>` 确认索引中无目标文件，
  用 `git check-ignore -v -- <路径>` 确认忽略生效；只写 `.gitignore` 不代表已取消跟踪。
- 不存在的文件不创建空文件，保留对应忽略规则以覆盖后续初始化生成的文件，并汇报缺失项。
- 非 Git 项目先准备根目录 `.gitignore`，明确跟踪验证尚未运行；执行 `git init` 后补验再暂存文件。
- `.gitignore` 本身可纳入目标项目的版本控制；提交、推送仍需已有授权。
- 对已跟踪文件取消跟踪后，提交会使其从仓库当前版本中移除，历史提交仍保留；
  协作者拉取时可能删除其原有受跟踪副本，应在交付说明中明确此影响。
- 被忽略文件不随普通 Git 克隆、拉取或推送传递，跨机接力须按 HANDOFF.md 核实本地副本。

## 避免重复维护

已有 PRD、架构文档、任务系统或部署手册时沿用原记录，模板文件可只提供入口。
TODO 维护计划，CHECKPOINT 维护实际现场；完成状态必须有验收证据。
MEMORY 只摘录长期约束并链接主记录，不复制完整架构、设计或需求。
CONTEXT 引用需求条款和当前任务，不复制长期知识。

## 阅读与维护路径

1. 开始或接手任务：先读适用 AGENTS.md，按入口读取 docs/AGENT-RULES.md 对应章节，再核对 MEMORY 的现行事实、CONTEXT 和最新 CHECKPOINT。
2. 依据 CONTEXT 的精确引用读取相关需求、架构、开发或部署文档，避免遍历全部文档。
3. 只有需要核对决定理由、旧问题或恢复依据时，读取相关 ADR、经验历史或归档检查点。
4. 文件树与职责表只做导航；新增、移动、删除文档时同步更新，不记录进度和决定。
5. MEMORY 通过条目 ID 链接详细依据；历史变多时按 docs/AGENT-RULES.md 第 17.2 节整理，关键约束不能因时间较旧丢失。
6. 正常结束或交接填写检查点结果摘要，区分已完成、未完成、未验证和阻塞条件。

本套模板是可由不同工具执行的文件协议。入口读取、记忆整理和结果记录须由当前工具实际执行；
文件存在本身不能保证自动注入上下文、强制互斥或结果校验。
初始化后先用一个小任务验证实际读取和人工切换，再用于复杂工作。

## 按需增加的文档

- docs/COMPONENT-GUIDELINES.md：有复用组件体系时记录组件、样式、依赖与无障碍要求。
- docs/PAGE-STRUCTURE.md：页面较多且路由/页面职责需要专门说明时建立。
- docs/REGISTRY.md：确实存在组件注册、构建和分发机制时建立。
- docs/adr/：重要决策需要记录详细背景、备选方案和后果时建立。
- docs/knowledge/：经验说明或历史过长时按需建立，MEMORY 保留稳定条目 ID 和入口。

这些文件不要求每个项目创建；通用详细要求维护在 docs/AGENT-RULES.md，项目文档只写实际适用的约定。
部署平台、技术栈、数据库、版本基准年和发布渠道由当前项目确定。

## 人工接力

在可恢复的小步骤及关键验证后更新检查点。
切换前停止旧工具写入；接手者核对项目、上下文版本、分支、HEAD、
未提交与未跟踪文件，以及外部操作实际状态。
突然退出按 HANDOFF.md 恢复，不将未知结果写成成功。
新任务开始前将旧上下文与检查点成对归档。
不配置自动 Agent 调度、余额探测或自动工具切换。