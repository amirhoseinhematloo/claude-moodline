'use strict';

// Renders the status line from the JSON Claude Code pipes to a statusLine
// command: model · effort · context bar on line one, 5h/7d usage bars on
// line two, each bar with a mood face. Pure — no I/O — so it is testable.

const ANSI = {
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};
const NO_ANSI = Object.fromEntries(Object.keys(ANSI).map((k) => [k, '']));

const EMOJI = {
  model: '🤖',
  ctx: '🧠',
  fiveHour: '⏱️',
  sevenDay: '📅',
  waiting: '😊',
  effort: { low: '🐢', medium: '🚶', high: '🏃', xhigh: '🚀', max: '🔥' },
  effortFallback: '✨',
  faces: ['😄', '🙂', '😅', '😱'],
  filled: '█',
  empty: '░',
  reset: '↻',
};

// For terminals that render emoji or block glyphs badly (e.g. the legacy
// Windows console host).
const ASCII = {
  model: '',
  ctx: '',
  fiveHour: '',
  sevenDay: '',
  waiting: '',
  effort: {},
  effortFallback: '',
  faces: [':D', ':)', ':S', ':O'],
  filled: '#',
  empty: '-',
  reset: '@',
};

const clampPct = (pct) => Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));

/** Moods by percentage used: <40 happy, <70 fine, <90 nervous, else panic. */
const moodIndex = (p) => (p >= 90 ? 3 : p >= 70 ? 2 : p >= 40 ? 1 : 0);

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d${h}h` : h ? `${h}h${m}m` : `${m}m`;
}

/**
 * @param {object} data   Parsed status-line JSON from Claude Code (may be {}).
 * @param {object} [opts]
 * @param {boolean} [opts.color=true]  Emit ANSI colors.
 * @param {boolean} [opts.ascii=false] Use plain ASCII instead of emoji/blocks.
 * @param {number}  [opts.now]         Current time in ms (for tests).
 * @returns {string}
 */
function render(data, opts = {}) {
  const d = data && typeof data === 'object' ? data : {};
  const c = opts.color === false ? NO_ANSI : ANSI;
  const g = opts.ascii ? ASCII : EMOJI;
  const nowSec = Math.floor((opts.now ?? Date.now()) / 1000);

  // Joins an optional icon to a label without leaving a stray space in ASCII mode.
  const icon = (i, rest) => (i ? `${i} ${rest}` : rest);
  const sep = `  ${c.dim}|${c.reset}  `;
  const colorFor = (p) => [c.green, c.green, c.yellow, c.red][moodIndex(p)];

  const bar = (pct, width = 10) => {
    const p = clampPct(pct);
    const filled = Math.round((p * width) / 100);
    const col = colorFor(p);
    return (
      `${col}${g.filled.repeat(filled)}${c.dim}${g.empty.repeat(width - filled)}${c.reset}` +
      ` ${col}${p}%${c.reset} ${g.faces[moodIndex(p)]}`
    );
  };

  const until = (epoch) => {
    if (!epoch) return '';
    return ` ${c.dim}${g.reset}${formatDuration(epoch - nowSec)}${c.reset}`;
  };

  const line1 = [];
  const model = d.model?.display_name || 'Claude';
  const effort = d.effort?.level;
  let head = icon(g.model, `${c.cyan}${model}${c.reset}`);
  if (effort) head += ' ' + icon(g.effort[effort] ?? g.effortFallback, `${c.magenta}${effort}${c.reset}`);
  line1.push(head);

  const ctx = d.context_window?.used_percentage;
  if (ctx != null) line1.push(icon(g.ctx, `${c.dim}ctx${c.reset} ${bar(ctx, 8)}`));

  const line2 = [];
  const rl = d.rate_limits || {};
  if (rl.five_hour?.used_percentage != null) {
    line2.push(icon(g.fiveHour, `${c.dim}5h${c.reset} ${bar(rl.five_hour.used_percentage)}${until(rl.five_hour.resets_at)}`));
  }
  if (rl.seven_day?.used_percentage != null) {
    line2.push(icon(g.sevenDay, `${c.dim}7d${c.reset} ${bar(rl.seven_day.used_percentage)}${until(rl.seven_day.resets_at)}`));
  }
  if (!line2.length) line2.push(icon(g.waiting, `${c.dim}usage: waiting for first reply${c.reset}`));

  return line1.join(sep) + '\n' + line2.join(sep);
}

module.exports = { render, formatDuration, moodIndex };
