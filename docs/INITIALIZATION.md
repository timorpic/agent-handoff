# 初始化与使用

## 模板文件树

~~~text
项目根目录/
├── AGENTS.md                  # 通用开发、记忆与 Release 规则
├── CLAUDE.md                  # Claude Code 统一入口
├── README.md                  # 项目简介与快速开始
├── MEMORY.md                  # 长期知识与共享同步索引
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
| AGENTS.md | 开发、质量、安全、图标、Release、Hindsight 与协作规则 |
| CLAUDE.md / adapters/ENTRY.md | 工具入口，引用统一规则 |
| MEMORY.md | 当前有效的长期知识、决策索引及共享同步索引 |
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

## 首次使用

1. 将模板文件及 .handoff 点目录复制到目标项目；已有同名文件先核对并合并，不能直接覆盖。
2. 确认目标项目根目录和稳定 project_id，写入 MEMORY；不使用模板目录或下载包名。
3. 按当前项目填写 README、PROJECT-SPEC、ARCHITECTURE 和 DEVELOPMENT；未知信息保留待确认。
   部署流程尚未确定时 DEPLOYMENT 保持空白；没有 UI 时 DESIGN 标明不适用。
4. 只把长期有效且容易遗漏的事实和决策摘要写进 MEMORY，详细依据引用正式文档。
5. 有实际任务后初始化 CONTEXT 和首份 CHECKPOINT；没有任务时保留 draft。
6. Claude Code 从 CLAUDE.md 读取统一入口；其他工具可显式使用 adapters/ENTRY.md。
   在实际工具中核实文件已读取，入口未加载时使用 PROMPTS 中的显式提示。
7. Hindsight 连接存在时核对 Bank 为 OpenMemory，按 AGENTS.md 第 17 节操作。
   不在模板中配置地址或凭据，不预填其他项目记忆。

## Hindsight 的操作闭环

- 开始/接管任务：按稳定项目标签及任务主题 recall，逐条核对项目归属、确认依据和有效性。
- 开始关键决策：检索相关历史，与本地现行需求和 ADR 核实后再判断。
- 决策或里程碑确认：先更新 MEMORY / ADR，再 retain 带标准标签的精炼摘要。
- 召回情况及本次采用的条目引用写 CHECKPOINT；长期同步状态写 MEMORY 的共享同步索引。
- accepted / initiated 只算 pending，确认实际存储完成后才记 synced。
- 离线、无匹配结果或异步结果未知时按规则处理，不阻断可基于本地资料继续的工作。
- 不进行无项目范围的默认召回，不自动继承跨项目偏好或事实，不写临时执行流水账。

## 避免重复维护

已有 PRD、架构文档、任务系统或部署手册时沿用原记录，模板文件可只提供入口。
TODO 维护计划，CHECKPOINT 维护实际现场；完成状态必须有验收证据。
MEMORY 只摘录长期约束并链接主记录，不复制完整架构、设计或需求。
CONTEXT 引用需求条款和当前任务，不复制长期知识。
Hindsight 是长期摘要的检索副本，不能替代以上主记录。

## 阅读与维护路径

1. 开始或接手任务：先核对适用规则、MEMORY 的现行事实、CONTEXT 和最新 CHECKPOINT。
2. 依据 CONTEXT 的精确引用读取相关需求、架构、开发或部署文档，避免遍历全部文档。
3. 只有需要核对决定理由、旧问题或恢复依据时，读取相关 ADR、经验历史或归档检查点。
4. 文件树与职责表只做导航；新增、移动、删除文档时同步更新，不记录进度和决定。
5. MEMORY 通过条目 ID 链接详细依据；历史变多时按 AGENTS.md 第 17.7 节整理，关键约束不能因时间较旧丢失。
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

这些文件不要求每个项目创建；AGENTS.md 保留通用要求，项目文档只写实际适用的约定。
部署平台、技术栈、数据库、版本基准年和发布渠道由当前项目确定。

## 人工接力

在可恢复的小步骤及关键验证后更新检查点。
切换前停止旧工具写入；接手者核对项目、上下文版本、分支、HEAD、
未提交与未跟踪文件，以及外部操作实际状态。
突然退出按 HANDOFF.md 恢复，不将未知结果写成成功。
新任务开始前将旧上下文与检查点成对归档。
不配置自动 Agent 调度、余额探测或自动工具切换。