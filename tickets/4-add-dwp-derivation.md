# Ticket 4: Add DWP derivation

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-3-dwp-domain-derivation`](../IMPLEMENTATION_PLAN.md#milestone-3-dwp-domain-derivation)
- Spec: [`SPEC.md#dwp-domain-service`](../SPEC.md#dwp-domain-service)

## Step

- Build `src/main/services/dwp.js`.
- Derive `localState`, `remoteState`, `effectiveState`, `syncStatus`, `warnings`, and lease diagnostics.
- Keep protocol facts separate from UI diagnostics such as `unknown` and `parse-error`.
- Implement strict v1 `effectiveState` behavior from the spec.
- Treat missing canonical `dwp-state` or failed trailer parsing as non-actionable at the protocol layer.

## Validation

- The service returns deterministic derived output for local-only, upstream, and mismatch cases.
- `effectiveState` follows the exact v1 rules from `SPEC.md`.
- `unknown` and `parse-error` remain app diagnostics, not protocol states.
