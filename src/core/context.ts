export interface ClaudeStdinPayload {
  cwd?: string;
  session_id?: string;
  session_name?: string;
  transcript_path?: string;
  version?: string;
  model?: { id?: string; display_name?: string };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
    added_dirs?: string[];
    git_worktree?: string;
  };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    used_percentage?: number;
    remaining_percentage?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
    };
  };
  output_style?: { name?: string };
  effort?: { level?: string };
  thinking?: { enabled?: boolean };
  exceeds_200k_tokens?: boolean;
  worktree?: {
    name?: string;
    path?: string;
    branch?: string;
    original_cwd?: string;
    original_branch?: string;
  };
}

export interface StatusContext {
  raw: ClaudeStdinPayload;
  cwd: string;
  model: { id: string; displayName: string };
  cost: { totalUsd: number; durationMs: number; apiDurationMs: number };
  ctx: {
    used: number;          // tokens currently in the context window (current API call)
    total: number;         // context window size
    pct: number;           // CC's pre-calculated used percentage
    remainingPct: number;
    inputTokens: number;   // cumulative session input
    outputTokens: number;  // cumulative session output
  };
  outputStyle?: string;
  version?: string;
  worktree?: { name: string; branch?: string };
  sessionId?: string;
  startedAt: number;
}

export function parseStdin(json: string): StatusContext {
  let raw: ClaudeStdinPayload = {};
  try {
    raw = JSON.parse(json) as ClaudeStdinPayload;
  } catch {
    raw = {};
  }
  const totalDuration = raw.cost?.total_duration_ms ?? 0;
  return {
    raw,
    cwd: raw.workspace?.current_dir ?? raw.cwd ?? process.cwd(),
    model: {
      id: raw.model?.id ?? "unknown",
      displayName: raw.model?.display_name ?? "Claude"
    },
    cost: {
      totalUsd: raw.cost?.total_cost_usd ?? 0,
      durationMs: totalDuration,
      apiDurationMs: raw.cost?.total_api_duration_ms ?? 0
    },
    ctx: (() => {
      const cu = raw.context_window?.current_usage;
      const cwSize = raw.context_window?.context_window_size ?? 200_000;
      const pct = raw.context_window?.used_percentage ?? 0;
      const usedFromCurrent = cu
        ? (cu.input_tokens ?? 0) +
          (cu.cache_creation_input_tokens ?? 0) +
          (cu.cache_read_input_tokens ?? 0)
        : undefined;
      const used = usedFromCurrent ?? Math.round((pct / 100) * cwSize);
      return {
        used,
        total: cwSize,
        pct,
        remainingPct: raw.context_window?.remaining_percentage ?? 100 - pct,
        inputTokens: raw.context_window?.total_input_tokens ?? 0,
        outputTokens: raw.context_window?.total_output_tokens ?? 0
      };
    })(),
    outputStyle: raw.output_style?.name,
    version: raw.version,
    worktree: raw.worktree?.name
      ? { name: raw.worktree.name, branch: raw.worktree.branch }
      : raw.workspace?.git_worktree
        ? { name: raw.workspace.git_worktree }
        : undefined,
    sessionId: raw.session_id,
    startedAt: Date.now() - totalDuration
  };
}
