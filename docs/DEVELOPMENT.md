# 开发流程

> 待按当前项目初始化，已有开发手册时引用原记录。

## 环境与依赖
- 系统/运行时版本：待填写。
- 依赖安装及锁文件约定：待填写。
- 配置变量与安全获取方式：待填写；禁止写凭据。

## 本地运行
- 执行目录：待填写。
- 启动方式：待填写。
- 必要本地服务：待填写或不适用。

## 验证命令
| 检查项 | 执行目录与命令 | 前置条件 | 适用范围 |
| --- | --- | --- | --- |

没有实际执行的检查不能写为通过；实际结果记录在检查点或正式验收记录。

## 修改与提交
遵循 AGENTS.md 指向的详细开发、安全、Git 及测试规则；项目特有分支和提交约定在此填写。
不将一般修改请求扩展为所有外部操作授权。

## 数据迁移与兼容性
待填写或不适用。

## 人工接力
遵循 HANDOFF.md；工具入口见 CLAUDE.md；仅当项目复制了 adapters/ENTRY.md 时才引用它。

## 多 Agent 接入与共享技能
- 规则入口唯一：根 AGENTS.md；客户端入口只引用，不复制正文。
- 客户端映射与核实状态见 docs/MULTI-AGENT.md；规则边界见 docs/AGENT-RULES.md 第 19 节。
- 共享工作流位于 skills/；新增技能按 skills/README.md 的规范，frontmatter `name` 必须等于目录名。
- 局部作用域按 `--module` 或手工复制 adapters/scoped/MODULE-AGENTS.md 建立，不预建空目录。
- 一致性自检：`sh scripts/check-docs.sh`；骨架生成：`node scripts/init.mjs --help`。

## 发布入口
发布版本号及质量要求遵循 docs/AGENT-RULES.md 第 17 节，执行与回滚见 DEPLOYMENT.md。
组件发布等流程只有实际存在时才补充。