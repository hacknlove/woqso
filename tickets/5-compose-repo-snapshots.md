# Ticket 5: Compose repo snapshots

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-4-repo-snapshot-composition`](../IMPLEMENTATION_PLAN.md#milestone-4-repo-snapshot-composition)
- Spec: [`SPEC.md#renderer-state-model`](../SPEC.md#renderer-state-model)

## Step

- Build `src/main/services/repoSnapshot.js`.
- Compose `RepoSnapshot`, `BranchDetails`, and `CommitDetails` with all required fields from the spec.
- Include `generatedAt`, `currentBranch`, `comparedRemoteName`, `diverged`, `rawEvidence`, and ISO 8601 UTC dates.
- Collect `recentDwpCommits` from the latest N commits whose final trailer block contains at least one `dwp-*` trailer.
- Keep batching strategy centered on `for-each-ref`, minimal `log`, and minimal `rev-list` calls.

## Validation

- `loadRepoSnapshot`, `getBranchDetails`, and `getCommitDetails` shapes match `SPEC.md`.
- `recentDwpCommits` is bounded to the configured last N commits.
- Partial parse data is preserved in snapshot and detail payloads.
