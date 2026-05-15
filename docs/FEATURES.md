# pi-agent-hub Features

`pi-agent-hub` keeps Pi coding-agent sessions alive in tmux and gives them a calm keyboard-driven dashboard.

## Daily loop

```text
pi-hub
  ↓
pick a session
  ↓
Enter to open/switch
  ↓
work in Pi
  ↓
Ctrl+Q returns to the dashboard
```

## Core capabilities

| Capability | How to use it | Why it matters |
| --- | --- | --- |
| Long-running sessions | `n` creates, `Enter` opens | Sessions keep running in tmux instead of disappearing with a terminal. |
| Dashboard return | `Ctrl+Q` inside a managed session | Jump back to the hub without stopping the agent. |
| In-session rename | `Alt+R` inside a managed session | Rename the current session from context, then return to it. |
| Stable grouping/order | `g`, `G`, `K`, `J` | Keep sessions organized without status/title resorting. |
| Multi-repo sessions | `Alt+A` in the new-session form | Work across repos through a symlink workspace without creating worktrees. |
| Project Skills | `s` picker | Attach Pi skills to the selected session's primary repo. |
| Project MCP servers | `m` picker | Enable MCP tools for the selected session's primary repo. |
| Subagent rows | Automatic when `pi-tmux-subagents` reports them | See child agent work nested under the parent session. |

## Status vocabulary

```text
● running or starting
◐ waiting for you
○ idle/read
× error
- stopped
```

Zero counts are hidden in the dashboard summaries, so `◐2 ×1` means only waiting and error sessions are currently visible.

## Project-scoped Skills and MCP

Skills and MCP state attach to the selected session's primary repo:

```text
<project>/.pi/sessions/skills.json
<project>/.pi/sessions/mcp.json
```

For multi-repo sessions, extra repos are available in the runtime workspace, but Skills/MCP still belong to the primary repo. Restart the session after changing Skills or MCP so Pi reloads tools.

## Multi-repo model

Extra repos are symlinked into a per-session runtime workspace:

```text
<PI_AGENT_HUB_DIR>/workspaces/<session-id>/
  primary-repo -> /path/to/primary
  extra-repo   -> /path/to/extra
  .pi          -> /path/to/primary/.pi
```

Source repos are not moved, cloned, or owned by `pi-agent-hub`.

## Non-goals

`pi-agent-hub` intentionally stays small:

- no cloud service;
- no custom agent runtime;
- no repo filesystem scanning;
- no worktree management;
- no Agent Deck remotes/tools registry clone.

Pi runs the agents. tmux keeps them alive. The hub gives you one stable place to see and steer them.
