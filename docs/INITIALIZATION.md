# 初始化与使用

## 项目定位

本项目是一套面向 AI 编程工具的 Agent 项目模板：定义 Agent 的行为边界，
提供统一规则入口、长期知识、共享技能库与研发治理规则。新项目用它获得一致的
工作规则与检查工具，不携带模板自身的历史，也不包含自动调度或跨工具并发能力。

- 核心能力：Agent 行为边界、统一规则入口、长期知识、共享工作流与范围约定。
- 当前非目标：任务接力（跨工具交接协议、活动任务上下文、检查点）、跨工具并发编排、
  任务分发、自动探测额度或自动切换工具。

本节记录模板仓库的定位；分发给目标项目的 README、需求与 MEMORY 仍按目标项目填写，
不得将模板本身的定位或维护记录带入目标项目。

模板不预填项目身份、任务或验证结论。初始化后，
由目标项目根据实际情况填写；模板维护与测试过程不作为目标项目的历史或授权。

## 模板文件树

~~~text
项目根目录/
├── AGENTS.md                  # 规则入口 SSOT（精简）＋章节路由   [项目层·跟踪]
├── CLAUDE.md                  # Claude Code 工具入口             [入口层·跟踪,可适配]
├── README.project.md          # 空白项目 README 样板（仅模板仓库）
├── README.md                  # 模板介绍；目标项目为自己的说明               [项目层·跟踪]
├── MEMORY.md                  # 长期知识与决策索引               [项目层·跟踪]
├── DESIGN.md                  # 视觉与交互规范（无 UI 时不适用） [项目层·跟踪]
├── CHANGELOG.md               # 版本变更与升级说明               [项目层·跟踪]
├── TODO.md                    # 任务计划与依赖                   [项目层·跟踪]
├── PROMPTS.md                 # 初始化与接入提示                 [协议层·跟踪,禁改]
├── .gitignore                 # 平台缓存忽略规则                 [项目层·跟踪]
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md # PR 描述与验证记录               [项目层·跟踪]
├── skills/                    # 跨客户端共享技能库（标准位置）   [项目层·跟踪]
│   ├── README.md              # 技能规范与新增检查清单
│   ├── code-review/SKILL.md   # 通用代码审查工作流
│   ├── refactor/SKILL.md      # 重构保障工作流
│   └── release/SKILL.md       # 发版与 CHANGELOG 联动
├── .claude/                   # Claude Code 私有配置目录         [项目层·跟踪]
│   ├── settings.json          # 权限与允许的命令（不含凭据）
│   └── skills -> ../skills    # 相对软链，共享根 skills/（Git 模式 120000）
├── .gemini/
│   └── antigravity/
│       └── skills -> ../../skills  # 相对 .gemini/antigravity/，层级必须是两级
├── adapters/
│   ├── ENTRY.md               # 无原生 AGENTS.md 机制时按需复制   [入口层·跟踪,可适配]
│   └── scoped/MODULE-AGENTS.md  # 局部作用域 AGENTS.md 模板
├── scripts/
│   └── bootstrap.sh           # 下载模板并初始化（模板专用）
└── docs/
    ├── INITIALIZATION.md      # 本文件；不复制到目标项目         [仅模板仓库]
    ├── MULTI-AGENT.md         # 客户端映射、作用域与避坑         [项目层·跟踪]
    ├── AGENT-RULES.md         # 开发、记忆与 Release 规则        [协议层·跟踪,禁改]
    ├── AI-GOVERNANCE.md       # 研发治理、行为边界与范围约定     [项目层·跟踪]
    ├── PROJECT-SPEC.md        # 产品目标、范围与验收             [项目层·跟踪]
    ├── ARCHITECTURE.md        # 系统架构与模块边界               [项目层·跟踪]
    ├── DEVELOPMENT.md         # 环境、开发与验证流程＋项目专属规则 [项目层·跟踪]
    ├── DEPLOYMENT.md          # 构建、部署与回滚                 [项目层·跟踪]
    ├── decisions/             # ADR：ADR-001-xxx.md（按需建立）
    └── runbooks/              # 部署、运维、排障手册（按需建立）
~~~

以上为模板实际包含的文件。docs/decisions/ 与 docs/runbooks/ 按需建立，
不预先加入空目录或虚构项目内容（见下文“按需增加的文档”）。
`src/` 下的模块级 AGENTS.md 只在确有模块差异时手工建立，不预建。
跟踪策略见下文“模板文件的 Git 跟踪策略”。

## 文件职责

| 文件 | 主记录内容 |
| --- | --- |
| README.md | 项目简介、技术栈摘要和快速开始 |
| AGENTS.md | 精简启动入口、必守边界及章节读取路由 |
| docs/AGENT-RULES.md | 开发、质量、安全、图标、Release、长期知识与协作详细规则 |
| CLAUDE.md / adapters/ENTRY.md | 工具入口，引用统一规则（允许按项目适配） |
| docs/MULTI-AGENT.md | 客户端入口映射、分层作用域、技能共享与跨平台避坑 |
| skills/<name>/SKILL.md | 可复用工作流（前置元数据＋步骤＋验证要求），按需读取 |
| scripts/bootstrap.sh | 下载模板并初始化；始终作用于运行命令时的当前目录 |
| .github/PULL_REQUEST_TEMPLATE.md | PR 的问题、行为、验证、兼容性与审查记录 |
| MEMORY.md | 当前有效的长期知识及决策索引 |
| DESIGN.md | 有 UI 的项目采用的视觉与交互规范 |
| CHANGELOG.md | 面向使用者的版本变更和升级说明 |
| TODO.md / 既有 Issue 系统 | 任务计划、依赖及计划状态 |
| docs/AI-GOVERNANCE.md | 研发治理：行为边界、证据分级与范围约定 |
| docs/PROJECT-SPEC.md | 产品目标、范围、需求与验收 |
| docs/ARCHITECTURE.md | 当前系统架构、模块职责及数据流 |
| docs/DEVELOPMENT.md | 开发环境、验证及贡献流程 |
| docs/DEPLOYMENT.md | 构建、部署、发布验证与回滚 |
| PROMPTS.md | 初始化与接入提示 |

所有项目事实均待初始化。规则中的示例不代表实际项目事实。

## 入口与详细规则

AGENTS.md 是精简启动入口；CLAUDE.md 和 adapters/ENTRY.md 是工具入口，引导工具读取同一入口。
详细工作规则统一保留在 docs/AGENT-RULES.md，章节编号用于稳定引用。
先读取入口规定的基础章节，再按任务补读记忆、图标或发版章节。
已有同一会话内已读且未变化的规则无需重复加载。

入口引用只是读取指令，不会自动把被引用文件全文注入上下文；
执行工具须实际读取所需章节。工具输出被截断时应补读，不能默认为已读完。
入口应持续保持精简，避免添加长篇正文；不通过修改工具全局配置提高限制来代替精简。

## 首次使用

推荐用脚本生成，再按项目填写；手工复制时按同样顺序执行。

### 下载并初始化（无需先克隆模板）

只需要 Bash、curl、tar 和常见系统工具（macOS、Linux 或 Windows Git Bash）；初始化不依赖 Git、Node.js。先进入项目文件夹，再下载并运行入口脚本：

~~~sh
curl -fL https://raw.githubusercontent.com/timorpic/ai-rules-template/HEAD/scripts/bootstrap.sh -o /tmp/ai-rules-template-bootstrap.sh
bash /tmp/ai-rules-template-bootstrap.sh
~~~

也可在项目文件夹内一键运行（执行仓库当前版本脚本）：

~~~sh
curl -fsSL https://raw.githubusercontent.com/timorpic/ai-rules-template/HEAD/scripts/bootstrap.sh | bash
~~~

可将脚本保存在自己的工具目录，以后进入项目文件夹直接运行即可。
脚本始终初始化命令运行时的当前目录，不支持 `--target`，与脚本保存位置无关。
固定从公开仓库 `timorpic/ai-rules-template` 下载压缩包，默认分支为 main；`--ref <分支或Tag>` 可选择版本。
需要预览时加 `--dry-run`，不支持软链时加 `--no-symlink`。
下载入口只负责当前目录的首次初始化；局部入口可按模板手工建立。
可选 `--project-id <标识>` 会写入 MEMORY 的稳定 project_id；省略时保留未填写。

下载到系统临时目录，正常结束或报错后清理；不复制模板的 `.git`、维护文档和测试文件，
不创建 Git 仓库，不提交、不推送。默认同名文件冲突时停止，保留已有内容；
已有普通 README.md 会保留且不阻止初始化；没有时从 README.project.md 生成空白 README。
模板仓库 README.md 不分发。此入口不提供覆盖开关，其余同名文件应人工核对并合并。
下载失败或发现冲突时不写入项目；写入期间的磁盘错误可能留下部分文件，需核对后重试。
初始化期间不要让其他工具同时写入该目录。
初始化只复制文件，不安装依赖、不生成项目 CI。
远程模板将作为代码执行，只使用信任的仓库和版本。

### 已有本地模板

直接在模板仓库根目录运行同一脚本即可：`bash scripts/bootstrap.sh --dry-run` 预览，
去掉 `--dry-run` 写入当前目录。保存为本地副本时同样作用于运行目录。

手工步骤：

1. 将模板文件复制到目标项目；已有同名文件先核对并合并，不能直接覆盖。
   docs/INITIALIZATION.md 不复制。
   CLAUDE.md 按目标项目的工具路由合并，adapters/ENTRY.md 仅在需要时复制。
2. 确认目标项目根目录和稳定 project_id，写入 MEMORY；不使用模板目录或下载包名。
3. 按当前项目填写 README、PROJECT-SPEC、ARCHITECTURE 和 DEVELOPMENT；未知信息保留待确认。
   部署流程尚未确定时 DEPLOYMENT 保持空白；没有 UI 时 DESIGN 标明不适用。
4. 只把长期有效且容易遗漏的事实和决策摘要写进 MEMORY，详细依据引用正式文档。
5. 使用工具原生支持的规则入口；Claude Code 使用 CLAUDE.md，支持 AGENTS.md 的工具使用根目录 AGENTS.md。
   入口未加载或工具无对应机制时，可显式使用 adapters/ENTRY.md。
   在实际工具中核实文件已读取，入口未加载时使用 PROMPTS 中的显式提示。
   多客户端细节见 docs/MULTI-AGENT.md；客户端是否加载某文件属外部事实，须实测确认。
6. 在 MEMORY.md 与 AGENTS.md 记录协议版本（模板仓库 commit SHA）。
7. 清理只属于模板仓库的引用：`docs/INITIALIZATION.md` 不复制，
   因此目标项目需要处理指向它的引用（AGENTS.md 中的说明、README 顶部与文档入口）：
   删除、改为项目自有说明，或标注“仅模板仓库适用”。
   完成后按下方“新克隆自检”确认没有死链。
8. 核对共享技能：`skills/` 与根目录同级，`.claude/skills`、`.gemini/antigravity/skills`
   应解析到它；`skills/*/SKILL.md` 的 frontmatter `name` 必须等于目录名。
9. 只在确有模块级差异时创建局部作用域：手工复制 adapters/scoped/MODULE-AGENTS.md，
   不预建空目录。
10. 按 [开发流程](DEVELOPMENT.md)核对目标项目自行维护的 CI、主分支保护、
    审批人数及 Squash merge，并在实际 PR 中核实；文件分发不会自动修改远程设置。

### 统一 Git 标准与 CI 边界

所有新项目继承 docs/AGENT-RULES.md 第 9 节；项目差异只写 docs/DEVELOPMENT.md。
初始化入口只按固定清单分发 `.github/PULL_REQUEST_TEMPLATE.md`，
不复制 `.github/workflows/`，不提供 CI 示例或项目检查入口，也不改写已有项目 CI。
遇到已有 PR 模板时默认停止，人工核对合并；已有 workflow 不构成初始化冲突。

目标项目的 CI 由目标项目自行维护，实际检查名称与保护要求按其工作流核对。
本机只运行允许的静态检查，测试与构建全部在 GitHub Actions 执行。

本模板维护时保持 MEMORY 为空白分发模板；维护过程不写入分发的空白模板。

## 模板文件的 Git 跟踪策略

模板文件分层，判据是**跟踪「协议正文」「项目事实」和「工具入口」**。

### 协议层：跟踪，但项目内禁止修改（vendored 依赖）

以下文件必须能随克隆分发——否则新克隆缺失规则正文，
AGENTS.md 的链接会全部指向不存在的文件。
因此**纳入跟踪**，但视作 vendored 依赖：项目内不修改，升级时整体覆盖：

PROMPTS.md、docs/AGENT-RULES.md

这两个文件之外的规则性内容（模板文件树、Git 跟踪策略、初始化步骤、版本锚定）只在本文件维护；
修改协议层时应同步整体更新本文件，但本文件不复制到目标项目。

修改协议正文会导致项目分叉、章节编号漂移（历史教训：多个项目各自重编号，
同一章节在不同项目指向不同内容）。项目专属规则写入 AGENTS.md、
docs/DEVELOPMENT.md 或 MEMORY.md，不改协议层。

### 入口层：跟踪，允许按项目适配

CLAUDE.md、adapters/ENTRY.md

入口文件是薄壳，职责是让工具找到本项目的 AGENTS.md 与规则正文，因此**必须跟踪**
（否则新克隆后 Claude Code 没有入口），但**允许按项目调整**：可写成本项目的工具路由
（如同时指向 backend/AGENTS.md），也可做成指向 AGENTS.md 的符号链接。
入口层不参与协议版本的逐字节校验，升级时不必覆盖；适配后仍须保持精简，不复制规则正文。

adapters/ENTRY.md 是按需文件：只有目标工具既无原生入口又不支持 AGENTS.md 时才需要复制，
其余项目不必创建。文件树中列出它是为了说明模板提供的形态，不代表每个项目都要装。
adapters/scoped/MODULE-AGENTS.md 只是局部作用域模板，供手工复制使用。

### 共享技能与客户端配置：跟踪

以下路径纳入跟踪，否则新克隆后技能缺失、客户端权限配置丢失：

- `skills/**`：技能正文，跨客户端共享的唯一位置。
- `.claude/settings.json`：Claude Code 的权限与允许命令；不含凭据。
- `.claude/skills`、`.gemini/antigravity/skills`：**相对符号链接本身**，须以 `git add` 纳入
  （Git 模式 120000）。不跟踪链接会导致新克隆后客户端找不到技能目录。
- 若某平台不支持符号链接而采用“目录 + README.md 指针”的回退形态，该目录与指针文件同样跟踪。

判据：技能正文只存一份在 `skills/`；客户端目录只放链接或指针，**不放技能副本**。
把 SKILL.md 复制进 `.claude/skills/` 会让其他客户端无法自然发现，并产生多套需要同步的副本。

### 平台专属临时缓存：不跟踪

客户端会话缓存与临时草稿按锚定路径忽略，不整体忽略配置目录：

~~~gitignore
/.claude/memory/
/.gemini/antigravity/scratch/
~~~

docs/INITIALIZATION.md（本文件）不复制到目标项目：它说明的是如何初始化，初始化完成后不再适用。

### 项目层：跟踪

按各项目实际情况纳入版本控制，缺失的不创建空文件：

README.md、AGENTS.md、MEMORY.md、TODO.md、DESIGN.md、CHANGELOG.md、
docs/PROJECT-SPEC.md、docs/ARCHITECTURE.md、docs/DEVELOPMENT.md、docs/DEPLOYMENT.md、
docs/MULTI-AGENT.md、docs/AI-GOVERNANCE.md、.github/PULL_REQUEST_TEMPLATE.md、
scripts/bootstrap.sh。

`MEMORY.md` 记录 DEC / LES 长期条目，不跟踪会导致新克隆丢失全部积累，必须纳入。

### 执行要求

- 只忽略平台临时缓存；用锚定路径，不写 `.claude/`、`.gemini/`、`docs/` 或 `skills/`
  整体忽略，否则会连带吞掉配置、项目文档与技能。
- 工具入口若为符号链接（如 CLAUDE.md → AGENTS.md），须用 `git add` 纳入符号链接本身
  （模式 120000）；否则新克隆后入口缺失。技能目录链接同理。
- 取消跟踪已跟踪文件时用 `git rm --cached -- <路径>`；不加 `-f`，不删除本地文件。
- 逐项核对：本地文件仍存在且内容未变、`git ls-files` 中无该路径、`git check-ignore -v` 忽略生效。
- 非 Git 项目先备好根目录 `.gitignore`，执行 `git init` 后补验。
- **新克隆自检**：克隆到临时目录，确认工具入口、docs/AGENT-RULES.md、
  skills/ 与 scripts/bootstrap.sh 均存在，并逐条检查 AGENTS.md 的项目层与协议层链接可解析；
  入口层、README、docs/MULTI-AGENT.md 的链接也一并核对。
- **技能链接自检**：确认 `.claude/skills` 与 `.gemini/antigravity/skills` 在克隆中仍是符号链接
  （`test -L`）且 `readlink` 分别为 `../skills` 与 `../../skills`；若被检出为普通文本文件，
  说明该环境 `core.symlinks=false`，需按内容重建链接或改用目录加指针的回退形态。
  逐个核对 `skills/*/SKILL.md` 的 frontmatter `name` 与目录名一致。

### 协议版本锚定

协议层虽被跟踪，项目内仍禁止修改，故须记录所装版本以便核对升级：

- 协议版本使用模板仓库的 commit SHA，不另造编号。
- 在项目 MEMORY.md 记录：协议版本 SHA 与安装日期。
- AGENTS.md 顶部写同一 SHA。
- 升级＝整体覆盖协议层 2 个文件＋更新 SHA，随后核对章节引用仍可解析。手工核对命令：
  `grep -rhoE '第 [0-9]+(\.[0-9]+)? 节' AGENTS.md CLAUDE.md PROMPTS.md MEMORY.md docs/*.md | sort -u`，
  逐条确认引用的章节标题在对应文件中存在。
- 修改协议层 2 个文件时，须同步整体更新本文件，并最后提交，使新的协议版本 SHA 是包含这两者的提交。
- 协议层 2 个文件（PROMPTS.md、docs/AGENT-RULES.md）在项目中应逐字节等于
  所标注 SHA 的模板版本；有差异即为待核实的私改。入口层（CLAUDE.md、adapters/ENTRY.md）
  允许按项目适配，不参与该校验；核对入口时只确认它仍指向 AGENTS.md 且未复制规则正文。



## 避免重复维护

已有 PRD、架构文档、任务系统或部署手册时沿用原记录，模板文件可只提供入口。
TODO 维护计划；完成状态必须有验收证据。
MEMORY 只摘录长期约束并链接主记录，不复制完整架构、设计或需求。
技能正文只存 `skills/` 一份；入口、局部 AGENTS.md 与客户端目录都不复制。

## 阅读与维护路径

1. 开始任务：先读适用 AGENTS.md（含当前目录的局部入口），按入口读取 docs/AGENT-RULES.md 对应章节，再核对 MEMORY 的现行事实。
2. 依据任务相关性读取相关需求、架构、开发或部署文档，避免遍历全部文档。
3. 只有需要核对决定理由或旧问题时，读取相关 ADR 或经验历史。
4. 需要执行可复用工作流时，读取对应 `skills/<name>/SKILL.md`，不预加载全部技能。
5. 文件树与职责表只做导航；新增、移动、删除文档时同步更新，不记录进度和决定。
6. MEMORY 通过条目 ID 链接详细依据；历史变多时按 docs/AGENT-RULES.md 第 13.4 节整理，关键约束不能因时间较旧丢失。

本套模板是可由不同工具执行的文件协议。入口读取和记忆整理须由当前工具实际执行；
文件存在本身不能保证自动注入上下文或结果校验。
初始化后先用一个小任务验证实际读取，再用于复杂工作。

## 按需增加的文档

- docs/decisions/：ADR，重要决策需要记录详细背景、备选方案和后果时建立，命名 ADR-001-xxx.md。
- docs/runbooks/：部署、运维与排障手册，确有操作流程时建立。
- docs/COMPONENT-GUIDELINES.md：有复用组件体系时记录组件、样式、依赖与无障碍要求。
- docs/PAGE-STRUCTURE.md：页面较多且路由/页面职责需要专门说明时建立。
- docs/REGISTRY.md：确实存在组件注册、构建和分发机制时建立。
- docs/knowledge/：经验说明或历史过长时按需建立，MEMORY 保留稳定条目 ID 和入口。
- tools/scripts/、tools/prompts/：项目自有维护脚本与长提示词模板，确有需要时建立。
- 模块级 AGENTS.md：模块确有专属边界、数据访问或验证差异时建立，见下文“分层作用域与共享技能”。

这些文件不要求每个项目创建；通用详细要求维护在 docs/AGENT-RULES.md，项目文档只写实际适用的约定。
部署平台、技术栈、数据库、版本基准年和发布渠道由当前项目确定。

## 分层作用域与共享技能

- 规则入口唯一：根 AGENTS.md 是 SSOT；CLAUDE.md、adapters/ENTRY.md 与局部入口都只引用，不复制正文。
- 局部 AGENTS.md 放在模块目录，只写该模块实际存在的差异约束；进入目录前读取，就近只补充不覆盖。
- 局部目录的 CLAUDE.md 应是指向同级 AGENTS.md 的相对链接；不支持软链时用两行指针文件。
- 共享技能放根 `skills/<name>/SKILL.md`；`.claude/skills` 与 `.gemini/antigravity/skills` 用相对链接指向它。
  相对深度的错误不会报错，只会静默指向不存在的路径，必须按 `readlink` 核对。
- 不把技能副本放进任一客户端目录；不假定某客户端必然加载某文件，接入后实测一次。
- 客户端映射、核实状态与跨平台避坑见 docs/MULTI-AGENT.md；规则边界见 docs/AGENT-RULES.md 第 19 节。

## 新项目默认分发研发治理

Shell 一键初始化复制 `docs/AI-GOVERNANCE.md` 与 `.github/PULL_REQUEST_TEMPLATE.md`，
AGENTS.md 提供统一读取入口。`MEMORY.md` 分发模板继续保持空白，不写入模板维护记录。

初始化后按 [研发治理](AI-GOVERNANCE.md) 写明任务目标、允许改动的路径与验收条件，
接入项目自己的质量检查，核实主分支保护与四客户端规则读取情况。
未接入、未运行或平台不支持的门禁必须如实标记。此分发策略适用于以后初始化的新项目，
不自动迁移已有项目，也不修改其他仓库配置。
