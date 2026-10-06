'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { render, formatDuration, moodIndex, visibleWidth, THEME_NAMES } = require('../src/render.js');

const NOW = 1_700_000_000_000;
const nowSec = NOW / 1000;
const plain = (data, opts = {}) => render(data, { color: false, now: NOW, ...opts });

const full = {
  model: { display_name: 'Opus' },
  effort: { level: 'high' },
  context_window: { used_percentage: 42 },
  rate_limits: {
    five_hour: { used_percentage: 73, resets_at: nowSec + 2 * 3600 + 15 * 60 },
    seven_day: { used_percentage: 95, resets_at: nowSec + 4 * 86400 + 6 * 3600 },
  },
};

test('renders both lines with every field present', () => {
  const [line1, line2] = plain(full).split('\n');
  assert.equal(line1, '🤖 Opus 🏃 high  |  🧠 ctx ███░░░░░ 42% 🙂');
  assert.equal(line2, '⏱️ 5h ███████░░░ 73% 😅 ↻2h15m  |  📅 7d ██████████ 95% 😱 ↻4d6h');
});

test('falls back gracefully on empty or invalid input', () => {
  assert.equal(plain({}), '🤖 Claude\n😊 usage: waiting for first reply');
  assert.equal(plain(null), '🤖 Claude\n😊 usage: waiting for first reply');
});

test('shows the git branch after model and effort', () => {
  assert.equal(plain(full, { branch: 'main' }).split('\n')[0], '🤖 Opus 🏃 high  |  🌿 main  |  🧠 ctx ███░░░░░ 42% 🙂');
  assert.match(plain(full, { branch: 'main', ascii: true }), /^Opus high {2}\| {2}main {2}\| {2}ctx /);
  assert.match(render(full, { now: NOW, branch: 'main' }), /\x1b\[34mmain\x1b\[0m/);
});

test('visibleWidth ignores ANSI codes and counts emoji as two columns', () => {
  assert.equal(visibleWidth('\x1b[36mOpus\x1b[0m'), 4);
  assert.equal(visibleWidth('🤖 ✨ 😱'), 8);
  assert.equal(visibleWidth('⏱️'), 2);
  assert.equal(visibleWidth('███░↻'), 5);
  assert.equal(visibleWidth('功能'), 4);
});

test('wraps segments onto extra lines when they do not fit the width', () => {
  const opts = { branch: 'main' };
  // Widest lines are 54 and 64 columns.
  assert.equal(plain(full, { ...opts, width: 64 }), plain(full, opts));
  assert.deepEqual(plain(full, { ...opts, width: 63 }).split('\n'), [
    '🤖 Opus 🏃 high  |  🌿 main  |  🧠 ctx ███░░░░░ 42% 🙂',
    '⏱️ 5h ███████░░░ 73% 😅 ↻2h15m',
    '📅 7d ██████████ 95% 😱 ↻4d6h',
  ]);
  assert.deepEqual(plain(full, { ...opts, width: 53 }).split('\n').slice(0, 2), [
    '🤖 Opus 🏃 high  |  🌿 main',
    '🧠 ctx ███░░░░░ 42% 🙂',
  ]);
});

test('a segment wider than the terminal gets its own line, not split', () => {
  const lines = plain(full, { branch: 'main', width: 10 }).split('\n');
  assert.equal(lines.length, 5);
  assert.ok(lines.every((l) => !l.includes('|')));
});

test('noBar hides the bar per item but keeps percentage, face and reset', () => {
  const [line1, line2] = plain(full, { noBar: ['ctx', '7d'] }).split('\n');
  assert.equal(line1, '🤖 Opus 🏃 high  |  🧠 ctx 42% 🙂');
  assert.equal(line2, '⏱️ 5h ███████░░░ 73% 😅 ↻2h15m  |  📅 7d 95% 😱 ↻4d6h');
  assert.equal(
    plain(full, { noBar: ['5h'], ascii: true }),
    'Opus high  |  ctx ###----- 42% :)\n5h 73% :S @2h15m  |  7d ########## 95% :O @4d6h',
  );
});

test('minimal theme uses thin line bars and no emoji or faces', () => {
  const out = plain(full, { theme: 'minimal', branch: 'main' });
  assert.equal(
    out,
    'Opus · high  │  main  │  ctx ━━━───── 42%\n5h ━━━━━━━─── 73% ↻2h15m  │  7d ━━━━━━━━━━ 95% ↻4d6h',
  );
  assert.equal(plain({}, { theme: 'minimal' }), 'Claude\nusage: waiting for first reply');
  assert.equal(
    plain(full, { theme: 'minimal', ascii: true }),
    'Opus high  |  ctx ===----- 42%\n5h =======--- 73% @2h15m  |  7d ========== 95% @4d6h',
  );
  // Quiet below 70%: no color on the bar, only on warnings.
  assert.match(render(full, { now: NOW, theme: 'minimal' }), /\x1b\[1mOpus\x1b\[0m/);
  assert.doesNotMatch(render(full, { now: NOW, theme: 'minimal' }), /\x1b\[32m/);
});

test('space theme uses star bars and cosmic moods', () => {
  const [line1, line2] = plain(full, { theme: 'space', branch: 'main' }).split('\n');
  assert.equal(line1, '🚀 Opus 🌕 high  ⋆  🛰️ main  ⋆  🪐 ctx ✦✦✦····· 42% 🌠');
  assert.equal(line2, '🌍 5h ✦✦✦✦✦✦✦··· 73% ☄️ ↻2h15m  ⋆  🌌 7d ✦✦✦✦✦✦✦✦✦✦ 95% 💥 ↻4d6h');
  assert.equal(plain({}, { theme: 'space' }), '🚀 Claude\n🔭 usage: awaiting first transmission');
  assert.doesNotMatch(plain(full, { theme: 'space', ascii: true }), /[^\x20-\x7e\n]/);
  assert.equal(visibleWidth('🛰️☄️☀️'), 6);
});

test('nature, jurassic and game themes', () => {
  assert.equal(
    plain(full, { theme: 'nature', branch: 'main' }),
    '🌳 Opus 🐇 high  ·  🌿 main  ·  🌻 ctx ▰▰▰▱▱▱▱▱ 42% 🍃\n☀️ 5h ▰▰▰▰▰▰▰▱▱▱ 73% 🍂 ↻2h15m  ·  🌙 7d ▰▰▰▰▰▰▰▰▰▰ 95% 🔥 ↻4d6h',
  );
  assert.equal(
    plain(full, { theme: 'jurassic', branch: 'main' }),
    '🦖 Opus 🦎 high  ¦  🌿 main  ¦  🦴 ctx ▓▓▓░░░░░ 42% 🌋\n👣 5h ▓▓▓▓▓▓▓░░░ 73% 🔥 ↻2h15m  ¦  🪨 7d ▓▓▓▓▓▓▓▓▓▓ 95% ☄️ ↻4d6h',
  );
  assert.equal(
    plain(full, { theme: 'game', branch: 'main' }),
    '🎮 Opus 🟠 high  ║  🗺️ main  ║  ❤️ ctx ■■■□□□□□ 42% 🎯\n⚡ 5h ■■■■■■■□□□ 73% ⚠️ ↻2h15m  ║  🛡️ 7d ■■■■■■■■■■ 95% 💀 ↻4d6h',
  );
  assert.equal(plain({}, { theme: 'jurassic' }), '🦖 Claude\n🥚 usage: waiting for first reply to hatch');
  assert.equal(visibleWidth('☀️❤️⚠️🗺️🛡️🪨'), 12);
});

test('every theme has a plain-ASCII fallback', () => {
  for (const theme of THEME_NAMES) {
    const out = plain({ ...full, effort: { level: 'max' } }, { theme, ascii: true, branch: 'main' });
    assert.doesNotMatch(out, /[^\x20-\x7e\n]/, theme);
  }
});

test('unknown theme falls back to the default', () => {
  assert.equal(plain(full, { theme: 'nope' }), plain(full));
});

test('unknown effort level gets the fallback icon', () => {
  assert.match(plain({ effort: { level: 'turbo' } }), /✨ turbo/);
});

test('ascii mode uses no emoji or block glyphs', () => {
  const out = plain(full, { ascii: true });
  assert.equal(out, 'Opus high  |  ctx ###----- 42% :)\n5h #######--- 73% :S @2h15m  |  7d ########## 95% :O @4d6h');
  assert.doesNotMatch(out, /[^\x20-\x7e\n]/);
});

test('color mode wraps output in ANSI codes; no-color has none', () => {
  assert.match(render(full, { now: NOW }), /\x1b\[36mOpus\x1b\[0m/);
  assert.doesNotMatch(plain(full), /\x1b/);
});

test('percentages are clamped and rounded', () => {
  assert.match(plain({ context_window: { used_percentage: 140 } }), /████████ 100%/);
  assert.match(plain({ context_window: { used_percentage: -5 } }), /░░░░░░░░ 0%/);
  assert.match(plain({ context_window: { used_percentage: 12.6 } }), / 13%/);
});

test('moods change at 40 / 70 / 90', () => {
  assert.deepEqual([0, 39, 40, 69, 70, 89, 90, 100].map(moodIndex), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('formatDuration picks the largest units and never goes negative', () => {
  assert.equal(formatDuration(59), '0m');
  assert.equal(formatDuration(3 * 60), '3m');
  assert.equal(formatDuration(3600 + 120), '1h2m');
  assert.equal(formatDuration(86400 * 2 + 3600 * 5), '2d5h');
  assert.equal(formatDuration(-100), '0m');
});
