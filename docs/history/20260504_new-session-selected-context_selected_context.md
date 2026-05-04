# New Session Selected Context

Implemented selected-session-aware defaults for the dashboard `n` new-session flow.

## Outcome

- When a session is selected, the new-session form defaults `cwd` and `group` to that selected session.
- When no session is selected, the form keeps the existing fallback: dashboard cwd and group from cwd basename.
- Title behavior is unchanged: a random two-word slug is generated unless tests inject a title generator.
- Cwd suggestions still come from known registry cwd values, with the selected/default cwd first via the existing form suggestion logic.
- Cycling cwd suggestions still updates the group until the group field is manually edited.

## Implementation Notes

- Added optional `group?: string` to `NewFormContext` in `src/tui/new-form.ts`.
- Added `buildNewFormContext()` in `src/app/run-tui.ts` so the runtime wiring is pure and directly testable.
- `runTui()` now passes `controller.selected()` into that helper for the real TUI action context.
- Added focused coverage in `test/run-tui.test.ts` and `test/sessions-view.test.ts`.
- Updated `README.md` to describe the selected-session default and dashboard fallback.

## Verification

- `npm test` passed (`162/162`).
