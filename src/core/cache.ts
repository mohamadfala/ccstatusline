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

export function writeCache<T>(key: string, value: T, dir = CACHE_DIR, now = Date.now): void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, cacheKey(key) + ".json");
  writeFileSync(file, JSON.stringify({ value, computedAt: now() }), "utf8");
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
          .then((v) => writeCache<T>(key, v, dir, now))
          .catch(() => undefined)
          .finally(() => inflight.delete(key))
      );
    }
    return { value: entry.value, stale: true };
  }
  try {
    const value = await compute();
    writeCache<T>(key, value, dir, now);
    return { value, stale: false };
  } catch {
    return { value: null, stale: true };
  }
}
