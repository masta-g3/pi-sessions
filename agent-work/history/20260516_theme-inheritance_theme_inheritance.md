# Theme inheritance

## Summary

Implemented Pi theme inheritance for `pi-agent-hub` dashboard rendering and tmux chrome. The dashboard now resolves Pi themes from built-ins, project/global `settings.themes`, conventional `.pi/themes`/agent `themes` directories, and installed local/git package theme resources declared via `package.json#pi.themes`.

## Implemented changes

- Replaced the old two-path custom theme lookup in `src/tui/theme.ts` with a small bounded resolver that:
  - loads project and global Pi settings in precedence order,
  - keeps built-in `dark`/`light` behavior unchanged,
  - supports explicit theme directories and individual `.json` theme files,
  - supports installed local package paths and git packages under `<scope>/git/<host>/<owner>/<repo>`,
  - respects simple package `themes` filters and `themes: []`,
  - intentionally skips npm package resolution and glob/exclusion complexity.
- Updated `src/app/dashboard.ts` so `openDashboard()` loads the resolved theme with the launch environment before calling `configureDashboardStatusBar()`.
- Added regression tests for:
  - global git package themes,
  - package manifest entries that point directly to JSON files,
  - project package precedence over global package resources,
  - `settings.themes` directories,
  - relative local package paths,
  - immediate dashboard chrome theming.

## Review notes

`code-critic` found one issue: relative local package specs such as `../packages/local-themes` could be mistaken for git shorthand because the host was `..`. Fixed by rejecting shorthand hosts that start with `.` and adding a relative local package regression test.

Concurrent unrelated send-message work was present in the worktree during execution; only the minimal `sendTextToSession` export was added to keep that work's tests/build passing. The send-message plan remains separate.

## Validation

- Baseline theme/chrome/dashboard/run-tui tests passed before implementation.
- `npm test` passed after review fixes: 276 tests.
- `npm run package:check` passed after review fixes.
- Runtime repro resolved `solarized-light` from the installed `pi-community-themes` git package (`dark? false`).
- Live dashboard tmux status style was updated from dark fallback to the resolved theme colors: `bg=#c7c1ae,fg=#268bd2`.

## Out of scope

- npm package theme resolution remains intentionally out of scope because faithfully locating global/project npm installs would require Pi package-manager behavior and could add slow shelling to the dashboard refresh path.
- Full Pi package resource/filter/glob parity remains out of scope; this resolver is intentionally small and targeted.
