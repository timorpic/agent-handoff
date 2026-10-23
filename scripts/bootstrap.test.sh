#!/usr/bin/env bash
# 纯 Shell 集成测试：用压缩包替代网络响应，并屏蔽 Git/Node。
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
temporary=$(mktemp -d)
trap 'rm -rf -- "$temporary"' EXIT
mkdir -p "$temporary/archive/template" "$temporary/bin" "$temporary/project with spaces" "$temporary/empty" "$temporary/scratch"
for rel in AGENTS.md CLAUDE.md README.md README.project.md MEMORY.md HANDOFF.md PROMPTS.md DESIGN.md CHANGELOG.md TODO.md .gitignore \
  .handoff/CONTEXT.md .handoff/CHECKPOINT.md .claude/settings.json \
  scripts/check-docs.sh scripts/init.mjs scripts/handoff.mjs .github/PULL_REQUEST_TEMPLATE.md; do
  mkdir -p "$temporary/archive/template/$(dirname "$rel")"
  cp "$root/$rel" "$temporary/archive/template/$rel"
done
for dir in docs adapters skills; do cp -R "$root/$dir" "$temporary/archive/template/$dir"; done
# 下载包包含模板自身 CI，但初始化不得分发它。
mkdir -p "$temporary/archive/template/.github/workflows"
cp "$root/.github/workflows/template-ci.yml" "$temporary/archive/template/.github/workflows/template-ci.yml"
tar -czf "$temporary/fixture.tar.gz" -C "$temporary/archive" template
cat > "$temporary/bin/curl" <<'MOCK'
#!/bin/bash
[[ "${TEST_DOWNLOAD_FAIL:-0}" == 0 ]] || exit 22
while (( $# )); do
  case "$1" in
    -o) cp "$TEST_ARCHIVE" "$2"; exit ;;
    https://*) printf '%s\n' "$1" >> "$TEST_URL_LOG" ;;
  esac
  shift
done
exit 1
MOCK
cat > "$temporary/bin/git" <<'MOCK'
#!/bin/bash
printf '禁止调用 Git\n' >&2
exit 99
MOCK
cp "$temporary/bin/git" "$temporary/bin/node"
chmod +x "$temporary/bin/"*
export PATH="$temporary/bin:$PATH"
export TEST_ARCHIVE="$temporary/fixture.tar.gz" TEST_URL_LOG="$temporary/urls" TMPDIR="$temporary/scratch"
run() { (cd "$temporary/project with spaces" && bash "$root/scripts/bootstrap.sh" "$@"); }
expect_status() {
  expected=$1; shift
  actual=0
  "$@" > "$temporary/output" 2>&1 || actual=$?
  [[ "$actual" == "$expected" ]] || { cat "$temporary/output"; printf '期望 %s，实际 %s\n' "$expected" "$actual"; exit 1; }
  [[ -z "$(ls -A "$temporary/scratch")" ]] || { printf '临时目录未清理\n'; exit 1; }
}
expect_status 0 run --dry-run
[[ -z "$(ls -A "$temporary/project with spaces")" ]]
expect_status 0 run --project-id 'my-project' --ref feature/example
grep -q '/feature/example$' "$TEST_URL_LOG"
grep -q '^- project_id: my-project$' "$temporary/project with spaces/.handoff/CONTEXT.md"
grep -q '^- 稳定 project_id：my-project$' "$temporary/project with spaces/MEMORY.md"
cmp "$root/README.project.md" "$temporary/project with spaces/README.md"
cmp "$root/.github/PULL_REQUEST_TEMPLATE.md" "$temporary/project with spaces/.github/PULL_REQUEST_TEMPLATE.md"
[[ ! -e "$temporary/project with spaces/.github/workflows" ]]
[[ ! -e "$temporary/project with spaces/scripts/ci-checks.sh" ]]
grep -q '^- status: draft$' "$temporary/project with spaces/.handoff/CHECKPOINT.md"
[[ -L "$temporary/project with spaces/.claude/skills" ]]
[[ -d "$temporary/project with spaces/.gemini/antigravity/skills" ]]
[[ ! -e "$temporary/project with spaces/.git" ]]
[[ ! -e "$temporary/project with spaces/docs/INITIALIZATION.md" ]]
! grep -q INITIALIZATION.md "$temporary/project with spaces/AGENTS.md" "$temporary/project with spaces/README.md"
printf '已有内容\n' > "$temporary/project with spaces/README.md"
expect_status 1 run
grep -q '^已有内容$' "$temporary/project with spaces/README.md"
# 切换到全新目录测试默认参数、失败和父目录链接，避免污染已初始化目录。
run() { (cd "$temporary/empty" && bash "$root/scripts/bootstrap.sh" "$@"); }
export TEST_DOWNLOAD_FAIL=1
expect_status 1 run
[[ -z "$(ls -A "$temporary/empty")" ]]
unset TEST_DOWNLOAD_FAIL
expect_status 2 run --target anywhere
expect_status 2 run --ref
expect_status 2 run --ref ../bad
ln -s "$temporary/project with spaces/docs" "$temporary/empty/docs"
expect_status 1 run
[[ ! -e "$temporary/empty/AGENTS.md" ]]
rm "$temporary/empty/docs"
printf '项目自己的 README\n' > "$temporary/empty/README.md"
expect_status 0 run --no-symlink
grep -q '^项目自己的 README$' "$temporary/empty/README.md"
[[ -f "$temporary/empty/.claude/skills/README.md" && ! -L "$temporary/empty/.claude/skills" ]]
grep -q '^- project_id: 未填' "$temporary/empty/.handoff/CONTEXT.md"
# 已有 CI 不影响初始化，不能改写项目 CI 或引入模板 CI。
mkdir -p "$temporary/github-existing/.github/workflows"
printf '已有项目的 CI\n' > "$temporary/github-existing/.github/workflows/ci.yml"
run() { (cd "$temporary/github-existing" && bash "$root/scripts/bootstrap.sh" "$@"); }
expect_status 0 run
grep -q '^已有项目的 CI$' "$temporary/github-existing/.github/workflows/ci.yml"
[[ ! -e "$temporary/github-existing/.github/workflows/template-ci.yml" ]]
# 已有 PR 模板仍按同名冲突保护，不能部分写入。
mkdir -p "$temporary/github-conflict/.github"
printf '已有项目的 PR 模板\n' > "$temporary/github-conflict/.github/PULL_REQUEST_TEMPLATE.md"
run() { (cd "$temporary/github-conflict" && bash "$root/scripts/bootstrap.sh" "$@"); }
expect_status 1 run
grep -q '^已有项目的 PR 模板$' "$temporary/github-conflict/.github/PULL_REQUEST_TEMPLATE.md"
[[ ! -e "$temporary/github-conflict/AGENTS.md" ]]
# 不完整压缩包：不能留下部分项目文件。
rm "$temporary/archive/template/HANDOFF.md"
tar -czf "$temporary/incomplete.tar.gz" -C "$temporary/archive" template
export TEST_ARCHIVE="$temporary/incomplete.tar.gz"
mkdir "$temporary/incomplete-project"
run() { (cd "$temporary/incomplete-project" && bash "$root/scripts/bootstrap.sh" "$@"); }
expect_status 1 run
[[ -z "$(ls -A "$temporary/incomplete-project")" ]]
printf 'PASS：纯 Shell 初始化、空白记录、标识同步、软链/指针、预览、冲突、下载失败、版本选择、清理与无 Git/Node 依赖。\n'
