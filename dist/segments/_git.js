import { execFileSync } from "node:child_process";
function tryExec(args, cwd) {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"]
        }).trim();
    }
    catch {
        return null;
    }
}
export function probeGit(cwd) {
    const branch = tryExec(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
    if (!branch)
        return { inRepo: false };
    const status = tryExec(["status", "--porcelain"], cwd) ?? "";
    const dirty = status.length > 0;
    const counts = tryExec(["rev-list", "--left-right", "--count", `${branch}...@{u}`], cwd);
    let ahead = 0;
    let behind = 0;
    if (counts) {
        const [a, b] = counts.split(/\s+/).map((n) => parseInt(n, 10));
        if (Number.isFinite(a))
            ahead = a;
        if (Number.isFinite(b))
            behind = b;
    }
    return { inRepo: true, branch, dirty, ahead, behind };
}
