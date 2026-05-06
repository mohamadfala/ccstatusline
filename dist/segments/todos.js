import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export const todosSegment = {
    id: "todos",
    label: "Todo progress",
    group: "session",
    cost: "cheap",
    render(ctx) {
        if (!ctx.sessionId)
            return null;
        const candidates = [
            join(homedir(), ".claude", "todos", `${ctx.sessionId}.json`),
            join(homedir(), ".claude", "projects", "todos", `${ctx.sessionId}.json`)
        ];
        for (const p of candidates) {
            if (!existsSync(p))
                continue;
            try {
                const data = JSON.parse(readFileSync(p, "utf8"));
                const todos = data.todos ?? [];
                if (todos.length === 0)
                    return null;
                const done = todos.filter((t) => t.status === "completed").length;
                return {
                    text: `☑ ${done}/${todos.length}`,
                    kind: done === todos.length ? "good" : "muted"
                };
            }
            catch {
                return null;
            }
        }
        return null;
    }
};
