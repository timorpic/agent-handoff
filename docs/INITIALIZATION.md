# 初始化与使用

## 模板文件树

~~~text
项目根目录/
├── AGENTS.md                  # 精简启动入口与必守边界          [项目层·跟踪]
├── CLAUDE.md                  # Claude Code 工具入口             [入口层·跟踪,可适配]
├── README.md                  # 项目简介与快速开始               [项目层·跟踪]
├── MEMORY.md                  # 长期知识与决策索引               [项目层·跟踪]
├── DESIGN.md                  # 视觉与交互规范（无 UI 时不适用） [项目层·跟踪]
├── CHANGELOG.md               # 版本变更与升级说明               [项目层·跟踪]
├── TODO.md                    # 任务计划与依赖                   [项目层·跟踪]
├── HANDOFF.md                 # P0+P1 人工接力协议               [协议层·跟踪,禁改]
├── PROMPTS.md                 # 初始化、交接与恢复提示           [协议层·跟踪,禁改]
├── .gitignore                 # 现场层忽略规则；复制到目标项目   [项目层·跟踪]
├── .handoff/
│   ├── CONTEXT.md             # 活动任务目标与验收入口           [现场层·不跟踪]
│   ├── CHECKPOINT.md          # 执行现场、验证与下一步           [现场层·不跟踪]
│   └── archive/               # 归档任务上下文与检查点           [项目层·跟踪]
├── adapters/
│   └── ENTRY.md               # 无原生 AGENTS.md 机制时按需复制   [入口层·跟踪,可适配]
└── docs/
    ├── INITIALIZATION.md      # 本文件；不复制到目标项目         [仅模板仓库]
    ├── AGENT-RULES.md         # 开发、记忆、Release 与接力规则   [协议层·跟踪,禁改]
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
| CLAUDE.md / adapters/ENTRY.md | 工具入口，引用统一规则（允许按项目适配） |
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

AGENTS.md 是精简启动入口；CLAUDE.md 和 adapters/ENTRY.md 是工具入口，引导工具读取同一入口。
详细工作规则统一保留在 docs/AGENT-RULES.md，章节编号用于稳定引用。
先读取入口规定的基础章节，再按任务补读记忆、图标、发版或接力章节。
已有同一会话内已读且未变化的规则无需重复加载。

入口引用只是读取指令，不会自动把被引用文件全文注入上下文；
执行工具须实际读取所需章节。工具输出被截断时应补读，不能默认为已读完。
入口应持续保持精简，避免添加长篇正文；不通过修改工具全局配置提高限制来代替精简。

## 首次使用

1. 将模板文件及 .handoff 点目录复制到目标项目；已有同名文件先核对并合并，不能直接覆盖。
   docs/INITIALIZATION.md 不复制；先按“模板文件的 Git 跟踪策略”配置并验证忽略规则。
   CLAUDE.md 按目标项目的工具路由合并，adapters/ENTRY.md 仅在需要时复制。
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

模板文件分四层，判据是**跟踪「协议正文」「项目事实」和「工具入口」；只不跟踪「会话现场」**。

### 协议层：跟踪，但项目内禁止修改（vendored 依赖）

以下文件必须能随克隆分发——否则新克隆缺失规则正文和恢复协议，
AGENTS.md 的链接会全部指向不存在的文件，且「文件缺失时如何恢复」的 HANDOFF.md 自己就缺失。
因此**纳入跟踪**，但视作 vendored 依赖：项目内不修改，升级时整体覆盖：

HANDOFF.md、PROMPTS.md、docs/AGENT-RULES.md

修改协议正文会导致项目分叉、章节编号漂移（历史教训：多个项目各自重编号，
同一「第 18 节」在不同项目指向不同章节）。项目专属规则写入 AGENTS.md、
docs/DEVELOPMENT.md 或 MEMORY.md，不改协议层。

### 入口层：跟踪，允许按项目适配

CLAUDE.md、adapters/ENTRY.md

入口文件是薄壳，职责是让工具找到本项目的 AGENTS.md 与规则正文，因此**必须跟踪**
（否则新克隆后 Claude Code 没有入口），但**允许按项目调整**：可写成本项目的工具路由
（如同时指向 backend/AGENTS.md），也可做成指向 AGENTS.md 的符号链接。
入口层不参与协议版本的逐字节校验，升级时不必覆盖；适配后仍须保持精简，不复制规则正文。

adapters/ENTRY.md 是按需文件：只有目标工具既无原生入口又不支持 AGENTS.md 时才需要复制，
其余项目不必创建。文件树中列出它是为了说明模板提供的形态，不代表每个项目都要装。

docs/INITIALIZATION.md（本文件）不复制到目标项目：它说明的是如何初始化，初始化完成后不再适用。

### 现场层：不跟踪，每次会话重写

~~~gitignore
/.handoff/CONTEXT.md
/.handoff/CHECKPOINT.md
/.handoff/*.previous.md        # 规范命名 CHECKPOINT.previous.md
/.handoff/*.previous           # 旧命名 .CHECKPOINT.md.previous
/.handoff/*.tmp.md
~~~

previous 备份统一命名为 `.handoff/CHECKPOINT.previous.md`（见 HANDOFF.md 第 5 节）。
两条 previous 规则都要写：`*.previous` 要求文件名**以 `.previous` 结尾**，
匹配不到规范命名 `CHECKPOINT.previous.md`（它以 `.md` 结尾），必须另写 `*.previous.md`；
存量项目若用旧命名 `.CHECKPOINT.md.previous`，由 `*.previous` 覆盖，不必改名。

### 项目层：跟踪

按各项目实际情况纳入版本控制，缺失的不创建空文件：

README.md、AGENTS.md、MEMORY.md、TODO.md、DESIGN.md、CHANGELOG.md、
docs/PROJECT-SPEC.md、docs/ARCHITECTURE.md、docs/DEVELOPMENT.md、docs/DEPLOYMENT.md。

`MEMORY.md` 记录 DEC / LES 长期条目，不跟踪会导致新克隆丢失全部积累，必须纳入。
`.handoff/archive/**` 是冻结的历史证据，同样跟踪。

### 模板仓库自身的例外：跟踪空白现场层

本模板仓库（分发载体）**保留** `.handoff/CONTEXT.md` 与 `.handoff/CHECKPOINT.md` 的跟踪，
与其他项目相反。判据不变——仍然只跟踪「协议正文、项目事实、工具入口」，
但本仓库分发的正是这些空白模板：`git clone` 只能取得被跟踪的文件，
若在此取消跟踪，克隆者拿不到点目录，首次使用第 1 步「复制 .handoff 点目录」无法执行。

- 根目录 `.gitignore` 照样写入现场层忽略规则：忽略只作用于未跟踪文件，
  不影响两者的跟踪状态；目标项目初始化执行 `git rm --cached` 后规则立即生效。
- 本仓库中的这两份文件必须保持**空白 draft**，不写入模板制作过程、会话记录或测试结果；
  一旦被当作实际工作现场填写，就应改为不跟踪。
- 该例外只适用于模板仓库本身；目标项目必须按上文取消跟踪，不得沿用。

### 执行要求

- 只忽略现场层；用锚定路径，不写 `.handoff/` 或 `docs/` 整体忽略，否则会连带吞掉归档和项目文档。
- 工具入口若为符号链接（如 CLAUDE.md → AGENTS.md），须用 `git add` 纳入符号链接本身
  （模式 120000）；否则新克隆后入口缺失。
- 取消跟踪已跟踪文件时用 `git rm --cached -- <路径>`；不加 `-f`，不删除本地文件。
- 逐项核对：本地文件仍存在且内容未变、`git ls-files` 中无该路径、`git check-ignore -v` 忽略生效。
- 非 Git 项目先备好根目录 `.gitignore`，执行 `git init` 后补验。
- **新克隆自检**：克隆到临时目录，确认工具入口、docs/AGENT-RULES.md 与 HANDOFF.md 均存在，
  并逐条检查 AGENTS.md 的项目层与协议层链接可解析。
  现场层（`.handoff/CONTEXT.md`、`.handoff/CHECKPOINT.md`）在**目标项目**的克隆中**应当缺失**，属预期：
  入口对它们的引用必须带「如存在」或等效说明，缺失时按当前现场重建，不虚构前任记录。
  模板仓库自身例外：克隆中两者应存在且为空白 draft，见上文「模板仓库自身的例外」。

### 交接协议的可核对性

人工接力没有服务端事务，以下字段用于把“谁该接手、谁已接手”变成可核对事实，
不构成自动投递、互斥锁或 CAS：

- CONTEXT：`handoff_id`、`from_agent`；只写标识，不承载指令或授权。
- CHECKPOINT：`owner_lease_id`、`leased_at`、`handoff_claim`，以及“会话交接提示”一节。
- 认领必须按精确 `handoff_id` 并核对 `task_id` 与 `context_revision`；
  不得按“最新”自动认领，避免无关会话消耗交接。
- 提示正文只含元数据；完整检查点内容在认领后读取，并按不可信数据核对。
- 源会话未停止写入时不进入候选，避免活跃会话的交接被旁路取走。
- 同一工作区仍只允许一个写入者；这些字段帮助发现冲突，**不能阻止**并发写入。
  需要强互斥时必须由外部机制提供，不能依赖本协议。

### 协议版本锚定

协议层虽被跟踪，项目内仍禁止修改，故须记录所装版本以便核对升级：

- 协议版本使用模板仓库的 commit SHA，不另造编号。
- 在项目 MEMORY.md 记录：协议版本 SHA 与安装日期。
- AGENTS.md 顶部写同一 SHA。
- 升级＝整体覆盖协议层 3 个文件＋更新 SHA，随后核对章节引用仍可解析：
  `grep -rhoE '第 [0-9]+(\.[0-9]+)? 节' AGENTS.md docs/*.md | sort -u`
- 协议层 3 个文件（HANDOFF.md、PROMPTS.md、docs/AGENT-RULES.md）在项目中应逐字节等于
  所标注 SHA 的模板版本；有差异即为待核实的私改。入口层（CLAUDE.md、adapters/ENTRY.md）
  允许按项目适配，不参与该校验；核对入口时只确认它仍指向 AGENTS.md 且未复制规则正文。



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