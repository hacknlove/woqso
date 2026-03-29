# Ticket 9: Add persistence and fetch UX

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-8-persistence-and-convenience`](../IMPLEMENTATION_PLAN.md#milestone-8-persistence-and-convenience)
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-9-fetch-and-error-ux`](../IMPLEMENTATION_PLAN.md#milestone-9-fetch-and-error-ux)
- Spec: [`SPEC.md#persistence`](../SPEC.md#persistence)

## Step

- Persist recent repositories, selected remote per repo, auto-refresh preference, and panel widths if implemented.
- Implement explicit `fetchRemote` behavior and surface fetch status/errors clearly.
- Keep stale remote-tracking facts visible without implying freshness.
- Ensure one bad branch or commit does not break the whole UI.

## Validation

- App preferences restore correctly after relaunch.
- Remote fetch works as an explicit action and reports failures clearly.
- Snapshot rendering survives partial parse failures and isolated branch errors.
