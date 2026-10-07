# claude-moodline

A status line for [Claude Code](https://claude.com/claude-code) that shows the model, reasoning effort, git
branch, context usage and your 5-hour / 7-day subscription usage — each as a colored bar with a mood face
that gets more worried as it fills up.

```
🤖 Opus 🏃 high  |  🌿 main  |  🧠 ctx ███░░░░░ 42% 🙂
⏱️ 5h ███████░░░ 73% 😅 ↻2h15m  |  📅 7d ██░░░░░░░░ 18% 😄 ↻4d6h
```

Bars are green below 70%, yellow from 70% and red from 90%. `↻` is the time until that limit resets.
Faces: 😄 under 40% · 🙂 under 70% · 😅 under 90% · 😱 at 90%+.
`🌿` is the current git branch (or short commit hash when detached); it's hidden outside a git repo.

When the terminal is too narrow, segments that don't fit move onto their own lines:

```
🤖 Opus 🏃 high  |  🌿 main
🧠 ctx ███░░░░░ 42% 🙂
⏱️ 5h ███████░░░ 73% 😅 ↻2h15m
📅 7d ██░░░░░░░░ 18% 😄 ↻4d6h
```

Works on Windows, macOS and Linux. No dependencies; needs Node.js 18+.

## Themes

Nine looks to pick from. `claude-moodline themes` prints a sample of each.

**mood** (default): emoji, block bars and faces that get more worried as usage fills up.

```
🤖 Opus 🏃 high  |  🌿 main  |  🧠 ctx ███░░░░░ 42% 🙂
⏱️ 5h ███████░░░ 73% 😅 ↻2h15m  |  📅 7d ██░░░░░░░░ 18% 😄 ↻4d6h
```

**minimal**: serious and quiet. No emoji or faces, thin line bars, and color only once usage passes 70%.

```
Opus · high  │  main  │  ctx ━━━───── 42%
5h ━━━━━━━─── 73% ↻2h15m  │  7d ━━──────── 18% ↻4d6h
```

**space**: a rocket, a satellite for the branch, moon phases for effort, star bars, and moods that go
from ✨ to 🌠 to ☄️ to 💥.

```
🚀 Opus 🌕 high  ⋆  🛰️ main  ⋆  🪐 ctx ✦✦✦····· 42% 🌠
🌍 5h ✦✦✦✦✦✦✦··· 73% ☄️ ↻2h15m  ⋆  🌌 7d ✦✦········ 18% ✨ ↻4d6h
```

**nature**: animals by speed for effort (🐌 low to 🦅 max), and moods that run through the seasons,
🌸 🍃 🍂, to a 🔥 wildfire.

```
🌳 Opus 🐇 high  ·  🌿 main  ·  🌻 ctx ▰▰▰▱▱▱▱▱ 42% 🍃
☀️ 5h ▰▰▰▰▰▰▰▱▱▱ 73% 🍂 ↻2h15m  ·  🌙 7d ▰▰▱▱▱▱▱▱▱▱ 18% 🌸 ↻4d6h
```

**jurassic**: effort grows from 🥚 to 🦖, bars are rock layers, and moods go from a calm 🌴 jungle
through 🌋 and 🔥 to the ☄️ asteroid.

```
🦖 Opus 🦎 high  ¦  🌿 main  ¦  🦴 ctx ▓▓▓░░░░░ 42% 🌋
👣 5h ▓▓▓▓▓▓▓░░░ 73% 🔥 ↻2h15m  ¦  🪨 7d ▓▓░░░░░░░░ 18% 🌴 ↻4d6h
```

**game**: context is the ❤️ health bar, effort is the difficulty (🟢 🟡 🟠 🔴 👾), and moods go
🏆 🎯 ⚠️ 💀.

```
🎮 Opus 🟠 high  ║  🗺️ main  ║  ❤️ ctx ■■■□□□□□ 42% 🎯
⚡ 5h ■■■■■■■□□□ 73% ⚠️ ↻2h15m  ║  🛡️ 7d ■■□□□□□□□□ 18% 🏆 ↻4d6h
```

**matrix**: green binary-rain bars, effort from the 🔵 blue pill through 🐇 and the 🔴 red pill to 🥋 and
the 😎 One, and moods that go 💚 📟, then a 🐈 déjà vu glitch, then the 🦑 Sentinels.

```
🕶️ Opus 🔴 high  ┆  🥄 main  ┆  💾 ctx 11100000 42% 📟
☎️ 5h 1111111000 73% 🐈 ↻2h15m  ┆  🌐 7d 1100000000 18% 💚 ↻4d6h
```

**one-piece**: the 🍖 meat bar is how full Luffy's context is, effort goes from a ⛵ dinghy to 👑 King of
the Pirates, and moods go 😁 🌊 🌀 to the ☠️ Jolly Roger.

```
👒 Opus ⚔️ high  ≈  🧭 main  ≈  🍖 ctx ●●●○○○○○ 42% 🌊
⚓ 5h ●●●●●●●○○○ 73% 🌀 ↻2h15m  ≈  🗺️ 7d ●●○○○○○○○○ 18% 😁 ↻4d6h
```

**god-of-war**: context is the 💢 Spartan Rage meter, effort follows the difficulty levels (📖 Give Me a
Story to ⚡ Give Me God of War), and moods march from 🌲 Midgard through ❄️ Fimbulwinter and 🔥 to 💀
Ragnarök.

```
🪓 Opus 🛡️ high  ‡  🌳 main  ‡  💢 ctx ▮▮▮▯▯▯▯▯ 42% ❄️
⏳ 5h ▮▮▮▮▮▮▮▯▯▯ 73% 🔥 ↻2h15m  ‡  🏛️ 7d ▮▮▯▯▯▯▯▯▯▯ 18% 🌲 ↻4d6h
```

Choose one when installing: `claude-moodline install --theme=minimal`. All themes support `--ascii`,
`--no-color` and `--no-bar`.

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
| `--theme=NAME` or `CLAUDE_MOODLINE_THEME=NAME` | The look: `mood` (default), `minimal`, `space`, `nature`, `jurassic`, `game`, `matrix`, `one-piece` or `god-of-war`. See [Themes](#themes). |
| `--ascii` or `CLAUDE_MOODLINE_ASCII=1` | Plain ASCII — no emoji or block characters. Use this if your terminal shows boxes or misaligned glyphs (e.g. the old Windows console host). |
| `--no-color` or `NO_COLOR` | No ANSI colors. |
| `--no-bar=ITEMS` or `CLAUDE_MOODLINE_NO_BAR=ITEMS` | Hide the progress bar for some items — a comma-separated list of `ctx`, `5h`, `7d`, or `all` (plain `--no-bar` means all). The percentage, face and reset time still show. |

Flags passed to `install` are saved into the command, e.g. `claude-moodline install --theme=space --ascii`.

With `--no-bar=5h,7d`:

```
🤖 Opus 🏃 high  |  🌿 main  |  🧠 ctx ███░░░░░ 42% 🙂
⏱️ 5h 73% 😅 ↻2h15m  |  📅 7d 18% 😄 ↻4d6h
```

```
Opus high  |  main  |  ctx ###----- 42% :)
5h #######--- 73% :S @2h15m  |  7d ##-------- 18% :D @4d6h
```

## Commands

```
claude-moodline install [--force] [--theme=NAME] [--ascii] [--no-color] [--no-bar[=ITEMS]]
claude-moodline uninstall [--force]
claude-moodline preview [--theme=NAME] [--ascii] [--no-color] [--no-bar[=ITEMS]]
claude-moodline themes [--ascii] [--no-color] [--no-bar[=ITEMS]]
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
