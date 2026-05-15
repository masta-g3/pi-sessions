# dashboard-scanability-001 — Dashboard scanability

Completed: 2026-05-14

## Summary

Improved the `pi-hub` dashboard's scanability while preserving the existing Pi-native/tmux-native design and pure width-safe TUI rendering. The work added compact status summaries, a persistent grouped footer, expanded help, compact/expanded selected-session metadata, and contextual Skills/MCP visibility without introducing Agent Deck architecture, mouse UI, animations, or new runtime concepts.

## Implemented

- Added fixed-order status counts for global and group summaries: `●` running/starting, `◐` waiting, `○` idle, `×` error, `-` stopped.
- Added a full-width top summary line showing total/visible sessions, status counts, and active filter text.
- Reworked the normal footer into a persistent grouped keybinding strip:
  - `Enter Open · n New · / Filter  │  i Info · r Rename · R Restart  │  ? Help`
- Changed successful inside-tmux switch messages into short-lived flashes while keeping switch errors durable.
- Added `i` to toggle compact vs expanded selected-session metadata.
- Made compact selected metadata prioritize title/status, tail-truncated primary path, repo count, contextual Skills/MCP counts, and errors.
- Kept full metadata available in expanded mode, including extra repos, runtime workspace, session file, MCP server names, and error details.
- Added contextual selected-session capability hints only when relevant:
  - Skills count from cached project Skills state.
  - MCP count from `enabledMcpServers`.
  - Edit hint as `s/m edit`.
- Expanded `?` help with navigation, session actions, project state, return shortcuts, status legend, zero-count elision, and metadata toggle.
- Filled the dashboard body to terminal height for a steadier visual frame.
- Preserved clipboard behavior: switching does not overwrite clipboard, and actionable tmux commands remain visible.
- Added `docs/FEATURES.md` as a concise user-facing feature map and linked it from `README.md`.

## Design constraints kept

- No status/title sorting and no stopped-session subsection; row order stays user-controlled.
- Groups remain implicit flat session labels.
- Rendering remains pure in `src/tui/*`; stateful flash/detail toggles live in `SessionsView`.
- ANSI styling remains width-safe through layout/theme helpers.
- Skills/MCP remain project-scoped to the selected session's primary cwd.
- No mouse/clickable chips, animation, worktree management, cloud runtime, or Agent Deck feature parity work.

## Review fixes

Code review found two width-safety regressions that were fixed before commit:

- Long group names now reserve space for right-side status counts instead of truncating them away.
- Long selected-session titles now reserve space for the inline status badge.

A process pitfall was captured in `AGENTS.md`: do not run `npm test` and `npm run package:check` concurrently because both rebuild `dist`, which can cause false module-resolution failures.

## Verification

- `npm test` — 262/262 passing.
- `npm run package:check` — passed.
- `git diff --check` — passed.
- Temp-state smoke:
  - `pi-hub doctor`
  - `pi-hub list`
