import { cached } from "../core/cache.js";
async function probe() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    try {
        const res = await fetch("https://api.anthropic.com/v1/health", {
            signal: ctrl.signal,
            method: "HEAD"
        });
        return res.status < 500;
    }
    catch {
        return false;
    }
    finally {
        clearTimeout(t);
    }
}
export const apiHealthSegment = {
    id: "api_health",
    label: "API health",
    group: "system",
    cost: "expensive",
    ttl: 30_000,
    async render() {
        const { value } = await cached("api-health", this.ttl ?? 30_000, probe);
        if (value === null)
            return null;
        return value
            ? { text: "● API", kind: "good" }
            : { text: "● API", kind: "bad" };
    }
};
