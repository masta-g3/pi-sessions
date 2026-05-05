# Multi-repo TUI repo fields

Implemented `multi-repo-001`: clearer TUI creation for common 2-3 repo sessions.

## What changed

- Replaced the comma-separated `extra cwd(s)` field in the new-session form with explicit optional `repo 2` and `repo 3` fields.
- Kept `primary cwd` as the first field and preserved automatic group defaults from the primary cwd.
- New-session submission now builds `additionalCwds` directly from `repo 2` and `repo 3`.
- When creating from a selected multi-repo session, the form pre-fills the selected primary cwd, first two additional repos, and group.
- Known cwd suggestions now include additional repo paths from existing sessions, while `ctrl-n`/`ctrl-p` suggestion cycling remains primary-cwd-only.
- README TUI guidance now describes `repo 2`/`repo 3` and points users to CLI `--add-cwd` for more than three repos.

## Verification

- Baseline before implementation: `npm test` passed `180/180`.
- Final verification: `npm test` passed `182/182`.
- `git diff --check` passed.
- Functional testing subagent confirmed no remaining blockers.
- Review passed with `code-critic`: LGTM.
