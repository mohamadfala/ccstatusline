import { cached } from "../core/cache.js";
import { probeGit } from "./_git.js";
export const gitAheadSegment = {
    id: "git_ahead",
    label: "Git ahead/behind",
    group: "git",
    cost: "expensive",
    ttl: 2000,
    async render(ctx) {
        const { value } = await cached(`git:${ctx.cwd}`, this.ttl ?? 2000, async () => probeGit(ctx.cwd));
        if (!value || !value.inRepo)
            return null;
        if (!value.ahead && !value.behind)
            return null;
        return { text: `↑${value.ahead ?? 0} ↓${value.behind ?? 0}`, kind: "muted" };
    }
};
