#!/usr/bin/env node
'use strict';

const { render } = require('../src/render.js');
const { install, uninstall, settingsPath } = require('../src/settings.js');
const { version } = require('../package.json');

const HELP = `claude-moodline ${version}
A Claude Code status line: model, effort, context and 5h/7d usage bars with mood faces.

Usage:
  claude-moodline install [--force] [--ascii] [--no-color]
                              Point Claude Code's statusLine at this package
  claude-moodline uninstall [--force]
                              Remove the statusLine entry
  claude-moodline preview [--ascii] [--no-color]
                              Print a sample status line
  claude-moodline [--ascii] [--no-color] < status.json
                              Render (this is what Claude Code runs)

Options:
  --ascii      Plain ASCII instead of emoji and block characters
  --no-color   No ANSI colors (also honoured: NO_COLOR env var)
  --force      Replace / remove a status line that isn't claude-moodline
  -h, --help   Show this help
  -v, --version

Env: CLAUDE_MOODLINE_ASCII=1 is the same as --ascii.
Settings file: ${settingsPath()}
`;

const argv = process.argv.slice(2);
const has = (...flags) => flags.some((f) => argv.includes(f));
const command = argv.find((a) => !a.startsWith('-'));

const renderOpts = {
  ascii: has('--ascii') || process.env.CLAUDE_MOODLINE_ASCII === '1',
  color: !has('--no-color') && !('NO_COLOR' in process.env),
};
// Flags to bake into the installed command, so the choice sticks.
const styleFlags = [renderOpts.ascii && '--ascii', has('--no-color') && '--no-color'].filter(Boolean);

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
      process.stdout.write(render(sample(), renderOpts) + '\n');
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
  process.stdout.write(render(data, renderOpts));
}

main();
