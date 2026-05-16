**Feature:** dashboard-preview-markdown → Preserve useful preview formatting without dashboard noise.

## Summary

Dashboard previews now capture Pi-rendered tmux pane styling with `tmux capture-pane -p -e`, then sanitize the captured output during rendering so only italic SGR formatting remains. This keeps agent thought text distinguishable from main answers while stripping colors, bold, underline, backgrounds, and other noisy terminal styles.

## Implemented changes

- Added an optional `preserveStyles` flag to `capturePane()` in `src/core/tmux.ts`.
  - Default behavior remains plain `tmux capture-pane -p` for existing callers.
  - Dashboard preview capture opts into `-e` via `SessionsController.refreshPreview()`.
- Added `stripAnsiExceptItalics()` in `src/tui/theme.ts`.
  - Preserves SGR `3` (italic), `23` (italic off), and `0` (reset).
  - Removes color, bold, underline, background, and unsupported SGR styling.
- Updated preview rendering in `src/tui/layout.ts` to sanitize captured preview lines before width-safe truncation.
- Added focused tests for tmux capture args, italic-only ANSI sanitization, and preview width safety.

## Decisions

- Do not parse or re-render markdown in `pi-agent-hub`; the preview source is already-rendered terminal output, not raw markdown.
- Do not add dependencies or settings for this narrow behavior.
- Preserve italics only because the main useful distinction is agent thoughts versus final answers; retaining bold/colors made the dashboard preview visually busy.

## Verification

- `npm test` passed with 280 tests.
- Manual tmux checks confirmed `capture-pane -p -e` preserves SGR styling while plain `-p` strips it.

## Reflection candidate

If durable user-facing docs are updated later, mention that dashboard previews are sanitized tmux pane captures, not markdown-rendered source text.
