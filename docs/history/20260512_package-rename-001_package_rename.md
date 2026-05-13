# package-rename-001 — Rename package to pi-agent-hub

## Summary

Renamed the package, installed CLI, runtime identifiers, tmux sessions, tests, and current docs from `pi-sessions` to `pi-agent-hub`. The package now publishes as `pi-agent-hub` and exposes only the `pi-agent-hub` binary; no compatibility aliases are shipped.

## Implemented

- Added centralized naming constants in `src/core/names.ts` for canonical `pi-agent-hub` values and legacy migration-only `pi-sessions` values.
- Updated package metadata and package checks:
  - `package.json` / `package-lock.json` package name is `pi-agent-hub`.
  - `bin` exposes only `pi-agent-hub -> dist/cli.js`.
  - `scripts/check-package.mjs` validates the package name, single binary, built CLI, and Pi extension inclusion.
- Updated CLI/help/dashboard runtime strings:
  - CLI help, usage errors, and docs use `pi-agent-hub`.
  - Dashboard tmux session is `pi-agent-hub`.
  - Managed tmux sessions use the `pi-agent-hub-` prefix.
  - Dashboard launch and return commands use `pi-agent-hub tui`.
- Renamed runtime state and managed-session env vars:
  - Global state env: `PI_AGENT_HUB_DIR`.
  - Managed session env: `PI_AGENT_HUB_SESSION_ID`.
  - Subagent metadata envs: `PI_AGENT_HUB_KIND`, `PI_AGENT_HUB_PARENT_ID`.
  - Default state dir: `<PI_CODING_AGENT_DIR>/pi-agent-hub`.
- Updated the Pi extension to use canonical env vars while still reading legacy env vars for already-running migrated sessions.
- Updated MCP client naming, TUI copy/headings, README, `docs/STRUCTURE.md`, `AGENTS.md`, and LICENSE attribution line.

## Migration behavior

`src/core/migration.ts` runs before CLI commands that read or write package state. It is intentionally small and idempotent.

- If `PI_AGENT_HUB_DIR` is set, it is canonical and default directories are not moved.
- If `PI_AGENT_HUB_DIR` is unset and `PI_SESSIONS_DIR` is set, the legacy custom directory is used as a one-time migration source and moved to a sibling `pi-agent-hub` directory.
- Otherwise, legacy `<PI_CODING_AGENT_DIR>/pi-sessions` state is moved to `<PI_CODING_AGENT_DIR>/pi-agent-hub` when the new path does not already exist.
- After a state move, a legacy symlink is left at the old path so already-running legacy Pi processes can keep writing heartbeats until restarted.
- Registry rows are rewritten from `pi-sessions-*` to `pi-agent-hub-*` when the live tmux rename succeeds or when the old tmux session is absent.
- If both old and new tmux names exist, migration does not overwrite; it keeps the legacy registry row and reports a warning via `doctor`.
- Persisted multi-repo `workspaceCwd` values are rewritten from the old state root to the new root.
- Stale `return-key/` state is removed because it embeds old control/target session names and process ownership.

## Verification

- Baseline test run before changes passed.
- Final `npm test` passed: 240/240 tests.
- `npm run package:check` passed.
- Local tarball install smoke verified a `pi-agent-hub` executable and no `pi-sessions` executable.
- Temporary state migration smoke verified registry migration and new state directory creation.
- `git diff --check` passed.
- `code-critic` review returned LGTM.

## Notes

- Legacy `pi-sessions` strings remain only in migration constants, migration tests, and explicit user-facing migration notes/warnings.
- No follow-up backlog items were created.
