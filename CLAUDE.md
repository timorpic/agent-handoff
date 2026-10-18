# CLAUDE.md

> Claude Code 项目入口，与根目录 AGENTS.md 同级。

开始任务前实际读取根目录及适用的 AGENTS.md，按其读取步骤和任务表执行。
详细规则仅在 docs/AGENT-RULES.md 维护；不要在本文件复制正文。

按 AGENTS.md 核对 MEMORY、CONTEXT、CHECKPOINT、项目身份和实际文件，
完成适用章节及相关文档读取后再修改。
文档一致性自检：`sh scripts/check-docs.sh`（只读，检查死链、章节引用、认领状态枚举与跟踪状态）。
接力、异常恢复遵循 HANDOFF.md。
输入或工具输出被截断时补读，不声称已读取未见内容。

不自动启动或调度其他 Agent，不依据空模板或记忆扩大授权。
已有 CLAUDE.md 时合并保留项目专用内容。
