#!/usr/bin/env bash
# 纯 Shell 下载和初始化；目标固定为运行命令时的当前目录。
set -euo pipefail
usage() {
  cat <<'HELP'
在项目文件夹中运行：bash /路径/bootstrap.sh [选项]
依赖：Bash、curl、tar 和常见系统工具；不需要 Git 或 Node.js。
  --ref <分支或Tag>     默认 main
  --project-id <标识>   可选；写入 MEMORY.md 的稳定 project_id，省略时保留未填写
  --no-symlink          用 README 指针替代技能软链
  --dry-run             下载并显示计划，不写项目目录
  --help, -h            查看说明
始终初始化当前目录；同名文件冲突时停止，不覆盖。
退出码：0 成功；1 下载或初始化失败；2 参数错误。
HELP
}
fail() { printf '%s\n' "$1" >&2; exit 1; }
ref=main
project_id=''
no_symlink=false
dry_run=false
while (( $# )); do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --no-symlink) no_symlink=true; shift ;;
    --dry-run) dry_run=true; shift ;;
    --ref|--project-id)
      if (( $# < 2 )) || [[ -z "$2" || "$2" == -* || "$2" == *[[:space:][:cntrl:]]* ]]; then
        printf '%s 需要有效的值\n' "$1" >&2; exit 2
      fi
      case "$1" in
        --ref)
          [[ "$2" != *[^a-zA-Z0-9._/-]* && "$2" != *..* ]] || { printf '无效版本\n' >&2; exit 2; }
          ref=$2 ;;
        --project-id) project_id=$2 ;;
      esac
      shift 2 ;;
    *) printf '未知参数：%s\n' "$1" >&2; exit 2 ;;
  esac
done
for tool in curl tar mktemp mkdir cp rm find awk grep ln dirname cat; do
  command -v "$tool" >/dev/null 2>&1 || fail "缺少系统工具：$tool"
done
target=$(pwd -P)
temporary=$(mktemp -d "${TMPDIR:-/tmp}/ai-rules-template-download.XXXXXXXX") || fail '无法创建临时目录。'
cleanup() { rm -rf -- "$temporary"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
source_dir="$temporary/source"
stage="$temporary/stage"
mkdir -p "$source_dir" "$stage"
printf '正在下载模板（%s）……\n' "$ref"
curl --proto '=https' --tlsv1.2 -fL --retry 2 --connect-timeout 15 --max-time 180 \
  "https://codeload.github.com/timorpic/ai-rules-template/tar.gz/$ref" -o "$temporary/template.tar.gz" \
  || fail '模板下载失败；未修改项目文件。'
# 在解压前拒绝绝对路径、路径穿越和控制字符。
tar -tzf "$temporary/template.tar.gz" > "$temporary/archive-list" || fail '模板压缩包损坏。'
awk '
  /^\// || /[[:cntrl:]]/ { exit 1 }
  { n=split($0, a, "/"); for(i=1;i<=n;i++) if(a[i]=="..") exit 1 }
  END { if(NR==0) exit 1 }
' "$temporary/archive-list" || fail '模板压缩包路径无效。'
tar -xzf "$temporary/template.tar.gz" --strip-components=1 -C "$source_dir" || fail '模板解压失败。'

# 只分发指定模板文件，不分发维护记录、测试或仓库历史。
for rel in AGENTS.md CLAUDE.md MEMORY.md PROMPTS.md DESIGN.md CHANGELOG.md TODO.md .gitignore \
  .claude/settings.json .github/PULL_REQUEST_TEMPLATE.md; do
  [[ -f "$source_dir/$rel" && ! -L "$source_dir/$rel" ]] || fail "模板缺少普通文件：$rel；未修改项目文件。"
  mkdir -p "$stage/$(dirname "$rel")"
  cp "$source_dir/$rel" "$stage/$rel"
done
for dir in adapters docs skills; do
  [[ -d "$source_dir/$dir" && ! -L "$source_dir/$dir" ]] || fail "模板缺少目录：$dir"
  [[ -z "$(find "$source_dir/$dir" -type l -print)" ]] || fail "模板目录包含非预期软链：$dir"
  cp -R "$source_dir/$dir" "$stage/$dir"
done
rm -f "$stage/docs/INITIALIZATION.md"
# 删除模板专属引用，项目介绍仍为空白；不写入模板维护历史。
awk '!/INITIALIZATION[.]md/' "$stage/AGENTS.md" > "$temporary/AGENTS.md"
cp "$temporary/AGENTS.md" "$stage/AGENTS.md"
# 项目 README 独立维护，普通已有文件保留；异常路径仍交由冲突检查拒绝。
if [[ -f "$target/README.md" && ! -L "$target/README.md" ]]; then
  printf '保留已有 README.md。\n'
else
  [[ -f "$source_dir/README.project.md" && ! -L "$source_dir/README.project.md" ]] || fail '模板缺少 README.project.md。'
  cp "$source_dir/README.project.md" "$stage/README.md"
fi
if [[ -n "$project_id" ]]; then
  TEMPLATE_PROJECT_ID="$project_id" awk '/^- 稳定 project_id：/ { print "- 稳定 project_id：" ENVIRON["TEMPLATE_PROJECT_ID"]; next } { print }' \
    "$stage/MEMORY.md" > "$temporary/MEMORY.md"
  cp "$temporary/MEMORY.md" "$stage/MEMORY.md"
fi
make_pointer() {
  mkdir -p "$stage/$1"
  printf '# skills 指针\n\n共享技能库：%s/。按需读取其中的 SKILL.md，不复制正文。\n' "$2" > "$stage/$1/README.md"
}
if [[ "$no_symlink" == true ]]; then
  make_pointer .claude/skills ../skills
  make_pointer .gemini/antigravity/skills ../../skills
else
  mkdir -p "$stage/.claude" "$stage/.gemini/antigravity"
  ln -s ../skills "$stage/.claude/skills" || make_pointer .claude/skills ../skills
  ln -s ../../skills "$stage/.gemini/antigravity/skills" || make_pointer .gemini/antigravity/skills ../../skills
fi
(cd "$stage" && find . \( -type f -o -type l \) -print) > "$temporary/files"
# 全量检查后再写入：同名文件、悬空链接、父路径软链或普通文件都视为冲突。
conflict=false
while IFS= read -r rel; do
  rel=${rel#./}
  check="$target/$rel"
  if [[ -e "$check" || -L "$check" ]]; then
    printf '冲突：%s\n' "$rel" >&2; conflict=true
  fi
  parent=$(dirname "$check")
  while [[ "$parent" != "$target" ]]; do
    if [[ -L "$parent" || ( -e "$parent" && ! -d "$parent" ) ]]; then
      printf '父路径冲突：%s\n' "$parent" >&2; conflict=true; break
    fi
    parent=$(dirname "$parent")
  done
done < "$temporary/files"
[[ "$conflict" == false ]] || fail '已停止：未写入项目文件，请人工核对已有内容。'
printf '初始化目录：%s\n' "$target"
while IFS= read -r rel; do printf '  %s\n' "${rel#./}"; done < "$temporary/files"
if [[ "$dry_run" == true ]]; then
  printf '预览完成，未写入项目文件。\n'; exit 0
fi
# 不覆盖已有文件；初始化期间请勿让其他工具同时写入此目录。
(set -C
  while IFS= read -r rel; do
    rel=${rel#./}
    mkdir -p "$target/$(dirname "$rel")"
    if [[ -L "$stage/$rel" ]]; then
      case "$rel" in
        .claude/skills) link=../skills ;;
        .gemini/antigravity/skills) link=../../skills ;;
        *) fail '非预期链接' ;;
      esac
      ln -s "$link" "$target/$rel"
    else
      cat "$stage/$rel" > "$target/$rel"
    fi
  done < "$temporary/files"
)
printf '初始化完成。按当前项目填写说明与需求；未知信息保留待填写。\n'
