# footer-rename

Moved normal dashboard session rename to an inline footer prompt while keeping in-session `Alt+R` on the explicit dashboard rename dialog.

## Final behavior

- Dashboard `r` and hidden `e` open a footer prompt: `rename <session>: …`.
- The footer prompt keeps dashboard rows and preview visible, supports cursor-aware single-line editing, validates blank titles, and cancels with `Esc`.
- In-session `Alt+R` still round-trips through the dashboard action handoff, opens the explicit `Rename session` dialog, then switches back to the managed session after a successful rename.
- Group rename (`G`) remains a dialog because it affects every session in the selected group.
- Subagent rename remains blocked.

## Implementation

- Added footer rename state with `TextInputState` plus a validation error in `src/tui/sessions-view.ts`.
- Preserved the existing `renameSessionForm`/`renderForm()` path for external `openRenameForTmuxSession()` / `Alt+R` handoff.
- Reused the shared footer cursor pulse for `/` filter, `p` send, and dashboard `r`/`e` rename prompts.
- Updated `test/sessions-view.test.ts` for dashboard footer rename, cursor editing, blank validation, `e` alias, and `Alt+R` dialog switch-back.

## Validation

- Baseline focused `sessions-view` tests passed before changes.
- Focused `sessions-view` tests passed after implementation: 83/83.
- Full `npm test` passed: 276/276.
- `npm run package:check` passed.
- Testing subagent verified current dist tests cover dashboard footer rename and external `Alt+R` dialog switch-back.
- Review passed with no blockers.
