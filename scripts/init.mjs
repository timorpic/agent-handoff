#!/usr/bin/env node
// scripts/init.mjs —— 零依赖骨架生成器
//
// 用途：
//   把本模板仓库的协议层与项目层文件复制到目标项目；为两个客户端建立指向根目录 skills/ 的
//   相对软链（不支持软链时回退为「目录 + README.md 指针」）；生成空白 draft 的现场层文件；
//   按 --module 追加局部作用域入口（AGENTS.md + 同级 CLAUDE.md）。
//
// 用法：
//   node scripts/init.mjs [--target <dir>] [--project-id <id>] [--module <相对路径>]...
//                         [--no-symlink] [--force] [--dry-run] [--help]
//
//   --target <dir>        目标目录，默认当前工作目录；不存在时创建。
//   --project-id <id>     写入现场层 project_id；不给则保持模板原文（不写空值）。
//   --module <相对路径>   追加一个局部作用域，可重复；路径相对目标目录，不得越出目标。
//   --no-symlink          不创建软链，直接使用「目录 + README.md 指针」回退形态。
//   --force               覆盖已存在的同名文件（覆盖前先打印将覆盖的路径清单）。
//   --dry-run             只打印计划，不写盘。
//   --help                打印本说明。
//
// 退出码：
//   0  生成成功，或 --dry-run 干跑成功，或 --help
//   1  存在冲突（未加 --force）或执行失败
//   2  用法错误（未知选项、缺参数、非法 project_id、越出目标目录的 --module 路径）
//
// 约束：
//   零依赖，只用 Node 内置模块（node:fs/promises、node:path、node:url、node:process），node >= 18。
//   不调用任何外部命令，只做文件系统操作。
//
// 关于「在目标项目里再执行本脚本」：
//   本脚本会被复制进目标项目的 scripts/init.mjs。此时脚本所在目录的上一级就是目标项目本身，
//   源目录与目标目录相同：基础文件逐项识别为「源与目标为同一路径」并按 no-op 跳过（绝不自我覆盖），
//   --module 仍可正常追加局部作用域。这正是目标项目里加模块入口的预期用法。

import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// ---------- 常量 ----------

// 源目录 = 本脚本所在目录的上一级（模板仓库根；在目标项目里即项目根）
const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 模板专属初始化说明的文件名：拼接构造，避免生成物里出现该字面量（目标项目不复制该文件）
const TEMPLATE_DOC_NAME = 'INITIAL' + 'IZATION' + '.md';
const TEMPLATE_DOC_REL = 'docs/' + TEMPLATE_DOC_NAME;

// 根目录固定复制项
const ROOT_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'MEMORY.md',
  'HANDOFF.md',
  'PROMPTS.md',
  'DESIGN.md',
  'CHANGELOG.md',
  'TODO.md',
  '.gitignore',
];

// 递归复制的目录（按需存在；缺失时记入「源文件暂缺」而不是崩溃）
const WALK_DIRS = ['adapters', 'docs', 'skills'];

// 其它固定复制项（scripts/init.mjs 一并复制：目标项目里要能执行 --module 追加）
const EXTRA_FILES = ['scripts/check-docs.sh', 'scripts/init.mjs', 'scripts/handoff.mjs', '.github/PULL_REQUEST_TEMPLATE.md', '.claude/settings.json'];

// 现场层：从空白模板复制后仅替换 project_id，status 保持 draft
const HANDOFF_TEMPLATES = ['.handoff/CONTEXT.md', '.handoff/CHECKPOINT.md'];

// 局部作用域模板
const MODULE_TEMPLATE = 'adapters/scoped/MODULE-AGENTS.md';

// 客户端技能位置：相对软链目标（相对链接所在目录），以及回退指针里给使用者看的相对路径
const SKILL_LINKS = [
  { rel: '.claude/skills', linkTarget: '../skills', skillsFromHere: '../skills' },
  { rel: '.gemini/antigravity/skills', linkTarget: '../../skills', skillsFromHere: '../../skills' },
];

// 遍历时跳过的目录名
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules']);

// 用法错误（退出码 2）
class UsageError extends Error {}

const HELP_TEXT = [
  '零依赖骨架生成器：从本模板仓库生成一个新项目骨架。',
  '',
  '用法：',
  '  node scripts/init.mjs [选项]',
  '',
  '选项：',
  '  --target <dir>       目标目录（默认当前工作目录；不存在时创建）',
  '  --project-id <id>    写入 .handoff 的 project_id；不给则保持模板原文「未填」',
  '  --module <相对路径>  追加局部作用域入口，可重复（如 --module src/api）',
  '  --no-symlink         不建软链，直接写「目录 + README.md 指针」回退形态',
  '  --force              覆盖已存在文件；覆盖前先打印将覆盖的路径清单',
  '  --dry-run            只打印计划，不写盘',
  '  --help, -h           打印本说明',
  '',
  '关于重复执行：',
  '  本脚本也会被复制到目标项目的 scripts/init.mjs；在那里它的源目录就是目标项目自身，',
  '  主要用途是继续用 --module 追加局部作用域。基础文件在目标项目里已存在，',
  '  重复执行不加 --force 会按「不覆盖」规则列出冲突并以退出码 1 结束（属预期保护）。',
  '',
  '行为：',
  '  1. 复制协议层与项目层文件（AGENTS.md、CLAUDE.md、README.md、MEMORY.md、HANDOFF.md、',
  '     PROMPTS.md、DESIGN.md、CHANGELOG.md、TODO.md、.gitignore、adapters/**、docs/**、',
  '     skills/**、scripts/check-docs.sh、scripts/init.mjs、scripts/handoff.mjs、',
  '     .github/PULL_REQUEST_TEMPLATE.md、.claude/settings.json）。',
  '  2. 不复制 .git/、.handoff 的已有内容、docs 下的模板专属初始化说明。',
  '  3. 对 AGENTS.md、README.md 去掉只属于模板仓库的引用（目标项目里不该出现该文件名）。',
  '  4. 生成空白 draft 的 .handoff/CONTEXT.md 与 .handoff/CHECKPOINT.md。',
  '  5. 建立 .claude/skills -> ../skills、.gemini/antigravity/skills -> ../../skills。',
  '  6. --module 生成 <dir>/AGENTS.md 与指向它的同级 CLAUDE.md。',
  '  7. 默认不覆盖已存在文件：列出冲突并以退出码 1 结束。',
  '',
  '退出码：0 成功或干跑；1 冲突或失败；2 用法错误。',
].join('\n');

// ---------- 参数解析 ----------

// 解析命令行参数；只做形态校验，与目标目录相关的校验放在 plan 里
function parseArgs(argv) {
  const options = {
    target: null,
    projectId: null,
    modules: [],
    noSymlink: false,
    force: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const takeValue = (name) => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new UsageError('选项 ' + name + ' 需要一个值');
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--target':
        options.target = takeValue('--target');
        if (options.target.trim() === '') throw new UsageError('--target 不能为空');
        break;
      case '--project-id':
        options.projectId = takeValue('--project-id').trim();
        if (options.projectId === '') throw new UsageError('--project-id 不能为空');
        if (/[\s\u0000-\u001f]/.test(options.projectId)) {
          throw new UsageError('--project-id 不能包含空白或控制字符');
        }
        break;
      case '--module':
        options.modules.push(takeValue('--module'));
        break;
      case '--no-symlink':
        options.noSymlink = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        throw new UsageError('未知参数：' + arg);
    }
  }

  return options;
}

// 规范化 --module 的相对路径；绝对路径与 .. 段一律拒绝（路径穿越）
function normalizeModulePath(raw) {
  const value = String(raw).replace(/\\/g, '/').trim();
  if (value === '') throw new UsageError('--module 需要一个非空相对路径');
  if (value.startsWith('/') || /^[A-Za-z]:\//.test(value)) {
    throw new UsageError('--module 只接受相对路径，拒绝：' + raw);
  }
  const segments = value.replace(/\/+$/, '').split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new UsageError('--module 路径不得包含空段、"." 或 ".."，拒绝：' + raw);
    }
  }
  return segments.join('/');
}

// ---------- 模板引用处理 ----------

// 对 AGENTS.md / README.md 去掉只属于模板仓库的引用。
// 规则（与文档约定一致，按行处理，避免正则大改）：
//   AGENTS.md：删除「模板文件在目标项目中的 Git 归属按 <该文件> ...」整行（缩进续行，删后语义完整）。
//   README.md：顶部说明行整行替换为项目中立说明；「文档入口」首项整行删除，并连带删除其后空行。
// 若源文件结构已变化（匹配不到），退化为「删除包含该文件名的整行」，并标记退化处理。
function transformTemplateRefs(relPath, text) {
  const changes = [];
  const degraded = [];
  const inputLines = text.split('\n');

  if (relPath === 'AGENTS.md') {
    const output = [];
    inputLines.forEach((line, index) => {
      if (line.includes(TEMPLATE_DOC_NAME)) {
        if (!line.trimStart().startsWith('模板文件在目标项目中的 Git 归属按')) {
          degraded.push('AGENTS.md：第 ' + (index + 1) + ' 行结构与约定不同，按退化规则整行删除');
        }
        changes.push('AGENTS.md：删除模板专属引用行（原第 ' + (index + 1) + ' 行）');
        return;
      }
      output.push(line);
    });
    return { content: output.join('\n'), changes, degraded };
  }

  if (relPath === 'README.md') {
    const replacement = '> 跨工具接力与客户端接入见 [客户端接入](docs/MULTI-AGENT.md)，'
      + '人工接力见 [人工接力协议](HANDOFF.md)。';
    const output = [];
    for (let index = 0; index < inputLines.length; index += 1) {
      const line = inputLines[index];
      const trimmed = line.trim();

      // 顶部说明行：整行替换为中立的项目内说明
      if (trimmed.startsWith('> 模板初始化与人工接力使用方法见')) {
        output.push(replacement);
        changes.push('README.md：原第 ' + (index + 1) + ' 行的模板初始化说明替换为项目中立说明');
        continue;
      }

      // 「文档入口」首项：整行删除，并连带删掉紧随其后的空行（保持列表紧凑）
      if (trimmed.startsWith('- [模板文件树与初始化说明]')) {
        changes.push('README.md：删除「文档入口」中的模板文件树条目（原第 ' + (index + 1) + ' 行）');
        if (inputLines[index + 1] !== undefined && inputLines[index + 1].trim() === '') {
          const nextNonEmpty = inputLines[index + 2];
          if (nextNonEmpty !== undefined && nextNonEmpty.trim().startsWith('- [')) {
            index += 1; // 连带删除空行
          }
        }
        continue;
      }

      if (line.includes(TEMPLATE_DOC_NAME)) {
        degraded.push('README.md：第 ' + (index + 1) + ' 行结构与约定不同，按退化规则整行删除');
        changes.push('README.md：删除模板专属引用行（原第 ' + (index + 1) + ' 行）');
        continue;
      }

      output.push(line);
    }
    return { content: output.join('\n'), changes, degraded };
  }

  return { content: text, changes, degraded };
}

// 现场层模板：只在给了 --project-id 时替换 project_id 的值；不给则保持原文（不写空字符串）
function fillProjectId(text, projectId) {
  if (!projectId) return { content: text, changed: false };
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (/^- project_id:/.test(lines[index])) {
      lines[index] = '- project_id: ' + projectId;
      return { content: lines.join('\n'), changed: true };
    }
  }
  return { content: text, changed: false };
}

// 局部作用域模板：替换占位符，并按模块实际深度改写指向规则正文的相对链接。
// 模板里的 ../../docs/AGENT-RULES.md 只在模块深度为 2 时正确，深层模块必须重算。
// 只改写 Markdown 链接形式 ](…docs/AGENT-RULES.md)：模板正文里还有用反引号写的
// 字面量，用于解释「模板按两级深度编写」，那是给人看的说明，不应跟着改写。
function transformModuleTemplate(raw, modulePath, moduleName, rulesRelFromModule) {
  const changes = [];
  let content = raw;

  const linkPattern = /\]\((?:\.\.\/)*docs\/AGENT-RULES\.md\)/g;
  const linkMatches = content.match(linkPattern) || [];
  if (linkMatches.length === 0) {
    changes.push('局部 AGENTS.md：未找到规则正文的 Markdown 链接，跳过相对路径改写（请人工核对）');
  } else {
    content = content.replace(linkPattern, '](' + rulesRelFromModule + ')');
    changes.push(
      '局部 AGENTS.md：规则正文链接按模块深度改写为 ' + rulesRelFromModule
        + '（' + linkMatches.length + ' 处）',
    );
  }

  if (content.includes('<MODULE_PATH>')) {
    content = content.split('<MODULE_PATH>').join(modulePath);
    changes.push('局部 AGENTS.md：<MODULE_PATH> 替换为 ' + modulePath);
  }
  if (content.includes('<MODULE_NAME>')) {
    content = content.split('<MODULE_NAME>').join(moduleName);
    changes.push('局部 AGENTS.md：<MODULE_NAME> 替换为 ' + moduleName);
  }

  // 模板里「复制本模板到目标模块后，把 <MODULE_PATH>、<MODULE_NAME> 替换为实际值」这句话
  // 在生成物里已经完成替换，会自相矛盾（变成「把 src/api、api 替换为实际值」），
  // 因此整行删除；其余说明性文字（如深度注意事项）保留。
  let lines = content.split('\n');
  const kept = [];
  let removedInstruction = false;
  for (const line of lines) {
    if (/^\s*>\s*复制本模板到目标模块后/.test(line)) {
      removedInstruction = true;
      continue;
    }
    kept.push(line);
  }
  if (removedInstruction) {
    lines = kept;
    changes.push('局部 AGENTS.md：删除生成后已自相矛盾的「复制本模板后替换占位符」说明行');
  }

  // 标题里的「局部作用域模板」在生成物中改为实际模块路径，避免把成品当模板
  const titleIndex = lines.findIndex((line) => line.startsWith('# AGENTS.md（局部作用域模板）'));
  if (titleIndex !== -1) {
    lines[titleIndex] = '# AGENTS.md（局部作用域：' + modulePath + '）';
    changes.push('局部 AGENTS.md：标题标注实际模块路径 ' + modulePath);
  }

  // 「本模板正文里的 ../../docs/…」一段是给手工复制者的深度说明；生成物中的链接已按实际
  // 深度算好，保留原文会变成错误陈述，替换为与生成结果一致的说明。
  const depthNoteIndex = lines.findIndex((line) => line.startsWith('- 本模板正文里的'));
  if (depthNoteIndex !== -1) {
    let endIndex = depthNoteIndex;
    while (endIndex < lines.length && !/当场核对一次。\s*$/.test(lines[endIndex])) endIndex += 1;
    if (endIndex < lines.length) {
      const replacement = [
        '- 本文件由 `scripts/init.mjs` 生成：上面的规则正文链接已按本模块深度计算为',
        '  `' + rulesRelFromModule + '`；移动或改名模块目录后需同步重算（深度写错通常表现为断链，',
        '  也可能静默指向别的文件，改名后当场核对一次）。',
      ];
      lines.splice(depthNoteIndex, endIndex - depthNoteIndex + 1, ...replacement);
      changes.push('局部 AGENTS.md：深度说明改写为生成结果的实际相对路径 ' + rulesRelFromModule);
    }
  }

  return { content: lines.join('\n'), changes };
}

// 回退形态的技能指针 README（不复制任何 SKILL.md）
function skillsPointerContent(skillsFromHere) {
  return [
    '# skills 指针（回退形态）',
    '',
    '本目录不是技能库本体，只是共享技能库的指针；技能正文只维护仓库根目录 `skills/` 一份。',
    '',
    '- 共享技能位于仓库根目录 `skills/`，从本目录访问的相对路径是 `' + skillsFromHere + '/`。',
    '- 使用某个技能时读取 `' + skillsFromHere + '/<name>/SKILL.md`'
      + '（例如 `' + skillsFromHere + '/code-review/SKILL.md`）。',
    '- 不要在本目录复制 SKILL.md：复制会让不同客户端各持一套副本，后续必然漂移。',
    '',
    '本文件由 scripts/init.mjs 生成（--no-symlink 或软链创建失败时的回退形态）。',
    '',
  ].join('\n');
}

// 局部作用域 CLAUDE.md 的回退形态：只有标题与一句指针，不复制 AGENTS.md 正文
function moduleClaudePointerContent(moduleName) {
  return '# CLAUDE.md（' + moduleName + '）\n'
    + '规则见同级 AGENTS.md；客户端未识别 AGENTS.md 时读取本文件所在目录的 AGENTS.md。\n';
}

// ---------- 文件系统小工具 ----------

function toPosix(value) {
  return value.split(path.sep).join('/');
}

async function lstatSafe(absPath) {
  try {
    return await lstat(absPath);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function pathExists(absPath) {
  return (await lstatSafe(absPath)) !== null;
}

// 递归列出相对路径（'/' 分隔）；符号链接目录跳过并记录
async function walkFiles(dirAbs, prefix, depth, notes) {
  if (depth > 16) {
    notes.push(dirAbs + '：目录层级过深，已跳过');
    return [];
  }
  let dirents;
  try {
    dirents = await readdir(dirAbs, { withFileTypes: true });
  } catch (error) {
    notes.push(dirAbs + '：无法读取目录（' + (error.code || error.message) + '），已跳过');
    return [];
  }
  dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const files = [];
  for (const dirent of dirents) {
    if (SKIP_DIR_NAMES.has(dirent.name)) continue;
    const rel = prefix === '' ? dirent.name : prefix + '/' + dirent.name;
    const abs = path.join(dirAbs, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...(await walkFiles(abs, rel, depth + 1, notes)));
    } else if (dirent.isFile()) {
      files.push(rel);
    } else if (dirent.isSymbolicLink()) {
      const info = await stat(abs).catch(() => null);
      if (info && info.isFile()) files.push(rel);
      else notes.push(rel + '：源目录内的符号链接目录已跳过（避免复制环与悬空链接）');
    }
  }
  return files;
}

// ---------- 计划 ----------

// 把单个复制项加入计划；源文件缺失时记入「源文件暂缺」，不中断
async function addCopyEntry(rel, transform, ctx) {
  const readmeTemplate = path.join(SOURCE_ROOT, 'README.project.md');
  const sourceAbs = rel === 'README.md' && await pathExists(readmeTemplate)
    ? readmeTemplate : path.join(SOURCE_ROOT, rel);
  const info = await lstatSafe(sourceAbs);
  if (!info || !info.isFile()) {
    ctx.missingSources.push({ rel, reason: '源文件暂缺（可能正在并行编辑）' });
    return;
  }

  if (transform === null) {
    ctx.entries.push({ kind: 'copy', rel, sourceAbs });
    return;
  }

  const raw = await readFile(sourceAbs, 'utf8');
  const result = transformTemplateRefs(rel, raw);
  if (result.changes.length > 0) ctx.transformChanges.push(...result.changes);
  if (result.degraded.length > 0) ctx.notes.push(...result.degraded);
  if (result.content.includes(TEMPLATE_DOC_NAME)) {
    ctx.notes.push('警告：' + rel + ' 处理后仍含模板专属文件名，请人工核对');
  }
  ctx.entries.push({
    kind: 'copy',
    rel,
    sourceAbs,
    content: result.content,
    changeCount: result.changes.length,
  });
}

// 递归目录复制项（排除模板专属初始化说明）
async function collectCopyEntries(relDir, ctx) {
  const absDir = path.join(SOURCE_ROOT, relDir);
  if (!(await pathExists(absDir))) {
    ctx.missingSources.push({ rel: relDir + '/**', reason: '源目录暂缺（可能正在并行编辑）' });
    return;
  }
  const files = await walkFiles(absDir, '', 0, ctx.notes);
  if (files.length === 0) {
    ctx.missingSources.push({ rel: relDir + '/**', reason: '源目录为空' });
    return;
  }
  for (const relInside of files) {
    const rel = relDir + '/' + relInside;
    if (rel === TEMPLATE_DOC_REL) continue; // 模板专属初始化说明绝不复制
    await addCopyEntry(rel, null, ctx);
  }
}

// 现场层：读空白模板，只替换 project_id，status 保持 draft
async function planHandoffFiles(ctx, options) {
  for (const rel of HANDOFF_TEMPLATES) {
    const sourceAbs = path.join(SOURCE_ROOT, rel);
    const info = await lstatSafe(sourceAbs);
    if (!info || !info.isFile()) {
      ctx.missingSources.push({ rel, reason: '空白模板暂缺（可能正在并行编辑）' });
      continue;
    }
    const raw = await readFile(sourceAbs, 'utf8');
    const filled = fillProjectId(raw, options.projectId);
    if (filled.changed) {
      ctx.notes.push(rel + '：project_id 已写入 ' + options.projectId);
    } else {
      ctx.notes.push(rel + '：未指定 --project-id，project_id 保持模板原文');
    }
    if (!/^- status: draft$/m.test(filled.content)) {
      ctx.notes.push('警告：' + rel + ' 的 status 不是 draft，请核对源模板（本脚本不改写状态）');
    }
    ctx.entries.push({
      kind: 'generate',
      rel,
      sourceAbs,
      content: filled.content,
      origin: rel + ' 空白模板',
    });
    ctx.handoffFiles.push(rel);
  }
}

// 两个客户端技能位置：软链，或（--no-symlink）回退目录
async function planSkillLinks(ctx, options) {
  const hasSkills = await pathExists(path.join(SOURCE_ROOT, 'skills'));
  for (const spec of SKILL_LINKS) {
    if (!hasSkills) {
      ctx.notes.push(spec.rel + '：源仓库缺少 skills/，跳过技能链接（避免生成悬空链接）');
      continue;
    }
    const pointerContent = skillsPointerContent(spec.skillsFromHere);
    if (options.noSymlink) {
      ctx.entries.push({ kind: 'fallback', rel: spec.rel, pointerContent, reason: '--no-symlink' });
    } else {
      ctx.entries.push({
        kind: 'symlink',
        rel: spec.rel,
        linkTarget: spec.linkTarget,
        pointerContent,
        purpose: '共享技能',
      });
    }
  }
}

// 局部作用域：<dir>/AGENTS.md + 同级 CLAUDE.md（软链或两行指针文件）
async function planModules(ctx, options) {
  const modules = options.modules.map((raw) => {
    const modulePath = normalizeModulePath(raw);
    const moduleDirAbs = path.join(ctx.targetDir, modulePath);
    const relFromTarget = path.relative(ctx.targetDir, moduleDirAbs);
    if (relFromTarget === '' || relFromTarget.startsWith('..') || path.isAbsolute(relFromTarget)) {
      throw new UsageError('--module 路径越出目标目录，已拒绝：' + raw);
    }
    return { modulePath, moduleDirAbs };
  });
  if (modules.length === 0) return;

  const templateAbs = path.join(SOURCE_ROOT, MODULE_TEMPLATE);
  const templateInfo = await lstatSafe(templateAbs);
  if (!templateInfo || !templateInfo.isFile()) {
    ctx.missingSources.push({ rel: MODULE_TEMPLATE, reason: '局部作用域模板暂缺（可能正在并行编辑）' });
    ctx.fatalMissing = true;
    return;
  }
  const templateText = await readFile(templateAbs, 'utf8');
  const rulesAbs = path.join(ctx.targetDir, 'docs', 'AGENT-RULES.md');
  if (!(await pathExists(rulesAbs))) {
    ctx.notes.push('警告：目标项目没有 docs/AGENT-RULES.md，局部入口的规则链接可能失效');
  }

  for (const item of modules) {
    const moduleName = path.posix.basename(item.modulePath);
    const rulesRel = toPosix(path.relative(item.moduleDirAbs, rulesAbs));
    const transformed = transformModuleTemplate(templateText, item.modulePath, moduleName, rulesRel);
    ctx.transformChanges.push(...transformed.changes);

    ctx.entries.push({
      kind: 'generate',
      rel: item.modulePath + '/AGENTS.md',
      sourceAbs: templateAbs,
      content: transformed.content,
      origin: MODULE_TEMPLATE + ' 局部作用域',
    });

    const claudeRel = item.modulePath + '/CLAUDE.md';
    const pointerContent = moduleClaudePointerContent(moduleName);
    if (options.noSymlink) {
      // --no-symlink：写「标题 + 一句指针」的两行文件，不复制 AGENTS.md 正文
      ctx.entries.push({
        kind: 'generate',
        rel: claudeRel,
        sourceAbs: null,
        content: pointerContent,
        origin: '局部入口指针（--no-symlink）',
        skipIfIdentical: true,
      });
    } else {
      // 默认：指向同级 AGENTS.md 的相对软链；软链失败时回退为同一个两行指针文件
      ctx.entries.push({
        kind: 'symlink',
        rel: claudeRel,
        linkTarget: 'AGENTS.md',
        fallback: { mode: 'file', content: pointerContent, reason: '软链创建失败（局部入口）' },
        purpose: '局部入口',
      });
    }
  }
}

// 构建并定稿计划：定稿阶段处理冲突（默认不覆盖）
async function plan(options) {
  const targetDir = path.resolve(process.cwd(), options.target === null ? '.' : options.target);
  const ctx = {
    targetDir,
    entries: [],
    missingSources: [],
    transformChanges: [],
    notes: [],
    handoffFiles: [],
    fatalMissing: false,
  };

  const targetInfo = await lstatSafe(targetDir);
  if (targetInfo && !targetInfo.isDirectory()) {
    throw new Error('目标路径已存在且不是目录：' + targetDir);
  }

  for (const rel of ROOT_FILES) {
    const transform = rel === 'AGENTS.md' ? 'agents' : rel === 'README.md' ? 'readme' : null;
    await addCopyEntry(rel, transform, ctx);
  }
  for (const relDir of WALK_DIRS) {
    await collectCopyEntries(relDir, ctx);
  }
  for (const rel of EXTRA_FILES) {
    await addCopyEntry(rel, null, ctx);
  }
  await planHandoffFiles(ctx, options);
  await planSkillLinks(ctx, options);
  await planModules(ctx, options);

  const finalized = await finalizeEntries(ctx, options);
  return {
    sourceRoot: SOURCE_ROOT,
    targetDir,
    targetExists: targetInfo !== null,
    dryRun: options.dryRun,
    entries: finalized.entries,
    conflicts: finalized.conflicts,
    overwrites: finalized.overwrites,
    missingSources: ctx.missingSources,
    transformChanges: ctx.transformChanges,
    notes: ctx.notes,
    handoffFiles: ctx.handoffFiles,
    fatalMissing: ctx.fatalMissing,
  };
}

// 冲突判定：默认「已存在即冲突」；源与目标同一路径的复制/生成按 no-op 跳过；
// 已指向正确目标的软链与内容一致的指针 README 视为已就绪（便于在已生成项目里追加 --module）。
async function finalizeEntries(ctx, options) {
  const entries = [];
  const conflicts = [];
  const overwrites = [];
  const expectedLinkTarget = new Map(SKILL_LINKS.map((spec) => [spec.rel, spec.linkTarget]));

  for (const entry of ctx.entries) {
    const destAbs = path.join(ctx.targetDir, entry.rel);

    // 源与目标同一路径（在目标项目内执行本脚本）：绝不自我覆盖
    if (
      (entry.kind === 'copy' || entry.kind === 'generate')
      && entry.sourceAbs
      && path.resolve(entry.sourceAbs) === path.resolve(destAbs)
    ) {
      entries.push({ ...entry, kind: 'skip', reason: '源与目标为同一路径，无需复制' });
      continue;
    }

    const info = await lstatSafe(destAbs);
    if (!info) {
      entries.push(entry);
      continue;
    }

    if (entry.rel === 'README.md' && info.isFile() && !info.isSymbolicLink()) {
      entries.push({ ...entry, kind: 'skip', reason: '保留项目已有 README.md' });
      continue;
    }

    if (entry.kind === 'copy' || entry.kind === 'generate') {
      // 内容一致（例如重复执行生成同样的空白 draft / 指针文件）按已就绪处理，不算冲突
      if (entry.kind === 'generate' && !options.force && info.isFile()) {
        const existing = await readFile(destAbs, 'utf8').catch(() => null);
        if (existing === entry.content) {
          entries.push({ ...entry, kind: 'skip', reason: '内容与本次生成一致，无需重写' });
          continue;
        }
      }
      if (options.force) {
        overwrites.push(entry.rel);
        entries.push({ ...entry, removeExisting: true });
      } else {
        conflicts.push({ rel: entry.rel, reason: '目标已存在同名文件' });
      }
      continue;
    }

    if (entry.kind === 'symlink') {
      if (info.isSymbolicLink()) {
        const actual = await readlink(destAbs).catch(() => null);
        if (actual === entry.linkTarget) {
          entries.push({ ...entry, kind: 'skip', reason: '软链已存在且指向 ' + entry.linkTarget });
        } else if (options.force) {
          overwrites.push(entry.rel + '（原软链指向 ' + actual + '）');
          entries.push({ ...entry, removeExisting: true });
        } else {
          conflicts.push({ rel: entry.rel, reason: '目标已存在软链，指向 ' + actual });
        }
        continue;
      }
      // 回退形态是按条目定义的：共享技能回退为「目录 + README.md 指针」，
      // 局部入口回退为「两行指针文件」。已有同名目录/文件时按对应形态判断。
      if (info.isDirectory()) {
        if (!entry.fallback || entry.fallback.mode !== 'file') {
          if (options.force) {
            // 不删除已存在目录：退化为在里面写指针 README
            entries.push({
              ...entry,
              kind: 'fallback',
              reason: '目标已存在同名目录，保留目录并写入指针 README（不删除目录）',
            });
          } else {
            conflicts.push({ rel: entry.rel, reason: '目标已存在同名目录' });
          }
          continue;
        }
        if (options.force) {
          conflicts.push({ rel: entry.rel, reason: '目标已存在同名目录，脚本不删除目录（请手工核对）' });
        } else {
          conflicts.push({ rel: entry.rel, reason: '目标已存在同名目录' });
        }
        continue;
      }
      if (!options.force && entry.fallback && entry.fallback.mode === 'file' && info.isFile()) {
        const existing = await readFile(destAbs, 'utf8').catch(() => null);
        if (existing === entry.fallback.content) {
          entries.push({ ...entry, kind: 'skip', reason: '已是内容一致的回退指针文件' });
          continue;
        }
      }
      if (options.force) {
        overwrites.push(entry.rel);
        entries.push({ ...entry, removeExisting: true });
      } else {
        conflicts.push({ rel: entry.rel, reason: '目标已存在同名文件' });
      }
      continue;
    }

    if (entry.kind === 'fallback') {
      const pointerRel = entry.rel + '/README.md';
      const pointerAbs = path.join(ctx.targetDir, pointerRel);
      if (info.isSymbolicLink()) {
        const actual = await readlink(destAbs).catch(() => null);
        if (actual === expectedLinkTarget.get(entry.rel)) {
          entries.push({ ...entry, kind: 'skip', reason: '已存在指向 skills/ 的软链，无需回退目录' });
        } else if (options.force) {
          overwrites.push(entry.rel + '（原软链指向 ' + actual + '）');
          entries.push({ ...entry, removeExisting: true });
        } else {
          conflicts.push({ rel: entry.rel, reason: '目标已存在软链，指向 ' + actual });
        }
        continue;
      }
      if (info.isDirectory()) {
        const pointerInfo = await lstatSafe(pointerAbs);
        if (!pointerInfo) {
          entries.push(entry);
          continue;
        }
        if (!pointerInfo.isFile()) {
          conflicts.push({ rel: pointerRel, reason: '目标已存在同名的非文件条目' });
          continue;
        }
        const existing = await readFile(pointerAbs, 'utf8').catch(() => null);
        if (existing === entry.pointerContent) {
          entries.push({ ...entry, kind: 'skip', reason: '指针 README 已存在且内容一致' });
        } else if (options.force) {
          overwrites.push(pointerRel);
          entries.push(entry);
        } else {
          conflicts.push({ rel: pointerRel, reason: '目标已存在内容不同的指针 README' });
        }
        continue;
      }
      if (options.force) {
        overwrites.push(entry.rel);
        entries.push({ ...entry, removeExisting: true });
      } else {
        conflicts.push({ rel: entry.rel, reason: '目标已存在同名文件' });
      }
      continue;
    }

    entries.push(entry);
  }

  return { entries, conflicts, overwrites };
}

// ---------- 执行 ----------

// 复制单个文件，保留源文件的可执行位（scripts/check-docs.sh 需要）
async function copyFileSafe(sourceAbs, destAbs) {
  await mkdir(path.dirname(destAbs), { recursive: true });
  await copyFile(sourceAbs, destAbs);
  const info = await stat(sourceAbs);
  if ((info.mode & 0o111) !== 0) {
    await chmod(destAbs, info.mode & 0o777);
  }
  return destAbs;
}

// 写入文本文件（自动建父目录）
async function writeFileSafe(destAbs, content) {
  await mkdir(path.dirname(destAbs), { recursive: true });
  await writeFile(destAbs, content, 'utf8');
  return destAbs;
}

// 只删除文件或软链；目录一律拒绝（避免误删用户已有目录）
async function removeNonDirectory(absPath) {
  const info = await lstatSafe(absPath);
  if (!info) return;
  if (info.isDirectory()) {
    throw new Error('拒绝自动删除已存在的目录：' + absPath + '（请手工核对后处理）');
  }
  await rm(absPath, { force: true });
}

// 写「目录 + README.md 指针」回退形态
async function writePointerDir(dirAbs, pointerContent) {
  await mkdir(dirAbs, { recursive: true });
  const pointerAbs = path.join(dirAbs, 'README.md');
  await writeFile(pointerAbs, pointerContent, 'utf8');
  return pointerAbs;
}

// 创建软链；失败（例如 Windows 无权限）时按条目定义的形态回退，不中断整体生成：
//   - 共享技能位置：写「目录 + README.md 指针」，绝不复制 SKILL.md；
//   - 局部入口 CLAUDE.md：写「标题 + 一句指针」的两行文件，不复制 AGENTS.md 正文。
async function linkOrFallback(entry, linkAbs, removeExisting) {
  await mkdir(path.dirname(linkAbs), { recursive: true });
  if (removeExisting) await removeNonDirectory(linkAbs);

  try {
    // 自测用注入点：模拟不支持软链的环境（Windows 无权限 / 无软链的文件系统），
    // 只用于验证回退形态是否真的可用；正常执行时该变量不存在。
    if (process.env.INIT_SIMULATE_SYMLINK_FAILURE === '1') {
      const simulated = new Error('模拟软链创建失败（INIT_SIMULATE_SYMLINK_FAILURE=1）');
      simulated.code = 'EPERM';
      throw simulated;
    }
    await symlink(entry.linkTarget, linkAbs, 'dir');
    const actual = await readlink(linkAbs);
    if (actual !== entry.linkTarget) {
      throw new Error('软链回读不一致：' + actual);
    }
    return { mode: 'symlink', detail: entry.linkTarget };
  } catch (error) {
    const reason = (error && error.code) || (error && error.message) || '未知错误';
    const info = await lstatSafe(linkAbs);
    if (info) {
      throw new Error('创建软链失败且目标位置已被占用：' + linkAbs + '（' + reason + '）');
    }
    const fallback = entry.fallback || {
      mode: 'pointer-dir',
      content: entry.pointerContent,
      reason: '软链创建失败',
    };
    if (fallback.mode === 'file') {
      await writeFileSafe(linkAbs, fallback.content);
      return {
        mode: 'fallback-file',
        detail: '软链创建失败（' + reason + '），已改为两行指针文件',
      };
    }
    await writePointerDir(linkAbs, fallback.content);
    return {
      mode: 'fallback',
      detail: '软链创建失败（' + reason + '），已改为目录 + README.md 指针',
    };
  }
}

// 执行计划，返回每个动作的实际结果
async function apply(planObject, options) {
  const results = [];

  for (const entry of planObject.entries) {
    const destAbs = path.join(planObject.targetDir, entry.rel);

    if (entry.kind === 'skip') {
      results.push({ rel: entry.rel, kind: 'skip', detail: entry.reason });
      continue;
    }

    if (entry.kind === 'copy') {
      if (entry.removeExisting) await removeNonDirectory(destAbs);
      if (typeof entry.content === 'string') {
        await writeFileSafe(destAbs, entry.content);
        results.push({ rel: entry.rel, kind: 'copy', detail: '已复制并去掉模板专属引用' });
      } else {
        await copyFileSafe(entry.sourceAbs, destAbs);
        results.push({ rel: entry.rel, kind: 'copy', detail: '已复制' });
      }
      continue;
    }

    if (entry.kind === 'generate') {
      if (entry.removeExisting) await removeNonDirectory(destAbs);
      await writeFileSafe(destAbs, entry.content);
      results.push({ rel: entry.rel, kind: 'generate', detail: '已生成' });
      continue;
    }

    if (entry.kind === 'symlink') {
      const outcome = await linkOrFallback(entry, destAbs, entry.removeExisting === true);
      results.push({ rel: entry.rel, kind: outcome.mode, detail: outcome.detail });
      continue;
    }

    if (entry.kind === 'fallback') {
      if (entry.removeExisting) await removeNonDirectory(destAbs);
      const pointerAbs = await writePointerDir(destAbs, entry.pointerContent);
      results.push({
        rel: entry.rel,
        kind: 'fallback',
        detail: '目录 + 指针（' + entry.reason + '）：' + toPosix(path.relative(planObject.targetDir, pointerAbs)),
      });
      continue;
    }

    throw new Error('未知的计划动作：' + entry.kind);
  }

  return results;
}

// 生成后自检：只检查本次真正写出的文件，避免在模板仓库自执行时误报
async function verifyResult(planObject, results) {
  const problems = [];
  const written = new Set(results.filter((item) => item.kind !== 'skip').map((item) => item.rel));

  for (const rel of ['AGENTS.md', 'README.md']) {
    if (!written.has(rel)) continue;
    const abs = path.join(planObject.targetDir, rel);
    const text = await readFile(abs, 'utf8').catch(() => null);
    if (text === null) {
      problems.push(rel + '：写入后读取失败');
    } else if (text.includes(TEMPLATE_DOC_NAME)) {
      problems.push(rel + '：仍含模板专属初始化说明文件名');
    }
  }

  for (const rel of planObject.handoffFiles) {
    if (!written.has(rel)) continue;
    const abs = path.join(planObject.targetDir, rel);
    const text = await readFile(abs, 'utf8').catch(() => null);
    if (text === null) {
      problems.push(rel + '：写入后读取失败');
    } else if (!/^- status: draft$/m.test(text)) {
      problems.push(rel + '：status 不是 draft');
    }
  }

  return problems;
}

// ---------- 输出 ----------

function describeEntry(entry) {
  switch (entry.kind) {
    case 'copy':
      return '[复制] ' + entry.rel
        + (entry.changeCount > 0 ? '（去模板专属引用 ' + entry.changeCount + ' 处）' : '');
    case 'generate':
      return '[生成] ' + entry.rel + '（来自 ' + entry.origin + '）';
    case 'symlink':
      return '[软链] ' + entry.rel + ' -> ' + entry.linkTarget;
    case 'fallback':
      return '[回退] ' + entry.rel + '/README.md（指针；' + entry.reason + '）';
    case 'skip':
      return '[跳过] ' + entry.rel + '（' + entry.reason + '）';
    default:
      return '[未知] ' + entry.rel;
  }
}

function printPlan(planObject) {
  console.log('== 生成计划 ==');
  console.log('源目录：' + planObject.sourceRoot);
  console.log('目标目录：' + planObject.targetDir + (planObject.targetExists ? '' : '（不存在，将创建）'));
  console.log('模式：' + (planObject.dryRun ? '干跑（--dry-run，不写盘）' : '实际写入'));
  if (planObject.sourceRoot === planObject.targetDir) {
    console.log('提示：源目录与目标目录相同，基础文件按 no-op 跳过，只在目标内新增缺失项（如 --module）。');
  }
  console.log('');
  console.log('动作（共 ' + planObject.entries.length + ' 项）：');
  for (const entry of planObject.entries) {
    console.log('  ' + describeEntry(entry));
  }
}

function printMissing(planObject) {
  console.log('');
  console.log('源文件暂缺（可能是并行编辑中，已跳过，不影响其它项）：');
  for (const item of planObject.missingSources) {
    console.log('  - ' + item.rel + '：' + item.reason);
  }
}

function printTransformChanges(planObject) {
  if (planObject.transformChanges.length === 0) return;
  console.log('');
  console.log('已处理的模板专属引用：');
  for (const change of planObject.transformChanges) {
    console.log('  - ' + change);
  }
}

function printNotes(planObject) {
  if (planObject.notes.length === 0) return;
  console.log('');
  console.log('说明与警告：');
  for (const note of planObject.notes) {
    console.log('  - ' + note);
  }
}

function printConflicts(planObject) {
  console.error('');
  console.error('错误：目标目录已有同名文件，默认不覆盖（共 ' + planObject.conflicts.length + ' 项冲突）。');
  console.error('冲突清单：');
  for (const item of planObject.conflicts) {
    console.error('  - ' + item.rel + '：' + item.reason);
  }
  console.error('');
  console.error('处理方式：核对后加 --force 覆盖（覆盖前会先打印将覆盖的路径清单），或换一个空目标目录。');
}

function printOverwrites(planObject) {
  console.log('');
  console.log('--force 将覆盖以下路径（共 ' + planObject.overwrites.length + ' 项）：');
  for (const item of planObject.overwrites) {
    console.log('  - ' + item);
  }
}

function printSummary(planObject, results, problems) {
  const counts = new Map();
  for (const item of results) {
    counts.set(item.kind, (counts.get(item.kind) || 0) + 1);
  }
  const label = (kind) => counts.get(kind) || 0;

  console.log('');
  console.log('== 生成摘要 ==');
  console.log('目标目录：' + planObject.targetDir);
  console.log('复制文件：' + label('copy') + ' 个；生成文件：' + label('generate') + ' 个');
  console.log('软链：' + label('symlink') + ' 个；回退指针目录：' + label('fallback') + ' 个；跳过：' + label('skip') + ' 个');
  if (planObject.missingSources.length > 0) {
    console.log('源文件暂缺：' + planObject.missingSources.length + ' 项（见上）');
  }

  console.log('');
  console.log('技能与入口落点：');
  for (const item of results) {
    if (item.kind === 'symlink' || item.kind === 'fallback' || item.kind === 'skip') {
      if (item.rel.indexOf('skills') !== -1 || item.rel.endsWith('CLAUDE.md')) {
        console.log('  - ' + item.rel + '：' + item.kind + '（' + item.detail + '）');
      }
    }
  }

  console.log('');
  console.log('核对提示（本脚本不写文件，仅提示）：');
  console.log('1. 入口只引用不复制：AGENTS.md 是唯一规则入口，CLAUDE.md 与局部 CLAUDE.md 只做指向，不复制规则正文。');
  console.log('2. 共享技能：技能正文只在根目录 skills/；两个客户端目录的创建结果见上（软链或回退指针）。');
  console.log('3. 现场层：.handoff/CONTEXT.md 与 .handoff/CHECKPOINT.md 保持空白 draft，未写入任何虚构任务事实。');
  console.log('4. 未复制：.git/ 与模板专属初始化说明；生成物不保留指向该文件的 Markdown 链接。');

  if (problems.length > 0) {
    console.log('');
    console.log('自检发现问题：');
    for (const problem of problems) console.log('  - ' + problem);
  }

  console.log('');
  console.log('下一步建议：');
  console.log('  cd ' + planObject.targetDir + ' && git init && sh scripts/check-docs.sh');
  console.log('  node scripts/init.mjs --module <相对路径>   # 需要局部作用域时在目标项目内追加');
  console.log('');
  console.log('关于重复执行：本脚本复制到目标项目后，主要用途是用 --module 追加局部作用域；');
  console.log('基础文件已存在，重复执行不加 --force 会按「不覆盖」规则列出冲突并以退出码 1 结束。');
}

// ---------- 模板专属引用复核 ----------

// 为什么允许保留某些纯文本提及（仅注释与说明用途，不产生死链）
const PLAIN_TEXT_KEEP_REASONS = [
  {
    test: (rel) => rel === 'scripts/check-docs.sh',
    reason: '功能必需：自检脚本用它判断当前是模板仓库还是目标项目布局',
  },
  {
    test: (rel) => rel === '.gitignore',
    reason: '规则来源注释；模板说明明确写「可保留」，不影响运行与链接',
  },
  {
    test: (rel) => rel === 'docs/MULTI-AGENT.md',
    reason: '纯文本且带「仅存在于模板仓库」限定，不构成 Markdown 链接',
  },
];

// 生成物复核：区分「纯文本提及」（允许，需说明）与「Markdown 链接」（会变死链，必须为空）
// 只用本次计划真正会写出的文件，避免在本仓库自执行时把模板自身文件算进来。
async function reviewTemplateRefs(planObject) {
  const linkPattern = new RegExp('\\[[^\\]]*\\]\\([^)]*' + 'INITIAL' + 'IZATION' + '[^)]*\\)');
  const plain = [];
  const links = [];
  const skipped = [];

  for (const entry of planObject.entries) {
    if (entry.kind !== 'copy' && entry.kind !== 'generate') continue;
    if (entry.kind === 'copy' && typeof entry.content !== 'string') {
      if (!/\.(md|sh|txt|json|ya?ml)$/i.test(entry.rel) && !entry.rel.startsWith('.')) {
        skipped.push(entry.rel);
        continue;
      }
    }
    let text = entry.content;
    if (typeof text !== 'string') {
      text = await readFile(entry.sourceAbs, 'utf8').catch(() => null);
      if (text === null) {
        skipped.push(entry.rel);
        continue;
      }
    }
    if (!text.includes(TEMPLATE_DOC_NAME)) continue;

    text.split('\n').forEach((line, index) => {
      if (!line.includes(TEMPLATE_DOC_NAME)) return;
      if (linkPattern.test(line)) {
        links.push({ rel: entry.rel, line: index + 1, text: line.trim() });
        return;
      }
      const matched = PLAIN_TEXT_KEEP_REASONS.find((item) => item.test(entry.rel));
      plain.push({
        rel: entry.rel,
        line: index + 1,
        text: line.trim(),
        note: matched ? matched.reason : '需人工核对：确认是说明而非链接',
      });
    });
  }

  return { plain, links, skipped };
}

function printTemplateRefReview(review) {
  console.log('');
  console.log('模板专属引用复核（目标项目不复制该初始化说明，因此只允许纯文本提及）：');
  console.log('a) 纯文本提及（' + review.plain.length + ' 处，允许保留并注明原因）：');
  if (review.plain.length === 0) {
    console.log('   （无）');
  }
  for (const item of review.plain) {
    console.log('   - ' + item.rel + ':' + item.line + '：' + item.note);
    console.log('     ' + item.text);
  }
  console.log('b) Markdown 链接（必须为空）：' + (review.links.length === 0 ? '无（通过）' : review.links.length + ' 处（未通过）'));
  for (const item of review.links) {
    console.log('   - ' + item.rel + ':' + item.line + '：' + item.text);
  }
}

// ---------- 入口 ----------

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error('用法错误：' + error.message);
      console.error('运行 node scripts/init.mjs --help 查看用法');
      process.exitCode = 2;
      return;
    }
    throw error;
  }

  if (options.help) {
    console.log(HELP_TEXT);
    return;
  }

  let planObject;
  try {
    planObject = await plan(options);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error('用法错误：' + error.message);
      console.error('运行 node scripts/init.mjs --help 查看用法');
      process.exitCode = 2;
      return;
    }
    console.error('失败：' + ((error && error.message) || String(error)));
    process.exitCode = 1;
    return;
  }

  printPlan(planObject);
  printTransformChanges(planObject);
  printMissing(planObject);
  printNotes(planObject);

  if (planObject.fatalMissing && options.modules.length > 0) {
    console.error('');
    console.error('错误：请求了 --module，但源仓库缺少局部作用域模板 ' + MODULE_TEMPLATE + '，无法生成。');
    process.exitCode = 1;
    return;
  }

  if (planObject.dryRun) {
    if (planObject.conflicts.length > 0) {
      console.log('');
      console.log('注意：干跑发现 ' + planObject.conflicts.length + ' 项冲突；实际执行（不带 --force）会以退出码 1 结束。');
      for (const item of planObject.conflicts) {
        console.log('  - ' + item.rel + '：' + item.reason);
      }
    }
    printTemplateRefReview(await reviewTemplateRefs(planObject));
    console.log('');
    console.log('干跑完成：未写盘。');
    return;
  }

  if (planObject.conflicts.length > 0 && !options.force) {
    printConflicts(planObject);
    process.exitCode = 1;
    return;
  }

  if (planObject.overwrites.length > 0) {
    printOverwrites(planObject);
  }

  try {
    const review = await reviewTemplateRefs(planObject);
    const results = await apply(planObject, options);
    const problems = await verifyResult(planObject, results);
    printTemplateRefReview(review);
    printSummary(planObject, results, problems);
    if (review.links.length > 0) {
      console.error('');
      console.error('失败：生成结果仍含指向模板专属初始化说明的 Markdown 链接（会变成死链，见上）。');
      process.exitCode = 1;
      return;
    }
    if (problems.length > 0) {
      console.error('');
      console.error('失败：生成结果自检未通过（见上），请人工核对。');
      process.exitCode = 1;
      return;
    }
    console.log('');
    console.log('完成：骨架已生成。');
  } catch (error) {
    console.error('失败：' + ((error && error.message) || String(error)));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('失败：' + ((error && error.message) || String(error)));
  process.exitCode = 1;
});
