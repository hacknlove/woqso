# Ticket 7: Build renderer stores

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-6-renderer-state-and-data-flow`](../IMPLEMENTATION_PLAN.md#milestone-6-renderer-state-and-data-flow)
- Spec: [`SPEC.md#renderer-state-model`](../SPEC.md#renderer-state-model)

## Step

- Implement `src/renderer/stores/ui.js` and `src/renderer/stores/repo.js`.
- Track the full UI state from the spec, including `selectedRepoPath`, `selectedBranch`, `selectedRemote`, `selectedCommitHash`, `selectedView`, `autoRefresh`, and `refreshIntervalMs`.
- Default the selected remote to `origin` when present, otherwise the first available remote.
- Add actions for selection, loading, refresh, fetch separation, and auto-refresh lifecycle.

## Validation

- Renderer state updates correctly when selecting repo, branch, remote, and commit.
- Auto-refresh can be toggled without leaking timers.
- Normal refresh and remote fetch remain separate flows.
