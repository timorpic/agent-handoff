# 初始化与使用

## 模板文件树

~~~text
项目根目录/
├── AGENTS.md                  # 精简启动入口与必守边界          [项目层·跟踪]
├── CLAUDE.md                  # Claude Code 统一入口             [协议层·不跟踪]
├── README.md                  # 项目简介与快速开始               [项目层·跟踪]
├── MEMORY.md                  # 长期知识与决策索引               [项目层·跟踪]
├── DESIGN.md                  # 视觉与交互规范（无 UI 时不适用） [项目层·跟踪]
├── CHANGELOG.md               # 版本变更与升级说明               [项目层·跟踪]
├── TODO.md                    # 任务计划与依赖                   [项目层·跟踪]
├── HANDOFF.md                 # P0+P1 人工接力协议               [协议层·不跟踪]
├── PROMPTS.md                 # 初始化、交接与恢复提示           [协议层·不跟踪]
├── .handoff/
│   ├── CONTEXT.md             # 活动任务目标与验收入口           [现场层·不跟踪]
│   ├── CHECKPOINT.md          # 执行现场、验证与下一步           [现场层·不跟踪]
│   └── archive/               # 归档任务上下文与检查点           [项目层·跟踪]
├── adapters/
│   └── ENTRY.md               # 其他工具可显式使用的统一入口     [协议层·不跟踪]
└── docs/
    ├── INITIALIZATION.md      # 本文件；不复制到目标项目         [仅模板仓库]
    ├── AGENT-RULES.md         # 开发、记忆、Release 与接力规则   [协议层·不跟踪]
    ├── PROJECT-SPEC.md        # 产品目标、范围与验收             [项目层·跟踪]
    ├── ARCHITECTURE.md        # 系统架构与模块边界               [项目层·跟踪]
    ├── DEVELOPMENT.md         # 环境、开发与验证流程＋项目专属规则 [项目层·跟踪]
    └── DEPLOYMENT.md          # 构建、部署与回滚                 [项目层·跟踪]
~~~

以上为模板实际包含的文件。组件指南、页面结构、组件注册和 ADR 文档按需建立，
见下文“按需增加的文档”；不预先加入空目录或虚构项目内容。
跟踪策略见下文“模板文件的 Git 跟踪策略”。

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
   docs/INITIALIZATION.md 不复制；先按“模板文件的 Git 跟踪策略”配置并验证忽略规则。
2. 确认目标项目根目录和稳定 project_id，写入 MEMORY；不使用模板目录或下载包名。
3. 按当前项目填写 README、PROJECT-SPEC、ARCHITECTURE 和 DEVELOPMENT；未知信息保留待确认。
   部署流程尚未确定时 DEPLOYMENT 保持空白；没有 UI 时 DESIGN 标明不适用。
4. 只把长期有效且容易遗漏的事实和决策摘要写进 MEMORY，详细依据引用正式文档。
5. 有实际任务后初始化 CONTEXT 和首份 CHECKPOINT；没有任务时保留 draft。
6. 使用工具原生支持的规则入口；Claude Code 使用 CLAUDE.md，支持 AGENTS.md 的工具使用根目录 AGENTS.md。
   入口未加载或工具无对应机制时，可显式使用 adapters/ENTRY.md。
   在实际工具中核实文件已读取，入口未加载时使用 PROMPTS 中的显式提示。
7. 在 MEMORY.md 与 AGENTS.md 记录协议版本（模板仓库 commit SHA）。

## 模板文件的 Git 跟踪策略

模板文件分三层，判据是**跟踪「项目事实」；不跟踪「协议正文」和「会话现场」**。
项目专属规则写进 docs/DEVELOPMENT.md 或 MEMORY.md，不改协议层正文。

### 协议层：不跟踪，由模板统一升级

以下文件由模板仓库单一维护，项目内禁止修改；升级时整体覆盖：

~~~gitignore
/CLAUDE.md
/HANDOFF.md
/PROMPTS.md
/adapters/ENTRY.md
/docs/AGENT-RULES.md
~~~

docs/INITIALIZATION.md（本文件）不复制到目标项目：它说明的是如何初始化，初始化完成后不再适用。

### 现场层：不跟踪，每次会话重写

~~~gitignore
/.handoff/CONTEXT.md
/.handoff/CHECKPOINT.md
/.handoff/*.previous
/.handoff/*.tmp.md
~~~

### 项目层：跟踪

按各项目实际情况纳入版本控制，缺失的不创建空文件：

README.md、AGENTS.md、MEMORY.md、TODO.md、DESIGN.md、CHANGELOG.md、
docs/PROJECT-SPEC.md、docs/ARCHITECTURE.md、docs/DEVELOPMENT.md、docs/DEPLOYMENT.md。

`MEMORY.md` 记录 DEC / LES 长期条目，不跟踪会导致新克隆丢失全部积累，必须纳入。
`.handoff/archive/**` 是冻结的历史证据，同样跟踪。

### 执行要求

- 用锚定路径（前导 `/`），不写 `.handoff/` 或 `docs/` 整体忽略，否则会连带吞掉归档和项目文档。
- 已跟踪的文件用 `git rm --cached -- <路径>` 取消跟踪；不加 `-f`，不删除本地文件。
- 逐项核对：本地文件仍存在且内容未变、`git ls-files` 中无该路径、`git check-ignore -v` 忽略生效。
- 只写 `.gitignore` 不代表已取消跟踪；不存在的文件不创建空文件，保留其忽略规则。
- 非 Git 项目先备好根目录 `.gitignore`，执行 `git init` 后补验。
- 被忽略文件不随克隆传递，跨机接力须按 HANDOFF.md 核实本地副本。

### 协议版本锚定

不跟踪协议正文就必须记录版本，否则无法核对升级与章节引用。

- 协议版本使用模板仓库的 commit SHA，不另造编号。
- 在项目 MEMORY.md 记录：协议版本 SHA 与安装日期。
- AGENTS.md 顶部写同一 SHA。
- 升级＝整体覆盖协议层 5 个文件＋更新 SHA，随后核对章节引用仍可解析：
  `grep -rhoE '第 [0-9]+(\.[0-9]+)? 节' AGENTS.md docs/*.md | sort -u`


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
5. MEMORY 通过条目 ID 链接详细依据；历史变多时按 docs/AGENT-RULES.md 第 13.4 节整理，关键约束不能因时间较旧丢失。
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