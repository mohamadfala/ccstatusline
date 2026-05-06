# ccstatusline — Design Spec

**Date:** 2026-05-06
**Owner:** mohamadfala
**Status:** Approved (brainstorming) — proceeding to implementation plan
**Repo:** https://github.com/mohamadfala/ccstatusline

---

## 1. Goals & non-goals

A Claude Code plugin that renders a customizable, modern, branded status line. Distributed via Claude Code's plugin system; written in TypeScript; Node-only runtime; cross-platform (macOS + Windows).

### In scope

- 16 segments (model, context %, session cost, tokens in/out, git branch + dirty, working directory, burn rate, session duration, git ahead/behind, output style, CC version + update warn, todos, clock, battery, API health, custom shell hook).
- 5 themes (Minimalist [default], Powerline, Pills, Accent underlines, Two-line dense), switchable at runtime via TUI.
- Customizable brand: glyph (default `⬢`) + label (default "Logisoft").
- Interactive Ink-based TUI as the front door for all configuration.
- JSON config file as source of truth at `~/.config/ccstatusline/config.json`.
- TTL disk cache for expensive segments.
- Setup command that patches `~/.claude/settings.json` to wire up the status line on first install.
- Distribution via `marketplace.json` so teammates run `claude plugin install`.

### Out of scope (explicit)

- npm publication.
- Additional runtimes (no Bun-specific build).
- Animated spinners, sound, telemetry, exportable theme files.
- Bundled "team-locked" config sync (each user has their own config; only the default brand ships with the plugin).
- Migrating existing `sirmalloc/ccstatusline` users.

---

## 2. System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code  ─── spawns each tick ──▶  bin/statusline (Node)   │
│      │                                            │             │
│      └──── pipes JSON to stdin                   │             │
│                                                   ▼             │
│                                  parseContext + loadConfig      │
│                                                   ▼             │
│                                  enabled segments .render()     │
│                                  cheap → fresh                  │
│                                  expensive → TTL disk cache ◀── ~/.cache/ccstatusline/
│                                                   ▼             │
│                                  active theme.format(chunks)    │
│                                                   ▼             │
│                                       ANSI line(s) → stdout     │
└─────────────────────────────────────────────────────────────────┘

Entry points (one package, three CLIs):
  bin/statusline.js   — per-tick renderer (CC spawns)
  bin/configure.js    — Ink TUI (slash command opens it)
  bin/setup.js        — one-shot installer for ~/.claude/settings.json
```

**Render mode:** Approach 2 (stateless binary + on-disk TTL cache). Stale-while-revalidate so a cache miss never blocks the render — segments fall back to a placeholder, then refresh asynchronously for the next tick.

**Per-tick budget target:** < 200ms cold start including all enabled segments on a typical Mac. Validated via a benchmark in CI.

---

## 3. Module structure

### Repo layout

```
ccstatusline/
├── .claude-plugin/
│   ├── plugin.json              # plugin manifest
│   ├── marketplace.json         # marketplace entry
│   └── settings.json            # ships subagentStatusLine config
├── commands/                    # slash commands (auto-discovered)
│   ├── ccstatusline-config.md   # opens TUI
│   └── ccstatusline-setup.md    # patches ~/.claude/settings.json
├── bin/
│   └── ccstatusline             # node shim → dist/bin/statusline.js
├── src/
│   ├── bin/
│   │   ├── statusline.ts        # per-tick renderer
│   │   ├── configure.ts         # TUI entry
│   │   └── setup.ts             # settings patcher
│   ├── core/
│   │   ├── context.ts           # parseStdin → StatusContext
│   │   ├── config.ts            # zod schema, load/save, defaults, migrations
│   │   ├── cache.ts             # TTL disk cache (stale-while-revalidate)
│   │   └── ansi.ts              # color helpers, truecolor + 256 fallback
│   ├── segments/
│   │   ├── index.ts             # registry: { id → Segment }
│   │   ├── types.ts             # Segment, Chunk, SegmentKind
│   │   └── <16 segment modules>.ts
│   ├── themes/
│   │   ├── index.ts             # registry: { id → Theme }
│   │   ├── types.ts             # Theme, ThemeContext
│   │   └── <5 theme modules>.ts
│   ├── tui/
│   │   ├── App.tsx              # Ink root + router
│   │   ├── screens/
│   │   │   ├── Home.tsx
│   │   │   ├── Segments.tsx     # toggle + reorder
│   │   │   ├── Theme.tsx        # pick theme + live preview
│   │   │   ├── Brand.tsx        # glyph + label
│   │   │   └── Preview.tsx
│   │   └── components/LivePreview.tsx
│   └── render.ts                # orchestrator: ctx + config → string
├── tests/
│   ├── segments/*.test.ts
│   ├── themes/*.test.ts
│   ├── render.test.ts
│   └── fixtures/sample-stdin.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── LICENSE
```

### Segment interface

```ts
export type SegmentKind =
  | "logo" | "model" | "metric"
  | "good" | "warn" | "bad"
  | "muted" | "accent" | "raw";

export interface Chunk {
  text: string;       // displayed text (no ANSI)
  kind: SegmentKind;  // tells the theme how to color/decorate
  raw?: string;       // optional pre-styled override (escape hatch)
}

export interface Segment {
  id: string;                                // stable config key
  label: string;                             // TUI display name
  group: "core" | "git" | "session" | "system" | "custom";
  cost: "cheap" | "expensive";
  ttl?: number;                              // ms; required if expensive
  defaults?: Record<string, unknown>;        // per-segment options
  render(ctx: StatusContext, opts: SegmentOpts):
    Chunk | Chunk[] | null;                  // null = "skip this tick"
}
```

### Theme interface

```ts
export interface ThemeContext {
  terminalWidth: number;
  truecolor: boolean;       // detected from $COLORTERM
  brand: BrandConfig;
}

export interface Theme {
  id: string;
  name: string;
  multiline: boolean;
  format(chunks: Chunk[], tctx: ThemeContext): string;
}
```

### Extensibility contract

- **Add a segment:** create one file in `src/segments/`, register it in `segments/index.ts`. TUI lists it automatically; all themes render it without changes.
- **Add a theme:** create one file in `src/themes/`, register it in `themes/index.ts`. TUI lists it automatically.
- **Themes never know specific segment IDs.** They operate on the abstract `Chunk[]` stream and color by `Chunk.kind`. This is what lets all 5 themes coexist cleanly while remaining trivial to extend.

---

## 4. Configuration model

### Source of truth

Single JSON file at `~/.config/ccstatusline/config.json` (Linux/macOS) or `%APPDATA%\ccstatusline\config.json` (Windows). Validated with `zod` on every load.

### Schema

```ts
{
  "$schema": "https://github.com/mohamadfala/ccstatusline/schema.json",
  "version": 1,
  "brand": {
    "glyph": "⬢",
    "label": "Logisoft",
    "color": "indigo"          // or hex, "auto" = theme-driven
  },
  "theme": "minimalist",        // one of the 5 theme ids
  "segments": [                 // ordered list of enabled segments
    { "id": "logo" },
    { "id": "model" },
    { "id": "context", "options": { "showRaw": true } },
    { "id": "cost" },
    { "id": "tokens" },
    { "id": "branch", "options": { "showDirty": true } },
    { "id": "dir" }
  ],
  "refresh": {
    "intervalSeconds": 5         // written into ~/.claude/settings.json by setup
  },
  "cache": {
    "dir": null,                 // null → OS default cache dir
    "git": { "ttlMs": 2000 },
    "apiHealth": { "ttlMs": 30000 },
    "version": { "ttlMs": 3600000 }
  }
}
```

### Defaults

A `DEFAULT_CONFIG` constant in `src/core/config.ts` is the single source. On first run, if no config file exists, the renderer uses defaults in-memory and the TUI offers to write the file. The TUI is the only writer; the renderer is read-only.

### Layered resolution

```
DEFAULT_CONFIG  ←  user config file  ←  per-segment options
```

Missing file → defaults. Corrupt file → log to stderr, fall back to defaults, render anyway (never crash CC's status line).

---

## 5. TUI design

### Invocation

- Slash command `/ccstatusline-config` opens the TUI inside Claude Code's terminal (Ink renders into a child process the slash command spawns).
- Direct CLI `ccstatusline configure` works the same way outside CC.

### Screen flow

```
Home
 ├─ Segments    → toggle on/off, reorder (j/k or arrows), per-segment options
 ├─ Theme       → cycle through 5 themes with live preview using sample data
 ├─ Brand       → edit glyph + label + color
 ├─ Preview     → render current config against a fixture, full-width
 └─ Save & quit → writes config.json + offers to refresh refreshInterval
```

### Live preview

The TUI imports `src/render.ts` directly and renders the same orchestrator with a fixture stdin payload. Whatever you see in preview is exactly what CC will render — no duplication.

### Keybindings (consistent across screens)

- `↑ / ↓` or `j / k` — move
- `space` — toggle
- `enter` — drill in
- `esc` or `q` — back / quit
- `s` — save (or auto-save with debounced write)
- `?` — help overlay

---

## 6. Plugin manifest & install flow

### `.claude-plugin/plugin.json`

```json
{
  "name": "ccstatusline",
  "displayName": "CC Status Line",
  "version": "0.1.0",
  "description": "Modern, themed status line for Claude Code with team branding",
  "author": "mohamadfala",
  "homepage": "https://github.com/mohamadfala/ccstatusline",
  "commands": ["ccstatusline-config", "ccstatusline-setup"],
  "bin": {
    "ccstatusline": "bin/ccstatusline"
  }
}
```

### `.claude-plugin/marketplace.json`

```json
{
  "name": "mohamadfala-marketplace",
  "plugins": [
    {
      "name": "ccstatusline",
      "source": "github:mohamadfala/ccstatusline"
    }
  ]
}
```

### `.claude-plugin/settings.json` (plugin-level)

```json
{
  "subagentStatusLine": {
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/bin/ccstatusline"
  }
}
```

(Subagent status line is settable from a plugin — main statusLine is not, hence the setup command.)

### Install flow

1. `claude plugin install ccstatusline@mohamadfala-marketplace` — downloads the plugin to `~/.claude/plugins/ccstatusline/`.
2. Plugin discovers `commands/ccstatusline-setup.md` and `commands/ccstatusline-config.md`.
3. User runs `/ccstatusline-setup` once. The setup script:
   - Detects the plugin's absolute path on disk.
   - Reads `~/.claude/settings.json` (creating empty if missing).
   - Adds (or replaces) the `statusLine` block:
     ```json
     "statusLine": {
       "type": "command",
       "command": "node /Users/<user>/.claude/plugins/ccstatusline/dist/bin/statusline.js",
       "refreshInterval": 5,
       "padding": 1
     }
     ```
   - Backs up the previous file to `settings.json.bak-<timestamp>`.
4. User runs `/ccstatusline-config` to launch the TUI and customize.

The setup command is idempotent — running it again replaces the existing block (preserving other settings) and creates a new backup.

### Build artifacts

The repo's CI builds TS → JS into `dist/` and commits the build to a `release` branch (or alternatively, the install path clones the source and runs `npm install && npm run build` during plugin installation — to be decided in the implementation plan).

---

## 7. Cross-platform considerations

| Concern | macOS / Linux | Windows |
|---|---|---|
| Config dir | `~/.config/ccstatusline/` | `%APPDATA%\ccstatusline\` |
| Cache dir | `~/.cache/ccstatusline/` | `%LOCALAPPDATA%\ccstatusline\Cache\` |
| Settings path | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` |
| Battery | `pmset -g batt` (parsed) | WMI via `systeminformation` npm pkg |
| Git branch | `git rev-parse --abbrev-ref HEAD` | same; uses `child_process.spawn` |
| Truecolor detection | `$COLORTERM` | `$WT_SESSION` (Windows Terminal) or fallback |
| Path resolution | Use `path` + `os.homedir()` everywhere — no hardcoded slashes |

Use the [`env-paths`](https://www.npmjs.com/package/env-paths) npm package for OS-correct config + cache dirs to keep this trivial.

---

## 8. Caching layer

`src/core/cache.ts` exposes:

```ts
async function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<{ value: T; stale: boolean }>;
```

- File location: `<cacheDir>/<sha1(key)>.json`.
- File contents: `{ value, computedAt }`.
- Stale-while-revalidate: if `now - computedAt > ttl` but file exists, return the stale value immediately AND fire-and-forget the recompute (writes for next tick). If file missing, return `null` and recompute synchronously (one-time penalty).
- Cache wipe: `ccstatusline cache clear` subcommand.

### What's cached

| Segment | TTL | Reason |
|---|---|---|
| `branch`, `git_ahead` | 2000 ms | Git status is the most expensive thing per tick |
| `version` | 3 600 000 ms (1h) | Update check via npm registry / GitHub releases API |
| `api-health` | 30 000 ms | HEAD against api.anthropic.com |
| `battery` | 5 000 ms | Battery rarely changes that fast |

Everything else recomputes per tick from CC's stdin or local clock.

---

## 9. Error handling

The single hard rule: **the renderer never throws to CC's stdout.** A crashing status line breaks the user's experience.

- All segment `render()` calls are wrapped in try/catch. A throwing segment is replaced with a `muted` chunk showing `⚠ <id>`.
- Unhandled exceptions at the top of `bin/statusline.ts` print a minimal fallback line (`⬢ Logisoft  (status error)`) and exit 0.
- A `--debug` env var (`CCSL_DEBUG=1`) emits stderr diagnostics, never stdout.
- Setup command validates JSON before writing and refuses to write if it can't parse the existing file (forces the user to fix it manually rather than silently overwriting).

---

## 10. Testing strategy

- **Unit tests (Vitest):** every segment + every theme. Segments get fixture stdin payloads + assertion on the produced `Chunk[]`. Themes get fixture `Chunk[]` + snapshot tests on the rendered ANSI string.
- **Integration:** `tests/render.test.ts` runs the full orchestrator against `tests/fixtures/sample-stdin.json` for each (theme × segment-set) combination, snapshotted.
- **Cross-platform:** GitHub Actions matrix on `ubuntu-latest` + `macos-latest` + `windows-latest`. Skip Windows-specific battery test on non-Windows runners.
- **Perf benchmark:** one Vitest benchmark that measures cold-start + render time. Fails CI if > 250ms on macOS runner.
- **TUI:** smoke test that imports `App.tsx` with `ink-testing-library` and asserts initial screen renders without throwing. Full TUI flows are manual.

Coverage target: **80%+** on `src/segments/` and `src/themes/`. TUI is exempted (Ink is hard to unit-test exhaustively).

---

## 11. Open questions deferred to implementation plan

1. **Build & distribution mechanics:** ship pre-built `dist/` in the repo vs build-on-install. Affects install latency and repo cleanliness. Default leaning: ship pre-built `dist/` from a `release` branch via a GitHub Action; main branch stays clean.
2. **Update notifications:** how the `version` segment detects "new CC version available" — npm registry vs GitHub releases vs CC's own API. To investigate during implementation.
3. **Slash command markdown bodies:** the `commands/*.md` files need to be defined (which trigger phrases route through Claude vs invoke the binary directly).

These are deliberately deferred — they don't change the architecture, only impl detail.

---

## 12. Success criteria

- [ ] `claude plugin install ccstatusline@mohamadfala-marketplace` works end-to-end on a fresh Mac.
- [ ] Same install works on Windows 11.
- [ ] `/ccstatusline-setup` patches `~/.claude/settings.json` once and is idempotent.
- [ ] `/ccstatusline-config` opens an Ink TUI; toggling a segment + saving updates the live status line on the next tick.
- [ ] All 16 segments render correctly given the CC stdin contract.
- [ ] All 5 themes render the same fixture set and pass snapshot tests.
- [ ] Cold-start render < 250ms on macOS in CI.
- [ ] Renderer never crashes CC: any thrown exception → fallback line, exit 0.
- [ ] README documents install, configure, troubleshoot, and "add a new segment" walkthroughs.
