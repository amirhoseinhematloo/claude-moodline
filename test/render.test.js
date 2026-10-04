'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { render, formatDuration, moodIndex } = require('../src/render.js');

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
