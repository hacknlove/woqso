# Ticket 2: Build Git execution layer

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-1-git-execution-layer`](../IMPLEMENTATION_PLAN.md#milestone-1-git-execution-layer)
- Spec: [`SPEC.md#git-service-requirements`](../SPEC.md#git-service-requirements)

## Step

- Implement `src/main/services/git.js`.
- Add safe Git command execution with `execFile` or `spawn`, timeouts, structured errors, and captured `stdout`/`stderr`.
- Sanitize repo paths and ref names before command execution.
- Implement repo validation, current branch lookup, remote listing, local branch listing, and upstream ahead/behind queries.

## Validation

- A valid Git repo can be detected successfully.
- Invalid repo paths and non-repos return structured errors.
- Branches, remotes, and ahead/behind facts can be read through the service.
