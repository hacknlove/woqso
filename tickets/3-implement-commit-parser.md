# Ticket 3: Implement commit parser

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-2-commit-parser-and-dwp-extraction`](../IMPLEMENTATION_PLAN.md#milestone-2-commit-parser-and-dwp-extraction)
- Spec: [`SPEC.md#parsing-strategy`](../SPEC.md#parsing-strategy)

## Step

- Build `src/main/services/parser.js`.
- Parse commit data into `hash`, `shortHash`, `title`, `body`, `rawMessage`, `trailers`, `stableTrailers`, `dwpState`, `parseStatus`, and `actionable`.
- Enforce final trailer-block parsing, case-sensitive keys, repeated trailer preservation, and `dwp-state` last-wins behavior.
- Preserve raw message and any successfully parsed fields on partial parse.

## Validation

- Commits with valid DWP trailers produce the expected parsed output.
- Mixed-case keys are preserved without implicit normalization.
- Missing or malformed canonical `dwp-state` results in `actionable: false`.
- Partial parse still returns `rawMessage` and partial fields.
