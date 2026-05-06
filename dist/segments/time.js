export const timeSegment = {
    id: "time",
    label: "Clock",
    group: "system",
    cost: "cheap",
    render() {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return { text: `${hh}:${mm}`, kind: "muted" };
    }
};
