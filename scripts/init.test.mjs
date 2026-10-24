#!/usr/bin/env node
// scripts/init.test.mjs —— scripts/init.mjs 的端到端自测（可选，零依赖）
//
// 用途：生成器与交接状态检查的回归测试，全部在临时目录里进行，结束后清理。
// 用法：node scripts/init.test.mjs        （在仓库任意位置执行均可；需要 node >= 18 与 git）
// 退出码：0 全部通过；1 有失败用例；2 环境不满足（例如找不到 git）。
//
// 说明：本文件只做测试，不属于分发内容（init.mjs 不会把它复制到目标项目）。
// 测试需要调用 sh 与 git，因此这里允许使用 node:child_process；init.mjs 本身不调用外部命令。

import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const INIT = path.join(SCRIPT_DIR, 'init.mjs');
// 模板专属初始化说明的文件名：拼接构造，避免生成物里出现该字面量
const TEMPLATE_DOC_NAME = 'INITIAL' + 'IZATION' + '.md';

const tempDirs = [];
let failures = 0;

function log(message) {
  console.log(message);
}

function pass(name, detail) {
  console.log('PASS  ' + name + (detail ? '：' + detail : ''));
}

function fail(name, detail) {
  failures += 1;
  console.error('FAIL  ' + name + (detail ? '：' + detail : ''));
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [INIT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
  });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function runShell(command, cwd) {
  const result = spawnSync('sh', ['-c', command], { cwd, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'init-test-'));
  tempDirs.push(dir);
  return dir;
}

// 递归收集文件，用于「不含模板专属初始化说明」的核对
function walkFiles(dirAbs, base = dirAbs) {
  const out = [];
  for (const name of readdirSync(dirAbs, { withFileTypes: true })) {
    const abs = path.join(dirAbs, name.name);
    if (name.isDirectory()) {
      if (name.name === '.git') continue;
      out.push(...walkFiles(abs, base));
    } else {
      out.push(path.relative(base, abs));
    }
  }
  return out;
}

async function test1DryRun() {
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const result = run(['--target', target, '--project-id', 'demo', '--dry-run']);
  if (result.code !== 0) return fail('1) --dry-run 退出码', 'exit=' + result.code);
  const before = readdirSync(tmp);
  if (before.length !== 0) return fail('1) --dry-run 不写盘', '临时目录出现了 ' + before.join(','));
  const expects = [
    '[复制] AGENTS.md',
    '[复制] README.md',
    '[复制] scripts/init.mjs',
    '[生成] .handoff/CONTEXT.md',
    '[软链] .claude/skills -> ../skills',
    '[软链] .gemini/antigravity/skills -> ../../skills',
    'Markdown 链接（必须为空）：无（通过）',
  ];
  const missing = expects.filter((item) => !result.stdout.includes(item));
  if (missing.length > 0) return fail('1) --dry-run 计划内容', '缺少：' + missing.join(' | '));
  return pass('1) --dry-run 不写盘且计划正确', 'target 未创建，7 个关键计划项齐全');
}

async function test2NoTemplateRefs() {
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const result = run(['--target', target, '--project-id', 'demo']);
  if (result.code !== 0) return fail('2) 生成退出码', 'exit=' + result.code);

  const files = walkFiles(target);
  const linkLines = [];
  for (const rel of files) {
    const text = await readFile(path.join(target, rel), 'utf8').catch(() => null);
    if (text === null || !text.includes(TEMPLATE_DOC_NAME)) continue;
    text.split('\n').forEach((line, index) => {
      if (line.includes(TEMPLATE_DOC_NAME) && /\[[^\]]*\]\([^)]*/.test(line)) {
        linkLines.push(rel + ':' + (index + 1));
      }
    });
  }
  if (linkLines.length > 0) {
    return fail('2) 生成物含模板专属引用链接', linkLines.join(', '));
  }

  const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
  const readme = await readFile(path.join(target, 'README.md'), 'utf8');
  if (agents.includes(TEMPLATE_DOC_NAME) || readme.includes(TEMPLATE_DOC_NAME)) {
    return fail('2) AGENTS.md / README.md 仍含模板专属文件名');
  }
  if (!readme.includes('人工接力协议](HANDOFF.md)')) {
    return fail('2) README 顶部未替换为项目中立说明');
  }
  if (existsSync(path.join(target, 'docs', TEMPLATE_DOC_NAME))) {
    return fail('2) docs 下不应复制模板专属初始化说明');
  }
  return pass('2) 目标项目无 INITIALIZATION 链接', 'AGENTS.md/README.md 已去引用，docs 未复制该文件');
}

async function test3CheckDocs() {
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const gen = run(['--target', target, '--project-id', 'demo']);
  if (gen.code !== 0) return fail('3) 生成退出码', 'exit=' + gen.code);
  const git = runShell('git init -q', target);
  if (git.code !== 0) return fail('3) git init 失败', git.stderr.trim());
  const check = runShell('sh scripts/check-docs.sh', target);
  if (check.code !== 0) {
    return fail('3) check-docs 退出码', 'exit=' + check.code + '\n' + check.stdout + check.stderr);
  }
  return pass('3) 临时项目 check-docs 退出码 0', 'git init 后检查 0 错误');
}

async function test4RepeatConflict() {
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const first = run(['--target', target, '--project-id', 'demo']);
  if (first.code !== 0) return fail('4) 首次生成', 'exit=' + first.code);
  const repeat = run(['--target', target, '--project-id', 'demo']);
  if (repeat.code !== 1) return fail('4) 重复执行退出码', '期望 1，实际 ' + repeat.code);
  if (!repeat.stderr.includes('冲突清单')) return fail('4) 未列出冲突清单');
  const conflictCount = (repeat.stderr.match(/^ {2}- /gm) || []).length;
  if (conflictCount === 0) return fail('4) 冲突条数为 0');

  // 软链与内容一致的生成项应识别为已就绪，只有文件类冲突
  if (repeat.stdout.includes('[跳过] .claude/skills')) {
    pass('4a) 已就绪软链按跳过处理');
  } else {
    fail('4a) 已就绪软链未被识别');
  }
  return pass('4) 重复执行退出码 1 并列出冲突', conflictCount + ' 项冲突');
}

async function test5NoSymlink() {
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const result = run(['--target', target, '--no-symlink']);
  if (result.code !== 0) return fail('5) --no-symlink 退出码', 'exit=' + result.code);

  for (const rel of ['.claude/skills', '.gemini/antigravity/skills']) {
    const abs = path.join(target, rel);
    const info = await stat(abs).catch(() => null);
    if (!info || !info.isDirectory()) return fail('5) ' + rel + ' 应为目录');
    const pointer = path.join(abs, 'README.md');
    if (!existsSync(pointer)) return fail('5) ' + rel + ' 缺少 README.md 指针');
    const text = await readFile(pointer, 'utf8');
    if (!text.includes('skills')) return fail('5) ' + rel + '/README.md 指针内容不完整');
  }
  // 不得复制任何 SKILL.md
  const check = runShell(
    'find .claude/skills .gemini/antigravity/skills -name SKILL.md -print',
    target,
  );
  if (check.stdout.trim() !== '') return fail('5) 回退目录内不应复制 SKILL.md', check.stdout.trim());
  return pass('5) --no-symlink 回退形态正确', '两个位置均为目录 + README.md，且未复制 SKILL.md');
}

async function test6Modules() {
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const result = run(['--target', target, '--module', 'src/api', '--module', 'src/a/b']);
  if (result.code !== 0) return fail('6) --module 退出码', 'exit=' + result.code);

  for (const rel of ['src/api', 'src/a/b']) {
    const agents = path.join(target, rel, 'AGENTS.md');
    const claude = path.join(target, rel, 'CLAUDE.md');
    if (!existsSync(agents)) return fail('6) ' + rel + '/AGENTS.md 未生成');
    if (!existsSync(claude)) return fail('6) ' + rel + '/CLAUDE.md 未生成');
    const text = await readFile(agents, 'utf8');
    if (text.includes('<MODULE_PATH>') || text.includes('<MODULE_NAME>')) {
      return fail('6) ' + rel + '/AGENTS.md 仍有占位符');
    }
    if (!text.includes('`' + rel + '`')) {
      return fail('6) ' + rel + '/AGENTS.md 未写入模块路径');
    }
    const match = text.match(/\]\(([^)]*docs\/AGENT-RULES\.md)\)/);
    if (!match) return fail('6) ' + rel + '/AGENTS.md 缺少规则正文链接');
    const resolved = path.resolve(path.dirname(agents), match[1]);
    if (!existsSync(resolved)) {
      return fail('6) ' + rel + ' 规则正文链接不可解析', match[1] + ' -> ' + resolved);
    }
  }

  const git = runShell('git init -q', target);
  if (git.code !== 0) return fail('6) git init 失败', git.stderr.trim());
  const check = runShell('sh scripts/check-docs.sh', target);
  if (check.code !== 0) {
    return fail('6) 含局部 AGENTS.md 的 check-docs', 'exit=' + check.code + '\n' + check.stdout);
  }
  return pass('6) --module 结构正确', 'src/api 与 src/a/b 各含 AGENTS.md + CLAUDE.md，链接可解析，check-docs 0 错误');
}

async function testExtraSafety() {
  // 用法错误 → 2
  const usage = run(['--bogus']);
  if (usage.code !== 2) fail('附加) 未知参数退出码应为 2', '实际 ' + usage.code);
  const traversal = run(['--module', '../escape']);
  if (traversal.code !== 2) fail('附加) 路径穿越应被拒绝', '实际 ' + traversal.code);

  // 无 --project-id 时保持模板原文，不写空字符串
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const gen = run(['--target', target]);
  if (gen.code !== 0) return fail('附加) 无 project-id 生成失败', 'exit=' + gen.code);
  const context = await readFile(path.join(target, '.handoff', 'CONTEXT.md'), 'utf8');
  if (!/- project_id: 未填（引用 MEMORY\.md 的稳定标识）/.test(context)) {
    fail('附加) 未给 --project-id 时应保持模板原文');
  }
  if (!/- status: draft/m.test(context)) fail('附加) CONTEXT 应保持 draft');

  // 模拟软链失败 → 按条目形态回退，且 check-docs 仍通过
  const simTarget = path.join(tmp, 'sim');
  const sim = run(['--target', simTarget, '--module', 'src/api'], {
    env: { INIT_SIMULATE_SYMLINK_FAILURE: '1' },
  });
  if (sim.code !== 0) return fail('附加) 模拟软链失败时退出码应为 0', 'exit=' + sim.code);
  const skillsInfo = await stat(path.join(simTarget, '.claude', 'skills')).catch(() => null);
  if (!skillsInfo || !skillsInfo.isDirectory()) fail('附加) 软链失败后 .claude/skills 应为目录');
  const moduleClaude = await readFile(path.join(simTarget, 'src', 'api', 'CLAUDE.md'), 'utf8');
  const lines = moduleClaude.split('\n').filter((line) => line !== '');
  if (lines.length !== 2) fail('附加) 局部 CLAUDE.md 回退应为两行', '实际 ' + lines.length + ' 行');
  if (moduleClaude.includes('## 作用域')) fail('附加) 局部 CLAUDE.md 回退不得复制 AGENTS.md 正文');

  if (failures === 0) pass('附加) 用法错误/穿越拒绝/未给 project-id/软链失败回退');
  return undefined;
}

async function testClaimStates() {
  const failuresBefore = failures;
  const tmp = await makeTempDir();
  const target = path.join(tmp, 'proj');
  const generated = run(['--target', target, '--project-id', 'claim-states']);
  if (generated.code !== 0) return fail('认领状态) 生成失败');
  if (runShell('git init -q', target).code !== 0) return fail('认领状态) git init 失败');
  const checkpoint = path.join(target, '.handoff', 'CHECKPOINT.md');
  const original = await readFile(checkpoint, 'utf8');
  async function checkState(field, row, expectedCode, label, retainHint = true) {
    const fieldValue = retainHint
      ? original.match(/^- handoff_claim: (.*)$/m)[1].replace(/^not_applicable/, field)
      : field;
    const text = original
      .replace(/^- status: draft$/m, '- status: active')
      .replace(/^- handoff_claim: .*$/m, '- handoff_claim: ' + fieldValue)
      .replace(/^\| 认领状态 \|.*$/m, '| 认领状态 | ' + row + ' |');
    await writeFile(checkpoint, text);
    const check = runShell('sh scripts/check-docs.sh', target);
    if (check.code !== expectedCode) {
      fail('认领状态) ' + label, 'exit=' + check.code + '\n' + check.stdout + check.stderr);
    }
  }
  for (const value of ['open', 'claimed', 'declined', 'expired', 'not_applicable']) {
    await checkState(value, value, 0, value);
  }
  await checkState('claimed', 'claimed', 0, '无枚举注释的实际状态', false);
  await checkState('claimed', 'open', 1, '字段与表格冲突');
  await checkState('unknown', 'unknown', 1, '未知状态');
  await checkState('claimed', '', 1, '缺失表格状态');
  await checkState('claimed', 'open / claimed / declined / expired / not_applicable', 1, '活动任务未填写表格状态');
  if (failures === failuresBefore) {
    pass('认领状态) 已验证合法单值、冲突、未知值与未填写状态', '模板枚举注释不再替代实际状态');
  }
}

async function testProjectReadme() {
  const target = await makeTempDir();
  const content = '# 已有项目\n\n保留项目自己的内容。\n';
  await writeFile(path.join(target, 'README.md'), content);
  for (const extra of [[], ['--force']]) {
    const result = run(['--target', target, ...extra]);
    if (result.code !== 0 || await readFile(path.join(target, 'README.md'), 'utf8') !== content) {
      return fail('项目 README) 保留已有内容', result.stdout + result.stderr);
    }
  }
  return pass('项目 README) 默认初始化及 --force 均保留项目已有说明');
}

async function testGithubFiles() {
  const target = await makeTempDir();
  await mkdir(path.join(target, '.github/workflows'), { recursive: true });
  const existing = path.join(target, '.github/workflows/ci.yml');
  await writeFile(existing, '已有项目的 CI\n');
  const result = run(['--target', target]);
  if (result.code !== 0) return fail('GitHub 模板) 已有项目 CI 不应阻止初始化', result.stderr);
  const rel = '.github/PULL_REQUEST_TEMPLATE.md';
  const source = await readFile(path.join(SCRIPT_DIR, '..', rel), 'utf8');
  const generated = await readFile(path.join(target, rel), 'utf8').catch(() => null);
  if (generated !== source) return fail('GitHub 模板) PR 模板分发内容不一致', rel);
  if (await readFile(existing, 'utf8') !== '已有项目的 CI\n'
      || existsSync(path.join(target, '.github/workflows/template-ci.yml'))
      || existsSync(path.join(target, 'scripts/ci-checks.sh'))) {
    return fail('GitHub 模板) 不得改动或引入目标项目 CI');
  }
  const conflictTarget = await makeTempDir();
  await mkdir(path.join(conflictTarget, '.github'), { recursive: true });
  const existingPr = path.join(conflictTarget, rel);
  await writeFile(existingPr, '已有项目的 PR 模板\n');
  const conflict = run(['--target', conflictTarget]);
  if (conflict.code !== 1 || await readFile(existingPr, 'utf8') !== '已有项目的 PR 模板\n'
      || existsSync(path.join(conflictTarget, 'AGENTS.md'))) {
    return fail('GitHub 模板) 已有 PR 模板应保留且不能部分写入', conflict.stdout + conflict.stderr);
  }
  return pass('GitHub 模板) 仅分发 PR 模板，保留项目 CI，冲突时无部分写入');
}

async function testGovernanceDistribution() {
  const target = await makeTempDir();
  const generated = run(['--target', target]);
  if (generated.code !== 0) return fail('治理分发) 初始化失败', generated.stderr);
  for (const rel of ['scripts/ai-check.mjs', '.ai/templates/task.json', 'docs/AI-GOVERNANCE.md']) {
    const source = await readFile(path.join(SCRIPT_DIR, '..', rel), 'utf8');
    if (await readFile(path.join(target, rel), 'utf8') !== source)
      return fail('治理分发) 文件内容不一致', rel);
  }
  if (existsSync(path.join(target, '.ai/tasks')))
    return fail('治理分发) 不得导入模板维护任务历史');
  const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
  if (!agents.includes('[研发治理](docs/AI-GOVERNANCE.md)') || agents.includes('## 本仓库研发治理'))
    return fail('治理分发) 新项目入口没有接入通用规则');

  const git = args => spawnSync('git', args, { cwd: target, encoding: 'utf8' });
  for (const args of [
    ['init', '-q'], ['add', '.'],
    ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline'],
  ]) {
    const result = git(args);
    if (result.status !== 0) return fail('治理分发) 无法建立 Git 基准', result.stderr);
  }
  await mkdir(path.join(target, '.ai/tasks'), { recursive: true });
  const contract = JSON.parse(await readFile(path.join(target, '.ai/templates/task.json'), 'utf8'));
  contract.goal = '验证新项目分发的范围检查器';
  contract.allowed_paths = ['.ai/tasks/task.json', 'src/**'];
  contract.acceptance = ['src 内允许修改；禁止路径和范围外路径拒绝'];
  await writeFile(path.join(target, '.ai/tasks/task.json'), JSON.stringify(contract));
  await mkdir(path.join(target, 'src'), { recursive: true });
  await writeFile(path.join(target, 'src/allowed.txt'), 'allowed\n');
  const check = () => spawnSync(process.execPath,
    ['scripts/ai-check.mjs', '.ai/tasks/task.json', 'HEAD'], { cwd: target, encoding: 'utf8' });
  if (check().status !== 0) return fail('治理分发) 合法任务应通过');
  await mkdir(path.join(target, 'src/database/migrations'), { recursive: true });
  const forbidden = path.join(target, 'src/database/migrations/change.sql');
  await writeFile(forbidden, 'forbidden\n');
  let rejected = check();
  if (rejected.status !== 1 || !rejected.stdout.includes('src/database/migrations/change.sql'))
    return fail('治理分发) 允许目录内的禁止路径应被拒绝');
  await rm(forbidden);
  await writeFile(path.join(target, 'outside.txt'), 'outside\n');
  rejected = check();
  if (rejected.status !== 1 || !rejected.stdout.includes('outside.txt'))
    return fail('治理分发) 未跟踪的范围外文件应被拒绝');
  return pass('治理分发) 新项目获得可用检查器和样例，不导入历史，允许/禁止/越界检查正确');
}

async function main() {
  const probe = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (probe.status !== 0) {
    console.error('环境不满足：需要 git（用于验证目标项目的 check-docs）');
    process.exitCode = 2;
    return;
  }
  if (!existsSync(INIT)) {
    console.error('找不到 ' + INIT + '，请在仓库内执行');
    process.exitCode = 2;
    return;
  }

  await test1DryRun();
  await test2NoTemplateRefs();
  await test3CheckDocs();
  await test4RepeatConflict();
  await test5NoSymlink();
  await test6Modules();
  await testExtraSafety();
  await testClaimStates();
  await testProjectReadme();
  await testGithubFiles();
  await testGovernanceDistribution();

  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }

  console.log('');
  if (failures > 0) {
    console.error('自测失败：' + failures + ' 项');
    process.exitCode = 1;
    return;
  }
  console.log('自测全部通过（临时目录已清理）。');
}

main().catch(async (error) => {
  console.error('自测异常：' + ((error && error.stack) || String(error)));
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  process.exitCode = 1;
});
