# ccstatusline

A modern, themed status line for [Claude Code](https://claude.com/claude-code) — 16 segments, 5 themes, an interactive Ink TUI for configuration, distributed as a Claude Code plugin.

```
⬢ Logisoft │ Opus 4.7 │ ▓▓▓░░ 47% 94K/200K │ $0.42 │ ↑12K ↓34K │  main* │ myapp
```

## Install

```bash
claude plugin marketplace add github:mohamadfala/ccstatusline
claude plugin install ccstatusline
/ccstatusline-setup
```

That's it. The setup command patches `~/.claude/settings.json` once and the status line appears on the next interaction.

## Configure

```
/ccstatusline-config
```

Opens an interactive TUI:

- Toggle segments on/off and reorder them
- Switch between 5 themes with live preview
- Edit the brand glyph and label

Config lives at `~/.config/ccstatusline/config.json` (Linux/macOS) or `%APPDATA%\ccstatusline\config.json` (Windows) and is hand-editable.

## Segments

| ID | What it shows |
|---|---|
| `logo` | Brand glyph + label (default `⬢ Logisoft`) |
| `model` | Active Claude model |
| `context` | Context % + raw token usage with progress bar |
| `cost` | Session cost in USD |
| `tokens` | Tokens in/out |
| `branch` | Git branch + dirty marker (cached) |
| `dir` | Working directory basename |
| `burn` | $/hour burn rate |
| `elapsed` | Session duration |
| `git_ahead` | Commits ahead/behind upstream (cached) |
| `output_style` | Active output style |
| `version` | Claude Code version + update warning (cached) |
| `todos` | TodoWrite progress |
| `time` | Local clock |
| `battery` | Laptop battery % (Mac/Win/Linux, cached) |
| `api_health` | Anthropic API reachability (cached) |
| `custom` | Run a user-defined shell command (cached) |

## Themes

| ID | Description |
|---|---|
| `minimalist` | Default — subtle separators, color tells meaning |
| `powerline` | Chevron arrows + color blocks (requires Powerline-patched font) |
| `pills` | Each segment in its own colored pill |
| `underline` | Accent underlines per segment (terminal-dependent) |
| `multiline` | Two-line dense layout |

## Adding a new segment

1. Create `src/segments/<id>.ts` exporting a `Segment` object.
2. Register it in `src/segments/index.ts`.
3. Add a test under `tests/segments/`.

That's the entire contract. Themes need no changes — they consume the abstract `Chunk[]` stream.

## Adding a new theme

1. Create `src/themes/<id>.ts` exporting a `Theme` object.
2. Register it in `src/themes/index.ts`.

## Architecture

Stateless per-tick Node binary spawned by Claude Code with JSON on stdin. Cheap segments compute fresh; expensive ones (git, network, version, battery) hit a TTL disk cache with stale-while-revalidate. The TUI imports the same render orchestrator the binary uses, so what you preview is what you get.

## Development

```bash
npm install
npm test           # 60 tests across segments, themes, render, TUI
npm run typecheck
npm run build
```

CI runs the matrix on macOS, Linux, and Windows × Node 20 and 22.

## License

MIT
