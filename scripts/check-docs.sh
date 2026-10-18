#!/bin/sh
# 文档一致性只读自检。
# 用法：sh scripts/check-docs.sh   （在仓库任意位置执行均可）
# 退出码：0 全部通过；1 存在错误；2 环境不满足（不在仓库根目录）。
#
# 检查项：
#   1. Markdown 相对链接目标是否存在（含 .handoff 现场层缺失的例外说明）。
#   2. “<文件> 第 N[.M] 节”引用的章节标题是否存在于该文件。
#   3. CHECKPOINT 的 handoff_claim 与“认领状态”枚举是否一致且包含 open。
#   4. 现场层 Git 跟踪状态：模板仓库应跟踪，目标项目应不跟踪但被忽略。
#   5. 目标项目（无 docs/INITIALIZATION.md）是否仍引用模板专属文件。
#   6. 模板仓库的 CONTEXT/CHECKPOINT 是否保持 draft。

set -u


if [ ! -f AGENTS.md ] || [ ! -f HANDOFF.md ]; then
	printf 'ERROR: 请在仓库根目录执行（需要 AGENTS.md 与 HANDOFF.md）\n' >&2
	exit 2
fi

tmpdir=$(mktemp -d 2>/dev/null || mktemp -d -t checkdocs)
trap 'rm -rf "$tmpdir"' EXIT INT TERM
errors="$tmpdir/errors"
warns="$tmpdir/warns"
: >"$errors"
: >"$warns"

err() {
	printf 'ERROR: %s\n' "$1" | tee -a "$errors" >&2
}
warn() {
	printf 'WARN:  %s\n' "$1" | tee -a "$warns" >&2
}

is_template() {
	[ -f docs/INITIALIZATION.md ]
}

is_tracked() {
	git ls-files --error-unmatch -- "$1" >/dev/null 2>&1
}

ignored_by_pattern() {
	git check-ignore --no-index -q -- "$1" 2>/dev/null
}

# ---------- 1. Markdown 相对链接 ----------
for f in $(find . -path ./.git -prune -o -name '*.md' -print | sort); do
	awk -v file="$f" '
		{
			line = $0
			while (match(line, /\[[^]]*\]\([^)]*\)/)) {
				link = substr(line, RSTART, RLENGTH)
				sub(/^\[[^]]*\]\(/, "", link)
				sub(/\)$/, "", link)
				print file "\t" link
				line = substr(line, RSTART + RLENGTH)
			}
		}' "$f"
done | while IFS='	' read -r file target; do
	case "$target" in
	http://*|https://*|mailto:*|'#'*|'') continue ;;
	esac
	path=${target%%#*}
	[ -z "$path" ] && continue
	dir=$(dirname "$file")
	case "$path" in
	/*) resolved=$path ;;
	*) resolved=$dir/$path ;;
	esac
	if [ ! -e "$resolved" ]; then
		printf '%s\t%s\t%s\n' "$file" "$target" "$resolved" >>"$tmpdir/broken-links"
	fi
done
if [ -s "$tmpdir/broken-links" ]; then
	while IFS='	' read -r file target resolved; do
		if is_template; then
			err "死链 $file -> $target（解析为 $resolved）"
		else
			case "$target" in
			docs/INITIALIZATION.md*)
				err "目标项目仍链接模板专属文件 $file -> $target（见初始化「首次使用」第 8 步）" ;;
			*)
				err "死链 $file -> $target（解析为 $resolved）" ;;
			esac
		fi
	done <"$tmpdir/broken-links"
fi

# ---------- 2. 章节引用 ----------
# 覆盖三种写法：
#   a. 显式文件名：xxx.md 第 N[.M] 节
#   b. 简写：详细规则第 N[.M] 节  → docs/AGENT-RULES.md
#   c. HANDOFF.md 内的自身简写：第 N[.M] 节（不含文件名或“详细规则”前缀）
for f in $(find . -path ./.git -prune -o -name '*.md' -print | sort); do
	awk -v file="$f" '
		{
			rest = $0
			# a. 显式文件名
			while (match(rest, /[A-Za-z0-9_.\/-]+\.md 第 [0-9]+(\.[0-9]+)? 节/)) {
				m = substr(rest, RSTART, RLENGTH)
				rest = substr(rest, RSTART + RLENGTH)
				doc = m; sub(/ 第 .*/, "", doc)
				n = m; sub(/.* 第 /, "", n); sub(/ 节$/, "", n)
				print file "\t" doc "\t" n
			}
			# b. “详细规则第 N 节”
			rest = $0
			while (match(rest, /详细规则第 [0-9]+(\.[0-9]+)? 节/)) {
				m = substr(rest, RSTART, RLENGTH)
				rest = substr(rest, RSTART + RLENGTH)
				n = m; sub(/^详细规则第 /, "", n); sub(/ 节$/, "", n)
				print file "\tdocs/AGENT-RULES.md\t" n
			}
			# c. HANDOFF.md 自身简写
			if (file ~ /HANDOFF\.md$/) {
				rest = $0
				while (match(rest, /第 [0-9]+(\.[0-9]+)? 节/)) {
					m = substr(rest, RSTART, RLENGTH)
					pre = substr(rest, 1, RSTART - 1)
					rest = substr(rest, RSTART + RLENGTH)
					if (pre ~ /(详细规则|\.md |上一节|本节|第 [0-9]+(\.[0-9]+)? 节)/) continue
					n = m; sub(/^第 /, "", n); sub(/ 节$/, "", n)
					print file "\t" file "\t" n
				}
			}
		}' "$f"
done >"$tmpdir/section-refs"
sort -u "$tmpdir/section-refs" >"$tmpdir/section-refs.uniq"
while IFS='	' read -r file doc num; do
	[ -z "$doc" ] && continue
	doc=${doc#./}
	if [ ! -f "$doc" ]; then
		err "章节引用指向不存在的文件：$file -> $doc 第 $num 节"
		continue
	fi
	escaped=$(printf '%s' "$num" | sed 's/\./\\./g')
	if ! grep -a -qE "^#+ ${escaped}(\\.| |$)" "$doc"; then
		err "章节引用不存在：$file -> $doc 第 $num 节"
	fi
done <"$tmpdir/section-refs.uniq"

# ---------- 3. 认领状态枚举 ----------
ckpt=.handoff/CHECKPOINT.md
if [ -f "$ckpt" ]; then
	claim_line=$(grep -a -m1 '^- handoff_claim:' "$ckpt")
	claim_line=${claim_line#*（}
	claim_line=${claim_line%%）*}
	claim_line=${claim_line%%；*}
	claimed_field=$(printf '%s\n' "$claim_line" | tr '/' '\n' |
		sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -a -v '^$' | sort -u)
	claim_row=$(grep -a -m1 '^| 认领状态 |' "$ckpt" |
		sed 's/^| 认领状态 |//; s/|.*$//' |
		sed 's/（.*//' |
		tr '/' '\n' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -a -v '^$' | sort -u)
	if [ -z "$claimed_field" ] || [ -z "$claim_row" ]; then
		err "未能从 $ckpt 解析 handoff_claim 或“认领状态”枚举"
	else
		if [ "$claimed_field" != "$claim_row" ]; then
			err "handoff_claim 与“认领状态”枚举不一致："
			printf '  字段: %s\n  表格: %s\n' "$(echo "$claimed_field" | tr '\n' ' ')" "$(echo "$claim_row" | tr '\n' ' ')" >&2
		fi
		printf '%s\n' "$claim_row" | grep -a -qx 'open' ||
			err "认领状态枚举缺少 open（PROMPTS 要求未认领时保持 open）"
	fi
fi

# ---------- 4. 现场层跟踪状态 ----------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	for p in .handoff/CONTEXT.md .handoff/CHECKPOINT.md; do
		[ -f "$p" ] || continue
		if is_template; then
			is_tracked "$p" || err "模板仓库应跟踪 $p（否则 clone 后无法分发点目录）"
		else
			if is_tracked "$p"; then
				err "目标项目仍在跟踪 $p，应执行 git rm --cached -- $p"
			fi
			ignored_by_pattern "$p" || err "目标项目未忽略 $p（检查 .gitignore 现场层规则）"
		fi
	done
	if grep -a -qE '^/?\.handoff/(\*)?[[:space:]]*$' .gitignore 2>/dev/null; then
		err ".gitignore 不得整体忽略 .handoff/（会吞掉 archive 与归档证据）"
	fi
else
	warn "当前目录不是 Git 仓库，跳过跟踪状态检查"
fi

# ---------- 5. 模板专属引用（目标项目） ----------
if ! is_template; then
	grep -a -rn --include='*.md' 'INITIALIZATION\.md' . 2>/dev/null |
		grep -a -v '^\./\.git/' |
		while IFS= read -r line; do
			case "$line" in
			*模板仓库*|*如存在*|*按需*) continue ;;
			esac
			err "目标项目仍引用模板专属文件：$line"
		done
fi

# ---------- 6. 模板仓库的空白 draft ----------
if is_template; then
	for p in .handoff/CONTEXT.md .handoff/CHECKPOINT.md; do
		[ -f "$p" ] || continue
		grep -a -q '^- status: draft' "$p" ||
			err "模板仓库的 $p 应为 draft（若已当作实际现场使用，应改为不跟踪）"
	done
fi

# ---------- 汇总 ----------
n_errors=$(wc -l <"$errors" | tr -d ' ')
n_warns=$(wc -l <"$warns" | tr -d ' ')
printf '\n检查完成：%s 个错误，%s 个警告\n' "$n_errors" "$n_warns"
[ "$n_errors" -eq 0 ] || exit 1
exit 0
