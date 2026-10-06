#!/usr/bin/env node
'use strict';

const { render, BAR_ITEMS, THEME_NAMES } = require('../src/render.js');
const { gitBranch } = require('../src/git.js');
const { install, uninstall, settingsPath } = require('../src/settings.js');
const { version } = require('../package.json');

const HELP = `claude-moodline ${version}
A Claude Code status line: model, effort, git branch, context and 5h/7d usage bars with mood faces.

Usage:
  claude-moodline install [--force] [--theme=NAME] [--ascii] [--no-color] [--no-bar[=ITEMS]]
                              Point Claude Code's statusLine at this package
  claude-moodline uninstall [--force]
                              Remove the statusLine entry
  claude-moodline preview [--theme=NAME] [--ascii] [--no-color] [--no-bar[=ITEMS]]
                              Print a sample status line
  claude-moodline themes [--ascii] [--no-color] [--no-bar[=ITEMS]]
                              Print a sample of every theme
  claude-moodline [--theme=NAME] [--ascii] [--no-color] [--no-bar[=ITEMS]] < status.json
                              Render (this is what Claude Code runs)

Options:
  --theme=NAME The look: ${THEME_NAMES.join(', ')} (default ${THEME_NAMES[0]})
  --ascii      Plain ASCII instead of emoji and block characters
  --no-color   No ANSI colors (also honoured: NO_COLOR env var)
  --no-bar=ITEMS
               Hide the progress bar for these items, comma-separated:
               ${BAR_ITEMS.join(', ')} or all (plain --no-bar means all). The
               percentage and face still show.
  --force      Replace / remove a status line that isn't claude-moodline
  -h, --help   Show this help
  -v, --version

Env: CLAUDE_MOODLINE_THEME=NAME is the same as --theme=NAME.
     CLAUDE_MOODLINE_ASCII=1 is the same as --ascii.
     CLAUDE_MOODLINE_NO_BAR=ITEMS is the same as --no-bar=ITEMS.
     COLUMNS sets the width to fit (Claude Code sets it); segments that
     don't fit wrap onto extra lines.
Settings file: ${settingsPath()}
`;

const argv = process.argv.slice(2);
const has = (...flags) => flags.some((f) => argv.includes(f));
const command = argv.find((a) => !a.startsWith('-'));

/** Items from --no-bar[=a,b] (last one wins) or CLAUDE_MOODLINE_NO_BAR. */
function parseNoBar() {
  const flag = argv.filter((a) => a === '--no-bar' || a.startsWith('--no-bar=')).pop();
  const raw = flag ? (flag.includes('=') ? flag.slice(flag.indexOf('=') + 1) : 'all') : process.env.CLAUDE_MOODLINE_NO_BAR || '';
  const items = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (items.includes('all')) return { noBar: BAR_ITEMS, unknown: [] };
  return {
    noBar: BAR_ITEMS.filter((i) => items.includes(i)),
    unknown: items.filter((i) => !BAR_ITEMS.includes(i)),
  };
}
const { noBar, unknown: unknownBars } = parseNoBar();

/** Theme from --theme=NAME (last one wins) or CLAUDE_MOODLINE_THEME. */
function parseTheme() {
  const flag = argv.filter((a) => a.startsWith('--theme=')).pop();
  const raw = (flag ? flag.slice('--theme='.length) : process.env.CLAUDE_MOODLINE_THEME || '').trim().toLowerCase();
  if (!raw) return { theme: THEME_NAMES[0] };
  return THEME_NAMES.includes(raw) ? { theme: raw } : { theme: THEME_NAMES[0], unknown: raw };
}
const { theme, unknown: unknownTheme } = parseTheme();

// Claude Code captures our stdout, so it passes the terminal size in COLUMNS.
// Leave a little slack: terminals disagree on how wide some emoji are.
const columns = Number(process.env.COLUMNS) || process.stdout.columns || 0;

const renderOpts = {
  theme,
  ascii: has('--ascii') || process.env.CLAUDE_MOODLINE_ASCII === '1',
  color: !has('--no-color') && !('NO_COLOR' in process.env),
  width: columns > 0 ? columns - 2 : 0,
  noBar,
};
// Flags to bake into the installed command, so the choice sticks.
const styleFlags = [
  theme !== THEME_NAMES[0] && `--theme=${theme}`,
  renderOpts.ascii && '--ascii',
  has('--no-color') && '--no-color',
  noBar.length && `--no-bar=${noBar.join(',')}`,
].filter(Boolean);

function fail(err) {
  process.stderr.write(`claude-moodline: ${err.message}\n`);
  process.exit(1);
}

function sample() {
  const now = Math.floor(Date.now() / 1000);
  return {
    model: { display_name: 'Opus' },
    effort: { level: 'high' },
    context_window: { used_percentage: 42 },
    rate_limits: {
      five_hour: { used_percentage: 73, resets_at: now + 2 * 3600 + 15 * 60 },
      seven_day: { used_percentage: 18, resets_at: now + 4 * 86400 + 6 * 3600 },
    },
  };
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (raw += chunk));
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', () => resolve(raw));
  });
}

async function main() {
  if (has('-h', '--help')) return void process.stdout.write(HELP);
  if (has('-v', '--version')) return void process.stdout.write(version + '\n');
  // Reject typos up front, but never blank the live status line over one.
  if (unknownBars.length && command) {
    fail(new Error(`unknown --no-bar item "${unknownBars.join(',')}". Use ${BAR_ITEMS.join(', ')} or all.`));
  }
  if (unknownTheme && command) {
    fail(new Error(`unknown theme "${unknownTheme}". Use ${THEME_NAMES.join(', ')}.`));
  }

  switch (command) {
    case 'install': {
      try {
        const res = install({ scriptPath: __filename, args: styleFlags, force: has('--force') });
        process.stdout.write(
          `Status line installed in ${res.file}\n  command: ${res.command}\n` +
            (res.previous ? `  previous: ${JSON.stringify(res.previous)} (backup: settings.json.bak)\n` : '') +
            'It shows up after your next message in Claude Code.\n',
        );
      } catch (err) {
        fail(err);
      }
      return;
    }
    case 'uninstall': {
      try {
        const res = uninstall({ force: has('--force') });
        process.stdout.write(res.removed ? `Status line removed from ${res.file}\n` : 'No status line configured.\n');
      } catch (err) {
        fail(err);
      }
      return;
    }
    case 'preview':
      process.stdout.write(render(sample(), { ...renderOpts, branch: 'main' }) + '\n');
      return;
    case 'themes':
      process.stdout.write(
        THEME_NAMES.map((name) => `${name}\n${render(sample(), { ...renderOpts, theme: name, branch: 'main' })}\n`).join('\n') +
          '\nPick one with: claude-moodline install --theme=NAME\n',
      );
      return;
    case undefined:
      break;
    default:
      fail(new Error(`unknown command "${command}". Run claude-moodline --help.`));
  }

  // Run by hand in a terminal with nothing piped in: don't hang waiting on stdin.
  if (process.stdin.isTTY) return void process.stdout.write(HELP);

  let data = {};
  try {
    data = JSON.parse(await readStdin());
  } catch {
    // Render with defaults rather than leave the status line blank.
  }
  const dir = data?.workspace?.current_dir || data?.cwd || process.cwd();
  process.stdout.write(render(data, { ...renderOpts, branch: gitBranch(dir) }));
}

main();
