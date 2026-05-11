# new-session-ux-002 — Recent repo picker

## Summary

Added a lightweight persistent recent-repo chooser for the new-session form. The feature keeps manual path typing and `ctrl-n`/`ctrl-p` cwd cycling intact while adding `ctrl-o` on repo fields to open a searchable modal picker populated from current sessions plus bounded persistent history.

## Implemented Behavior

- `n` opens the new-session form as before.
- When focus is on `★ primary` or an extra `+ repo` field, `ctrl-o` opens the recent repo picker.
- Picker controls:
  - type to filter by basename or full path
  - `↑`/`↓` move selection
  - `enter` selects a visible repo
  - `esc` returns to the unchanged form
- Selecting into the primary repo field continues existing group auto-update behavior unless the group was manually edited.
- Enter with no picker match keeps the picker open instead of silently cancelling.
- Newly created repos remain available in the current dashboard process even if their session is deleted before restart.

## State and Data Model

Added one global state file under existing `PI_SESSIONS_DIR`:

```text
<PI_SESSIONS_DIR>/repo-history.json
```

Schema:

```ts
interface RepoHistoryEntry {
  cwd: string;
  lastUsedAt: number;
  useCount: number;
  favorite?: boolean;
}

interface RepoHistory {
  version: 1;
  repos: RepoHistoryEntry[];
}
```

Rules:

- Paths are normalized to absolute paths.
- Blank and duplicate paths are ignored/merged.
- History is capped at 50 repos.
- Ranking is favorites first, then most recent, then use count, then cwd for deterministic ties.
- `favorite?: boolean` is preserved for future favorites UI, but no pin/unpin UI was added.

## Architecture

- `src/core/paths.ts` exposes `repoHistoryPath()`.
- `src/core/repo-history.ts` loads, records, ranks, and merges repo history.
- `src/app/session-commands.ts` records primary and extra repo usage after successful `startManagedSession()` only.
- Repo-history writes are best-effort; write failures do not make already-created sessions fail.
- `src/app/run-tui.ts` loads history once at TUI startup, merges it into new-session context, and updates the in-memory history list after session creation.
- `src/tui/repo-picker.ts` implements pure picker state/render helpers with in-memory substring filtering.
- `src/tui/new-form.ts` exposes `setRepoValue()` for picker selection.
- `src/tui/sessions-view.ts` adds `repoPicker` mode and `ctrl-o` wiring.

## Performance Constraints Kept

- No recursive scanning.
- No background project discovery or indexing.
- No file stats during render.
- History loads once at TUI startup.
- Writes happen only after successful session creation.
- Filtering is in-memory over at most 50 history entries plus current registry paths.

## Validation

- Baseline `npm test` passed before implementation.
- Final `npm test` passed after review fixes: 235 tests.
- `npm run build` passed.
- CLI smoke verified successful `pi-sessions add` writes `repo-history.json`.
- CLI smoke verified failed session start does not write history.
- CLI smoke verified repo-history write failure does not block successful session creation.

## Follow-up

Favorites UI remains intentionally deferred. The schema and ranking support `favorite?: boolean` for a future small picker action if needed.
