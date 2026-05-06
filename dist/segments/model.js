export const modelSegment = {
    id: "model",
    label: "Model",
    group: "core",
    cost: "cheap",
    render(ctx) {
        return { text: ctx.model.displayName, kind: "model" };
    }
};
