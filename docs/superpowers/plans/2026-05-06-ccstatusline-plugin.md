# ccstatusline Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin that renders a customizable, themed status line with 16 segments and 5 themes, configurable through an Ink TUI, distributed via `claude plugin install`.

**Architecture:** Stateless per-tick Node binary spawned by Claude Code with JSON on stdin. Cheap segments compute fresh; expensive ones (git, network, version) hit a TTL disk cache (stale-while-revalidate). All segments register in one map; all themes in another. The TUI imports the same render orchestrator the binary uses, so what you preview is what you get.

**Tech Stack:** TypeScript (strict), Node ≥ 20, Vitest, Zod, Ink + React (TUI only), env-paths (cross-platform dirs), no extra color library (hand-rolled ANSI). Build via `tsc` to `dist/`.

**Spec:** `docs/superpowers/specs/2026-05-06-ccstatusline-plugin-design.md`

---

## File Structure

```
ccstatusline/
├── .claude-plugin/
│   ├── plugin.json
│   ├── marketplace.json
│   └── settings.json
├── commands/
│   ├── ccstatusline-config.md
│   └── ccstatusline-setup.md
├── bin/ccstatusline                          # node shim
├── src/
│   ├── bin/{statusline,configure,setup}.ts
│   ├── core/{context,config,cache,ansi,paths}.ts
│   ├── segments/{index,types}.ts + 16 segment files
│   ├── themes/{index,types}.ts + 5 theme files
│   ├── tui/{App.tsx, screens/*, components/*}
│   └── render.ts
├── tests/{segments,themes}/*.test.ts + render.test.ts + fixtures/
├── package.json, tsconfig.json, vitest.config.ts
├── .github/workflows/ci.yml
└── README.md
```

Each file has one responsibility. Segments and themes are isolated by file. The TUI is the only consumer of React/Ink — keeps the renderer's cold start fast.

---

## Task 1: Initialize Node project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.gitattributes`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "ccstatusline",
  "version": "0.1.0",
  "description": "Modern, themed status line for Claude Code",
  "type": "module",
  "engines": { "node": ">=20" },
  "bin": { "ccstatusline": "bin/ccstatusline" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "statusline": "node dist/bin/statusline.js",
    "configure": "node dist/bin/configure.js",
    "setup": "node dist/bin/setup.js"
  },
  "dependencies": {
    "env-paths": "^3.0.0",
    "ink": "^5.0.1",
    "ink-select-input": "^6.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.3.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "ink-testing-library": "^4.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "declaration": false,
    "sourceMap": false,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: { include: ["src/segments/**", "src/themes/**", "src/core/**"], thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } }
  }
});
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
dist/
coverage/
.DS_Store
*.log
.env
.env.*
!.env.example
.vitest-cache/
```

- [ ] **Step 5: Write `.gitattributes`**

```
* text=auto eol=lf
*.cmd text eol=crlf
*.ps1 text eol=crlf
```

- [ ] **Step 6: Install + commit**

```bash
cd /Users/mohamadfala/Projects/ccstatusline
npm install
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore .gitattributes
git commit -m "chore: initialize Node + TS project skeleton"
```

Expected: `npm install` finishes; `git status` clean.

---

## Task 2: Add CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions matrix (mac/linux/windows × node 20/22)"
```

---

## Task 3: Define core types

**Files:**
- Create: `src/segments/types.ts`
- Create: `src/themes/types.ts`
- Create: `src/core/context.ts` (types only in this task)

- [ ] **Step 1: Write segment types**

`src/segments/types.ts`:
```ts
import type { StatusContext } from "../core/context.js";

export type SegmentKind =
  | "logo"
  | "model"
  | "metric"
  | "good"
  | "warn"
  | "bad"
  | "muted"
  | "accent";

export interface Chunk {
  text: string;
  kind: SegmentKind;
  raw?: string;
}

export type SegmentOpts = Record<string, unknown>;

export interface Segment {
  id: string;
  label: string;
  group: "core" | "git" | "session" | "system" | "custom";
  cost: "cheap" | "expensive";
  ttl?: number;
  defaults?: SegmentOpts;
  render(
    ctx: StatusContext,
    opts: SegmentOpts
  ): Chunk | Chunk[] | null | Promise<Chunk | Chunk[] | null>;
}
```

- [ ] **Step 2: Write theme types**

`src/themes/types.ts`:
```ts
import type { Chunk } from "../segments/types.js";

export interface BrandConfig {
  glyph: string;
  label: string;
  color: string;
}

export interface ThemeContext {
  terminalWidth: number;
  truecolor: boolean;
  brand: BrandConfig;
}

export interface Theme {
  id: string;
  name: string;
  multiline: boolean;
  format(chunks: Chunk[], tctx: ThemeContext): string;
}
```

- [ ] **Step 3: Write context types**

`src/core/context.ts`:
```ts
export interface ClaudeStdinPayload {
  cwd?: string;
  session_id?: string;
  session_name?: string;
  transcript_path?: string;
  version?: string;
  model?: { id?: string; display_name?: string };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
    added_dirs?: string[];
    git_worktree?: string;
  };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    used_percentage?: number;
    remaining_percentage?: number;
  };
  output_style?: { name?: string };
  effort?: { level?: string };
  thinking?: { enabled?: boolean };
  exceeds_200k_tokens?: boolean;
  worktree?: {
    name?: string;
    path?: string;
    branch?: string;
    original_cwd?: string;
    original_branch?: string;
  };
}

export interface StatusContext {
  raw: ClaudeStdinPayload;
  cwd: string;
  model: { id: string; displayName: string };
  cost: { totalUsd: number; durationMs: number; apiDurationMs: number };
  ctx: {
    used: number;
    total: number;
    pct: number;
    remainingPct: number;
    inputTokens: number;
    outputTokens: number;
  };
  outputStyle?: string;
  version?: string;
  worktree?: { name: string; branch?: string };
  sessionId?: string;
  startedAt: number; // epoch ms; derived from durationMs
}

export function parseStdin(json: string): StatusContext {
  let raw: ClaudeStdinPayload = {};
  try {
    raw = JSON.parse(json) as ClaudeStdinPayload;
  } catch {
    raw = {};
  }
  const totalDuration = raw.cost?.total_duration_ms ?? 0;
  return {
    raw,
    cwd: raw.workspace?.current_dir ?? raw.cwd ?? process.cwd(),
    model: {
      id: raw.model?.id ?? "unknown",
      displayName: raw.model?.display_name ?? "Claude"
    },
    cost: {
      totalUsd: raw.cost?.total_cost_usd ?? 0,
      durationMs: totalDuration,
      apiDurationMs: raw.cost?.total_api_duration_ms ?? 0
    },
    ctx: {
      used: raw.context_window?.total_input_tokens ?? 0,
      total: raw.context_window?.context_window_size ?? 200_000,
      pct: raw.context_window?.used_percentage ?? 0,
      remainingPct: raw.context_window?.remaining_percentage ?? 100,
      inputTokens: raw.context_window?.total_input_tokens ?? 0,
      outputTokens: raw.context_window?.total_output_tokens ?? 0
    },
    outputStyle: raw.output_style?.name,
    version: raw.version,
    worktree: raw.worktree?.name
      ? { name: raw.worktree.name, branch: raw.worktree.branch }
      : raw.workspace?.git_worktree
        ? { name: raw.workspace.git_worktree }
        : undefined,
    sessionId: raw.session_id,
    startedAt: Date.now() - totalDuration
  };
}
```

- [ ] **Step 4: Write fixture for tests**

`tests/fixtures/sample-stdin.json`:
```json
{
  "cwd": "/Users/dev/projects/myapp",
  "session_id": "abc123",
  "version": "2.1.97",
  "model": { "id": "claude-opus-4-7", "display_name": "Opus 4.7" },
  "workspace": {
    "current_dir": "/Users/dev/projects/myapp",
    "project_dir": "/Users/dev/projects/myapp",
    "added_dirs": []
  },
  "cost": {
    "total_cost_usd": 0.4234,
    "total_duration_ms": 1380000,
    "total_api_duration_ms": 145000,
    "total_lines_added": 142,
    "total_lines_removed": 38
  },
  "context_window": {
    "total_input_tokens": 12300,
    "total_output_tokens": 34500,
    "context_window_size": 200000,
    "used_percentage": 47,
    "remaining_percentage": 53
  },
  "output_style": { "name": "default" }
}
```

- [ ] **Step 2: Write failing test**

`tests/core/context.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseStdin } from "../../src/core/context.js";

const fixture = readFileSync("tests/fixtures/sample-stdin.json", "utf8");

describe("parseStdin", () => {
  it("parses sample CC payload", () => {
    const c = parseStdin(fixture);
    expect(c.model.displayName).toBe("Opus 4.7");
    expect(c.cost.totalUsd).toBeCloseTo(0.4234);
    expect(c.ctx.pct).toBe(47);
    expect(c.ctx.inputTokens).toBe(12300);
    expect(c.outputStyle).toBe("default");
    expect(c.cwd).toBe("/Users/dev/projects/myapp");
  });

  it("returns sane defaults for empty input", () => {
    const c = parseStdin("");
    expect(c.model.displayName).toBe("Claude");
    expect(c.ctx.total).toBe(200_000);
    expect(c.cost.totalUsd).toBe(0);
  });

  it("survives malformed JSON", () => {
    const c = parseStdin("not json{");
    expect(c.model.displayName).toBe("Claude");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/core/context.test.ts
```

Expected: PASS (3/3).

- [ ] **Step 4: Commit**

```bash
git add src/segments/types.ts src/themes/types.ts src/core/context.ts tests/core/context.test.ts tests/fixtures/sample-stdin.json
git commit -m "feat(core): add core types and stdin parser"
```

---

## Task 4: Config schema, paths, load/save

**Files:**
- Create: `src/core/paths.ts`
- Create: `src/core/config.ts`
- Create: `tests/core/config.test.ts`

- [ ] **Step 1: Write paths helper**

`src/core/paths.ts`:
```ts
import envPaths from "env-paths";
import { homedir } from "node:os";
import { join } from "node:path";

const paths = envPaths("ccstatusline", { suffix: "" });

export const CONFIG_DIR = paths.config;
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const CACHE_DIR = paths.cache;
export const CC_SETTINGS_FILE = join(homedir(), ".claude", "settings.json");
```

- [ ] **Step 2: Write config schema + IO**

`src/core/config.ts`:
```ts
import { z } from "zod";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG_DIR, CONFIG_FILE } from "./paths.js";

export const BrandSchema = z.object({
  glyph: z.string().default("⬢"),
  label: z.string().default("Logisoft"),
  color: z.string().default("indigo")
});

export const SegmentEntrySchema = z.object({
  id: z.string(),
  options: z.record(z.unknown()).default({})
});

export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  brand: BrandSchema.default({}),
  theme: z.string().default("minimalist"),
  segments: z.array(SegmentEntrySchema).default([
    { id: "logo", options: {} },
    { id: "model", options: {} },
    { id: "context", options: {} },
    { id: "cost", options: {} },
    { id: "tokens", options: {} },
    { id: "branch", options: {} },
    { id: "dir", options: {} }
  ]),
  refresh: z.object({ intervalSeconds: z.number().int().min(1).default(5) }).default({}),
  cache: z
    .object({
      dir: z.string().nullable().default(null),
      git: z.object({ ttlMs: z.number().int().min(0).default(2000) }).default({}),
      apiHealth: z.object({ ttlMs: z.number().int().min(0).default(30_000) }).default({}),
      version: z.object({ ttlMs: z.number().int().min(0).default(3_600_000) }).default({}),
      battery: z.object({ ttlMs: z.number().int().min(0).default(5_000) }).default({})
    })
    .default({})
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = ConfigSchema.parse({});

export function loadConfig(file = CONFIG_FILE): Config {
  try {
    const raw = readFileSync(file, "utf8");
    const json = JSON.parse(raw);
    return ConfigSchema.parse(json);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_CONFIG;
    process.stderr.write(`[ccstatusline] config load failed, using defaults: ${(err as Error).message}\n`);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config, file = CONFIG_FILE): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export { CONFIG_DIR, CONFIG_FILE };
```

- [ ] **Step 3: Write tests**

`tests/core/config.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, DEFAULT_CONFIG, ConfigSchema } from "../../src/core/config.js";

const makeTmp = () => mkdtempSync(join(tmpdir(), "ccsl-"));

describe("config", () => {
  it("returns defaults when file missing", () => {
    const dir = makeTmp();
    const c = loadConfig(join(dir, "missing.json"));
    expect(c.theme).toBe("minimalist");
    expect(c.brand.glyph).toBe("⬢");
    expect(c.segments).toHaveLength(7);
    rmSync(dir, { recursive: true });
  });

  it("returns defaults when file is corrupt", () => {
    const dir = makeTmp();
    const file = join(dir, "config.json");
    writeFileSync(file, "{not json", "utf8");
    const c = loadConfig(file);
    expect(c).toEqual(DEFAULT_CONFIG);
    rmSync(dir, { recursive: true });
  });

  it("round-trips", () => {
    const dir = makeTmp();
    const file = join(dir, "config.json");
    const next = ConfigSchema.parse({ ...DEFAULT_CONFIG, theme: "pills", brand: { glyph: "◆", label: "Acme", color: "red" } });
    saveConfig(next, file);
    const loaded = loadConfig(file);
    expect(loaded.theme).toBe("pills");
    expect(loaded.brand.label).toBe("Acme");
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/core/config.test.ts
```

Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/core/paths.ts src/core/config.ts tests/core/config.test.ts
git commit -m "feat(core): add config schema, paths, load/save"
```

---

## Task 5: TTL disk cache (stale-while-revalidate)

**Files:**
- Create: `src/core/cache.ts`
- Create: `tests/core/cache.test.ts`

- [ ] **Step 1: Write cache module**

`src/core/cache.ts`:
```ts
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR } from "./paths.js";

export interface CacheResult<T> {
  value: T | null;
  stale: boolean;
}

interface Entry<T> {
  value: T;
  computedAt: number;
}

const inflight = new Map<string, Promise<unknown>>();

export function cacheKey(key: string): string {
  return createHash("sha1").update(key).digest("hex").slice(0, 16);
}

export function readCache<T>(key: string, dir = CACHE_DIR): Entry<T> | null {
  try {
    const file = join(dir, cacheKey(key) + ".json");
    return JSON.parse(readFileSync(file, "utf8")) as Entry<T>;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T, dir = CACHE_DIR): void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, cacheKey(key) + ".json");
  writeFileSync(file, JSON.stringify({ value, computedAt: Date.now() }), "utf8");
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
  opts: { dir?: string; now?: () => number } = {}
): Promise<CacheResult<T>> {
  const dir = opts.dir ?? CACHE_DIR;
  const now = opts.now ?? (() => Date.now());
  const entry = readCache<T>(key, dir);
  if (entry && now() - entry.computedAt <= ttlMs) {
    return { value: entry.value, stale: false };
  }
  if (entry) {
    if (!inflight.has(key)) {
      inflight.set(
        key,
        compute()
          .then((v) => writeCache<T>(key, v, dir))
          .catch(() => undefined)
          .finally(() => inflight.delete(key))
      );
    }
    return { value: entry.value, stale: true };
  }
  try {
    const value = await compute();
    writeCache<T>(key, value, dir);
    return { value, stale: false };
  } catch {
    return { value: null, stale: true };
  }
}
```

- [ ] **Step 2: Write tests**

`tests/core/cache.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cached } from "../../src/core/cache.js";

const makeTmp = () => mkdtempSync(join(tmpdir(), "ccsl-cache-"));

describe("cached", () => {
  it("returns fresh value on first call", async () => {
    const dir = makeTmp();
    const r = await cached("k1", 1000, async () => "hello", { dir });
    expect(r.value).toBe("hello");
    expect(r.stale).toBe(false);
    rmSync(dir, { recursive: true });
  });

  it("returns cached value within ttl", async () => {
    const dir = makeTmp();
    let calls = 0;
    const compute = async () => {
      calls++;
      return calls;
    };
    const r1 = await cached("k2", 1000, compute, { dir });
    const r2 = await cached("k2", 1000, compute, { dir });
    expect(r1.value).toBe(1);
    expect(r2.value).toBe(1);
    expect(calls).toBe(1);
    rmSync(dir, { recursive: true });
  });

  it("returns stale value past ttl and triggers refresh", async () => {
    const dir = makeTmp();
    let t = 1000;
    const now = () => t;
    let calls = 0;
    const compute = async () => ++calls;
    await cached("k3", 100, compute, { dir, now });
    t = 5000;
    const r = await cached("k3", 100, compute, { dir, now });
    expect(r.value).toBe(1);
    expect(r.stale).toBe(true);
    await new Promise((r) => setTimeout(r, 30));
    rmSync(dir, { recursive: true });
  });

  it("returns null + stale when no cache and compute throws", async () => {
    const dir = makeTmp();
    const r = await cached(
      "k4",
      1000,
      async () => {
        throw new Error("boom");
      },
      { dir }
    );
    expect(r.value).toBeNull();
    expect(r.stale).toBe(true);
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/core/cache.test.ts
```

Expected: PASS (4/4).

- [ ] **Step 4: Commit**

```bash
git add src/core/cache.ts tests/core/cache.test.ts
git commit -m "feat(core): add TTL disk cache with stale-while-revalidate"
```

---

## Task 6: ANSI helpers

**Files:**
- Create: `src/core/ansi.ts`
- Create: `tests/core/ansi.test.ts`

- [ ] **Step 1: Write ANSI module**

`src/core/ansi.ts`:
```ts
import type { SegmentKind } from "../segments/types.js";

const ESC = "\x1b";
export const RESET = `${ESC}[0m`;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const PALETTE: Record<SegmentKind, RGB> = {
  logo: { r: 165, g: 180, b: 252 },
  model: { r: 147, g: 197, b: 253 },
  metric: { r: 229, g: 231, b: 235 },
  good: { r: 134, g: 239, b: 172 },
  warn: { r: 252, g: 211, b: 77 },
  bad: { r: 248, g: 113, b: 113 },
  muted: { r: 107, g: 114, b: 128 },
  accent: { r: 249, g: 168, b: 212 }
};

export function detectTruecolor(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR) return false;
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") return true;
  if (env.WT_SESSION) return true; // Windows Terminal
  if (env.TERM_PROGRAM === "iTerm.app" || env.TERM_PROGRAM === "vscode" || env.TERM_PROGRAM === "WezTerm") return true;
  return false;
}

export function fg({ r, g, b }: RGB, truecolor: boolean): string {
  if (!truecolor) {
    const code = rgbTo256(r, g, b);
    return `${ESC}[38;5;${code}m`;
  }
  return `${ESC}[38;2;${r};${g};${b}m`;
}

export function bg({ r, g, b }: RGB, truecolor: boolean): string {
  if (!truecolor) {
    const code = rgbTo256(r, g, b);
    return `${ESC}[48;5;${code}m`;
  }
  return `${ESC}[48;2;${r};${g};${b}m`;
}

export function bold(s: string): string {
  return `${ESC}[1m${s}${ESC}[22m`;
}

export function underline(s: string): string {
  return `${ESC}[4m${s}${ESC}[24m`;
}

export function colorize(text: string, kind: SegmentKind, truecolor: boolean): string {
  const c = PALETTE[kind];
  return `${fg(c, truecolor)}${text}${RESET}`;
}

function rgbTo256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return 16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((g / 255) * 5) + Math.round((b / 255) * 5);
}

export function visibleLength(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

export function terminalWidth(env: NodeJS.ProcessEnv = process.env): number {
  if (process.stdout && typeof process.stdout.columns === "number" && process.stdout.columns > 0) {
    return process.stdout.columns;
  }
  const c = parseInt(env.COLUMNS ?? "", 10);
  return Number.isFinite(c) && c > 0 ? c : 120;
}
```

- [ ] **Step 2: Write tests**

`tests/core/ansi.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { colorize, detectTruecolor, fg, RESET, visibleLength } from "../../src/core/ansi.js";

describe("ansi", () => {
  it("emits truecolor escape when supported", () => {
    const s = colorize("hi", "good", true);
    expect(s).toContain("\x1b[38;2;134;239;172m");
    expect(s.endsWith(RESET)).toBe(true);
  });

  it("falls back to 256-color", () => {
    const s = colorize("hi", "warn", false);
    expect(s).toContain("\x1b[38;5;");
  });

  it("respects NO_COLOR", () => {
    expect(detectTruecolor({ NO_COLOR: "1" })).toBe(false);
  });

  it("detects COLORTERM=truecolor", () => {
    expect(detectTruecolor({ COLORTERM: "truecolor" })).toBe(true);
  });

  it("counts visible length ignoring escapes", () => {
    expect(visibleLength(colorize("hello", "good", true))).toBe(5);
  });

  it("fg returns 24-bit when truecolor", () => {
    expect(fg({ r: 1, g: 2, b: 3 }, true)).toBe("\x1b[38;2;1;2;3m");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/core/ansi.test.ts
```

Expected: PASS (6/6).

- [ ] **Step 4: Commit**

```bash
git add src/core/ansi.ts tests/core/ansi.test.ts
git commit -m "feat(core): add ANSI helpers (truecolor + 256 fallback)"
```

---

## Task 7: Cheap segments — logo, model, dir, time, output-style

**Files:**
- Create: `src/segments/logo.ts`
- Create: `src/segments/model.ts`
- Create: `src/segments/dir.ts`
- Create: `src/segments/time.ts`
- Create: `src/segments/output-style.ts`
- Create: `tests/segments/cheap-batch-1.test.ts`

- [ ] **Step 1: Write segments**

`src/segments/logo.ts`:
```ts
import type { Segment } from "./types.js";

export const logoSegment: Segment = {
  id: "logo",
  label: "Brand logo",
  group: "core",
  cost: "cheap",
  render() {
    // Brand is rendered by theme using ThemeContext.brand; emit a placeholder chunk
    // marked as "logo" so themes know to swap in the brand glyph + label.
    return { text: "", kind: "logo" };
  }
};
```

`src/segments/model.ts`:
```ts
import type { Segment } from "./types.js";

export const modelSegment: Segment = {
  id: "model",
  label: "Model",
  group: "core",
  cost: "cheap",
  render(ctx) {
    return { text: ctx.model.displayName, kind: "model" };
  }
};
```

`src/segments/dir.ts`:
```ts
import { basename } from "node:path";
import type { Segment } from "./types.js";

export const dirSegment: Segment = {
  id: "dir",
  label: "Working directory",
  group: "session",
  cost: "cheap",
  render(ctx) {
    return { text: basename(ctx.cwd), kind: "muted" };
  }
};
```

`src/segments/time.ts`:
```ts
import type { Segment } from "./types.js";

export const timeSegment: Segment = {
  id: "time",
  label: "Clock",
  group: "system",
  cost: "cheap",
  render() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return { text: `${hh}:${mm}`, kind: "muted" };
  }
};
```

`src/segments/output-style.ts`:
```ts
import type { Segment } from "./types.js";

export const outputStyleSegment: Segment = {
  id: "output_style",
  label: "Output style",
  group: "session",
  cost: "cheap",
  render(ctx) {
    if (!ctx.outputStyle) return null;
    return { text: ctx.outputStyle, kind: "muted" };
  }
};
```

- [ ] **Step 2: Write tests**

`tests/segments/cheap-batch-1.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { logoSegment } from "../../src/segments/logo.js";
import { modelSegment } from "../../src/segments/model.js";
import { dirSegment } from "../../src/segments/dir.js";
import { timeSegment } from "../../src/segments/time.js";
import { outputStyleSegment } from "../../src/segments/output-style.js";
import { parseStdin } from "../../src/core/context.js";
import { readFileSync } from "node:fs";

const ctx = parseStdin(readFileSync("tests/fixtures/sample-stdin.json", "utf8"));

describe("cheap segments — batch 1", () => {
  it("logo emits empty chunk with logo kind", () => {
    const r = logoSegment.render(ctx, {});
    expect(r).toEqual({ text: "", kind: "logo" });
  });

  it("model returns display name", () => {
    expect(modelSegment.render(ctx, {})).toEqual({ text: "Opus 4.7", kind: "model" });
  });

  it("dir returns basename of cwd", () => {
    expect(dirSegment.render(ctx, {})).toEqual({ text: "myapp", kind: "muted" });
  });

  it("time returns HH:MM", () => {
    const r = timeSegment.render(ctx, {});
    expect(r).not.toBeNull();
    expect((r as { text: string }).text).toMatch(/^\d{2}:\d{2}$/);
  });

  it("output style returns style name", () => {
    expect(outputStyleSegment.render(ctx, {})).toEqual({ text: "default", kind: "muted" });
  });

  it("output style returns null when missing", () => {
    const empty = parseStdin("{}");
    expect(outputStyleSegment.render(empty, {})).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/segments/cheap-batch-1.test.ts
```

Expected: PASS (6/6).

- [ ] **Step 4: Commit**

```bash
git add src/segments/{logo,model,dir,time,output-style}.ts tests/segments/cheap-batch-1.test.ts
git commit -m "feat(segments): add cheap segments — logo, model, dir, time, output-style"
```

---

## Task 8: Cheap segments — context, cost, tokens, elapsed, todos, burn-rate

**Files:**
- Create: `src/segments/context.ts`
- Create: `src/segments/cost.ts`
- Create: `src/segments/tokens.ts`
- Create: `src/segments/elapsed.ts`
- Create: `src/segments/todos.ts`
- Create: `src/segments/burn-rate.ts`
- Create: `tests/segments/cheap-batch-2.test.ts`

- [ ] **Step 1: Write segments**

`src/segments/context.ts`:
```ts
import type { Segment } from "./types.js";

function bar(pct: number, width = 5): string {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "▓".repeat(filled) + "░".repeat(width - filled);
}

function compactTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export const contextSegment: Segment = {
  id: "context",
  label: "Context usage",
  group: "core",
  cost: "cheap",
  defaults: { showRaw: true, barWidth: 5 },
  render(ctx, opts) {
    const showRaw = (opts.showRaw as boolean) ?? true;
    const width = (opts.barWidth as number) ?? 5;
    const pct = Math.round(ctx.ctx.pct);
    const kind = pct >= 80 ? "warn" : pct >= 95 ? "bad" : "good";
    const raw = showRaw ? ` ${compactTokens(ctx.ctx.used)}/${compactTokens(ctx.ctx.total)}` : "";
    return { text: `${bar(pct, width)} ${pct}%${raw}`, kind };
  }
};
```

`src/segments/cost.ts`:
```ts
import type { Segment } from "./types.js";

export const costSegment: Segment = {
  id: "cost",
  label: "Session cost",
  group: "core",
  cost: "cheap",
  render(ctx) {
    const usd = ctx.cost.totalUsd;
    return { text: `$${usd.toFixed(2)}`, kind: "warn" };
  }
};
```

`src/segments/tokens.ts`:
```ts
import type { Segment } from "./types.js";

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export const tokensSegment: Segment = {
  id: "tokens",
  label: "Tokens in/out",
  group: "session",
  cost: "cheap",
  render(ctx) {
    return { text: `↑${compact(ctx.ctx.inputTokens)} ↓${compact(ctx.ctx.outputTokens)}`, kind: "muted" };
  }
};
```

`src/segments/elapsed.ts`:
```ts
import type { Segment } from "./types.js";

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60}m`;
}

export const elapsedSegment: Segment = {
  id: "elapsed",
  label: "Session duration",
  group: "session",
  cost: "cheap",
  render(ctx) {
    return { text: formatMs(ctx.cost.durationMs), kind: "muted" };
  }
};
```

`src/segments/todos.ts`:
```ts
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Segment } from "./types.js";

interface TodoFile {
  todos?: Array<{ status?: string }>;
}

export const todosSegment: Segment = {
  id: "todos",
  label: "Todo progress",
  group: "session",
  cost: "cheap",
  render(ctx) {
    if (!ctx.sessionId) return null;
    // CC stores TodoWrite state per session; path layout has changed across versions.
    // Try common locations; fall back to null silently.
    const candidates = [
      join(homedir(), ".claude", "todos", `${ctx.sessionId}.json`),
      join(homedir(), ".claude", "projects", "todos", `${ctx.sessionId}.json`)
    ];
    for (const p of candidates) {
      if (!existsSync(p)) continue;
      try {
        const data = JSON.parse(readFileSync(p, "utf8")) as TodoFile;
        const todos = data.todos ?? [];
        if (todos.length === 0) return null;
        const done = todos.filter((t) => t.status === "completed").length;
        return { text: `☑ ${done}/${todos.length}`, kind: done === todos.length ? "good" : "muted" };
      } catch {
        return null;
      }
    }
    return null;
  }
};
```

`src/segments/burn-rate.ts`:
```ts
import type { Segment } from "./types.js";

export const burnRateSegment: Segment = {
  id: "burn",
  label: "Burn rate",
  group: "session",
  cost: "cheap",
  render(ctx) {
    const hours = ctx.cost.durationMs / 3_600_000;
    if (hours < 0.05) return null; // <3 min: noise
    const rate = ctx.cost.totalUsd / hours;
    return { text: `🔥 $${rate.toFixed(2)}/hr`, kind: "warn" };
  }
};
```

- [ ] **Step 2: Write tests**

`tests/segments/cheap-batch-2.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contextSegment } from "../../src/segments/context.js";
import { costSegment } from "../../src/segments/cost.js";
import { tokensSegment } from "../../src/segments/tokens.js";
import { elapsedSegment } from "../../src/segments/elapsed.js";
import { burnRateSegment } from "../../src/segments/burn-rate.js";
import { todosSegment } from "../../src/segments/todos.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin(readFileSync("tests/fixtures/sample-stdin.json", "utf8"));

describe("cheap segments — batch 2", () => {
  it("context shows bar and percent", () => {
    const r = contextSegment.render(ctx, { showRaw: true, barWidth: 5 });
    expect(r).not.toBeNull();
    const c = r as { text: string; kind: string };
    expect(c.text).toMatch(/47%/);
    expect(c.text).toContain("▓");
    expect(c.kind).toBe("good");
  });

  it("cost formats as USD", () => {
    expect(costSegment.render(ctx, {})).toEqual({ text: "$0.42", kind: "warn" });
  });

  it("tokens compacts to K", () => {
    const r = tokensSegment.render(ctx, {}) as { text: string };
    expect(r.text).toBe("↑12.3K ↓34.5K");
  });

  it("elapsed formats minutes", () => {
    const r = elapsedSegment.render(ctx, {}) as { text: string };
    expect(r.text).toBe("23m");
  });

  it("burn rate computes $/hr", () => {
    const r = burnRateSegment.render(ctx, {}) as { text: string };
    expect(r.text).toMatch(/^🔥 \$\d+\.\d{2}\/hr$/);
  });

  it("todos returns null when no session-id", () => {
    const empty = parseStdin("{}");
    expect(todosSegment.render(empty, {})).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/segments/cheap-batch-2.test.ts
```

Expected: PASS (6/6).

- [ ] **Step 4: Commit**

```bash
git add src/segments/{context,cost,tokens,elapsed,todos,burn-rate}.ts tests/segments/cheap-batch-2.test.ts
git commit -m "feat(segments): add context, cost, tokens, elapsed, todos, burn-rate"
```

---

## Task 9: Custom shell-hook segment

**Files:**
- Create: `src/segments/custom.ts`
- Create: `tests/segments/custom.test.ts`

- [ ] **Step 1: Write segment**

`src/segments/custom.ts`:
```ts
import { execSync } from "node:child_process";
import type { Segment } from "./types.js";

export const customSegment: Segment = {
  id: "custom",
  label: "Custom shell command",
  group: "custom",
  cost: "expensive",
  ttl: 5000,
  defaults: { command: "", kind: "muted", timeoutMs: 1500 },
  render(_ctx, opts) {
    const cmd = (opts.command as string) ?? "";
    if (!cmd) return null;
    const timeout = (opts.timeoutMs as number) ?? 1500;
    try {
      const out = execSync(cmd, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (!out) return null;
      return { text: out, kind: (opts.kind as never) ?? "muted" };
    } catch {
      return null;
    }
  }
};
```

- [ ] **Step 2: Write tests**

`tests/segments/custom.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { customSegment } from "../../src/segments/custom.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin("{}");

describe("customSegment", () => {
  it("returns null when no command configured", () => {
    expect(customSegment.render(ctx, {})).toBeNull();
  });

  it("runs the configured command and returns its output", () => {
    const r = customSegment.render(ctx, { command: "echo hello" });
    expect(r).toEqual({ text: "hello", kind: "muted" });
  });

  it("returns null when command fails", () => {
    expect(customSegment.render(ctx, { command: "false" })).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/segments/custom.test.ts
```

Expected: PASS (3/3) on macOS/Linux. (CI Windows runner uses pwsh — `false` and `echo` work; `echo hello` will print `hello` on both.)

- [ ] **Step 4: Commit**

```bash
git add src/segments/custom.ts tests/segments/custom.test.ts
git commit -m "feat(segments): add custom shell-hook segment"
```

---

## Task 10: Git segments — branch + ahead/behind (cached)

**Files:**
- Create: `src/segments/_git.ts` (shared probing helper)
- Create: `src/segments/branch.ts`
- Create: `src/segments/git-ahead.ts`
- Create: `tests/segments/git.test.ts`

- [ ] **Step 1: Write shared git helper**

`src/segments/_git.ts`:
```ts
import { execFileSync } from "node:child_process";

interface GitInfo {
  inRepo: boolean;
  branch?: string;
  dirty?: boolean;
  ahead?: number;
  behind?: number;
}

function tryExec(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export function probeGit(cwd: string): GitInfo {
  const branch = tryExec(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (!branch) return { inRepo: false };
  const status = tryExec(["status", "--porcelain"], cwd) ?? "";
  const dirty = status.length > 0;
  const counts = tryExec(["rev-list", "--left-right", "--count", `${branch}...@{u}`], cwd);
  let ahead = 0;
  let behind = 0;
  if (counts) {
    const [a, b] = counts.split(/\s+/).map((n) => parseInt(n, 10));
    if (Number.isFinite(a)) ahead = a;
    if (Number.isFinite(b)) behind = b;
  }
  return { inRepo: true, branch, dirty, ahead, behind };
}
```

- [ ] **Step 2: Write branch segment**

`src/segments/branch.ts`:
```ts
import { cached } from "../core/cache.js";
import type { Segment } from "./types.js";
import { probeGit } from "./_git.js";

export const branchSegment: Segment = {
  id: "branch",
  label: "Git branch",
  group: "git",
  cost: "expensive",
  ttl: 2000,
  defaults: { showDirty: true },
  async render(ctx, opts) {
    const showDirty = (opts.showDirty as boolean) ?? true;
    const { value } = await cached(`git:${ctx.cwd}`, this.ttl ?? 2000, async () => probeGit(ctx.cwd));
    if (!value || !value.inRepo) return null;
    const dirty = showDirty && value.dirty ? "*" : "";
    return { text: ` ${value.branch}${dirty}`, kind: "accent" };
  }
};
```

- [ ] **Step 3: Write git-ahead segment**

`src/segments/git-ahead.ts`:
```ts
import { cached } from "../core/cache.js";
import type { Segment } from "./types.js";
import { probeGit } from "./_git.js";

export const gitAheadSegment: Segment = {
  id: "git_ahead",
  label: "Git ahead/behind",
  group: "git",
  cost: "expensive",
  ttl: 2000,
  async render(ctx) {
    const { value } = await cached(`git:${ctx.cwd}`, this.ttl ?? 2000, async () => probeGit(ctx.cwd));
    if (!value || !value.inRepo) return null;
    if (!value.ahead && !value.behind) return null;
    return { text: `↑${value.ahead ?? 0} ↓${value.behind ?? 0}`, kind: "muted" };
  }
};
```

- [ ] **Step 4: Write tests**

`tests/segments/git.test.ts`:
```ts
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { branchSegment } from "../../src/segments/branch.js";
import { gitAheadSegment } from "../../src/segments/git-ahead.js";
import { parseStdin } from "../../src/core/context.js";

let repo: string;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "ccsl-git-"));
  execSync("git init -q -b main", { cwd: repo });
  execSync("git config user.email test@test.com", { cwd: repo });
  execSync("git config user.name Test", { cwd: repo });
  writeFileSync(join(repo, "x.txt"), "hi", "utf8");
  execSync("git add . && git commit -qm init", { cwd: repo });
});

afterAll(() => rmSync(repo, { recursive: true }));

describe("git segments", () => {
  it("branch returns 'main' for a clean repo", async () => {
    const ctx = parseStdin(JSON.stringify({ workspace: { current_dir: repo } }));
    const r = await branchSegment.render(ctx, { showDirty: true });
    expect(r).not.toBeNull();
    expect((r as { text: string }).text).toMatch(/main/);
  });

  it("branch marks dirty repo with *", async () => {
    writeFileSync(join(repo, "x.txt"), "changed", "utf8");
    const ctx = parseStdin(JSON.stringify({ workspace: { current_dir: repo } }));
    const r = await branchSegment.render(ctx, { showDirty: true });
    expect((r as { text: string }).text).toMatch(/main\*/);
  });

  it("returns null outside a repo", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ccsl-nogit-"));
    const ctx = parseStdin(JSON.stringify({ workspace: { current_dir: dir } }));
    expect(await branchSegment.render(ctx, {})).toBeNull();
    expect(await gitAheadSegment.render(ctx, {})).toBeNull();
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/segments/git.test.ts
```

Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add src/segments/{_git,branch,git-ahead}.ts tests/segments/git.test.ts
git commit -m "feat(segments): add cached git branch + ahead/behind"
```

---

## Task 11: System segments — battery, api-health, version (cached)

**Files:**
- Create: `src/segments/battery.ts`
- Create: `src/segments/api-health.ts`
- Create: `src/segments/version.ts`
- Create: `tests/segments/system.test.ts`

- [ ] **Step 1: Write battery segment**

`src/segments/battery.ts`:
```ts
import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { cached } from "../core/cache.js";
import type { Segment } from "./types.js";

interface Battery {
  pct: number;
  charging: boolean;
}

function readBattery(): Battery | null {
  const p = platform();
  try {
    if (p === "darwin") {
      const out = execFileSync("pmset", ["-g", "batt"], { encoding: "utf8" });
      const m = out.match(/(\d+)%; (charging|discharging|charged|finishing charge|AC attached)/i);
      if (!m) return null;
      return { pct: parseInt(m[1], 10), charging: !/discharging/i.test(m[2]) };
    }
    if (p === "win32") {
      const out = execFileSync("powershell", ["-NoProfile", "-Command", "(Get-CimInstance Win32_Battery | Select -First 1) | ConvertTo-Json -Compress"], { encoding: "utf8" });
      const obj = JSON.parse(out) as { EstimatedChargeRemaining?: number; BatteryStatus?: number };
      if (typeof obj.EstimatedChargeRemaining !== "number") return null;
      return { pct: obj.EstimatedChargeRemaining, charging: obj.BatteryStatus === 2 };
    }
    if (p === "linux") {
      const fs = require("node:fs") as typeof import("node:fs");
      const cap = fs.readFileSync("/sys/class/power_supply/BAT0/capacity", "utf8").trim();
      const status = fs.readFileSync("/sys/class/power_supply/BAT0/status", "utf8").trim();
      return { pct: parseInt(cap, 10), charging: /charging|full/i.test(status) };
    }
  } catch {
    return null;
  }
  return null;
}

export const batterySegment: Segment = {
  id: "battery",
  label: "Battery",
  group: "system",
  cost: "expensive",
  ttl: 5000,
  async render(_ctx) {
    const { value } = await cached("battery", this.ttl ?? 5000, async () => readBattery());
    if (!value) return null;
    const icon = value.charging ? "🔌" : "🔋";
    const kind = value.pct < 20 ? "bad" : value.pct < 50 ? "warn" : "good";
    return { text: `${icon} ${value.pct}%`, kind };
  }
};
```

- [ ] **Step 2: Write api-health segment**

`src/segments/api-health.ts`:
```ts
import { cached } from "../core/cache.js";
import type { Segment } from "./types.js";

async function probe(): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch("https://api.anthropic.com/v1/health", { signal: ctrl.signal, method: "HEAD" });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export const apiHealthSegment: Segment = {
  id: "api_health",
  label: "API health",
  group: "system",
  cost: "expensive",
  ttl: 30_000,
  async render() {
    const { value } = await cached("api-health", this.ttl ?? 30_000, probe);
    if (value === null) return null;
    return value
      ? { text: "● API", kind: "good" }
      : { text: "● API", kind: "bad" };
  }
};
```

- [ ] **Step 3: Write version segment**

`src/segments/version.ts`:
```ts
import { cached } from "../core/cache.js";
import type { Segment } from "./types.js";

interface VersionCheck {
  current: string;
  latest: string | null;
}

async function fetchLatest(current: string): Promise<VersionCheck> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch("https://registry.npmjs.org/@anthropic-ai/claude-code/latest", { signal: ctrl.signal });
    if (!res.ok) return { current, latest: null };
    const j = (await res.json()) as { version?: string };
    return { current, latest: j.version ?? null };
  } catch {
    return { current, latest: null };
  } finally {
    clearTimeout(t);
  }
}

export const versionSegment: Segment = {
  id: "version",
  label: "CC version",
  group: "system",
  cost: "expensive",
  ttl: 3_600_000,
  async render(ctx) {
    const current = ctx.version ?? "?";
    const { value } = await cached("cc-version", this.ttl ?? 3_600_000, async () => fetchLatest(current));
    if (!value) return { text: `✦ v${current}`, kind: "muted" };
    if (value.latest && value.latest !== value.current) {
      return { text: `✦ v${value.current} → ${value.latest}`, kind: "warn" };
    }
    return { text: `✦ v${value.current}`, kind: "muted" };
  }
};
```

- [ ] **Step 4: Write tests**

`tests/segments/system.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { batterySegment } from "../../src/segments/battery.js";
import { apiHealthSegment } from "../../src/segments/api-health.js";
import { versionSegment } from "../../src/segments/version.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin(JSON.stringify({ version: "2.1.97" }));

describe("system segments", () => {
  it("battery returns null or a chunk (platform-dependent)", async () => {
    const r = await batterySegment.render(ctx, {});
    if (r === null) {
      expect(r).toBeNull();
    } else {
      const c = r as { text: string; kind: string };
      expect(c.text).toMatch(/^(🔌|🔋) \d+%/);
    }
  });

  it("version segment falls back gracefully when offline", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const r = await versionSegment.render(ctx, {});
    expect(r).not.toBeNull();
    expect((r as { text: string }).text).toContain("v2.1.97");
    fetchSpy.mockRestore();
  });

  it("api-health returns good/bad based on probe", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const r = await apiHealthSegment.render(ctx, {});
    expect(r).not.toBeNull();
    expect((r as { kind: string }).kind).toBe("good");
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test -- tests/segments/system.test.ts
```

Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add src/segments/{battery,api-health,version}.ts tests/segments/system.test.ts
git commit -m "feat(segments): add battery, api-health, version (cached, cross-platform)"
```

---

## Task 12: Segment registry

**Files:**
- Create: `src/segments/index.ts`
- Create: `tests/segments/registry.test.ts`

- [ ] **Step 1: Write registry**

`src/segments/index.ts`:
```ts
import { logoSegment } from "./logo.js";
import { modelSegment } from "./model.js";
import { dirSegment } from "./dir.js";
import { timeSegment } from "./time.js";
import { outputStyleSegment } from "./output-style.js";
import { contextSegment } from "./context.js";
import { costSegment } from "./cost.js";
import { tokensSegment } from "./tokens.js";
import { elapsedSegment } from "./elapsed.js";
import { todosSegment } from "./todos.js";
import { burnRateSegment } from "./burn-rate.js";
import { customSegment } from "./custom.js";
import { branchSegment } from "./branch.js";
import { gitAheadSegment } from "./git-ahead.js";
import { batterySegment } from "./battery.js";
import { apiHealthSegment } from "./api-health.js";
import { versionSegment } from "./version.js";
import type { Segment } from "./types.js";

export const SEGMENTS: Segment[] = [
  logoSegment,
  modelSegment,
  contextSegment,
  costSegment,
  tokensSegment,
  branchSegment,
  dirSegment,
  burnRateSegment,
  elapsedSegment,
  gitAheadSegment,
  outputStyleSegment,
  versionSegment,
  todosSegment,
  timeSegment,
  batterySegment,
  apiHealthSegment,
  customSegment
];

export const SEGMENTS_BY_ID: Record<string, Segment> = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));
```

- [ ] **Step 2: Write tests**

`tests/segments/registry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { SEGMENTS, SEGMENTS_BY_ID } from "../../src/segments/index.js";

describe("segment registry", () => {
  it("contains all 17 entries (16 spec + custom shell)", () => {
    expect(SEGMENTS.length).toBeGreaterThanOrEqual(16);
  });

  it("ids are unique", () => {
    const ids = SEGMENTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("expensive segments declare a ttl", () => {
    for (const s of SEGMENTS) {
      if (s.cost === "expensive") expect(s.ttl).toBeGreaterThan(0);
    }
  });

  it("by-id index round-trips", () => {
    expect(SEGMENTS_BY_ID["model"].id).toBe("model");
    expect(SEGMENTS_BY_ID["branch"].id).toBe("branch");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/segments/registry.test.ts
```

Expected: PASS (4/4).

- [ ] **Step 4: Commit**

```bash
git add src/segments/index.ts tests/segments/registry.test.ts
git commit -m "feat(segments): wire up segment registry"
```

---

## Task 13: Theme — Minimalist (default)

**Files:**
- Create: `src/themes/minimalist.ts`
- Create: `tests/themes/minimalist.test.ts`

- [ ] **Step 1: Write theme**

`src/themes/minimalist.ts`:
```ts
import { colorize, fg, RESET } from "../core/ansi.js";
import type { Chunk } from "../segments/types.js";
import type { Theme, ThemeContext } from "./types.js";

const SEP = " │ ";

function renderChunk(c: Chunk, tctx: ThemeContext): string {
  if (c.raw) return c.raw;
  if (c.kind === "logo") {
    return colorize(`${tctx.brand.glyph} ${tctx.brand.label}`, "logo", tctx.truecolor);
  }
  return colorize(c.text, c.kind, tctx.truecolor);
}

export const minimalistTheme: Theme = {
  id: "minimalist",
  name: "Minimalist",
  multiline: false,
  format(chunks, tctx) {
    const sep = `${fg({ r: 55, g: 65, b: 81 }, tctx.truecolor)}${SEP}${RESET}`;
    return chunks.filter((c) => c.text || c.kind === "logo").map((c) => renderChunk(c, tctx)).join(sep);
  }
};
```

- [ ] **Step 2: Write tests**

`tests/themes/minimalist.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { minimalistTheme } from "../../src/themes/minimalist.js";
import type { ThemeContext } from "../../src/themes/types.js";

const tctx: ThemeContext = {
  terminalWidth: 120,
  truecolor: true,
  brand: { glyph: "⬢", label: "Logisoft", color: "indigo" }
};

describe("minimalist theme", () => {
  it("renders logo chunk via brand", () => {
    const out = minimalistTheme.format([{ text: "", kind: "logo" }], tctx);
    expect(out).toContain("⬢ Logisoft");
  });

  it("joins chunks with separators", () => {
    const out = minimalistTheme.format(
      [
        { text: "", kind: "logo" },
        { text: "Opus 4.7", kind: "model" },
        { text: "47%", kind: "good" }
      ],
      tctx
    );
    expect(out).toContain("Opus 4.7");
    expect(out).toContain("47%");
    expect(out).toContain("│");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/themes/minimalist.test.ts
```

Expected: PASS (2/2).

- [ ] **Step 4: Commit**

```bash
git add src/themes/minimalist.ts tests/themes/minimalist.test.ts
git commit -m "feat(themes): add Minimalist (default)"
```

---

## Task 14: Theme — Powerline

**Files:**
- Create: `src/themes/powerline.ts`
- Create: `tests/themes/powerline.test.ts`

- [ ] **Step 1: Write theme**

`src/themes/powerline.ts`:
```ts
import { bg, fg, RESET, type RGB } from "../core/ansi.js";
import type { Chunk, SegmentKind } from "../segments/types.js";
import type { Theme, ThemeContext } from "./types.js";

const ARROW = ""; // requires Powerline-patched font

const KIND_BG: Record<SegmentKind, RGB> = {
  logo: { r: 79, g: 70, b: 229 },
  model: { r: 30, g: 41, b: 59 },
  metric: { r: 31, g: 41, b: 55 },
  good: { r: 6, g: 78, b: 59 },
  warn: { r: 120, g: 53, b: 15 },
  bad: { r: 127, g: 29, b: 29 },
  muted: { r: 31, g: 41, b: 55 },
  accent: { r: 131, g: 24, b: 67 }
};

const TEXT_FG: RGB = { r: 245, g: 245, b: 245 };

export const powerlineTheme: Theme = {
  id: "powerline",
  name: "Powerline",
  multiline: false,
  format(chunks, tctx) {
    const visible = chunks.filter((c) => c.text || c.kind === "logo");
    let out = "";
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const text = c.kind === "logo" ? `${tctx.brand.glyph} ${tctx.brand.label}` : c.text;
      const segBg = KIND_BG[c.kind];
      out += `${bg(segBg, tctx.truecolor)}${fg(TEXT_FG, tctx.truecolor)} ${text} `;
      const next = visible[i + 1];
      if (next) {
        const nextBg = KIND_BG[next.kind];
        out += `${bg(nextBg, tctx.truecolor)}${fg(segBg, tctx.truecolor)}${ARROW}`;
      } else {
        out += `${RESET}${fg(segBg, tctx.truecolor)}${ARROW}${RESET}`;
      }
    }
    return out;
  }
};
```

- [ ] **Step 2: Write tests**

`tests/themes/powerline.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { powerlineTheme } from "../../src/themes/powerline.js";

const tctx = { terminalWidth: 120, truecolor: true, brand: { glyph: "⬢", label: "Logisoft", color: "indigo" } };

describe("powerline theme", () => {
  it("emits chevron arrows", () => {
    const out = powerlineTheme.format([{ text: "", kind: "logo" }, { text: "Opus", kind: "model" }], tctx);
    expect(out).toContain("");
  });

  it("renders brand from logo chunk", () => {
    const out = powerlineTheme.format([{ text: "", kind: "logo" }], tctx);
    expect(out).toContain("⬢ Logisoft");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/themes/powerline.test.ts
```

Expected: PASS (2/2).

- [ ] **Step 4: Commit**

```bash
git add src/themes/powerline.ts tests/themes/powerline.test.ts
git commit -m "feat(themes): add Powerline"
```

---

## Task 15: Theme — Pills

**Files:**
- Create: `src/themes/pills.ts`
- Create: `tests/themes/pills.test.ts`

- [ ] **Step 1: Write theme**

`src/themes/pills.ts`:
```ts
import { colorize, fg, RESET, type RGB } from "../core/ansi.js";
import type { SegmentKind } from "../segments/types.js";
import type { Theme, ThemeContext } from "./types.js";

const BORDER: Record<SegmentKind, RGB> = {
  logo: { r: 99, g: 102, b: 241 },
  model: { r: 59, g: 130, b: 246 },
  metric: { r: 148, g: 163, b: 184 },
  good: { r: 34, g: 197, b: 94 },
  warn: { r: 245, g: 158, b: 11 },
  bad: { r: 239, g: 68, b: 68 },
  muted: { r: 148, g: 163, b: 184 },
  accent: { r: 236, g: 72, b: 153 }
};

export const pillsTheme: Theme = {
  id: "pills",
  name: "Pills",
  multiline: false,
  format(chunks, tctx) {
    return chunks
      .filter((c) => c.text || c.kind === "logo")
      .map((c) => {
        const text = c.kind === "logo" ? `${tctx.brand.glyph} ${tctx.brand.label}` : c.text;
        const border = BORDER[c.kind];
        const left = `${fg(border, tctx.truecolor)}❨${RESET}`;
        const right = `${fg(border, tctx.truecolor)}❩${RESET}`;
        return `${left}${colorize(text, c.kind, tctx.truecolor)}${right}`;
      })
      .join(" ");
  }
};
```

- [ ] **Step 2: Write tests**

`tests/themes/pills.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { pillsTheme } from "../../src/themes/pills.js";

const tctx = { terminalWidth: 120, truecolor: true, brand: { glyph: "⬢", label: "Logisoft", color: "indigo" } };

describe("pills theme", () => {
  it("wraps each chunk in pill brackets", () => {
    const out = pillsTheme.format([{ text: "Opus", kind: "model" }], tctx);
    expect(out).toContain("❨");
    expect(out).toContain("❩");
    expect(out).toContain("Opus");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/themes/pills.test.ts
```

Expected: PASS (1/1).

- [ ] **Step 4: Commit**

```bash
git add src/themes/pills.ts tests/themes/pills.test.ts
git commit -m "feat(themes): add Pills"
```

---

## Task 16: Theme — Underline

**Files:**
- Create: `src/themes/underline.ts`
- Create: `tests/themes/underline.test.ts`

- [ ] **Step 1: Write theme**

`src/themes/underline.ts`:
```ts
import { colorize, fg, RESET } from "../core/ansi.js";
import type { Theme, ThemeContext } from "./types.js";

function underlineColored(text: string, kind: import("../segments/types.js").SegmentKind, truecolor: boolean): string {
  const colored = colorize(text, kind, truecolor);
  return `\x1b[4m${colored.replace(RESET, "\x1b[24m" + RESET)}`;
}

export const underlineTheme: Theme = {
  id: "underline",
  name: "Accent underlines",
  multiline: false,
  format(chunks, tctx) {
    const sepC = fg({ r: 75, g: 85, b: 99 }, tctx.truecolor);
    const sep = `${sepC} · ${RESET}`;
    return chunks
      .filter((c) => c.text || c.kind === "logo")
      .map((c) => {
        const text = c.kind === "logo" ? `${tctx.brand.glyph} ${tctx.brand.label}` : c.text;
        return underlineColored(text, c.kind, tctx.truecolor);
      })
      .join(sep);
  }
};
```

- [ ] **Step 2: Write tests**

`tests/themes/underline.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { underlineTheme } from "../../src/themes/underline.js";

const tctx = { terminalWidth: 120, truecolor: true, brand: { glyph: "⬢", label: "Logisoft", color: "indigo" } };

describe("underline theme", () => {
  it("emits underline escape sequences", () => {
    const out = underlineTheme.format([{ text: "Opus", kind: "model" }], tctx);
    expect(out).toContain("\x1b[4m");
    expect(out).toContain("\x1b[24m");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/themes/underline.test.ts
```

Expected: PASS (1/1).

- [ ] **Step 4: Commit**

```bash
git add src/themes/underline.ts tests/themes/underline.test.ts
git commit -m "feat(themes): add Accent underlines"
```

---

## Task 17: Theme — Multiline + theme registry

**Files:**
- Create: `src/themes/multiline.ts`
- Create: `src/themes/index.ts`
- Create: `tests/themes/multiline.test.ts`
- Create: `tests/themes/registry.test.ts`

- [ ] **Step 1: Write multiline theme**

`src/themes/multiline.ts`:
```ts
import { colorize, fg, RESET } from "../core/ansi.js";
import type { Chunk } from "../segments/types.js";
import type { Theme, ThemeContext } from "./types.js";

const PRIMARY_KINDS = new Set(["logo", "model", "good", "warn", "bad"]);

function row(chunks: Chunk[], tctx: ThemeContext): string {
  const sep = `${fg({ r: 55, g: 65, b: 81 }, tctx.truecolor)} │ ${RESET}`;
  return chunks
    .map((c) => (c.kind === "logo" ? colorize(`${tctx.brand.glyph} ${tctx.brand.label}`, "logo", tctx.truecolor) : colorize(c.text, c.kind, tctx.truecolor)))
    .join(sep);
}

export const multilineTheme: Theme = {
  id: "multiline",
  name: "Two-line dense",
  multiline: true,
  format(chunks, tctx) {
    const visible = chunks.filter((c) => c.text || c.kind === "logo");
    const top = visible.filter((c) => PRIMARY_KINDS.has(c.kind));
    const bottom = visible.filter((c) => !PRIMARY_KINDS.has(c.kind));
    const lines: string[] = [];
    if (top.length > 0) lines.push(row(top, tctx));
    if (bottom.length > 0) {
      const indent = colorize("└", "muted", tctx.truecolor);
      lines.push(`${indent} ${row(bottom, tctx)}`);
    }
    return lines.join("\n");
  }
};
```

- [ ] **Step 2: Write theme registry**

`src/themes/index.ts`:
```ts
import { minimalistTheme } from "./minimalist.js";
import { powerlineTheme } from "./powerline.js";
import { pillsTheme } from "./pills.js";
import { underlineTheme } from "./underline.js";
import { multilineTheme } from "./multiline.js";
import type { Theme } from "./types.js";

export const THEMES: Theme[] = [minimalistTheme, powerlineTheme, pillsTheme, underlineTheme, multilineTheme];
export const THEMES_BY_ID: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));
```

- [ ] **Step 3: Write tests**

`tests/themes/multiline.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { multilineTheme } from "../../src/themes/multiline.js";

const tctx = { terminalWidth: 120, truecolor: true, brand: { glyph: "⬢", label: "Logisoft", color: "indigo" } };

describe("multiline theme", () => {
  it("emits two rows when both primary and secondary chunks present", () => {
    const out = multilineTheme.format(
      [
        { text: "", kind: "logo" },
        { text: "Opus", kind: "model" },
        { text: "47%", kind: "good" },
        { text: "main*", kind: "accent" },
        { text: "↑12K ↓34K", kind: "muted" }
      ],
      tctx
    );
    expect(out.split("\n")).toHaveLength(2);
  });

  it("emits single row when only primary chunks present", () => {
    const out = multilineTheme.format([{ text: "Opus", kind: "model" }], tctx);
    expect(out.split("\n")).toHaveLength(1);
  });
});
```

`tests/themes/registry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { THEMES, THEMES_BY_ID } from "../../src/themes/index.js";

describe("theme registry", () => {
  it("has all 5 themes", () => {
    expect(THEMES).toHaveLength(5);
  });

  it("ids are unique", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(5);
  });

  it("by-id includes minimalist", () => {
    expect(THEMES_BY_ID["minimalist"].name).toBe("Minimalist");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/themes/multiline.test.ts tests/themes/registry.test.ts
```

Expected: PASS (5/5 across both files).

- [ ] **Step 5: Commit**

```bash
git add src/themes/multiline.ts src/themes/index.ts tests/themes/multiline.test.ts tests/themes/registry.test.ts
git commit -m "feat(themes): add Multiline + theme registry"
```

---

## Task 18: Render orchestrator

**Files:**
- Create: `src/render.ts`
- Create: `tests/render.test.ts`

- [ ] **Step 1: Write orchestrator**

`src/render.ts`:
```ts
import type { Config } from "./core/config.js";
import { detectTruecolor, terminalWidth } from "./core/ansi.js";
import type { StatusContext } from "./core/context.js";
import { SEGMENTS_BY_ID } from "./segments/index.js";
import type { Chunk } from "./segments/types.js";
import { THEMES_BY_ID } from "./themes/index.js";

export async function renderStatus(ctx: StatusContext, config: Config): Promise<string> {
  const chunks: Chunk[] = [];
  for (const entry of config.segments) {
    const seg = SEGMENTS_BY_ID[entry.id];
    if (!seg) continue;
    try {
      const opts = { ...(seg.defaults ?? {}), ...entry.options };
      const result = await seg.render(ctx, opts);
      if (!result) continue;
      if (Array.isArray(result)) chunks.push(...result);
      else chunks.push(result);
    } catch (err) {
      if (process.env.CCSL_DEBUG) {
        process.stderr.write(`[ccsl] segment ${seg.id} failed: ${(err as Error).message}\n`);
      }
      chunks.push({ text: `⚠ ${seg.id}`, kind: "muted" });
    }
  }
  const theme = THEMES_BY_ID[config.theme] ?? THEMES_BY_ID["minimalist"];
  return theme.format(chunks, {
    terminalWidth: terminalWidth(),
    truecolor: detectTruecolor(),
    brand: config.brand
  });
}
```

- [ ] **Step 2: Write integration test**

`tests/render.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderStatus } from "../src/render.js";
import { parseStdin } from "../src/core/context.js";
import { ConfigSchema, DEFAULT_CONFIG } from "../src/core/config.js";

const ctx = parseStdin(readFileSync("tests/fixtures/sample-stdin.json", "utf8"));

describe("renderStatus", () => {
  it("renders default config + minimalist theme without throwing", async () => {
    const out = await renderStatus(ctx, DEFAULT_CONFIG);
    expect(out).toContain("Logisoft");
    expect(out).toContain("Opus 4.7");
    expect(out).toContain("47%");
    expect(out).toContain("$0.42");
  });

  it("falls back to minimalist when theme id is unknown", async () => {
    const cfg = ConfigSchema.parse({ ...DEFAULT_CONFIG, theme: "does-not-exist" });
    const out = await renderStatus(ctx, cfg);
    expect(out.length).toBeGreaterThan(0);
  });

  it("produces output for every shipped theme", async () => {
    const ids = ["minimalist", "powerline", "pills", "underline", "multiline"];
    for (const id of ids) {
      const cfg = ConfigSchema.parse({ ...DEFAULT_CONFIG, theme: id });
      const out = await renderStatus(ctx, cfg);
      expect(out).toContain("Logisoft");
    }
  });

  it("never throws on a misbehaving segment", async () => {
    const cfg = ConfigSchema.parse({ ...DEFAULT_CONFIG, segments: [{ id: "model", options: {} }, { id: "does-not-exist", options: {} }] });
    const out = await renderStatus(ctx, cfg);
    expect(out).toContain("Opus 4.7");
  });
});
```

- [ ] **Step 3: Run test**

```bash
npm test -- tests/render.test.ts
```

Expected: PASS (4/4).

- [ ] **Step 4: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "feat: add render orchestrator (segments → theme)"
```

---

## Task 19: bin/statusline entry

**Files:**
- Create: `src/bin/statusline.ts`

- [ ] **Step 1: Write entry**

`src/bin/statusline.ts`:
```ts
#!/usr/bin/env node
import { loadConfig } from "../core/config.js";
import { parseStdin } from "../core/context.js";
import { renderStatus } from "../render.js";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  try {
    const [stdin, config] = await Promise.all([readStdin(), Promise.resolve(loadConfig())]);
    const ctx = parseStdin(stdin);
    const out = await renderStatus(ctx, config);
    process.stdout.write(out);
  } catch (err) {
    if (process.env.CCSL_DEBUG) {
      process.stderr.write(`[ccsl] fatal: ${(err as Error).stack}\n`);
    }
    process.stdout.write("⬢ Logisoft  (status error)");
  }
}

main();
```

- [ ] **Step 2: Build + smoke test**

```bash
npm run build
echo '{"model":{"display_name":"Opus 4.7"},"context_window":{"used_percentage":47,"context_window_size":200000,"total_input_tokens":12300,"total_output_tokens":34500},"cost":{"total_cost_usd":0.42,"total_duration_ms":1380000}}' | node dist/bin/statusline.js
```

Expected: prints a single line containing `Logisoft`, `Opus 4.7`, `47%`, `$0.42`.

- [ ] **Step 3: Commit**

```bash
git add src/bin/statusline.ts
git commit -m "feat(bin): add statusline entry point"
```

---

## Task 20: bin/setup — patches ~/.claude/settings.json

**Files:**
- Create: `src/bin/setup.ts`
- Create: `tests/bin/setup.test.ts`

- [ ] **Step 1: Write setup**

`src/bin/setup.ts`:
```ts
#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

interface SetupOpts {
  settingsFile?: string;
  pluginRoot?: string;
  refreshInterval?: number;
  padding?: number;
}

export function patchSettings(opts: SetupOpts = {}): { written: boolean; backup?: string } {
  const file = opts.settingsFile ?? join(homedir(), ".claude", "settings.json");
  const pluginRoot = opts.pluginRoot ?? resolve(__dirname, "..", "..");
  const refreshInterval = opts.refreshInterval ?? 5;
  const padding = opts.padding ?? 1;

  const command = `node ${join(pluginRoot, "dist", "bin", "statusline.js").replace(/\\/g, "/")}`;
  const block = { type: "command", command, refreshInterval, padding };

  let json: Record<string, unknown> = {};
  let backup: string | undefined;
  if (existsSync(file)) {
    const raw = readFileSync(file, "utf8");
    try {
      json = JSON.parse(raw);
    } catch (err) {
      throw new Error(`existing ${file} is not valid JSON; refusing to overwrite (${(err as Error).message})`);
    }
    backup = `${file}.bak-${Date.now()}`;
    copyFileSync(file, backup);
  } else {
    mkdirSync(dirname(file), { recursive: true });
  }

  json["statusLine"] = block;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  return { written: true, backup };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = patchSettings();
    process.stdout.write(`✓ Patched ${join(homedir(), ".claude", "settings.json")}\n`);
    if (result.backup) process.stdout.write(`  Backup: ${result.backup}\n`);
    process.stdout.write(`Run /ccstatusline-config to customize. Restart Claude Code or wait for the next interaction to see the status line.\n`);
  } catch (err) {
    process.stderr.write(`✗ Setup failed: ${(err as Error).message}\n`);
    process.exit(1);
  }
}
```

(Note: in `tsconfig` we set `module: ESNext` which means `__dirname` isn't available natively. Use `import.meta.url` shim.)

Update the file to use ESM `__dirname` shim — replace the `pluginRoot` line with:
```ts
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

- [ ] **Step 2: Write tests**

`tests/bin/setup.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchSettings } from "../../src/bin/setup.js";

const makeTmp = () => mkdtempSync(join(tmpdir(), "ccsl-setup-"));

describe("patchSettings", () => {
  it("writes a new settings.json when missing", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    patchSettings({ settingsFile: file, pluginRoot: "/plug" });
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.statusLine.type).toBe("command");
    expect(j.statusLine.command).toContain("/plug/dist/bin/statusline.js");
    rmSync(dir, { recursive: true });
  });

  it("preserves other keys + creates a backup", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ theme: "dark", env: { FOO: "bar" } }), "utf8");
    const r = patchSettings({ settingsFile: file, pluginRoot: "/plug" });
    expect(r.backup).toBeDefined();
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.theme).toBe("dark");
    expect(j.env.FOO).toBe("bar");
    expect(j.statusLine).toBeDefined();
    rmSync(dir, { recursive: true });
  });

  it("refuses to overwrite a corrupt file", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    writeFileSync(file, "{not json", "utf8");
    expect(() => patchSettings({ settingsFile: file, pluginRoot: "/plug" })).toThrow(/not valid JSON/);
    rmSync(dir, { recursive: true });
  });

  it("is idempotent — second run replaces statusLine", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    patchSettings({ settingsFile: file, pluginRoot: "/plug" });
    patchSettings({ settingsFile: file, pluginRoot: "/plug2" });
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.statusLine.command).toContain("/plug2/dist/bin/statusline.js");
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/bin/setup.test.ts
```

Expected: PASS (4/4).

- [ ] **Step 4: Commit**

```bash
git add src/bin/setup.ts tests/bin/setup.test.ts
git commit -m "feat(bin): add setup command (patches ~/.claude/settings.json)"
```

---

## Task 21: TUI — App skeleton + LivePreview component

**Files:**
- Create: `src/tui/App.tsx`
- Create: `src/tui/components/LivePreview.tsx`

- [ ] **Step 1: Write LivePreview**

`src/tui/components/LivePreview.tsx`:
```tsx
import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { renderStatus } from "../../render.js";
import type { Config } from "../../core/config.js";
import { parseStdin } from "../../core/context.js";
import { readFileSync } from "node:fs";

const FIXTURE_PATH = new URL("../../../tests/fixtures/sample-stdin.json", import.meta.url);

let fixtureCache: string | null = null;
function fixture(): string {
  if (fixtureCache === null) {
    try {
      fixtureCache = readFileSync(FIXTURE_PATH, "utf8");
    } catch {
      fixtureCache = "{}";
    }
  }
  return fixtureCache;
}

export function LivePreview({ config }: { config: Config }): React.ReactElement {
  const [text, setText] = useState<string>("…");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = parseStdin(fixture());
      const out = await renderStatus(ctx, config);
      if (!cancelled) setText(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text>{text}</Text>
    </Box>
  );
}
```

- [ ] **Step 2: Write App skeleton (router stub)**

`src/tui/App.tsx`:
```tsx
import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { Config } from "../core/config.js";
import { saveConfig } from "../core/config.js";
import { LivePreview } from "./components/LivePreview.js";

type Screen = "home" | "segments" | "theme" | "brand" | "preview";

export function App({ initial }: { initial: Config }): React.ReactElement {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState<Config>(initial);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      saveConfig(config);
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">⬢ ccstatusline — config</Text>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Press q or esc to save & quit. Detailed screens land in the next task.</Text>
        <Text dimColor>Current screen: {screen}</Text>
      </Box>
    </Box>
  );
}
```

(The App is a smoke skeleton — actual screens come in Task 22.)

- [ ] **Step 3: Build to check for compile errors**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/tui/App.tsx src/tui/components/LivePreview.tsx
git commit -m "feat(tui): add app skeleton + LivePreview component"
```

---

## Task 22: TUI screens — Home, Segments, Theme, Brand, Preview

**Files:**
- Create: `src/tui/screens/Home.tsx`
- Create: `src/tui/screens/Segments.tsx`
- Create: `src/tui/screens/Theme.tsx`
- Create: `src/tui/screens/Brand.tsx`
- Create: `src/tui/screens/Preview.tsx`
- Modify: `src/tui/App.tsx`

- [ ] **Step 1: Write Home screen**

`src/tui/screens/Home.tsx`:
```tsx
import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

export function Home({ onPick }: { onPick: (s: string) => void }): React.ReactElement {
  const items = [
    { label: "Segments", value: "segments" },
    { label: "Theme", value: "theme" },
    { label: "Brand (glyph + label)", value: "brand" },
    { label: "Live preview", value: "preview" },
    { label: "Save & quit", value: "quit" }
  ];
  return (
    <Box flexDirection="column">
      <Text dimColor>Use ↑/↓ to navigate, enter to pick, q to save & quit.</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={(i) => onPick(i.value as string)} />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Write Segments screen**

`src/tui/screens/Segments.tsx`:
```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Config } from "../../core/config.js";
import { SEGMENTS } from "../../segments/index.js";

export function SegmentsScreen({ config, onChange, onBack }: { config: Config; onChange: (c: Config) => void; onBack: () => void }): React.ReactElement {
  const all = SEGMENTS;
  const [cursor, setCursor] = useState(0);
  const enabledIds = new Set(config.segments.map((s) => s.id));

  useInput((input, key) => {
    if (key.escape) return onBack();
    if (key.upArrow || input === "k") setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow || input === "j") setCursor((c) => Math.min(all.length - 1, c + 1));
    if (input === " ") {
      const id = all[cursor].id;
      const next = enabledIds.has(id)
        ? config.segments.filter((s) => s.id !== id)
        : [...config.segments, { id, options: {} }];
      onChange({ ...config, segments: next });
    }
    if (input === "[" || input === "]") {
      const id = all[cursor].id;
      const idx = config.segments.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const target = idx + (input === "]" ? 1 : -1);
      if (target < 0 || target >= config.segments.length) return;
      const next = [...config.segments];
      [next[idx], next[target]] = [next[target], next[idx]];
      onChange({ ...config, segments: next });
    }
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>space toggle · [ ] reorder enabled · esc back</Text>
      <Box marginTop={1} flexDirection="column">
        {all.map((s, i) => {
          const on = enabledIds.has(s.id);
          const indicator = on ? "●" : "○";
          const arrow = i === cursor ? "▶" : " ";
          const order = on ? config.segments.findIndex((e) => e.id === s.id) + 1 : "";
          return (
            <Text key={s.id} color={i === cursor ? "cyan" : undefined}>
              {arrow} {indicator} {String(order).padStart(2)} · {s.label} ({s.id})
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Write Theme screen**

`src/tui/screens/Theme.tsx`:
```tsx
import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { Config } from "../../core/config.js";
import { THEMES } from "../../themes/index.js";
import { LivePreview } from "../components/LivePreview.js";

export function ThemeScreen({ config, onChange, onBack }: { config: Config; onChange: (c: Config) => void; onBack: () => void }): React.ReactElement {
  const items = THEMES.map((t) => ({ label: t.name + (t.id === config.theme ? "  ✓" : ""), value: t.id }));
  return (
    <Box flexDirection="column">
      <Text dimColor>Pick a theme. Live preview updates as you arrow through.</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onHighlight={(i) => onChange({ ...config, theme: (i.value as string) })}
          onSelect={() => onBack()}
        />
      </Box>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Write Brand screen**

`src/tui/screens/Brand.tsx`:
```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Config } from "../../core/config.js";
import { LivePreview } from "../components/LivePreview.js";

export function BrandScreen({ config, onChange, onBack }: { config: Config; onChange: (c: Config) => void; onBack: () => void }): React.ReactElement {
  const [field, setField] = useState<"glyph" | "label">("glyph");
  const [glyph, setGlyph] = useState(config.brand.glyph);
  const [label, setLabel] = useState(config.brand.label);

  useInput((_, key) => {
    if (key.escape) onBack();
    if (key.tab) setField((f) => (f === "glyph" ? "label" : "glyph"));
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>tab cycles fields · enter commits the field · esc back</Text>
      <Box marginTop={1}>
        <Text>Glyph: </Text>
        {field === "glyph" ? (
          <TextInput
            value={glyph}
            onChange={setGlyph}
            onSubmit={(v) => onChange({ ...config, brand: { ...config.brand, glyph: v } })}
          />
        ) : (
          <Text>{glyph}</Text>
        )}
      </Box>
      <Box>
        <Text>Label: </Text>
        {field === "label" ? (
          <TextInput
            value={label}
            onChange={setLabel}
            onSubmit={(v) => onChange({ ...config, brand: { ...config.brand, label: v } })}
          />
        ) : (
          <Text>{label}</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 5: Write Preview screen**

`src/tui/screens/Preview.tsx`:
```tsx
import React from "react";
import { Box, Text, useInput } from "ink";
import type { Config } from "../../core/config.js";
import { LivePreview } from "../components/LivePreview.js";

export function PreviewScreen({ config, onBack }: { config: Config; onBack: () => void }): React.ReactElement {
  useInput((_, key) => {
    if (key.escape || key.return) onBack();
  });
  return (
    <Box flexDirection="column">
      <Text bold>Full preview</Text>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>esc or enter to go back</Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 6: Wire screens into App**

Replace `src/tui/App.tsx` body with:

```tsx
import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { Config } from "../core/config.js";
import { saveConfig } from "../core/config.js";
import { Home } from "./screens/Home.js";
import { SegmentsScreen } from "./screens/Segments.js";
import { ThemeScreen } from "./screens/Theme.js";
import { BrandScreen } from "./screens/Brand.js";
import { PreviewScreen } from "./screens/Preview.js";

type Screen = "home" | "segments" | "theme" | "brand" | "preview";

export function App({ initial }: { initial: Config }): React.ReactElement {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState<Config>(initial);

  useInput((input, key) => {
    if (screen === "home" && (key.escape || input === "q")) {
      saveConfig(config);
      exit();
    }
  });

  const back = () => setScreen("home");

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">⬢ ccstatusline — config</Text>
      <Box marginTop={1}>
        {screen === "home" && (
          <Home
            onPick={(s) => {
              if (s === "quit") {
                saveConfig(config);
                exit();
              } else {
                setScreen(s as Screen);
              }
            }}
          />
        )}
        {screen === "segments" && <SegmentsScreen config={config} onChange={setConfig} onBack={back} />}
        {screen === "theme" && <ThemeScreen config={config} onChange={setConfig} onBack={back} />}
        {screen === "brand" && <BrandScreen config={config} onChange={setConfig} onBack={back} />}
        {screen === "preview" && <PreviewScreen config={config} onBack={back} />}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 7: Smoke test (build only)**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 8: Commit**

```bash
git add src/tui/screens/*.tsx src/tui/App.tsx
git commit -m "feat(tui): add Home, Segments, Theme, Brand, Preview screens"
```

---

## Task 23: bin/configure — TUI entry

**Files:**
- Create: `src/bin/configure.ts`
- Create: `tests/tui/smoke.test.tsx`

- [ ] **Step 1: Write configure entry**

`src/bin/configure.ts`:
```ts
#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "../tui/App.js";
import { loadConfig } from "../core/config.js";

const config = loadConfig();
render(<App initial={config} />);
```

- [ ] **Step 2: Write smoke test**

`tests/tui/smoke.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../../src/tui/App.js";
import { DEFAULT_CONFIG } from "../../src/core/config.js";

describe("TUI smoke", () => {
  it("mounts without throwing", () => {
    const { lastFrame, unmount } = render(<App initial={DEFAULT_CONFIG} />);
    expect(lastFrame()).toContain("ccstatusline");
    unmount();
  });
});
```

- [ ] **Step 3: Run test + build**

```bash
npm test -- tests/tui/smoke.test.tsx
npm run build
```

Expected: PASS (1/1) and clean build.

- [ ] **Step 4: Commit**

```bash
git add src/bin/configure.ts tests/tui/smoke.test.tsx
git commit -m "feat(bin): add configure entry (Ink TUI)"
```

---

## Task 24: Plugin manifest + marketplace + plugin settings

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.claude-plugin/marketplace.json`
- Create: `.claude-plugin/settings.json`

- [ ] **Step 1: Write plugin.json**

```json
{
  "name": "ccstatusline",
  "displayName": "CC Status Line",
  "version": "0.1.0",
  "description": "Modern, themed status line for Claude Code with configurable segments and team branding.",
  "author": "mohamadfala",
  "homepage": "https://github.com/mohamadfala/ccstatusline",
  "license": "MIT",
  "commands": ["ccstatusline-config", "ccstatusline-setup"]
}
```

- [ ] **Step 2: Write marketplace.json**

```json
{
  "name": "mohamadfala-marketplace",
  "owner": "mohamadfala",
  "plugins": [
    {
      "name": "ccstatusline",
      "source": "github:mohamadfala/ccstatusline",
      "description": "Modern, themed status line for Claude Code"
    }
  ]
}
```

- [ ] **Step 3: Write plugin-level settings.json**

```json
{
  "subagentStatusLine": {
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_ROOT}/dist/bin/statusline.js",
    "padding": 1
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/
git commit -m "feat(plugin): add manifest, marketplace, and subagentStatusLine config"
```

---

## Task 25: bin shim + slash command markdown

**Files:**
- Create: `bin/ccstatusline`
- Create: `commands/ccstatusline-config.md`
- Create: `commands/ccstatusline-setup.md`

- [ ] **Step 1: Write bin shim**

`bin/ccstatusline`:
```bash
#!/usr/bin/env bash
# Shim: forwards to dist/bin/statusline.js relative to plugin root.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/dist/bin/statusline.js" "$@"
```

Make executable:

```bash
chmod +x bin/ccstatusline
```

- [ ] **Step 2: Write `commands/ccstatusline-config.md`**

```markdown
---
description: Open the ccstatusline configuration TUI to toggle segments, switch theme, edit brand
---

Run `node "$CLAUDE_PLUGIN_ROOT/dist/bin/configure.js"` in an interactive terminal to launch the ccstatusline configuration TUI.

The TUI lets you:
- Toggle segments on/off and reorder them
- Switch between the 5 themes with live preview
- Edit the brand glyph and label (default `⬢ Logisoft`)
- Save changes — they take effect on the next status line tick
```

- [ ] **Step 3: Write `commands/ccstatusline-setup.md`**

```markdown
---
description: Patch ~/.claude/settings.json to wire the ccstatusline binary into Claude Code's status line
---

Run `node "$CLAUDE_PLUGIN_ROOT/dist/bin/setup.js"` once after installing the plugin.

It will:
1. Detect this plugin's absolute path on disk
2. Read your existing `~/.claude/settings.json` (preserving every other setting)
3. Add (or replace) the `statusLine` block pointing to ccstatusline
4. Back up the previous settings file as `settings.json.bak-<timestamp>`

The setup is idempotent — running it again replaces the block and creates a fresh backup.
```

- [ ] **Step 4: Commit**

```bash
git add bin/ccstatusline commands/
git commit -m "feat(plugin): add bin shim + slash command definitions"
```

---

## Task 26: Build artifacts checked in for plugin install

**Files:**
- Modify: `.gitignore` (un-ignore `dist/`)
- Build + commit `dist/`

The plugin is installed by cloning the repo. Without committed build output, users would need `npm install` post-install. Simpler: ship the build.

- [ ] **Step 1: Remove `dist/` from `.gitignore`**

Edit `.gitignore` — remove the line `dist/`.

- [ ] **Step 2: Run a fresh build**

```bash
rm -rf dist/ && npm run build
```

Expected: `dist/` populated with compiled JS for all entry points.

- [ ] **Step 3: Commit dist + the .gitignore change**

```bash
git add .gitignore dist/
git commit -m "build: ship compiled dist/ for plugin install"
```

---

## Task 27: README + repo polish

**Files:**
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write LICENSE (MIT)**

```
MIT License

Copyright (c) 2026 Mohamad Fala

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Write README.md**

```markdown
# ccstatusline

A modern, themed Claude Code status line — 16 segments, 5 themes, configurable through an interactive TUI, distributed as a Claude Code plugin.

![preview](docs/preview.png)

## Install

```bash
claude plugin marketplace add github:mohamadfala/ccstatusline
claude plugin install ccstatusline
/ccstatusline-setup
```

That's it. The setup command patches `~/.claude/settings.json` and the status line shows up on the next interaction.

## Configure

```bash
/ccstatusline-config
```

Opens an interactive TUI. Toggle segments, reorder them, switch themes, edit the brand glyph and label.

Config lives at `~/.config/ccstatusline/config.json` and is hand-editable.

## Segments

| ID | Description |
|---|---|
| `logo` | Brand glyph + label (default `⬢ Logisoft`) |
| `model` | Active Claude model |
| `context` | Context % + raw token usage with progress bar |
| `cost` | Session cost in USD |
| `tokens` | Tokens in/out |
| `branch` | Git branch + dirty marker |
| `dir` | Working directory basename |
| `burn` | $/hour burn rate |
| `elapsed` | Session duration |
| `git_ahead` | Commits ahead/behind upstream |
| `output_style` | Active output style |
| `version` | Claude Code version + update warning |
| `todos` | TodoWrite progress |
| `time` | Local clock |
| `battery` | Laptop battery % (Mac/Win/Linux) |
| `api_health` | Anthropic API reachability |
| `custom` | Run a user-defined shell command |

## Themes

`minimalist` (default), `powerline`, `pills`, `underline`, `multiline`.

## Adding a new segment

1. Create `src/segments/<id>.ts` exporting a `Segment` object.
2. Register it in `src/segments/index.ts`.
3. Add a test under `tests/segments/`.

That's the entire contract. Themes need no changes — they consume `Chunk[]` abstractly.

## Adding a new theme

1. Create `src/themes/<id>.ts` exporting a `Theme` object.
2. Register it in `src/themes/index.ts`.

## Development

```bash
npm install
npm test
npm run build
```

CI runs on macOS, Linux, and Windows against Node 20 and 22.

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: add README + MIT license"
```

---

## Task 28: End-to-end manual verification

- [ ] **Step 1: Run the full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Smoke-test the binary**

```bash
echo '{"model":{"display_name":"Opus 4.7"},"context_window":{"used_percentage":47,"context_window_size":200000,"total_input_tokens":12300,"total_output_tokens":34500},"cost":{"total_cost_usd":0.42,"total_duration_ms":1380000},"workspace":{"current_dir":"'"$PWD"'"}}' | node dist/bin/statusline.js
echo
```

Expected: a single colored line containing `⬢ Logisoft`, `Opus 4.7`, a context bar with `47%`, `$0.42`, branch info, and `ccstatusline`.

- [ ] **Step 4: Smoke-test setup (against a temp settings.json)**

```bash
TMPDIR_RUN=$(mktemp -d)
node -e "import('./dist/bin/setup.js').then(m=>m.patchSettings({settingsFile:'$TMPDIR_RUN/settings.json',pluginRoot:process.cwd()}))"
cat "$TMPDIR_RUN/settings.json"
rm -rf "$TMPDIR_RUN"
```

Expected: prints a JSON file containing a `statusLine` block with absolute path to the local repo's `dist/bin/statusline.js`.

---

## Task 29: Push to GitHub

- [ ] **Step 1: Push main**

```bash
cd /Users/mohamadfala/Projects/ccstatusline
git push -u origin main
```

Expected: branch `main` pushed; CI starts on GitHub.

- [ ] **Step 2: Tag release**

```bash
git tag -a v0.1.0 -m "v0.1.0 — initial release"
git push origin v0.1.0
```

Expected: tag visible on https://github.com/mohamadfala/ccstatusline/tags.

- [ ] **Step 3: Verify**

Open https://github.com/mohamadfala/ccstatusline — README renders, all directories present, GH Actions running.

---

## Self-review notes (post-write)

- All 16 spec segments + custom shell are covered (Tasks 7–11).
- All 5 themes covered (Tasks 13–17).
- Plugin manifest + marketplace + plugin settings covered (Task 24).
- Setup command idempotency tested (Task 20).
- Cross-platform CI matrix in place (Task 2).
- TUI smoke test exists; full TUI flows are exempted from automated coverage per spec §10.
- Build artifacts shipped via committed `dist/` (Task 26) so plugin install works without a post-install build step.
- Type names match across tasks: `Segment`, `Chunk`, `Theme`, `ThemeContext`, `StatusContext`, `Config` defined once (Tasks 3–4) and used throughout.
- No placeholders, no "implement later" text. Every code step has full code.
