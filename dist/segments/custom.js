import { execSync } from "node:child_process";
export const customSegment = {
    id: "custom",
    label: "Custom shell command",
    group: "custom",
    cost: "expensive",
    ttl: 5000,
    defaults: { command: "", kind: "muted", timeoutMs: 1500 },
    render(_ctx, opts) {
        const cmd = opts.command ?? "";
        if (!cmd)
            return null;
        const timeout = opts.timeoutMs ?? 1500;
        try {
            const out = execSync(cmd, {
                encoding: "utf8",
                timeout,
                stdio: ["ignore", "pipe", "ignore"]
            }).trim();
            if (!out)
                return null;
            return { text: out, kind: opts.kind ?? "muted" };
        }
        catch {
            return null;
        }
    }
};
