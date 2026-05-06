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
    // Use a fresh cwd path to avoid the cache hit from the first test
    const ctx = parseStdin(JSON.stringify({ workspace: { current_dir: repo + "/." } }));
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
