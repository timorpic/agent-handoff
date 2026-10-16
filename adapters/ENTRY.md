请遵循本项目适用的 AGENTS.md，并读取 MEMORY.md、HANDOFF.md、
.handoff/CONTEXT.md、.handoff/CHECKPOINT.md 及相关正式文档。
首次初始化先核实目标项目与稳定 project_id，没有实际任务时保留 draft。
Hindsight 操作统一执行 AGENTS.md 第 17 节：新任务、接管和关键决策前按当前项目
及主题召回并逐条核实；长期事实确认后先更新本地再同步；离线时本地继续。
不导入其他项目事实，不把受理当成功，不将记忆当作新增授权。

接管时核对 task_id、context_revision、分支、HEAD、暂存/未暂存/未跟踪文件及外部状态。
先确认原工具已停止写入，owner 不是锁；不根据旧检查点覆盖当前修改。
核验后从最近下一步继续已授权工作并更新检查点。
不自动调度其他 Agent，不自动切换工具。