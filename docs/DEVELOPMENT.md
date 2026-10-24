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
统一标准见 [详细规则](AGENT-RULES.md)第 9 节；本节只记录已确认的项目差异及依据。

- 默认主分支差异：无（默认 main；已有项目需核对）。
- 分支、Commit 或合并方式差异及确认依据：无。
- 人工审批人数及团队规模：待确认（单人项目可设为 0，仍须自审和 CI）。
- 远程保护状态与核实证据：待填写；未核实不表示已生效。

## GitHub Actions 与仓库设置

目标项目自行设计和维护 GitHub Actions 工作流、检查命令、运行时、服务及必需检查名称。
本模板不生成目标项目 workflow；分发 PR 模板、治理规则、`.ai/templates/task.json` 和
`scripts/ai-check.mjs`。按 [研发治理](AI-GOVERNANCE.md) 将范围检查加入项目 CI，
并补齐项目实际的 lint、类型检查、测试和构建命令；已有项目 CI 保持原样，模板自身 CI 不分发。
构建与测试全部在 GitHub Actions 执行，本机只做允许的静态检查。

初始化后按项目已有或自行建立的 CI 逐项核实并记录证据：

1. 确认实际默认分支与现有分支保护目标。
2. 在实际 PR 上核对项目必需检查及其覆盖范围，通过后配置为必需状态检查；缺少 CI 时记录待配置。
3. 配置主分支必须经 PR、审查讨论解决、禁止强推和删除，并限制绕过者。
4. 多人项目默认至少 1 位其他维护者批准；单人项目设为 0，PR 中仍记录自审。
5. 默认启用 Squash merge，并将默认合并提交标题设为 PR 标题；其他合并方式按已确认差异配置。
6. 用实际 PR 核实配置生效；仓库权限或套餐不支持时记录限制及人工把关办法。

不得把模板文档检查、workflow 已触发或设置已保存写成项目 CI 通过或保护已生效。
需要验证时按已有授权使用项目实际 workflow，例如 `gh workflow run <项目工作流> --ref <已推送分支>`，
再查询对应运行并核对结果。初始化与普通修改不自动授权推送、远程设置变更或生产发布。

设置能力及语法参考 [GitHub 分支保护说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
与 [GitHub Actions workflow 语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

## 数据迁移与兼容性
待填写或不适用。

## 人工接力
遵循 HANDOFF.md；工具入口见 CLAUDE.md；仅当项目复制了 adapters/ENTRY.md 时才引用它。
提供本地助手时，先执行 `node scripts/handoff.mjs inspect`，按
[接力助手说明](HANDOFF-HELPER.md) 先 `claim` 再修改业务文件，用 `save` 保存完整结果和检查点。
助手不证明旧工具已停止写入，也不替代业务验收。

## 多 Agent 接入与共享技能
- 规则入口唯一：根 AGENTS.md；客户端入口只引用，不复制正文。
- 客户端映射与核实状态见 docs/MULTI-AGENT.md；规则边界见 docs/AGENT-RULES.md 第 19 节。
- 共享工作流位于 skills/；新增技能按 skills/README.md 的规范，frontmatter `name` 必须等于目录名。
- 局部作用域按 `--module` 或手工复制 adapters/scoped/MODULE-AGENTS.md 建立，不预建空目录。
- 一致性自检：`sh scripts/check-docs.sh`；骨架生成：`node scripts/init.mjs --help`。

## 发布入口
发布版本号及质量要求遵循 docs/AGENT-RULES.md 第 17 节，执行与回滚见 DEPLOYMENT.md。
组件发布等流程只有实际存在时才补充。

## 研发治理与初始化验收

新项目采用 [研发治理](AI-GOVERNANCE.md) 的任务契约与范围检查。
初始化分发规则、检查器和契约样例，不分发 `.ai/tasks/` 下的维护历史，也不生成项目 workflow。
每个项目必须在真实 PR 上核对缺失契约或越界变更能使独立范围检查失败，
再按实际权限配置必需检查；仅生成文件不能宣称门禁已启用。
模板仓库自身通过 `template-checks` 和 `task-scope` 验证分发行为及 PR 范围。
本机可运行 `node --check scripts/ai-check.mjs`、`sh scripts/check-docs.sh` 和范围静态检查；
新增回归仅由 GitHub Actions 执行。远程分支保护与四客户端行为验收仍待实际核实。
