import { cached } from "../core/cache.js";
import { probeGit } from "./_git.js";
export const branchSegment = {
    id: "branch",
    label: "Git branch",
    group: "git",
    cost: "expensive",
    ttl: 2000,
    defaults: { showDirty: true },
    async render(ctx, opts) {
        const showDirty = opts.showDirty ?? true;
        const { value } = await cached(`git:${ctx.cwd}`, this.ttl ?? 2000, async () => probeGit(ctx.cwd));
        if (!value || !value.inRepo)
            return null;
        const dirty = showDirty && value.dirty ? "*" : "";
        return { text: ` ${value.branch}${dirty}`, kind: "accent" };
    }
};
