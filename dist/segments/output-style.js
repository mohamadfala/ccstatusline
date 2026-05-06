export const outputStyleSegment = {
    id: "output_style",
    label: "Output style",
    group: "session",
    cost: "cheap",
    render(ctx) {
        if (!ctx.outputStyle)
            return null;
        return { text: ctx.outputStyle, kind: "muted" };
    }
};
