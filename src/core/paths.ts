import envPaths from "env-paths";
import { homedir } from "node:os";
import { join } from "node:path";

const paths = envPaths("ccstatusline", { suffix: "" });

export const CONFIG_DIR = paths.config;
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");
export const CACHE_DIR = paths.cache;
export const CC_SETTINGS_FILE = join(homedir(), ".claude", "settings.json");
