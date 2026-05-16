# send-message

Implemented a dashboard `p` shortcut for sending a one-line message to the selected managed Pi tmux session without leaving the dashboard.

## Final behavior

- `p` opens a footer prompt: `send to <session>: …` while keeping the dashboard rows and preview visible.
- `Enter` validates non-empty text, pastes it into the selected tmux session, and submits with `Enter`.
- `Esc` cancels the footer prompt.
- Live normal sessions are allowed: `starting`, `running`, `waiting`, and `idle`.
- `stopped`, `error`, and `kind: "subagent"` rows are blocked with footer messages.
- Success flashes `sent → <title>`; async tmux failures surface through the existing footer error path.

## Implementation

- Added `sendTextToSession()` in `src/core/tmux.ts` using a process-scoped tmux buffer:
  - `tmux set-buffer -b pi-agent-hub-send-${process.pid} -- <message>`
  - `tmux paste-buffer -d -b <buffer> -t <session>`
  - `tmux send-keys -t <session> Enter`
- Wired `SessionsViewActions.sendMessage` in `src/app/run-tui.ts` to call `sendTextToSession()` outside registry mutation flow.
- Added `send` mode, footer prompt state, guards, validation, help text, and tests in `src/tui/sessions-view.ts` / `test/sessions-view.test.ts`.
- Reused the footer inline input cursor pulse also used by filter/rename.
- No registry, config, heartbeat, history, runtime service, or Pi protocol changes.

## Validation

- Focused `sessions-view` tests passed.
- Full `npm test` passed: 276/276.
- `npm run package:check` passed.
- Real tmux smoke verified messages starting with `-` paste and submit correctly through `set-buffer --`.
- Review passed with no blockers.
