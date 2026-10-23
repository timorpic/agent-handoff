# 初始化与使用

## 项目定位：跨工具任务接力

本项目解决同一编程任务在不同工具之间的连续执行：例如 Codex 额度耗尽后，
由用户切换到 Claude Code，接手工具依据项目文件和检查点继续尚未完成的工作。

- 核心能力：统一规则、长期知识、任务目标、执行现场、验证证据与可执行的下一步。
- 正常切换：旧工具保存现场，用户停止其写入并打开新工具，新工具核验后继续。
- 突然中断：额度耗尽而来不及交接时，新工具从最后有效检查点与实际文件重建现场，
  区分已证实、推测和未知，不依赖旧工具再生成一份交接说明。
- 当前非目标：跨工具并发编排、任务分发、自动探测额度或自动切换工具。
- 工具内部如何并发由各工具自身负责，本项目不提供或调度该能力；
  切换时仍需确认旧工具及其派生任务已停止写入。

“无缝继续”的验收重点是：已有文件能回答任务目标、已完成与未完成事项、验证状态和下一步，
用户无需重新描述这些已记录信息。它不表示迁移聊天全文、模型内部状态或未保存的编辑内容。
接力与异常恢复步骤统一见 [HANDOFF.md](../HANDOFF.md)，不另建并发调度流程。

本节记录模板仓库的定位；分发给目标项目的 README、需求与 MEMORY 仍按目标项目填写，
不得将模板本身的定位或维护记录带入目标项目。

### 本地接力助手

`scripts/handoff.mjs` 提供只读核对（inspect）、接管提示（prompt）、
接管记录（claim）和结果保存（save）。使用方式及边界见
[本地接力助手](HANDOFF-HELPER.md)。

模板不预填项目身份、任务、运行现场或验证结论。初始化后，
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
├── HANDOFF.md                 # P0+P1 人工接力协议               [协议层·跟踪,禁改]
├── PROMPTS.md                 # 初始化、交接与恢复提示           [协议层·跟踪,禁改]
├── .gitignore                 # 现场层与平台缓存忽略规则         [项目层·跟踪]
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md # PR 描述与验证记录               [项目层·跟踪]
│   └── workflows/template-ci.yml # 模板自身检查；不分发           [仅模板仓库]
├── .handoff/
│   ├── CONTEXT.md             # 活动任务目标与验收入口           [现场层·不跟踪]
│   ├── CHECKPOINT.md          # 执行现场、验证与下一步           [现场层·不跟踪]
│   └── archive/               # 归档任务上下文与检查点           [项目层·跟踪]
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
│   ├── check-docs.sh          # 只读一致性自检                   [项目层·跟踪]
│   ├── bootstrap.sh          # 下载模板并调用生成器（模板专用）
│   ├── init.mjs               # 零依赖骨架生成器                 [项目层·跟踪]
│   ├── handoff.mjs            # 本地接力检查、认领与结果保存     [项目层·跟踪]
│   ├── handoff.test.mjs       # 接力集成回归（仅模板仓库需要）   [项目层·跟踪]
│   └── init.test.mjs          # 生成器回归自测（仅模板仓库需要） [项目层·跟踪]
└── docs/
    ├── INITIALIZATION.md      # 本文件；不复制到目标项目         [仅模板仓库]
    ├── MULTI-AGENT.md         # 客户端映射、作用域与避坑         [项目层·跟踪]
    ├── HANDOFF-HELPER.md      # 本地接力助手与验收、结果格式     [项目层·跟踪]
    ├── AGENT-RULES.md         # 开发、记忆、Release 与接力规则   [协议层·跟踪,禁改]
    ├── PROJECT-SPEC.md        # 产品目标、范围与验收             [项目层·跟踪]
    ├── ARCHITECTURE.md        # 系统架构与模块边界               [项目层·跟踪]
    ├── DEVELOPMENT.md         # 环境、开发与验证流程＋项目专属规则 [项目层·跟踪]
    ├── DEPLOYMENT.md          # 构建、部署与回滚                 [项目层·跟踪]
    ├── decisions/             # ADR：ADR-001-xxx.md（按需建立）
    └── runbooks/              # 部署、运维、排障手册（按需建立）
~~~

以上为模板实际包含的文件。docs/decisions/ 与 docs/runbooks/ 按需建立，
不预先加入空目录或虚构项目内容（见下文“按需增加的文档”）。
`src/` 下的模块级 AGENTS.md 只在确有模块差异时用 `--module` 生成，不预建。
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
| scripts/bootstrap.sh | 下载模板并初始化；`bash scripts/bootstrap.test.sh` 验证下载入口 |
| scripts/init.mjs | 零依赖骨架生成器：复制模板并建立链接或回退形态 |
| .github/PULL_REQUEST_TEMPLATE.md | PR 的问题、行为、验证、兼容性与审查记录 |
| .github/workflows/template-ci.yml | 仅模板仓库运行文档与维护回归；不分发到目标项目 |
| scripts/init.test.mjs | 生成器的端到端回归自测：`node scripts/init.test.mjs`，退出码 0 表示全部通过 |
| scripts/handoff.mjs | 本地接力助手：只读现场、精确认领、合规检查点与完整备份 |
| scripts/handoff.test.mjs | 接力助手集成回归：`node --test scripts/handoff.test.mjs`，仅模板仓库需要 |
| docs/HANDOFF-HELPER.md | 助手验收约定、命令与结果 JSON 格式及能力边界 |
| scripts/check-docs.sh | 只读一致性自检：死链、章节引用、技能元数据、链接解析、跟踪状态 |
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

推荐用脚本生成，再按项目填写；手工复制时按同样顺序执行。

### 下载并初始化（无需先克隆模板）

只需要 Bash、curl、tar 和常见系统工具（macOS、Linux 或 Windows Git Bash）；初始化不依赖 Git、Node.js。先进入项目文件夹，再下载并运行入口脚本：

~~~sh
curl -fL https://raw.githubusercontent.com/timorpic/agent-handoff/HEAD/scripts/bootstrap.sh -o /tmp/agent-handoff-bootstrap.sh
bash /tmp/agent-handoff-bootstrap.sh
~~~

也可在项目文件夹内一键运行（执行仓库当前版本脚本）：

~~~sh
curl -fsSL https://raw.githubusercontent.com/timorpic/agent-handoff/HEAD/scripts/bootstrap.sh | bash
~~~

可将脚本保存在自己的工具目录，以后进入项目文件夹直接运行即可。
脚本始终初始化命令运行时的当前目录，不支持 `--target`，与脚本保存位置无关。
固定从公开仓库 `timorpic/agent-handoff` 下载压缩包，默认分支为 main；`--ref <分支或Tag>` 可选择版本。
需要预览时加 `--dry-run`，不支持软链时加 `--no-symlink`。
下载入口只负责当前目录的首次初始化；局部入口可按模板手工建立。
可选 `--project-id <标识>` 会同步写入 MEMORY 和两份空白现场记录；省略时均保留未填写。

下载到系统临时目录，正常结束或报错后清理；不复制模板的 `.git`、维护文档和测试文件，
不创建 Git 仓库，不提交、不推送。默认同名文件冲突时停止，保留已有内容；
已有普通 README.md 会保留且不阻止初始化；没有时从 README.project.md 生成空白 README。
模板仓库 README.md 不分发。此入口不提供覆盖开关，其余同名文件应人工核对并合并。
下载失败或发现冲突时不写入项目；写入期间的磁盘错误可能留下部分文件，需核对后重试。
初始化期间不要让其他工具同时写入该目录。
初始化只复制文件；后续如使用可选的 `handoff.mjs` 或 `init.mjs`，这些工具仍需要 Node.js。
远程模板将作为代码执行，只使用信任的仓库和版本。

### 已有本地模板

本地生成器同样保留已有 README.md；缺失时从 README.project.md 生成空白项目说明，
不复制模板介绍。即使指定 `--force`，也保留已有的普通 README.md 文件。


一键生成：

~~~bash
node scripts/init.mjs --target ../my_project --project-id my_project --dry-run   # 先看计划
node scripts/init.mjs --target ../my_project --project-id my_project             # 实际生成
node scripts/init.mjs --target ../my_project --module src/api --module src/persistence
~~~

脚本行为：复制项目层与协议层文件、建立 `.claude/skills` 与 `.gemini/antigravity/skills`
的相对软链、生成空白 draft 的 `.handoff/CONTEXT.md` 与 `.handoff/CHECKPOINT.md`、
清理指向 `docs/INITIALIZATION.md` 的模板专属引用；默认不覆盖已存在文件，
冲突时列出清单并以退出码 1 结束，`--force` 才覆盖。
不支持符号链接的环境加 `--no-symlink`，回退为目录加 README.md 指针。
生成器的回归自测：`node scripts/init.test.mjs`（模板仓库内执行，退出码 0 表示通过）。

手工步骤：

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
   多客户端细节见 docs/MULTI-AGENT.md；客户端是否加载某文件属外部事实，须实测确认。
7. 在 MEMORY.md 与 AGENTS.md 记录协议版本（模板仓库 commit SHA）。
8. 清理只属于模板仓库的引用：`docs/INITIALIZATION.md` 不复制，
   因此目标项目需要处理指向它的引用（AGENTS.md 第 3 行后的说明、README 顶部与文档入口）：
   删除、改为项目自有说明，或标注“仅模板仓库适用”。
   `.gitignore` 顶部注释可保留，它只是规则来源说明，不影响运行。
   完成后按下方“新克隆自检”确认没有死链。
9. 核对共享技能：`skills/` 与根目录同级，`.claude/skills`、`.gemini/antigravity/skills`
   应解析到它；`skills/*/SKILL.md` 的 frontmatter `name` 必须等于目录名。
10. 只在确有模块级差异时创建局部作用域：`--module <相对路径>` 或手工复制
    adapters/scoped/MODULE-AGENTS.md，不预建空目录。
11. 执行 `sh scripts/check-docs.sh`，退出码应为 0；在目标项目中它会自动识别为
   「非模板布局」，不再要求存在模板专属文件。
12. 按 [开发流程](DEVELOPMENT.md)核对目标项目自行维护的 CI、主分支保护、
    审批人数及 Squash merge，并在实际 PR 中核实；文件分发不会自动修改远程设置。

### 统一 Git 标准与 CI 边界

所有新项目继承 docs/AGENT-RULES.md 第 9 节；项目差异只写 docs/DEVELOPMENT.md。
两个初始化入口只按固定清单分发 `.github/PULL_REQUEST_TEMPLATE.md`，
不复制 `.github/workflows/`，不提供 CI 示例或项目检查入口，也不改写已有项目 CI。
遇到已有 PR 模板时默认停止，人工核对合并；已有 workflow 不构成初始化冲突。

`.github/workflows/template-ci.yml` 仅服务于本模板仓库，检查 PR 标题、文档一致性，
并在 GitHub Actions 执行生成器、接力助手和 Shell 初始化回归；它和维护测试均不分发。
目标项目的 CI 由目标项目自行维护，实际检查名称与保护要求按其工作流核对。
不能把模板维护回归当作业务项目的验收。本机只运行允许的静态检查，
测试与构建全部在 GitHub Actions 执行。

本模板维护时保持 MEMORY 与两份分发用现场记录为空白；维护过程可记在被忽略的
`.handoff/*.tmp.md` 中，不复制到目标项目，不将维护身份或结果写入分发模板。

## 模板文件的 Git 跟踪策略

模板文件分四层，判据是**跟踪「协议正文」「项目事实」和「工具入口」；只不跟踪「会话现场」**。

### 协议层：跟踪，但项目内禁止修改（vendored 依赖）

以下文件必须能随克隆分发——否则新克隆缺失规则正文和恢复协议，
AGENTS.md 的链接会全部指向不存在的文件，且「文件缺失时如何恢复」的 HANDOFF.md 自己就缺失。
因此**纳入跟踪**，但视作 vendored 依赖：项目内不修改，升级时整体覆盖：

HANDOFF.md、PROMPTS.md、docs/AGENT-RULES.md

这三个文件之外的规则性内容（模板文件树、Git 跟踪策略、初始化步骤、版本锚定）只在本文件维护；
修改协议层时应同步整体更新本文件，但本文件不复制到目标项目。

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
adapters/scoped/MODULE-AGENTS.md 只是局部作用域模板，供 `--module` 或手工复制使用。

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
docs/PROJECT-SPEC.md、docs/ARCHITECTURE.md、docs/DEVELOPMENT.md、docs/DEPLOYMENT.md、
docs/MULTI-AGENT.md、scripts/check-docs.sh、scripts/init.mjs、.github/PULL_REQUEST_TEMPLATE.md。
模板仓库自身的 `.github/workflows/template-ci.yml` 也须跟踪，但不分发给目标项目。

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

- 只忽略现场层与平台缓存；用锚定路径，不写 `.handoff/`、`.claude/`、`docs/` 或 `skills/`
  整体忽略，否则会连带吞掉归档、配置、项目文档与技能。
- 工具入口若为符号链接（如 CLAUDE.md → AGENTS.md），须用 `git add` 纳入符号链接本身
  （模式 120000）；否则新克隆后入口缺失。技能目录链接同理。
- 取消跟踪已跟踪文件时用 `git rm --cached -- <路径>`；不加 `-f`，不删除本地文件。
- 逐项核对：本地文件仍存在且内容未变、`git ls-files` 中无该路径、`git check-ignore -v` 忽略生效。
- 非 Git 项目先备好根目录 `.gitignore`，执行 `git init` 后补验。
- **新克隆自检**：克隆到临时目录，确认工具入口、docs/AGENT-RULES.md、HANDOFF.md、
  skills/ 与 scripts/check-docs.sh 均存在，并逐条检查 AGENTS.md 的项目层与协议层链接可解析；
  入口层、README、docs/MULTI-AGENT.md 的链接也一并核对。
  现场层（`.handoff/CONTEXT.md`、`.handoff/CHECKPOINT.md`）在**目标项目**的克隆中**应当缺失**，属预期：
  入口对它们的引用必须带「如存在」或等效说明，缺失时按当前现场重建，不虚构前任记录。
  `.handoff/archive/` 同样可能不存在；入口不得要求其必须存在。
  模板仓库自身例外：克隆中两者应存在且为空白 draft，见上文「模板仓库自身的例外」。
- **技能链接自检**：确认 `.claude/skills` 与 `.gemini/antigravity/skills` 在克隆中仍是符号链接
  （`test -L`）且 `readlink` 分别为 `../skills` 与 `../../skills`；若被检出为普通文本文件，
  说明该环境 `core.symlinks=false`，需按内容重建链接或改用目录加指针的回退形态。
  逐个核对 `skills/*/SKILL.md` 的 frontmatter `name` 与目录名一致。

### 交接协议的可核对性

人工接力没有服务端事务，以下字段用于把“谁该接手、谁已接手”变成可核对事实，
不构成自动投递、互斥锁或 CAS：

- CONTEXT：`handoff_id`、`from_agent`；只写标识，不承载指令或授权。
  这两项以 CONTEXT 为唯一来源，检查点不复制值。
- CHECKPOINT：`owner_lease_id`、`leased_at`、`handoff_claim`，以及“会话交接提示”一节；
  其中 handoff_id 只引用 CONTEXT，认领状态取值
  open / claimed / declined / expired / not_applicable，定义以 HANDOFF.md 第 3 节为准。
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
- 升级＝整体覆盖协议层 3 个文件＋更新 SHA，随后核对章节引用仍可解析；推荐直接执行
  `sh scripts/check-docs.sh`（只读，覆盖死链、章节引用、认领状态枚举、技能前置元数据、
  技能链接解析、settings.json 合法性与忽略规则）。
  手工等价命令：
  `grep -rhoE '第 [0-9]+(\.[0-9]+)? 节' AGENTS.md CLAUDE.md HANDOFF.md PROMPTS.md MEMORY.md .handoff/*.md docs/*.md | sort -u`
  （MEMORY 与 .handoff 模板也含章节引用，必须纳入；目标项目缺少现场层文件时按实际存在的文件执行。）
- 修改协议层 3 个文件时，须同步整体更新本文件，并最后提交，使新的协议版本 SHA 是包含这三者的提交。
- 协议层 3 个文件（HANDOFF.md、PROMPTS.md、docs/AGENT-RULES.md）在项目中应逐字节等于
  所标注 SHA 的模板版本；有差异即为待核实的私改。入口层（CLAUDE.md、adapters/ENTRY.md）
  允许按项目适配，不参与该校验；核对入口时只确认它仍指向 AGENTS.md 且未复制规则正文。



## 避免重复维护

已有 PRD、架构文档、任务系统或部署手册时沿用原记录，模板文件可只提供入口。
TODO 维护计划，CHECKPOINT 维护实际现场；完成状态必须有验收证据。
MEMORY 只摘录长期约束并链接主记录，不复制完整架构、设计或需求。
CONTEXT 引用需求条款和当前任务，不复制长期知识。
技能正文只存 `skills/` 一份；入口、局部 AGENTS.md 与客户端目录都不复制。

## 阅读与维护路径

1. 开始或接手任务：先读适用 AGENTS.md（含当前目录的局部入口），按入口读取 docs/AGENT-RULES.md 对应章节，再核对 MEMORY 的现行事实、CONTEXT 和最新 CHECKPOINT。
2. 依据 CONTEXT 的精确引用读取相关需求、架构、开发或部署文档，避免遍历全部文档。
3. 只有需要核对决定理由、旧问题或恢复依据时，读取相关 ADR、经验历史或归档检查点。
4. 需要执行可复用工作流时，读取对应 `skills/<name>/SKILL.md`，不预加载全部技能。
5. 文件树与职责表只做导航；新增、移动、删除文档时同步更新，不记录进度和决定。
6. MEMORY 通过条目 ID 链接详细依据；历史变多时按 docs/AGENT-RULES.md 第 13.4 节整理，关键约束不能因时间较旧丢失。
7. 正常结束或交接填写检查点结果摘要，区分已完成、未完成、未验证和阻塞条件。

本套模板是可由不同工具执行的文件协议。入口读取、记忆整理和结果记录须由当前工具实际执行；
文件存在本身不能保证自动注入上下文、强制互斥或结果校验。
初始化后先用一个小任务验证实际读取和人工切换，再用于复杂工作。

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

## 人工接力

在可恢复的小步骤及关键验证后更新检查点。
切换前停止旧工具写入；接手者核对项目、上下文版本、分支、HEAD、
未提交与未跟踪文件，以及外部操作实际状态。
突然退出按 HANDOFF.md 恢复，不将未知结果写成成功。
新任务开始前将旧上下文与检查点成对归档。
不配置自动 Agent 调度、余额探测或自动工具切换。
多工具并行不改变上述边界：同一工作区仍只有一位写入者，由用户手动切换。
