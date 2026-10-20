# 共享技能库

> 多客户端共用的技能目录。技能正文只在本目录维护一份；
> Claude Code 与 Antigravity 通过软链接读取同一份文件，不复制副本。
> 本目录只写操作步骤；工作规则正文仍在 [AGENTS.md](../AGENTS.md) 与 [docs/AGENT-RULES.md](../docs/AGENT-RULES.md)。

## 目录结构

~~~text
skills/
├── README.md                 # 本文件：规范与新增清单
├── code-review/SKILL.md      # 代码审查
├── refactor/SKILL.md         # 重构
└── release/SKILL.md          # 发版
~~~

目录名使用小写连字符；一个目录只放一份 SKILL.md，不按客户端分叉。

## YAML Frontmatter 规范

每个 SKILL.md 以 `---` 包围的 frontmatter 开头，只保留必要字段：

| 字段 | 要求 |
| --- | --- |
| name | 必填，必须等于所在目录名（`skills/code-review/` 对应 `code-review`）；改名即断链，不另设别名 |
| description | 必填，单行，说明「何时使用」而不是罗列功能；写触发场景，供读取者判断是否适用 |

- 不写客户端未统一支持的字段；需要时先确认各客户端实际读取的键名，再补。
- description 不写版本号、负责人或临时状态，这些属于项目文档。
- frontmatter 之后必须有正文，步骤不能只靠文件名或元数据传递。

## 如何被各客户端发现

| 客户端约定 | 仓库内路径 | 软链目标 |
| --- | --- | --- |
| Claude Code | [.claude/skills](../.claude/skills) | `../skills` |
| Antigravity | [.gemini/antigravity/skills](../.gemini/antigravity/skills) | `../../skills` |

两处都是相对软链：`.claude/skills` 位于仓库根下第一级，指到 `../skills`；
`.gemini/antigravity/skills` 位于仓库根下第二级，必须指到 `../../skills`。
写成 `../skills` 会解析为 `.gemini/skills`，指向不存在的目录。
软链本身要进 Git（符号链接模式，模式 120000），不把技能内容复制进客户端目录。

新增或搬动客户端目录后在仓库根目录核对：

~~~sh
readlink .claude/skills              # 期望输出 ../skills
readlink .gemini/antigravity/skills  # 期望输出 ../../skills
test -e .claude/skills && test -e .gemini/antigravity/skills && echo ok
~~~

## 新增技能检查清单

- [ ] 目录名小写连字符，且与 frontmatter 的 `name` 完全相同。
- [ ] `description` 单行，写清何时使用。
- [ ] 正文包含固定小节：适用场景 / 前置读取 / 步骤 / 输出 / 验证与记录 / 边界。
- [ ] 前置读取只引用章节号（如详细规则第 5 节），不复制规则正文。
- [ ] 步骤不要求授权之外的操作；涉及提交、推送、发版时先确认授权。
- [ ] 两个客户端路径下 `test -e` 通过，`readlink` 输出与上表一致。
- [ ] 在仓库根目录执行 `sh scripts/check-docs.sh`，没有因新增文件产生的错误。
- [ ] 需要时同步更新本文件的目录结构与项目文档导航。

## 与其他层的关系

- 技能是步骤化操作建议，不是规则正文；与 [docs/AGENT-RULES.md](../docs/AGENT-RULES.md) 冲突时以规则为准。
- 技能不扩大授权，不自动调度其他 Agent，也不替代 [HANDOFF.md](../HANDOFF.md) 的人工接管流程。
- 现场与验证证据写 [.handoff/CHECKPOINT.md](../.handoff/CHECKPOINT.md)；长期有效的结论才进 [MEMORY.md](../MEMORY.md)。
- 局部作用域的 AGENTS.md 模板见 [adapters/scoped/MODULE-AGENTS.md](../adapters/scoped/MODULE-AGENTS.md)。
