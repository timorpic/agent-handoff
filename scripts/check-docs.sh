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
#   7. 技能前置元数据：skills/*/SKILL.md 的 frontmatter、name 与目录名是否一致。
#   8. 技能目录共享：.claude/skills 与 .gemini/antigravity/skills 的相对软链能否解析。
#   9. .claude/settings.json 是否为合法 JSON，且不含明文疑似凭据。
#  10. .gitignore 是否整体忽略 skills/docs/.handoff，平台缓存规则是否齐全。

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

# 校验客户端技能目录：符号链接（可解析、目标符合预期）或回退布局（目录 + README.md）。
# 参数：$1 = 链接路径，$2 = 期望的相对目标。
check_skill_link() {
	link_path=$1
	expect_target=$2
	if [ -L "$link_path" ]; then
		actual_target=$(readlink "$link_path" 2>/dev/null)
		if [ "$actual_target" != "$expect_target" ]; then
			err "$link_path 指向 $actual_target，应为 $expect_target（相对软链深度写错会静默失效）"
		elif [ ! -e "$link_path" ]; then
			err "$link_path 解析不到目标 $actual_target（目标路径不存在）"
		fi
	elif [ -d "$link_path" ]; then
		if [ ! -f "$link_path/README.md" ]; then
			err "$link_path 是目录而非软链，且缺少 README.md 指针（回退布局需说明共享技能位于仓库根 skills/）"
		fi
	else
		err "$link_path 既不是符号链接也不是目录（无法共享仓库根 skills/）"
	fi
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

# ---------- 7. 技能前置元数据 ----------
# 目标是「目录名 = name 且能被客户端解析」，不校验业务内容。
if [ -d skills ]; then
	for skill_md in skills/*/SKILL.md; do
		[ -f "$skill_md" ] || continue
		skill_dir=${skill_md%/SKILL.md}
		skill_dir=${skill_dir#skills/}
		# 统一 CRLF 与行尾空白，避免 Windows 检出时首行/结束标记比较失败。
		awk '{ sub(/\r$/, ""); sub(/[ \t]+$/, ""); print }' "$skill_md" >"$tmpdir/skill.md"
		if [ "$(sed -n '1p' "$tmpdir/skill.md")" != '---' ]; then
			err "$skill_md 首行不是 ---（frontmatter 必须从第一行开始）"
			continue
		fi
		fm_end=$(awk 'NR > 1 && $0 == "---" { print NR; exit }' "$tmpdir/skill.md")
		if [ -z "$fm_end" ]; then
			err "$skill_md 前 20 行内没有 frontmatter 结束标记 ---"
			continue
		fi
		if [ "$fm_end" -gt 20 ]; then
			err "$skill_md 的 frontmatter 结束于第 $fm_end 行，超出前 20 行（元数据块过长，客户端可能忽略）"
			continue
		fi
		if [ "$fm_end" -le 2 ]; then
			err "$skill_md 的 frontmatter 为空（缺少 name 与 description）"
			continue
		fi
		sed -n "2,$((fm_end - 1))p" "$tmpdir/skill.md" >"$tmpdir/frontmatter"

		name_line=$(grep -a -m1 -E '^name[[:space:]]*:' "$tmpdir/frontmatter")
		name_value=$(printf '%s' "$name_line" | sed 's/^name[[:space:]]*:[[:space:]]*//; s/[[:space:]]*$//')
		case "$name_value" in
		'"'*'"') name_value=${name_value#'"'}; name_value=${name_value%'"'} ;;
		"'"*"'") name_value=${name_value#"'"}; name_value=${name_value%"'"} ;;
		esac
		if [ -z "$name_value" ]; then
			err "$skill_md 缺少非空的 name:"
		elif [ "$name_value" != "$skill_dir" ]; then
			err "$skill_md 的 name 为 $name_value，与目录名 $skill_dir 不一致（客户端按 name 索引技能）"
		fi

		desc_line_no=$(grep -a -n -m1 -E '^description[[:space:]]*:' "$tmpdir/frontmatter" | cut -d: -f1)
		if [ -z "$desc_line_no" ]; then
			err "$skill_md 缺少 description:（写清何时使用）"
		else
			desc_value=$(sed -n "${desc_line_no}p" "$tmpdir/frontmatter" |
				sed 's/^description[[:space:]]*:[[:space:]]*//; s/[[:space:]]*$//')
			case "$desc_value" in
			'"'*'"') desc_value=${desc_value#'"'}; desc_value=${desc_value%'"'} ;;
			"'"*"'") desc_value=${desc_value#"'"}; desc_value=${desc_value%"'"} ;;
			esac
			if [ -z "$desc_value" ]; then
				err "$skill_md 的 description: 为空"
			fi
			next_line_no=$((desc_line_no + 1))
			next_line=$(sed -n "${next_line_no}p" "$tmpdir/frontmatter")
			case "$next_line" in
			' '*|'	'*)
				warn "$skill_md 的 description 疑似多行（第 $next_line_no 行有缩进续行），多行描述可能不被客户端正确解析"
				;;
			esac
		fi
	done
fi

# ---------- 8. 技能目录共享 ----------
# 客户端目录整体不存在时跳过：不是每个项目都接这两个客户端。
if [ -e .claude/skills ] || [ -L .claude/skills ]; then
	check_skill_link .claude/skills ../skills
elif [ -d .claude ]; then
	warn "存在 .claude/ 但没有 skills 链接（不共享技能时可忽略；需要时 ln -s ../skills .claude/skills）"
fi
if [ -e .gemini/antigravity/skills ] || [ -L .gemini/antigravity/skills ]; then
	check_skill_link .gemini/antigravity/skills ../../skills
elif [ -d .gemini/antigravity ]; then
	warn "存在 .gemini/antigravity/ 但没有 skills 链接（不使用该客户端时可忽略；需要时 ln -s ../../skills .gemini/antigravity/skills）"
fi

# ---------- 9. .claude/settings.json ----------
if [ -f .claude/settings.json ]; then
	if command -v node >/dev/null 2>&1; then
		json_err=$(node --input-type=commonjs \
			-e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' \
			.claude/settings.json 2>&1)
		if [ $? -ne 0 ]; then
			json_hint=$(printf '%s\n' "$json_err" | grep -a -m1 -E 'SyntaxError|Error' | cut -c1-160)
			[ -n "$json_hint" ] || json_hint=$(printf '%s\n' "$json_err" | sed -n '1p')
			[ -n "$json_hint" ] || json_hint='解析失败（node 退出码非 0）'
			err ".claude/settings.json 不是合法 JSON：$json_hint"
		fi
	else
		warn "未找到 node，跳过 .claude/settings.json 的 JSON 校验"
	fi
	# 只认「键名紧跟冒号/等号且值足够长」的形态，避免把 max_tokens 之类字段当成凭据；
	# 值以 ${ENV_VAR} 开头的属环境变量引用，不是明文凭据，单独排除。
	leaks=$(grep -a -n -i -E \
		'(api[_-]?key|token|secret|password)["[:space:]]*[:=][[:space:]]*"?[^"[:space:]]{16,}' \
		.claude/settings.json 2>/dev/null |
		grep -a -v -E '[:=][[:space:]]*"?[$][{]' |
		cut -d: -f1 | head -n 5)
	for leak_line in $leaks; do
		err ".claude/settings.json 第 $leak_line 行含疑似明文凭据（API key/token/secret/password），改用环境变量注入"
	done
fi

# ---------- 10. 忽略规则 ----------
if [ -f .gitignore ]; then
	for ignore_dir in skills docs .handoff; do
		case "$ignore_dir" in
		skills) ignore_hint="会挡掉共享技能库，各客户端路径将指向空目录" ;;
		docs) ignore_hint="会挡掉正式规则与决策记录" ;;
		.handoff) ignore_hint="会吞掉 archive 与归档证据（只应忽略 CONTEXT/CHECKPOINT 等运行文件）" ;;
		*) ignore_hint="会挡掉必须进 Git 的内容" ;;
		esac
		if grep -a -qE "^(/?\*\*/)?/?${ignore_dir}(/\\*{1,2})?/?[[:space:]]*$" .gitignore; then
			err ".gitignore 不得整体忽略 $ignore_dir/（$ignore_hint）"
		fi
	done
	if [ -d .claude ] &&
		! grep -a -qE '^/?\.claude/memory(/\*{0,2})?/?[[:space:]]*$' .gitignore; then
		warn ".gitignore 缺少平台缓存规则 .claude/memory/（存在 .claude/ 时建议忽略会话缓存）"
	fi
	if [ -d .gemini ] &&
		! grep -a -qE '^/?\.gemini/antigravity/scratch(/\*{0,2})?/?[[:space:]]*$' .gitignore; then
		warn ".gitignore 缺少平台缓存规则 .gemini/antigravity/scratch/（存在 .gemini/ 时建议忽略临时草稿）"
	fi
fi

# ---------- 汇总 ----------
n_errors=$(wc -l <"$errors" | tr -d ' ')
n_warns=$(wc -l <"$warns" | tr -d ' ')
printf '\n检查完成：%s 个错误，%s 个警告\n' "$n_errors" "$n_warns"
[ "$n_errors" -eq 0 ] || exit 1
exit 0
