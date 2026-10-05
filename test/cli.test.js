'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'claude-moodline.js');

function run(args, { input, env = {}, cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-cwd-')) } = {}) {
  const { NO_COLOR, CLAUDE_MOODLINE_ASCII, COLUMNS, ...base } = process.env;
  return spawnSync(process.execPath, [BIN, ...args], {
    input,
    cwd,
    encoding: 'utf8',
    env: { ...base, ...env },
  });
}

test('renders JSON piped on stdin', () => {
  const r = run(['--no-color'], { input: JSON.stringify({ model: { display_name: 'Sonnet' } }) });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '🤖 Sonnet\n😊 usage: waiting for first reply');
});

test('shows the git branch of the workspace directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-repo-'));
  fs.mkdirSync(path.join(dir, '.git'));
  fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/my-branch\n');
  const r = run(['--no-color'], { input: JSON.stringify({ workspace: { current_dir: dir } }) });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.split('\n')[0], '🤖 Claude  |  🌿 my-branch');
});

test('wraps to fit the COLUMNS env var', () => {
  const input = JSON.stringify({ model: { display_name: 'Opus' }, context_window: { used_percentage: 42 } });
  const wide = run(['--no-color'], { input, env: { COLUMNS: '120' } });
  assert.equal(wide.stdout.split('\n')[0], '🤖 Opus  |  🧠 ctx ███░░░░░ 42% 🙂');
  const narrow = run(['--no-color'], { input, env: { COLUMNS: '30' } });
  assert.deepEqual(narrow.stdout.split('\n').slice(0, 2), ['🤖 Opus', '🧠 ctx ███░░░░░ 42% 🙂']);
});

test('renders defaults on garbage input instead of failing', () => {
  const r = run(['--no-color'], { input: 'not json' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Claude/);
});

test('NO_COLOR and CLAUDE_MOODLINE_ASCII env vars are honoured', () => {
  const r = run([], { input: '{}', env: { NO_COLOR: '1', CLAUDE_MOODLINE_ASCII: '1' } });
  assert.equal(r.stdout, 'Claude\nusage: waiting for first reply');
});

test('preview prints a sample', () => {
  const r = run(['preview', '--no-color']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Opus/);
  assert.match(r.stdout, /5h/);
});

test('install and uninstall round-trip through a temp config dir', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-cli-'));
  const env = { CLAUDE_CONFIG_DIR: dir };
  const inst = run(['install', '--ascii'], { env });
  assert.equal(inst.status, 0, inst.stderr);
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  assert.match(s.statusLine.command, /^node ".*claude-moodline\.js" --ascii$/);
  assert.doesNotMatch(s.statusLine.command, /\\/);

  const un = run(['uninstall'], { env });
  assert.equal(un.status, 0, un.stderr);
});

test('--no-bar and CLAUDE_MOODLINE_NO_BAR hide bars per item', () => {
  const input = JSON.stringify({
    context_window: { used_percentage: 42 },
    rate_limits: { five_hour: { used_percentage: 73 }, seven_day: { used_percentage: 18 } },
  });
  const some = run(['--no-color', '--no-bar=7d,CTX'], { input });
  assert.equal(some.stdout, '🤖 Claude  |  🧠 ctx 42% 🙂\n⏱️ 5h ███████░░░ 73% 😅  |  📅 7d 18% 😄');
  const all = run(['--no-color', '--no-bar'], { input });
  assert.doesNotMatch(all.stdout, /[█░]/);
  const env = run(['--no-color'], { input, env: { CLAUDE_MOODLINE_NO_BAR: '5h' } });
  assert.match(env.stdout, /5h 73%/);
  assert.match(env.stdout, /7d ██/);
});

test('--no-bar rejects unknown items, except while rendering', () => {
  const bad = run(['preview', '--no-bar=ctx,foo']);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown --no-bar item "foo"/);
  const live = run(['--no-color', '--no-bar=foo'], { input: '{}' });
  assert.equal(live.status, 0);
  assert.match(live.stdout, /Claude/);
});

test('install saves --no-bar into the command', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-cli-'));
  const inst = run(['install', '--no-bar=7d,5h'], { env: { CLAUDE_CONFIG_DIR: dir } });
  assert.equal(inst.status, 0, inst.stderr);
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  assert.match(s.statusLine.command, / --no-bar=5h,7d$/);
});

test('unknown commands exit non-zero', () => {
  const r = run(['frobnicate']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown command/);
});

test('shipped files use LF endings (a CRLF shebang breaks macOS/Linux installs)', () => {
  const root = path.join(__dirname, '..');
  for (const f of ['bin/claude-moodline.js', 'src/render.js', 'src/settings.js', 'src/git.js']) {
    assert.ok(!fs.readFileSync(path.join(root, f), 'utf8').includes('\r'), `${f} contains CR characters`);
  }
});
