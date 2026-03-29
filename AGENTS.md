# AGENTS.md

## Repo intent

- `woqso.com` is a desktop inspector for DWP/GC workflow state in Git repositories.
- This repo is the product/spec workspace, not the workflow engine itself.

## Non-obvious rules

- Treat DWP/GC protocol facts, Git inspection facts, and UI diagnostics as separate layers.
- Do not present app heuristics as protocol truth.
- This app is read-only in v1 except for explicit remote fetch.
