---
description: Patch ~/.claude/settings.json to wire the ccstatusline binary into Claude Code's status line
---

Run `node "$CLAUDE_PLUGIN_ROOT/dist/bin/setup.js"` once after installing the plugin.

It will:
1. Detect this plugin's absolute path on disk
2. Read your existing `~/.claude/settings.json` (preserving every other setting)
3. Add (or replace) the `statusLine` block pointing to ccstatusline
4. Back up the previous settings file as `settings.json.bak-<timestamp>`

The setup is idempotent — running it again replaces the block and creates a fresh backup.
