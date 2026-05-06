#!/usr/bin/env node
import { loadConfig } from "../core/config.js";
import { parseStdin } from "../core/context.js";
import { renderStatus } from "../render.js";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  try {
    const [stdin, config] = await Promise.all([readStdin(), Promise.resolve(loadConfig())]);
    const ctx = parseStdin(stdin);
    const out = await renderStatus(ctx, config);
    process.stdout.write(out);
  } catch (err) {
    if (process.env.CCSL_DEBUG) {
      process.stderr.write(`[ccsl] fatal: ${(err as Error).stack}\n`);
    }
    process.stdout.write("⬢ Logisoft  (status error)");
  }
}

main();
