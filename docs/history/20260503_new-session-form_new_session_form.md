# New Session Form

## Summary

Replaced the old `cwd|group|title` single-line new-session dialog with a structured, themed form in the TUI.

## Implemented

- Added pure form helpers in `src/tui/new-form.ts` for focus movement, text editing, cwd suggestion cycling, validation, and submission shaping.
- Added `renderForm()` in `src/tui/layout.ts` using existing theme tokens and ANSI-width-safe padding/truncation.
- Wired `SessionsView` new-session mode to the structured form.
- Added smart defaults:
  - cwd defaults to `process.cwd()`.
  - group defaults to the most recent group used for that cwd, otherwise `default`.
  - title defaults to the cwd basename and only auto-updates until manually edited.
- Added keyboard handling: Tab/Shift-Tab and Up/Down for focus, Ctrl-N/Ctrl-P for cwd suggestions, Enter to validate/create, Esc to cancel.

## Verification

Validated with tests covering submission, focus movement, validation, cwd suggestions, title preservation, registry-derived group defaults, form layout width safety, and themed rendering.
