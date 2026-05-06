import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR } from "./paths.js";
const inflight = new Map();
export function cacheKey(key) {
    return createHash("sha1").update(key).digest("hex").slice(0, 16);
}
export function readCache(key, dir = CACHE_DIR) {
    try {
        const file = join(dir, cacheKey(key) + ".json");
        return JSON.parse(readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
export function writeCache(key, value, dir = CACHE_DIR, now = Date.now) {
    mkdirSync(dir, { recursive: true });
    const file = join(dir, cacheKey(key) + ".json");
    writeFileSync(file, JSON.stringify({ value, computedAt: now() }), "utf8");
}
export async function cached(key, ttlMs, compute, opts = {}) {
    const dir = opts.dir ?? CACHE_DIR;
    const now = opts.now ?? (() => Date.now());
    const entry = readCache(key, dir);
    if (entry && now() - entry.computedAt <= ttlMs) {
        return { value: entry.value, stale: false };
    }
    if (entry) {
        if (!inflight.has(key)) {
            inflight.set(key, compute()
                .then((v) => writeCache(key, v, dir, now))
                .catch(() => undefined)
                .finally(() => inflight.delete(key)));
        }
        return { value: entry.value, stale: true };
    }
    try {
        const value = await compute();
        writeCache(key, value, dir, now);
        return { value, stale: false };
    }
    catch {
        return { value: null, stale: true };
    }
}
