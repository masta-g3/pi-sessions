# local-extension-deploy

Packaged `pi-sessions` for reliable local Pi extension dogfooding and made the shell command open the tmux dashboard by default.

## Implemented

- Added `src/app/dashboard.ts` with one stable dashboard tmux session: `pi-sessions-dashboard`.
  - Outside tmux: create or attach with `tmux new-session` / `tmux attach-session`.
  - Inside tmux: create detached if missing, then `tmux switch-client`.
  - Dashboard command is `pi-sessions tui` to avoid recursive dashboard launching.
  - Preserves `PI_CODING_AGENT_DIR` and `PI_SESSIONS_DIR` when creating the dashboard session.
- Updated `src/cli.ts` so no-arg `pi-sessions` opens the dashboard and `pi-sessions tui` remains direct TUI mode.
- Added extension duplicate-load protection in `src/extension/index.ts` for the `pi install` + managed-session `--extension` case, with guard cleanup on `session_shutdown`.
- Added `scripts/check-package.mjs` plus `prepack` and `package:check` scripts.
- Reclassified Pi core packages as peer + dev dependencies; kept `@modelcontextprotocol/sdk` as runtime dependency.
- Updated README with local dogfood install/uninstall, dashboard behavior, package smoke, and publish-name guidance.
- Updated `docs/STRUCTURE.md` and `AGENTS.md` with durable dashboard/extension idempotency rules.
- Added tests for dashboard tmux behavior and extension idempotency; adjusted stale local path fixture.

## Verification

- `npm test` passed: 118 tests.
- `npm run package:check` passed and dry-run tarball included `dist/cli.js`, `dist/src/extension/index.js`, `package.json`, and `README.md`.
- `node dist/cli.js --help` showed the dashboard/default and direct TUI commands.
- `node dist/cli.js doctor` passed with temp state during implementation.
- Code review found the extension guard needed shutdown cleanup; fixed with `finally` and re-ran tests/package check.

## Deferred Manual Dogfood

Interactive/global smoke was intentionally not run during implementation to avoid taking over the terminal or mutating global Pi/npm state. Next manual checks:

```bash
npm link
pi install /Users/manager/Code/agents/pi-command-center
pi-sessions doctor
pi-sessions
```

Then verify inside-tmux `pi-sessions` switches to `pi-sessions-dashboard` and managed sessions do not duplicate MCP tools/heartbeats.
