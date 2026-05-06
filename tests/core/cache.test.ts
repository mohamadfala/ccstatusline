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
