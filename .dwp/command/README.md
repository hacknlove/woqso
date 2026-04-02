# DWP Command Runtime

This package contains the workflow runtime for DWP commands in this repository.

## Why it lives here

- AYNIG resolves commands directly from `.dwp/command/<state>`.
- The workflow runtime should not share dependencies with the product app.
- Keeping `package.json` here isolates workflow tooling, tests, and templates.

## Entrypoints

The files at `.dwp/command/<state>` are the AYNIG-visible executables.

They are thin Node entrypoints that delegate to the canonical runtime in `src/index.mjs`.
That runtime keeps prompts in Markdown and uses a small shared core for process execution, Git helpers, AYNIG state transitions, and output handling.

`dwp.mjs` is now legacy reference code and should not be treated as the primary implementation path.

## Structure

- `src/index.mjs`: canonical workflow runtime / dispatch path
- `src/shared/`: reusable helpers for process execution, Git helpers, AYNIG state transitions, prompts, and file handling
- `prompts/`: Markdown templates used to build `opencode` prompts
- `test/unit/`: focused tests for shared primitives
- `test/integration/`: business-level workflow tests with mocked CLIs and filesystem state

## Test Philosophy

- Unit tests validate strict parsing and helper behavior.
- Integration tests validate business-relevant workflow histories.
- Tests mock `git`, `opencode`, `aynig`, and filesystem state rather than running full end-to-end flows.

## Commands

- `npm test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run check`

## Remaining Shell Helpers

- `call-human` stays in shell because it is mostly OS notification plumbing.
- `clean` stays in shell because it is currently a tiny operational helper.
