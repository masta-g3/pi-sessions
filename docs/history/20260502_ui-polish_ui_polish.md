# pi-command-center UI Polish — Completed 2026-05-02

## Summary

Polished the `pi-center` TUI while preserving the minimalist Pi-native architecture. The UI now has deliberate dashboard hierarchy, modal dialogs, contextual footer behavior, Pi theme-token styling, ANSI-safe width handling, and real-terminal smoke coverage.

## Implemented

- Dashboard layout refinements:
  - clearer group headers
  - separate waiting/error counts
  - stronger selected-row marker
  - dimmed stopped sessions
  - richer detail pane with cwd, session path, MCP summary, errors, and read-only preview marker.
- Preview pane now renders captured tmux output and shows `preview empty` when no output is available.
- Modal-style dialogs for new session, fork session, restart confirmation, Skills picker, and MCP picker.
- Picker improvements:
  - search/filter support
  - empty and no-match states
  - apply/restart prompt after changes
  - printable `j`/`k` search input, with arrow keys for picker movement.
- Footer/help improvements:
  - contextual footer copy only advertises valid actions
  - empty state advertises `q  quit`
  - help overlay matches implemented behavior.
- Theme-token rendering:
  - centralized `styleToken()` / `stripAnsi()` helpers
  - themed borders, accents, status colors, dim/muted text
  - ANSI-aware padding/truncation for layout, footer messages, and pickers.
- Project-state apply fixes found during review:
  - Skills and MCP picker apply use single bulk writes instead of parallel per-item JSON read-modify-write loops
  - async apply errors surface in the footer instead of showing success
  - clipboard copy is best-effort and macOS-only; the UI still shows the actionable `tmux switch-client` command.

## Validation

- `npm test` passed: 85/85.
- `npm run build` passed.
- `scripts/smoke.sh` passed with temporary state.
- `node dist/cli.js` launched under a real TTY via `expect`; empty state rendered and `q` exited cleanly.
- Real TTY smoke created a managed session via `n`, verified it in `list`, then stopped it.
- Functional UI review reported no remaining user-facing issues after fixes.
