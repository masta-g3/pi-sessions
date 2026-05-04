# pi-sessions

Minimal Pi-native session manager for tmux-managed Pi sessions.

- Pi is the only agent runtime.
- tmux owns long-running sessions.
- `pi-sessions` opens a stable tmux dashboard session for the control center.
- The standalone TUI shows managed sessions, status, preview metadata, filters, and simple actions.
- A tiny Pi extension writes heartbeats and registers enabled MCP tools.

## Install for development

```bash
cd /Users/manager/Code/agents/pi-command-center
npm install
npm test
npm run build
```

## Local dogfood install

Use both installs while testing locally:

```bash
npm link
pi install /Users/manager/Code/agents/pi-command-center
pi-sessions doctor
pi-sessions
```

- `npm link` provides the `pi-sessions` shell command.
- `pi install ...` lets Pi discover the package extension through `package.json#pi.extensions`.

Uninstall local dogfood setup:

```bash
pi remove /Users/manager/Code/agents/pi-command-center
npm unlink -g pi-sessions
```

## CLI

```bash
pi-sessions              # create/attach/switch to the dashboard tmux session
pi-sessions tui          # run the TUI directly in the current terminal
pi-sessions doctor
pi-sessions list
pi-sessions add . -t api -g default
pi-sessions delete <session-id>
```

`delete` stops the tmux session if it is still alive, removes the registry row, and removes the heartbeat file. Pi conversation/session files are kept.

## Dashboard tmux behavior

Running `pi-sessions` uses one stable tmux session named `pi-sessions-dashboard`:

- outside tmux: create or attach `pi-sessions-dashboard`;
- inside tmux: create it detached if needed, then switch the current client to it.

The dashboard runs `pi-sessions tui` inside tmux so it does not recursively create dashboards.

## TUI behavior

When the dashboard is running inside tmux, pressing `enter` on a managed session switches the current tmux client to that session and shows the equivalent `tmux switch-client -t <session>` command. Press `Ctrl+Q` from a managed `pi-sessions-*` session to return to the sessions dashboard. Outside tmux direct TUI mode, attach uses normal `tmux attach-session`; return with tmux's standard detach keys.

Groups are implicit flat labels. Use `n` to create a session with any group name, `g` on a selected session to move it to an existing or new group, and `G` to rename the selected session's current group for every session in that group. Use `e` to rename the selected session.

## Pi package

The package declares its extension in `package.json`:

```json
{
  "pi": {
    "extensions": ["dist/src/extension/index.js"]
  }
}
```

Local install:

```bash
pi install /Users/manager/Code/agents/pi-command-center
```

Package smoke before publishing:

```bash
npm run package:check
npm publish --dry-run
```

The npm name `pi-sessions` is already taken. Before public npm publish, choose a scoped package name such as `@your-scope/pi-sessions` and keep the binary name `pi-sessions`.

## Theme behavior

The standalone TUI reads Pi settings from the current project first (`.pi/settings.json`), then global Pi settings (`~/.pi/agent/settings.json` or `PI_CODING_AGENT_DIR/settings.json`). Custom themes are loaded from `.pi/themes/<name>.json` or `<agent-dir>/themes/<name>.json`. If a theme cannot be loaded, `pi-sessions` falls back to a small built-in dark token map.

## Runtime state

- Global state: `<PI_CODING_AGENT_DIR>/pi-sessions` or `~/.pi/agent/pi-sessions`
- Registry: `registry.json`
- Heartbeats: `heartbeats/<session-id>.json`
- Dashboard tmux session: `pi-sessions-dashboard`
- Managed Pi tmux sessions: `pi-sessions-<session-id>`
- Project skills: `<project>/.pi/skills`
- Project skill state: `<project>/.pi/sessions/skills.json`
- Project MCP state: `<project>/.pi/sessions/mcp.json`
- MCP catalog: `<agent-dir>/pi-sessions/mcp.json`
- MCP pool socket: `<agent-dir>/pi-sessions/pool/pool.sock`
- Temporary tmux return binding state: `return-key/active.json` and `return-key/previous.tmux`

## MCP catalog example

```json
{
  "version": 1,
  "servers": {
    "filesystem": {
      "type": "stdio",
      "command": "mcp-filesystem",
      "args": ["."],
      "pool": false
    }
  }
}
```

Enable per project:

```json
{
  "version": 1,
  "enabledServers": ["filesystem"]
}
```

## Smoke test with temp state

```bash
TMP=$(mktemp -d)
PI_CODING_AGENT_DIR="$TMP/agent" PI_SESSIONS_DIR="$TMP/sessions" node dist/cli.js doctor
PI_CODING_AGENT_DIR="$TMP/agent" PI_SESSIONS_DIR="$TMP/sessions" node dist/cli.js list
```
