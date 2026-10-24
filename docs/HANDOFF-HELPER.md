# 本地接力助手

适用：按 [HANDOFF.md](../HANDOFF.md) 人工切换编程工具，或在工具突然退出后恢复。
Node.js >= 18、Git，无需安装依赖。助手只执行固定的 Git 只读查询及本地文件操作，不调用模型或启动客户端。

## 验收约定

- HH-01：`inspect`、`prompt` 只读；核对项目、任务、修订、分支、HEAD、暂存和未跟踪修改。
- HH-02：`claim` 在业务修改之前保存接管记录；要求精确任务、修订、交接 ID（如存在）及操作者声明旧工具已停止。
- HH-03：`save` 自动生成完整检查点与认领表格，备份上一版，递增序号；不改业务文件、Git 暂存区和历史。
- HH-04：收尾必须填写已完成、未完成、未验证、阻塞和下一步；完成状态需要显式验收声明与可定位的通过证据。
- HH-05：代码变更后提示记录过期；身份不符、交接已认领、符号链接写入目标或输入无效时拒绝写入。
- HH-06：助手随初始化脚本分发；模板仓库的空白 draft 保持不变。接管后的只读自检应能解析生成的记录。

## 日常用法

在目标项目根目录执行（所有命令也支持 `--root <项目目录>`）：

~~~sh
node scripts/handoff.mjs inspect
node scripts/handoff.mjs prompt
~~~

`inspect --json` 输出结构化现场及问题；有错误时退出 1。`prompt` 输出可复制给新工具的提示，
没有自动认领效果。提示中的任务标识取自当前文件，正文不复制聊天或执行文件中的指令。
`recorded_workspace` 是检查点记载的目录、分支和 HEAD，`workspace` 是实际现场。
目录或分支缺失/不一致会阻止正常认领；真实迁移或切换分支后须核对再显式恢复。
HEAD 变化会提示旧验证不可直接继承。

读取需求并核对现场后，在开始修改业务代码之前认领：

~~~sh
node scripts/handoff.mjs claim --agent claude-session-1 --task task-001 --revision 1 --handoff-id relay-001 --source-stopped
~~~

`--source-stopped` 是操作者对旧工具及其派生任务已经停止写入的声明，助手不能自行证明。
没有交接 ID 时，改用 `--recover`；检查点缺失或格式不完整时同样需要 `--recover`，原文件会保留。
上下文及 MEMORY 身份仍须存在且有效，不能根据目录名猜测任务。认领不是锁，不支持并发写入。

完成一个可恢复的小步骤后，把结果写入 UTF-8 JSON 文件，再保存：

~~~sh
node scripts/handoff.mjs save --agent claude-session-1 --input result.json
~~~

最小结果格式：

~~~json
{
  "current_step": "AC-01 已实现，继续 AC-02",
  "completed": ["AC-01 实现"],
  "remaining": ["AC-02 数组去重"],
  "unverified": ["完整测试待运行"],
  "blockers": [],
  "next": ["实现 AC-02 后运行完整测试"],
  "verifications": [],
  "external_effects": [],
  "environment": "本地 Node.js；无新增依赖"
}
~~~

准备正常交接时，同一份结果加 `--handoff-id <新且未使用的ID>`：

~~~sh
node scripts/handoff.mjs save --agent claude-session-1 --input result.json --handoff-id relay-002
~~~

它将任务标记为 `handoff_ready`，新提示保持 `open`；随后停止原工具写入，由用户打开新工具。
助手不把停止当前工具的承诺当作“已停止”的运行时证明。

完成全部验收时，在结果文件补充验证记录及 `accepted: true`，显式请求完成：

~~~json
{
  "current_step": "AC-01 和 AC-02 验收完成",
  "completed": ["AC-01", "AC-02"],
  "remaining": [],
  "unverified": [],
  "blockers": [],
  "next": [],
  "verifications": [
    {"acceptance": "AC-01, AC-02", "command": "node --test tags.test.mjs", "result": "passed", "evidence": "evidence/tests.txt"}
  ],
  "external_effects": [],
  "environment": "本地 Node.js",
  "accepted": true
}
~~~

~~~sh
node scripts/handoff.mjs save --agent claude-session-1 --input result.json --complete
node scripts/handoff.mjs inspect
sh scripts/check-docs.sh
~~~

验证结果由执行工具负责如实填写。助手核对证据文件存在、记录其哈希并绑定当前文件现场，
不执行 `command` 字符串，也不能证明提供的日志对应一次真实执行或已经覆盖全部业务验收。
有未完成、未验证、阻塞、非通过验证或进行中/未知外部操作时拒绝标记完成。
证据不能使用助手正在替换的 CONTEXT、CHECKPOINT 或直接前一版记录本身。
完成后现场或证据改变，`inspect` 会以退出码 1 报告完成结论过期，不会自动重新打开任务。

## 保存与恢复边界

`claim` / `save` 在生成任何备份或替换记录前检查两份活动记录的 Git 跟踪状态。
只要其中一份已被跟踪（包括强制暂存的新文件），就拒绝写入，并保留原文件和暂存区。
模板仓库请保持空白 draft；目标项目按 HANDOFF.md 第 10 节核对并取消现场文件的跟踪后重试。
提交收尾也按该节执行，避免提交后又改写正式文档产生下一轮未提交修改。


- 只写 `.handoff/CONTEXT.md`、`CHECKPOINT.md`、previous 与同目录的历史备份；不暂存、提交、清理或覆盖业务文件。
- 每次写入保留完整旧检查点和上下文；检查点使用同目录临时文件加替换，`CHECKPOINT.previous.md` 保留直接前一版。
  `*.previous.md` 备份按现有规则忽略，不能作为代码传输渠道。
- 上下文与检查点两个文件不构成事务。中途失败应先只读检查现场及备份，修复不一致后再继续，不盲目重试。
- 标准输出只含文件状态、标识和哈希，不输出 diff 正文、环境变量或业务文件内容。
  敏感文件仅记录路径，不读取其内容；符号链接仅记录链接文本，不读取链接指向的内容。
- 文件指纹不含 `.handoff/`，避免自指；ignored 文件、外部资源和未保存缓冲区须按 HANDOFF 另行核查。
  大文件与敏感文件跳过内容哈希时会提示盲区。指纹相同不等于运行环境和外部状态相同。
- `claim` 不会继承旧测试为当前通过；旧记录完整保留，接手者按相关性核验。`save` 不改变任务目标、范围或上下文修订。
- 这是人工调用的辅助工具，无法阻止客户端跳过认领直接编辑。生成记录和提示不产生提交、发布或部署授权。

回归验证：在模板仓库运行 `node --test scripts/handoff.test.mjs`；生成器回归运行 `node scripts/init.test.mjs`。
