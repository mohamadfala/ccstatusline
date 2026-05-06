import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform } from "node:os";
import { cached } from "../core/cache.js";
function readBattery() {
    const p = platform();
    try {
        if (p === "darwin") {
            const out = execFileSync("pmset", ["-g", "batt"], { encoding: "utf8" });
            const m = out.match(/(\d+)%; (charging|discharging|charged|finishing charge|AC attached)/i);
            if (!m)
                return null;
            return { pct: parseInt(m[1], 10), charging: !/discharging/i.test(m[2]) };
        }
        if (p === "win32") {
            const out = execFileSync("powershell", [
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_Battery | Select -First 1) | ConvertTo-Json -Compress"
            ], { encoding: "utf8" });
            const obj = JSON.parse(out);
            if (typeof obj.EstimatedChargeRemaining !== "number")
                return null;
            return { pct: obj.EstimatedChargeRemaining, charging: obj.BatteryStatus === 2 };
        }
        if (p === "linux") {
            const cap = readFileSync("/sys/class/power_supply/BAT0/capacity", "utf8").trim();
            const status = readFileSync("/sys/class/power_supply/BAT0/status", "utf8").trim();
            return { pct: parseInt(cap, 10), charging: /charging|full/i.test(status) };
        }
    }
    catch {
        return null;
    }
    return null;
}
export const batterySegment = {
    id: "battery",
    label: "Battery",
    group: "system",
    cost: "expensive",
    ttl: 5000,
    async render(_ctx) {
        const { value } = await cached("battery", this.ttl ?? 5000, async () => readBattery());
        if (!value)
            return null;
        const icon = value.charging ? "🔌" : "🔋";
        const kind = value.pct < 20 ? "bad" : value.pct < 50 ? "warn" : "good";
        return { text: `${icon} ${value.pct}%`, kind };
    }
};
