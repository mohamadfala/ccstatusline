#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export function patchSettings(opts = {}) {
    const file = opts.settingsFile ?? join(homedir(), ".claude", "settings.json");
    const pluginRoot = opts.pluginRoot ?? resolve(__dirname, "..", "..");
    const refreshInterval = opts.refreshInterval ?? 5;
    const padding = opts.padding ?? 1;
    const command = `node ${join(pluginRoot, "dist", "bin", "statusline.js").replace(/\\/g, "/")}`;
    const block = { type: "command", command, refreshInterval, padding };
    let json = {};
    let backup;
    if (existsSync(file)) {
        const raw = readFileSync(file, "utf8");
        try {
            json = JSON.parse(raw);
        }
        catch (err) {
            throw new Error(`existing ${file} is not valid JSON; refusing to overwrite (${err.message})`);
        }
        backup = `${file}.bak-${Date.now()}`;
        copyFileSync(file, backup);
    }
    else {
        mkdirSync(dirname(file), { recursive: true });
    }
    json["statusLine"] = block;
    writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
    return { written: true, backup };
}
if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const result = patchSettings();
        process.stdout.write(`✓ Patched ${join(homedir(), ".claude", "settings.json")}\n`);
        if (result.backup)
            process.stdout.write(`  Backup: ${result.backup}\n`);
        process.stdout.write(`Run /ccstatusline-config to customize. Restart Claude Code or wait for the next interaction to see the status line.\n`);
    }
    catch (err) {
        process.stderr.write(`✗ Setup failed: ${err.message}\n`);
        process.exit(1);
    }
}
