export function parseStdin(json) {
    let raw = {};
    try {
        raw = JSON.parse(json);
    }
    catch {
        raw = {};
    }
    const totalDuration = raw.cost?.total_duration_ms ?? 0;
    return {
        raw,
        cwd: raw.workspace?.current_dir ?? raw.cwd ?? process.cwd(),
        model: {
            id: raw.model?.id ?? "unknown",
            displayName: raw.model?.display_name ?? "Claude"
        },
        cost: {
            totalUsd: raw.cost?.total_cost_usd ?? 0,
            durationMs: totalDuration,
            apiDurationMs: raw.cost?.total_api_duration_ms ?? 0
        },
        ctx: (() => {
            const cu = raw.context_window?.current_usage;
            const cwSize = raw.context_window?.context_window_size ?? 200_000;
            const pct = raw.context_window?.used_percentage ?? 0;
            const usedFromCurrent = cu
                ? (cu.input_tokens ?? 0) +
                    (cu.cache_creation_input_tokens ?? 0) +
                    (cu.cache_read_input_tokens ?? 0)
                : undefined;
            const used = usedFromCurrent ?? Math.round((pct / 100) * cwSize);
            return {
                used,
                total: cwSize,
                pct,
                remainingPct: raw.context_window?.remaining_percentage ?? 100 - pct,
                inputTokens: raw.context_window?.total_input_tokens ?? 0,
                outputTokens: raw.context_window?.total_output_tokens ?? 0
            };
        })(),
        outputStyle: raw.output_style?.name,
        version: raw.version,
        worktree: raw.worktree?.name
            ? { name: raw.worktree.name, branch: raw.worktree.branch }
            : raw.workspace?.git_worktree
                ? { name: raw.workspace.git_worktree }
                : undefined,
        sessionId: raw.session_id,
        startedAt: Date.now() - totalDuration
    };
}
