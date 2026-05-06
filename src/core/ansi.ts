import type { SegmentKind } from "../segments/types.js";

const ESC = "\x1b";
export const RESET = `${ESC}[0m`;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const PALETTE: Record<SegmentKind, RGB> = {
  logo: { r: 165, g: 180, b: 252 },
  model: { r: 147, g: 197, b: 253 },
  metric: { r: 229, g: 231, b: 235 },
  good: { r: 134, g: 239, b: 172 },
  warn: { r: 252, g: 211, b: 77 },
  bad: { r: 248, g: 113, b: 113 },
  muted: { r: 107, g: 114, b: 128 },
  accent: { r: 249, g: 168, b: 212 }
};

export function detectTruecolor(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR) return false;
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit") return true;
  if (env.WT_SESSION) return true;
  if (
    env.TERM_PROGRAM === "iTerm.app" ||
    env.TERM_PROGRAM === "vscode" ||
    env.TERM_PROGRAM === "WezTerm"
  ) {
    return true;
  }
  return false;
}

export function fg({ r, g, b }: RGB, truecolor: boolean): string {
  if (!truecolor) {
    const code = rgbTo256(r, g, b);
    return `${ESC}[38;5;${code}m`;
  }
  return `${ESC}[38;2;${r};${g};${b}m`;
}

export function bg({ r, g, b }: RGB, truecolor: boolean): string {
  if (!truecolor) {
    const code = rgbTo256(r, g, b);
    return `${ESC}[48;5;${code}m`;
  }
  return `${ESC}[48;2;${r};${g};${b}m`;
}

export function bold(s: string): string {
  return `${ESC}[1m${s}${ESC}[22m`;
}

export function underline(s: string): string {
  return `${ESC}[4m${s}${ESC}[24m`;
}

export function colorize(text: string, kind: SegmentKind, truecolor: boolean): string {
  const c = PALETTE[kind];
  return `${fg(c, truecolor)}${text}${RESET}`;
}

function rgbTo256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  return (
    16 +
    36 * Math.round((r / 255) * 5) +
    6 * Math.round((g / 255) * 5) +
    Math.round((b / 255) * 5)
  );
}

export function visibleLength(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

export function terminalWidth(env: NodeJS.ProcessEnv = process.env): number {
  if (process.stdout && typeof process.stdout.columns === "number" && process.stdout.columns > 0) {
    return process.stdout.columns;
  }
  const c = parseInt(env.COLUMNS ?? "", 10);
  return Number.isFinite(c) && c > 0 ? c : 120;
}
