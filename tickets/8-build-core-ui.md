# Ticket 8: Build core UI

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-7-core-ui-screens`](../IMPLEMENTATION_PLAN.md#milestone-7-core-ui-screens)
- Spec: [`SPEC.md#ui-requirements`](../SPEC.md#ui-requirements)

## Step

- Implement `RepoPicker.jsx`, `Toolbar.jsx`, `RemotePanel.jsx`, `BranchList.jsx`, `BranchStatusBadge.jsx`, `BranchDetail.jsx`, `CommitDetail.jsx`, and `ErrorBanner.jsx`.
- Show branch overview, selected branch details, commit details, raw trailers, raw commit message, and recognized DWP metadata.
- Show remote branch refs for the selected remote in the remote panel.
- Cover app diagnostics and badges for `unknown`, `parse-error`, `no upstream`, `diverged`, and lease states.

## Validation

- The UI can inspect a repo end-to-end from branch list to commit detail.
- Raw evidence is visible alongside app-derived diagnostics.
- Branches without upstream can still be inspected against the selected remote's visible branch refs.
