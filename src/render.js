'use strict';

// Renders the status line from the JSON Claude Code pipes to a statusLine
// command: model · effort · git branch · context bar on line one, 5h/7d
// usage bars on line two, each bar with a mood face. On a narrow terminal,
// segments that don't fit wrap onto extra lines. Pure — no I/O — so it is
// testable.

const ANSI = {
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};
const NO_ANSI = Object.fromEntries(Object.keys(ANSI).map((k) => [k, '']));

const EMOJI = {
  model: '🤖',
  branch: '🌿',
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
  branch: '',
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

/** Items that have a progress bar, by the label shown next to them. */
const BAR_ITEMS = ['ctx', '5h', '7d'];

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

// Code points terminals draw two columns wide: emoji, plus CJK and other
// East Asian wide/fullwidth ranges (branch names can contain these).
const WIDE = [
  [0x1100, 0x115f], [0x231a, 0x231b], [0x23e9, 0x23ec], [0x23f0, 0x23f0], [0x23f3, 0x23f3],
  [0x25fd, 0x25fe], [0x2614, 0x2615], [0x2648, 0x2653], [0x267f, 0x267f], [0x2693, 0x2693],
  [0x26a1, 0x26a1], [0x26aa, 0x26ab], [0x26bd, 0x26be], [0x26c4, 0x26c5], [0x26ce, 0x26ce],
  [0x26d4, 0x26d4], [0x26ea, 0x26ea], [0x26f2, 0x26f3], [0x26f5, 0x26f5], [0x26fa, 0x26fa],
  [0x26fd, 0x26fd], [0x2705, 0x2705], [0x270a, 0x270b], [0x2728, 0x2728], [0x274c, 0x274c],
  [0x274e, 0x274e], [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797], [0x27b0, 0x27b0],
  [0x27bf, 0x27bf], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55], [0x2e80, 0x303e],
  [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xac00, 0xd7a3],
  [0xf900, 0xfaff], [0xfe30, 0xfe4f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f000, 0x1faff],
  [0x20000, 0x3fffd],
];
const isWide = (cp) => WIDE.some(([lo, hi]) => cp >= lo && cp <= hi);
const isZeroWidth = (cp) => cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x300 && cp <= 0x36f);

/** Columns a string occupies in a terminal, ignoring ANSI color codes. */
function visibleWidth(s) {
  let w = 0;
  let prevNarrow = false;
  for (const ch of s.replace(/\x1b\[[0-9;]*m/g, '')) {
    const cp = ch.codePointAt(0);
    // VS16 asks for emoji presentation, which widens a narrow symbol like ⏱.
    if (cp === 0xfe0f && prevNarrow) w += 1;
    if (isZeroWidth(cp)) {
      prevNarrow = false;
      continue;
    }
    const cw = isWide(cp) ? 2 : 1;
    w += cw;
    prevNarrow = cw === 1;
  }
  return w;
}

/** Packs segments onto as few lines as fit in `width`, never splitting one. */
function wrap(segments, sep, width) {
  if (!(width > 0)) return [segments.join(sep)];
  const sepWidth = visibleWidth(sep);
  const lines = [];
  let cur = [];
  let curWidth = 0;
  for (const seg of segments) {
    const w = visibleWidth(seg);
    if (cur.length && curWidth + sepWidth + w > width) {
      lines.push(cur.join(sep));
      cur = [];
      curWidth = 0;
    }
    curWidth += (cur.length ? sepWidth : 0) + w;
    cur.push(seg);
  }
  if (cur.length) lines.push(cur.join(sep));
  return lines;
}

/**
 * @param {object} data   Parsed status-line JSON from Claude Code (may be {}).
 * @param {object} [opts]
 * @param {boolean} [opts.color=true]  Emit ANSI colors.
 * @param {boolean} [opts.ascii=false] Use plain ASCII instead of emoji/blocks.
 * @param {number}  [opts.now]         Current time in ms (for tests).
 * @param {string}  [opts.branch]      Git branch to show, if any.
 * @param {number}  [opts.width]       Terminal columns; segments that don't fit
 *                                     move to their own lines. Unset = no wrapping.
 * @param {string[]} [opts.noBar]      Items (see BAR_ITEMS) to show without a
 *                                     progress bar: just percentage and face.
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

  const noBar = new Set(opts.noBar);
  const bar = (item, pct, width = 10) => {
    const p = clampPct(pct);
    const col = colorFor(p);
    const stats = `${col}${p}%${c.reset} ${g.faces[moodIndex(p)]}`;
    if (noBar.has(item)) return stats;
    const filled = Math.round((p * width) / 100);
    return `${col}${g.filled.repeat(filled)}${c.dim}${g.empty.repeat(width - filled)}${c.reset} ${stats}`;
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

  if (opts.branch) line1.push(icon(g.branch, `${c.blue}${opts.branch}${c.reset}`));

  const ctx = d.context_window?.used_percentage;
  if (ctx != null) line1.push(icon(g.ctx, `${c.dim}ctx${c.reset} ${bar('ctx', ctx, 8)}`));

  const line2 = [];
  const rl = d.rate_limits || {};
  if (rl.five_hour?.used_percentage != null) {
    line2.push(icon(g.fiveHour, `${c.dim}5h${c.reset} ${bar('5h', rl.five_hour.used_percentage)}${until(rl.five_hour.resets_at)}`));
  }
  if (rl.seven_day?.used_percentage != null) {
    line2.push(icon(g.sevenDay, `${c.dim}7d${c.reset} ${bar('7d', rl.seven_day.used_percentage)}${until(rl.seven_day.resets_at)}`));
  }
  if (!line2.length) line2.push(icon(g.waiting, `${c.dim}usage: waiting for first reply${c.reset}`));

  return [...wrap(line1, sep, opts.width), ...wrap(line2, sep, opts.width)].join('\n');
}

module.exports = { render, formatDuration, moodIndex, visibleWidth, BAR_ITEMS };
