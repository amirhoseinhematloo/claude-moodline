# claude-moodline

A status line for [Claude Code](https://claude.com/claude-code) that shows the model, reasoning effort,
context usage and your 5-hour / 7-day subscription usage — each as a colored bar with a mood face
that gets more worried as it fills up.

```
🤖 Opus 🏃 high  |  🧠 ctx ███░░░░░ 42% 🙂
⏱️ 5h ███████░░░ 73% 😅 ↻2h15m  |  📅 7d ██░░░░░░░░ 18% 😄 ↻4d6h
```

Bars are green below 70%, yellow from 70% and red from 90%. `↻` is the time until that limit resets.
Faces: 😄 under 40% · 🙂 under 70% · 😅 under 90% · 😱 at 90%+.

Works on Windows, macOS and Linux. No dependencies; needs Node.js 18+.

## Install

```sh
npm install -g claude-moodline
claude-moodline install
```

`install` adds a `statusLine` entry to your Claude Code user settings (`~/.claude/settings.json`, or
`$CLAUDE_CONFIG_DIR/settings.json`), keeping everything else and writing a `settings.json.bak` first.
The status line appears after your next message.

If you already have a different status line, `install` won't touch it unless you pass `--force`.

Prefer not to install globally? `npx claude-moodline install` works too, and sets the status line to
run through `npx` (a little slower on each refresh).

### Manual setup

Add this to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-moodline",
    "refreshInterval": 60
  }
}
```

## Options

| Flag / env | Effect |
|---|---|
| `--ascii` or `CLAUDE_MOODLINE_ASCII=1` | Plain ASCII — no emoji or block characters. Use this if your terminal shows boxes or misaligned glyphs (e.g. the old Windows console host). |
| `--no-color` or `NO_COLOR` | No ANSI colors. |

Flags passed to `install` are saved into the command, e.g. `claude-moodline install --ascii`.

```
Opus high  |  ctx ###----- 42% :)
5h #######--- 73% :S @2h15m  |  7d ##-------- 18% :D @4d6h
```

## Commands

```
claude-moodline install [--force] [--ascii] [--no-color]
claude-moodline uninstall [--force]
claude-moodline preview [--ascii] [--no-color]
claude-moodline --help | --version
```

Run with JSON on stdin (what Claude Code does), it prints the status line.

## Notes

- The usage bars only appear for Claude subscription plans, once Claude Code has received its first
  reply in a session; until then the second line says *waiting for first reply*.
- After upgrading Node or moving your global npm prefix, run `claude-moodline install` again so the
  saved path is current.

## Uninstall

```sh
claude-moodline uninstall
npm uninstall -g claude-moodline
```

## License

MIT
