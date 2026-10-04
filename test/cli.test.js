'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'claude-moodline.js');

function run(args, { input, env = {} } = {}) {
  const { NO_COLOR, CLAUDE_MOODLINE_ASCII, ...base } = process.env;
  return spawnSync(process.execPath, [BIN, ...args], {
    input,
    encoding: 'utf8',
    env: { ...base, ...env },
  });
}

test('renders JSON piped on stdin', () => {
  const r = run(['--no-color'], { input: JSON.stringify({ model: { display_name: 'Sonnet' } }) });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '🤖 Sonnet\n😊 usage: waiting for first reply');
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

test('unknown commands exit non-zero', () => {
  const r = run(['frobnicate']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown command/);
});

test('shipped files use LF endings (a CRLF shebang breaks macOS/Linux installs)', () => {
  const root = path.join(__dirname, '..');
  for (const f of ['bin/claude-moodline.js', 'src/render.js', 'src/settings.js']) {
    assert.ok(!fs.readFileSync(path.join(root, f), 'utf8').includes('\r'), `${f} contains CR characters`);
  }
});
