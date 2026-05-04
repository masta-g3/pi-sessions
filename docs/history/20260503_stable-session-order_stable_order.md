# Stable Session Order

Implemented persistent, user-controlled session ordering for the `pi-sessions` dashboard.

## Outcome

- Session rows no longer move when status or title changes.
- Sessions are ordered by group, then an optional persisted `ManagedSession.order` value.
- Legacy registry rows without `order` keep their group-relative registry order.
- Stopped sessions stay in-place and dimmed; there is no separate `Stopped` subsection.
- New, forked, and group-moved sessions append to the target group.
- Users can reorder the selected session within its current group with `K`/`J` or Shift-Up/Shift-Down.
- Reorder keys clamp at group boundaries and are disabled while a filter is active with `clear filter to reorder`.

## Implementation Notes

- Added `src/core/session-order.ts` as the shared ordering helper for controller navigation and render grouping.
- Added optional `order?: number` to `ManagedSession`; registry version remains `1`.
- Updated `SessionsController.reorderSelected()` to swap selected rows within a group and normalize that group to `0..n-1` order values.
- Updated TUI footer/help text to surface reorder keys.
- Updated durable docs in `README.md`, `docs/STRUCTURE.md`, and `AGENTS.md`.

## Verification

- Baseline before implementation: `npm test` passed (`149/149`).
- Final verification: `npm test` passed (`158/158`).
- Review invoked `code-critic`; result: LGTM.
