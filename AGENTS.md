# AGENTS.md

## Repo intent

- `woqso.com` is a desktop inspector for DWP/GC workflow state in Git repositories.
- This repo is the product/spec workspace, not the workflow engine itself.

## Non-obvious rules

- Treat DWP/GC protocol facts, Git inspection facts, and UI diagnostics as separate layers.
- Do not present app heuristics as protocol truth.
- This app is read-only in v1 except for explicit remote fetch.

## AYNIG / probe workflow notes

When validating the system end-to-end, prefer a runner-level probe over direct command execution.

Expected probe flow:

1. Create a branch for the probe run, e.g. `probing`.
2. On that branch, create the state event with AYNIG, for example:
   - `aynig set-state --dwp-state probe --prompt "say hello"`
3. Run the runner from `master` to process the branch:
   - `aynig run --log-level debug`
4. Inspect logs/output to confirm dispatch and completion.

For a quick local smoke test, it is acceptable to run from the probe branch with:
- `aynig run --same-branch=only`

Important distinction:
- Running `.dwp/command/probe` directly only tests the command runtime.
- Running `aynig run ...` against a branch in `probe` state tests the actual runner/dispatch path.
