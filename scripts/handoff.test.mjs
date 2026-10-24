#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, readdir, symlink, lstat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const contexts = '.handoff/CONTEXT.md';
const checkpoints = '.handoff/CHECKPOINT.md';
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}
function cli(root, ...args) { return run(process.execPath, [path.join(root, 'scripts/handoff.mjs'), ...args], root); }
function git(root, ...args) {
  const result = run('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], root);
  assert.equal(result.code, 0, result.stderr); return result.stdout;
}
function replace(text, key, value) {
  return text.replace(new RegExp(`^- ${key}:.*$`, 'm'), () => `- ${key}: ${value}`);
}
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'handoff-helper-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const initialized = run(process.execPath, [path.join(source, 'scripts/init.mjs'), '--target', root, '--project-id', 'fixture'], source);
  assert.equal(initialized.code, 0, initialized.stderr);
  await writeFile(path.join(root, 'MEMORY.md'), '# Memory\n- 稳定 project_id: fixture\n');
  await writeFile(path.join(root, 'business.txt'), 'baseline\n');
  git(root, 'init', '-q', '-b', 'main'); git(root, 'add', '.'); git(root, 'commit', '-qm', 'fixture baseline');
  let context = await readFile(path.join(root, contexts), 'utf8');
  for (const [key, value] of Object.entries({ task_id: 'task-001', context_revision: 1, status: 'handoff_ready', handoff_id: 'relay-001', from_agent: 'source-agent' })) context = replace(context, key, value);
  await writeFile(path.join(root, contexts), context);
  let checkpoint = await readFile(path.join(root, checkpoints), 'utf8');
  for (const [key, value] of Object.entries({ project_id: 'fixture', task_id: 'task-001', context_revision: 1, checkpoint_seq: 1, status: 'handoff_ready', owner: 'source-agent', handoff_claim: 'open', repo_root: root, branch: 'main', HEAD: git(root, 'rev-parse', 'HEAD').trim() })) checkpoint = replace(checkpoint, key, value);
  checkpoint = checkpoint.replace(/^\| 认领状态 \|.*$/m, '| 认领状态 | open |');
  await writeFile(path.join(root, checkpoints), checkpoint);
  await writeFile(path.join(root, 'business.txt'), 'user staged change\n'); git(root, 'add', 'business.txt');
  await writeFile(path.join(root, 'scratch.txt'), 'user untracked change\n');
  return root;
}
const claim = (root, extra = []) => cli(root, 'claim', '--agent', 'receiver-1', '--task', 'task-001', '--revision', '1', '--handoff-id', 'relay-001', '--source-stopped', ...extra);
async function resultFile(root, changes = {}) {
  const result = {
    current_step: 'AC-01 完成', completed: ['AC-01'], remaining: ['AC-02'], unverified: ['完整测试'],
    blockers: [], next: ['完成 AC-02 并验证'], verifications: [], external_effects: [], environment: 'Node 本地', ...changes,
  };
  const file = '.handoff/result.tmp.md';
  await writeFile(path.join(root, file), JSON.stringify(result));
  return file;
}
async function preserved(root) {
  return {
    business: await readFile(path.join(root, 'business.txt'), 'utf8'), scratch: await readFile(path.join(root, 'scratch.txt'), 'utf8'),
    index: git(root, 'diff', '--cached', '--binary'), head: git(root, 'rev-parse', 'HEAD'),
  };
}

test('generated helper is usable; inspect/prompt are read-only and preserve user changes', async t => {
  const root = await fixture(t);
  const before = await preserved(root);
  const oldContext = await readFile(path.join(root, contexts)); const oldCheckpoint = await readFile(path.join(root, checkpoints));
  const inspect = cli(root, 'inspect', '--json'); assert.equal(inspect.code, 0, inspect.stderr);
  const data = JSON.parse(inspect.stdout);
  assert.equal(data.task_id, 'task-001');
  assert(data.workspace.changes.some(item => item.path === 'business.txt' && item.status === 'M '));
  assert(data.workspace.changes.some(item => item.path === 'scratch.txt' && item.status === '??'));
  const prompt = cli(root, 'prompt'); assert.equal(prompt.code, 0, prompt.stderr);
  assert.match(prompt.stdout, /relay-001/); assert.match(prompt.stdout, /claim/);
  assert.deepEqual(await readFile(path.join(root, contexts)), oldContext);
  assert.deepEqual(await readFile(path.join(root, checkpoints)), oldCheckpoint);
  assert.deepEqual(await preserved(root), before);
});

test('claim precedes save, synchronizes table, keeps exact previous, and passes document checker', async t => {
  const root = await fixture(t); const before = await preserved(root);
  const previous = await readFile(path.join(root, checkpoints));
  const input = await resultFile(root);
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input).code, 1);
  const received = claim(root); assert.equal(received.code, 0, received.stderr);
  const text = await readFile(path.join(root, checkpoints), 'utf8');
  assert.match(text, /- owner: receiver-1/); assert.match(text, /- checkpoint_seq: 2/);
  assert.match(text, /- handoff_claim: claimed/); assert.match(text, /\| 认领状态 \| claimed \|/);
  assert.match(text, /not_run/);
  assert.deepEqual(await readFile(path.join(root, '.handoff/CHECKPOINT.previous.md')), previous);
  assert.equal(claim(root).code, 1, 'cannot consume an already claimed handoff');
  const check = run('sh', ['scripts/check-docs.sh'], root); assert.equal(check.code, 0, check.stdout + check.stderr);
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input).code, 0);
  assert.equal(cli(root, 'inspect', '--json').code, 0);
  assert.deepEqual(await preserved(root), before);
});

test('wrong task/revision/handoff or missing stopped-writer statement never writes records', async t => {
  const root = await fixture(t); const original = await readFile(path.join(root, checkpoints));
  for (const args of [
    ['--agent', 'receiver-1', '--task', 'wrong', '--revision', '1', '--handoff-id', 'relay-001', '--source-stopped'],
    ['--agent', 'receiver-1', '--task', 'task-001', '--revision', '2', '--handoff-id', 'relay-001', '--source-stopped'],
    ['--agent', 'receiver-1', '--task', 'task-001', '--revision', '1', '--handoff-id', 'wrong', '--source-stopped'],
    ['--agent', 'receiver-1', '--task', 'task-001', '--revision', '1', '--handoff-id', 'relay-001'],
  ]) assert.equal(cli(root, 'claim', ...args).code, 1);
  assert.deepEqual(await readFile(path.join(root, checkpoints)), original);
  assert.equal((await readdir(path.join(root, '.handoff'))).filter(name => name.endsWith('.previous.md')).length, 0);
});

test('MEMORY or checkpoint identity mismatch cannot be overridden by recovery', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'MEMORY.md'), '# Wrong project\n- 稳定 project_id: other\n');
  assert.equal(claim(root, ['--recover']).code, 1);
  await writeFile(path.join(root, 'MEMORY.md'), '# Memory\n- 稳定 project_id: fixture\n');
  const original = await readFile(path.join(root, checkpoints), 'utf8');
  await writeFile(path.join(root, checkpoints), replace(original, 'project_id', 'other'));
  assert.equal(claim(root, ['--recover']).code, 1);
});

test('sudden interruption without checkpoint or handoff can recover without invented success', async t => {
  const root = await fixture(t);
  const contextPath = path.join(root, contexts);
  let text = await readFile(contextPath, 'utf8'); text = replace(replace(text, 'handoff_id', '无'), 'status', 'active');
  await writeFile(contextPath, text); await rm(path.join(root, checkpoints));
  const command = ['claim', '--agent', 'receiver-1', '--task', 'task-001', '--revision', '1', '--source-stopped', '--recover'];
  const received = cli(root, ...command); assert.equal(received.code, 0, received.stderr);
  const checkpoint = await readFile(path.join(root, checkpoints), 'utf8');
  assert.match(checkpoint, /- checkpoint_seq: 1/); assert.match(checkpoint, /- handoff_claim: not_applicable/);
  assert.match(checkpoint, /not_run/); assert.doesNotMatch(checkpoint, /\| passed \|/);
  assert.equal(run('sh', ['scripts/check-docs.sh'], root).code, 0);
});

test('recovery repairs missing table without losing legacy records', async t => {
  const root = await fixture(t); const target = path.join(root, checkpoints);
  const old = (await readFile(target, 'utf8')).replace(/^\| 认领状态 \|.*$/m, '');
  await writeFile(target, old);
  assert.equal(claim(root).code, 1);
  const recovered = claim(root, ['--recover']); assert.equal(recovered.code, 0, recovered.stderr);
  assert.equal(await readFile(path.join(root, '.handoff/CHECKPOINT.previous.md'), 'utf8'), old);
  assert.equal(run('sh', ['scripts/check-docs.sh'], root).code, 0);
});

test('normal handoff, exact next claim, and round trip preserve all original backups', async t => {
  const root = await fixture(t); const first = await readFile(path.join(root, checkpoints)); const before = await preserved(root);
  assert.equal(claim(root).code, 0);
  const input = await resultFile(root);
  let saved = cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--handoff-id', 'relay-002');
  assert.equal(saved.code, 0, saved.stderr);
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input).code, 1, 'outgoing writer must stop');
  const incoming = cli(root, 'claim', '--agent', 'receiver-2', '--task', 'task-001', '--revision', '1', '--handoff-id', 'relay-002', '--source-stopped');
  assert.equal(incoming.code, 0, incoming.stderr);
  saved = cli(root, 'save', '--agent', 'receiver-2', '--input', input, '--handoff-id', 'relay-001');
  assert.equal(saved.code, 1, 'cannot reuse a previously claimed handoff ID');
  const names = (await readdir(path.join(root, '.handoff'))).filter(name => /^CHECKPOINT\..*\.previous\.md$/.test(name));
  const backups = await Promise.all(names.map(name => readFile(path.join(root, '.handoff', name))));
  assert(backups.some(value => value.equals(first)), 'original checkpoint survives several rotations');
  assert.deepEqual(await preserved(root), before);
});

test('completion rejects incomplete work, unverified results, missing evidence, pending side effects and wrong owner', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  const input = await resultFile(root); const checkpoint = await readFile(path.join(root, checkpoints));
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--complete').code, 1);
  assert.equal(cli(root, 'save', '--agent', 'other', '--input', input).code, 1);
  const finished = { remaining: [], unverified: [], next: [], accepted: true, verifications: [{ acceptance: 'AC-01', command: 'not executed by helper', result: 'passed', evidence: 'missing.txt' }] };
  await resultFile(root, finished);
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--complete').code, 1);
  await writeFile(path.join(root, '.handoff/test-log.tmp.md'), 'Reported by executor: tests passed.\n');
  finished.verifications[0].evidence = '.handoff/test-log.tmp.md';
  await resultFile(root, { ...finished, external_effects: [{ operation: 'migration', status: 'unknown', recovery: 'query operation ID first' }] });
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--complete').code, 1);
  assert.deepEqual(await readFile(path.join(root, checkpoints)), checkpoint);
  await resultFile(root, finished);
  const saved = cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--complete');
  assert.equal(saved.code, 0, saved.stderr);
  assert.match(await readFile(path.join(root, checkpoints), 'utf8'), /- status: completed/);
  assert.equal(run('sh', ['scripts/check-docs.sh'], root).code, 0);
});

test('code or index changes make verification stale and do not leak file contents', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  assert.equal(cli(root, 'inspect', '--json').code, 0);
  await writeFile(path.join(root, 'business.txt'), 'SECRET_BUSINESS_CONTENT_NOT_FOR_REPORT\n');
  let report = JSON.parse(cli(root, 'inspect', '--json').stdout);
  assert.equal(report.verification_state, 'stale'); assert(report.changes_since_checkpoint.files_changed.includes('business.txt'));
  assert(!JSON.stringify(report).includes('SECRET_BUSINESS_CONTENT_NOT_FOR_REPORT'));
  git(root, 'add', 'business.txt'); report = JSON.parse(cli(root, 'inspect', '--json').stdout);
  assert.equal(report.changes_since_checkpoint.index_changed, true);
});

test('symlink record targets are refused; external symlink contents and sensitive files are not exposed', async t => {
  const root = await fixture(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'handoff-outside-')); t.after(() => rm(outside, { recursive: true, force: true }));
  const target = path.join(outside, 'secret.txt'); await writeFile(target, 'PRIVATE_SENTINEL\n');
  await rm(path.join(root, checkpoints)); await symlink(target, path.join(root, checkpoints));
  assert.equal(claim(root, ['--recover']).code, 1);
  assert.equal(await readFile(target, 'utf8'), 'PRIVATE_SENTINEL\n');
  await rm(path.join(root, checkpoints));
  await symlink(target, path.join(root, 'external.txt')); await writeFile(path.join(root, 'private.key'), 'PRIVATE_KEY_SENTINEL');
  const inspected = cli(root, 'inspect', '--json');
  assert(!inspected.stdout.includes('PRIVATE_SENTINEL')); assert(!inspected.stdout.includes('PRIVATE_KEY_SENTINEL'));
  assert.equal((await lstat(path.join(root, checkpoints)).catch(() => null)), null);
});

test('parameter errors and draft-template writes fail without modifying distributed templates', async () => {
  assert.equal(cli(source, 'inspect', '--nonsense').code, 2);
  const before = await readFile(path.join(source, checkpoints));
  assert.equal(cli(source, 'claim', '--agent', 'receiver-1', '--task', 'task-001', '--revision', '1', '--source-stopped', '--recover').code, 1);
  assert.deepEqual(await readFile(path.join(source, checkpoints)), before);
});

test('changed or missing ignored evidence marks old verification stale', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  const evidence = '.handoff/test-log.tmp.md';
  await writeFile(path.join(root, evidence), 'Executor reports exit 0\n');
  const input = await resultFile(root, { verifications: [{ acceptance: 'AC-01', command: 'test command', result: 'passed', evidence }] });
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input).code, 0);
  assert.notEqual(JSON.parse(cli(root, 'inspect', '--json').stdout).verification_state, 'stale');
  await writeFile(path.join(root, evidence), 'Changed reported result\n');
  assert.equal(JSON.parse(cli(root, 'inspect', '--json').stdout).verification_state, 'stale');
  await rm(path.join(root, evidence));
  assert.equal(JSON.parse(cli(root, 'inspect', '--json').stdout).verification_state, 'stale');
});

test('recovery handles legacy sequence and corrupt helper data without guessing project identity', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  const file = path.join(root, checkpoints); const before = await readFile(file, 'utf8');
  const corrupt = replace(before.replace(/<!-- handoff-helper-state\n[\s\S]*?\n-->/, '<!-- handoff-helper-state\n{broken}\n-->'), 'checkpoint_seq', '未知');
  await writeFile(file, corrupt);
  assert.equal(cli(root, 'inspect').code, 1);
  const received = claim(root, ['--recover']); assert.equal(received.code, 0, received.stderr);
  assert.match(await readFile(file, 'utf8'), /- checkpoint_seq: 1/);
  assert.equal(await readFile(path.join(root, '.handoff/CHECKPOINT.previous.md'), 'utf8'), corrupt);
  assert.equal(run('sh', ['scripts/check-docs.sh'], root).code, 0);
});

test('unsafe previous backup target prevents any replacement', async t => {
  const root = await fixture(t); const original = await readFile(path.join(root, checkpoints));
  await symlink('../business.txt', path.join(root, '.handoff/CHECKPOINT.previous.md'));
  assert.equal(claim(root).code, 1);
  assert.deepEqual(await readFile(path.join(root, checkpoints)), original);
  assert.equal(await readFile(path.join(root, 'business.txt'), 'utf8'), 'user staged change\n');
});

test('same-revision CONTEXT edits require explicit recovery instead of silently reusing a session', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  const input = await resultFile(root);
  const context = await readFile(path.join(root, contexts), 'utf8');
  await writeFile(path.join(root, contexts), context + '\nChanged scope must be reviewed.\n');
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input).code, 1);
  assert.equal(claim(root, ['--recover']).code, 0);
});

test('commands in result records are stored as data and never executed; invalid JSON is not echoed', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  await writeFile(path.join(root, '.handoff/log.tmp.md'), 'reported result\n');
  const input = await resultFile(root, { verifications: [{ acceptance: 'AC-01', command: 'touch NEVER_EXECUTE_RESULT_COMMAND', result: 'passed', evidence: '.handoff/log.tmp.md' }] });
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input).code, 0);
  assert.equal(await lstat(path.join(root, 'NEVER_EXECUTE_RESULT_COMMAND')).catch(() => null), null);
  await writeFile(path.join(root, input), '{PRIVATE_INVALID_JSON_SENTINEL');
  const invalid = cli(root, 'save', '--agent', 'receiver-1', '--input', input);
  assert.equal(invalid.code, 1); assert(!invalid.stderr.includes('PRIVATE_INVALID_JSON_SENTINEL'));
});

test('completion becomes invalid when evidence changes and cannot be prompted as a new active handoff', async t => {
  const root = await fixture(t); assert.equal(claim(root).code, 0);
  await writeFile(path.join(root, '.handoff/log.tmp.md'), 'reported exit 0\n');
  const done = { remaining: [], unverified: [], next: [], accepted: true,
    verifications: [{ acceptance: 'AC-01', command: 'test command', result: 'passed', evidence: './' + checkpoints }] };
  const input = await resultFile(root, done);
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--complete').code, 1);
  done.verifications[0].evidence = '.handoff/log.tmp.md'; await resultFile(root, done);
  assert.equal(cli(root, 'save', '--agent', 'receiver-1', '--input', input, '--complete').code, 0);
  assert.equal(cli(root, 'prompt').code, 1);
  await writeFile(path.join(root, '.handoff/log.tmp.md'), 'evidence changed\n');
  const inspected = cli(root, 'inspect', '--json'); assert.equal(inspected.code, 1);
  assert.equal(JSON.parse(inspected.stdout).verification_state, 'stale');
});

test('workspace fields in the identity section reject wrong root and branch before normal claim', async t => {
  const root = await fixture(t); const file = path.join(root, checkpoints);
  const original = await readFile(file, 'utf8');
  for (const [field, value, expected] of [
    ['repo_root', '/wrong/project/root', /repo_root/],
    ['branch', 'wrong-branch', /分支/],
    ['repo_root', '未知', /repo_root/],
    ['branch', '未填', /分支/],
  ]) {
    await writeFile(file, replace(original, field, value));
    const inspected = cli(root, 'inspect', '--json');
    assert.equal(inspected.code, 1, `identity section ${field} must be checked`);
    assert.match(JSON.parse(inspected.stdout).errors.join(' '), expected);
    assert.equal(claim(root).code, 1);
    assert.equal(await readFile(file, 'utf8'), replace(original, field, value));
  }
  const recovered = claim(root, ['--recover']); assert.equal(recovered.code, 0, recovered.stderr);
  assert.equal(cli(root, 'inspect').code, 0);
});

test('HEAD drift in identity section is reported even without helper snapshot metadata', async t => {
  const root = await fixture(t); const file = path.join(root, checkpoints);
  await writeFile(file, replace(await readFile(file, 'utf8'), 'HEAD', '0'.repeat(40)));
  const inspected = cli(root, 'inspect', '--json');
  assert.match(JSON.parse(inspected.stdout).warnings.join(' '), /HEAD 已变化/);
});

for (const command of ['claim', 'save']) {
  for (const trackedPath of [contexts, checkpoints]) {
    test(`${command} refuses tracked ${trackedPath} without writing records or changing the index`, async t => {
      const root = await fixture(t);
      if (command === 'save') assert.equal(claim(root).code, 0);
      const input = command === 'save' ? await resultFile(root) : null;
      git(root, 'add', '-f', '--', trackedPath);
      const before = await preserved(root);
      const oldContext = await readFile(path.join(root, contexts));
      const oldCheckpoint = await readFile(path.join(root, checkpoints));
      const oldNames = (await readdir(path.join(root, '.handoff'))).sort();
      const result = command === 'claim' ? claim(root)
        : cli(root, 'save', '--agent', 'receiver-1', '--input', input);
      assert.equal(result.code, 1);
      assert.match(result.stderr, /仍被 Git 跟踪/);
      assert.deepEqual(await readFile(path.join(root, contexts)), oldContext);
      assert.deepEqual(await readFile(path.join(root, checkpoints)), oldCheckpoint);
      assert.deepEqual((await readdir(path.join(root, '.handoff'))).sort(), oldNames);
      assert.deepEqual(await preserved(root), before);
    });
  }
}

test('claim and save ignored records leave Git status unchanged', async t => {
  const root = await fixture(t);
  const before = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  assert.equal(claim(root).code, 0);
  const input = await resultFile(root);
  const saved = cli(root, 'save', '--agent', 'receiver-1', '--input', input);
  assert.equal(saved.code, 0, saved.stderr);
  assert.equal(git(root, 'status', '--porcelain=v1', '--untracked-files=all'), before);
});
