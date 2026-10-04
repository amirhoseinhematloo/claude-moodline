'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildCommand, install, uninstall, settingsPath } = require('../src/settings.js');

function tempEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-'));
  return { env: { CLAUDE_CONFIG_DIR: dir }, file: path.join(dir, 'settings.json') };
}
const SCRIPT = path.join('/opt', 'lib', 'node_modules', 'claude-moodline', 'bin', 'claude-moodline.js');

test('buildCommand uses an absolute node path with forward slashes', () => {
  assert.equal(
    buildCommand('C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\claude-moodline\\bin\\claude-moodline.js'),
    'node "C:/Users/me/AppData/Roaming/npm/node_modules/claude-moodline/bin/claude-moodline.js"',
  );
  assert.equal(buildCommand('/usr/lib/x/claude-moodline.js', ['--ascii']), 'node "/usr/lib/x/claude-moodline.js" --ascii');
});

test('buildCommand falls back to npx when run from the npx cache', () => {
  assert.equal(buildCommand('/home/me/.npm/_npx/abc/node_modules/claude-moodline/bin/claude-moodline.js'), 'npx -y claude-moodline');
  assert.equal(buildCommand('C:\\Users\\me\\AppData\\Local\\npm-cache\\_npx\\abc\\x.js'), 'npx -y claude-moodline');
});

test('settingsPath honours CLAUDE_CONFIG_DIR', () => {
  assert.equal(settingsPath({ CLAUDE_CONFIG_DIR: '/tmp/cc' }), path.join('/tmp/cc', 'settings.json'));
});

test('install creates settings.json when missing', () => {
  const { env, file } = tempEnv();
  install({ scriptPath: SCRIPT, env });
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(s.statusLine.type, 'command');
  assert.match(s.statusLine.command, /claude-moodline\.js"$/);
  assert.equal(s.statusLine.refreshInterval, 60);
});

test('install keeps other settings, handles a BOM, and writes a backup', () => {
  const { env, file } = tempEnv();
  fs.writeFileSync(file, '\uFEFF' + JSON.stringify({ theme: 'dark', permissions: { allow: ['x'] } }));
  install({ scriptPath: SCRIPT, env });
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(s.theme, 'dark');
  assert.deepEqual(s.permissions, { allow: ['x'] });
  assert.ok(fs.existsSync(file + '.bak'));
});

test('install refuses to replace a foreign status line without --force', () => {
  const { env, file } = tempEnv();
  fs.writeFileSync(file, JSON.stringify({ statusLine: { type: 'command', command: 'node ~/.claude/statusline.js' } }));
  assert.throws(() => install({ scriptPath: SCRIPT, env }), { code: 'EXISTS' });
  const res = install({ scriptPath: SCRIPT, env, force: true });
  assert.equal(res.previous.command, 'node ~/.claude/statusline.js');
});

test('install over an existing claude-moodline entry needs no --force', () => {
  const { env } = tempEnv();
  install({ scriptPath: SCRIPT, env });
  assert.doesNotThrow(() => install({ scriptPath: SCRIPT, args: ['--ascii'], env }));
});

test('install reports a malformed settings.json instead of overwriting it', () => {
  const { env, file } = tempEnv();
  fs.writeFileSync(file, '{ not json');
  assert.throws(() => install({ scriptPath: SCRIPT, env }), /Could not parse/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{ not json');
});

test('uninstall removes only our entry', () => {
  const { env, file } = tempEnv();
  install({ scriptPath: SCRIPT, env });
  assert.deepEqual(uninstall({ env }), { file, removed: true });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).statusLine, undefined);
  assert.deepEqual(uninstall({ env }), { file, removed: false });

  fs.writeFileSync(file, JSON.stringify({ statusLine: { type: 'command', command: 'other' } }));
  assert.throws(() => uninstall({ env }), { code: 'NOT_OURS' });
});
