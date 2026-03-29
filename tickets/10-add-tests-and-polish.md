# Ticket 10: Add tests and polish

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-10-testing`](../IMPLEMENTATION_PLAN.md#milestone-10-testing)
- Spec: [`SPEC.md#notes-for-implementation`](../SPEC.md#notes-for-implementation)

## Step

- Add parser tests for multiline bodies, repeated trailers, mixed-case keys, missing `dwp-state`, invalid trailer blocks, and partial parse recovery.
- Add DWP derivation tests for actionable vs non-actionable commits, `effectiveState`, UI diagnostics, lease diagnostics, and upstream mismatch cases.
- Add snapshot tests for many branches, no-upstream branches, stale remote-tracking refs, and partial parse failures.
- Add lightweight UI smoke coverage if practical and do a final pass on error handling and wording.

## Validation

- Automated tests pass locally.
- Core protocol-sensitive behavior is covered by tests.
- Final UI language keeps protocol facts, Git inspection features, and app diagnostics clearly separated.
