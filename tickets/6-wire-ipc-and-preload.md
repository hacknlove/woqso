# Ticket 6: Wire IPC and preload

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-5-ipc-and-preload-contract`](../IMPLEMENTATION_PLAN.md#milestone-5-ipc-and-preload-contract)
- Spec: [`SPEC.md#ipc-contract`](../SPEC.md#ipc-contract)

## Step

- Build `src/main/ipc/repo.js` and `src/preload/index.js`.
- Expose only the explicit `window.woqso` API methods from the spec.
- Add minimal argument validation for repo path, branch name, remote name, and commit hash inputs.
- Ensure the renderer cannot send arbitrary command strings.

## Validation

- The renderer can select a repo and request snapshot, branch, commit, and fetch operations through IPC.
- Invalid argument shapes are rejected safely.
- No direct shell execution path exists from renderer input.
