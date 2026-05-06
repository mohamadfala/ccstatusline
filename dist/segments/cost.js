export const costSegment = {
    id: "cost",
    label: "Session cost",
    group: "core",
    cost: "cheap",
    render(ctx) {
        const usd = ctx.cost.totalUsd;
        return { text: `$${usd.toFixed(2)}`, kind: "warn" };
    }
};
