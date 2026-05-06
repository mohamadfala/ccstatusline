import { basename } from "node:path";
export const dirSegment = {
    id: "dir",
    label: "Working directory",
    group: "session",
    cost: "cheap",
    render(ctx) {
        return { text: basename(ctx.cwd), kind: "muted" };
    }
};
