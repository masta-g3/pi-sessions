# pi-command-center Foundation — Completed 2026-05-02

## Summary

Built `pi-command-center` as a separate TypeScript npm/Pi package for managing Pi sessions in tmux. The implementation stays Pi-native: Pi remains the agent runtime, tmux remains the process substrate, and the package supplies only the registry, TUI, lifecycle actions, skills integration, MCP bridge, and heartbeat extension.

## Implemented

- npm package with `pi-center` CLI, TypeScript ESM build, package metadata, local Pi package extension declaration, and smoke script.
- JSON-backed registry and runtime paths under `PI_CENTER_DIR` or `<PI_CODING_AGENT_DIR>/command-center`.
- tmux lifecycle actions for list, add/start, stop, restart, fork, doctor, and MCP pool daemon.
- Pi process argument construction for new, resume, and forked sessions.
- Pi extension that writes per-session heartbeats and registers enabled MCP tools.
- Status reducer for running, waiting, idle, starting, stopped, and error states, including stale/missing heartbeat behavior.
- Standalone TUI with groups, status counts, preview from `tmux capture-pane`, filtering, attach/switch instructions, restart confirmation, new/fork flows, help, and empty/no-match states.
- Skills manager:
  - pool discovery under `<agent-dir>/command-center/skills/pool`
  - project state under `.pi/command-center/skills.json`
  - managed materialization into `.pi/skills`
  - safe detach behavior.
- MCP manager:
  - global catalog under `<agent-dir>/command-center/mcp.json`
  - project enablement under `.pi/command-center/mcp.json`
  - stdio and HTTP direct clients
  - tool schema/result adaptation
  - Pi-safe tool name generation and collision handling
  - optional Unix-socket pool daemon for stdio servers.

## Key decisions

- Use a standalone companion TUI plus tiny Pi extension instead of trying to manage many sessions from inside one Pi extension.
- Do not fork Pi and do not clone Agent Deck architecture.
- Use `tmux capture-pane` for read-only preview; attach/switch for interaction.
- Keep storage as JSON until a real bottleneck appears.
- Treat MCP as optional package-level functionality because Pi does not ship MCP.
- Persist heartbeat Pi metadata into the registry so restart/fork can preserve conversation history.
- Display `starting` as running in the user-facing UI while retaining richer internal state.
- Reject HTTP MCP servers with `pool: true` for the MVP.

## Validation

- Unit/integration tests passed.
- Smoke script passed with temporary state.
- Local Pi package install smoke passed with temporary `PI_CODING_AGENT_DIR`.
