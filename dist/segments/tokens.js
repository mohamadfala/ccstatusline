function compact(n) {
    if (n >= 1_000_000)
        return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1000)
        return (n / 1000).toFixed(1) + "K";
    return String(n);
}
export const tokensSegment = {
    id: "tokens",
    label: "Tokens in/out",
    group: "session",
    cost: "cheap",
    render(ctx) {
        return {
            text: `↑${compact(ctx.ctx.inputTokens)} ↓${compact(ctx.ctx.outputTokens)}`,
            kind: "muted"
        };
    }
};
