# Available Commands

This file documents the DWP workflow commands available in this repository.
There commands are meant to be called by a DWP runner, not directly by humans or agents.

The documentation is meant to be a reference for workflow authors and maintainers, and for smart states that have freedom to choose the next state.

## `plan`

Purpose:
- Create the initial plan for a ticket.

Use when:
- A ticket has not been planned yet.
- You want the planner to create the first `## Plan` section in the ticket.

Expected inputs:
- Trailer: `dwp-ticket: <path-to-ticket>`
- Body: optional extra planning instructions

Behavior:
- Starts a fresh opencode planning session titled `<commit-hash>-plan`.
- Reads `SPEC.md`, `IMPLEMENTATION_PLAN.md`, and the ticket.
- Creates or updates the ticket's `## Plan` section.
- Writes a structured output file at `.dwp/logs/dwp-output-<commit-hash>.md`.

Allowed output decisions:
- `review-plan` when there is enough information to create a solid plan.
- `call-human` only when the plan cannot be created without human intervention.

State transitions:
- `review-plan`
- `call-human`
- `error` on command failure

Trailers written on success:
- `dwp-ticket`
- `dwp-plan-version: 1`
- `dwp-planner-session-id`

## `review-plan`

Purpose:
- Review the current ticket plan and decide whether to approve it, request another iteration, or ask for human help.

Use when:
- A plan exists in the ticket.
- The body contains the latest planner or iteration notes intended for the reviewer.

Expected inputs:
- Trailer: `dwp-ticket: <path-to-ticket>`
- Trailer: `dwp-plan-version: <n>`
- Trailer: `dwp-planner-session-id: <session-id>`
- Body: latest notes for the reviewer

Behavior:
- Starts a fresh opencode review session titled `<commit-hash>-review-plan`.
- Reads `SPEC.md`, `IMPLEMENTATION_PLAN.md`, the ticket, and the notes from the body.
- Writes a structured output file at `.dwp/logs/dwp-output-<commit-hash>.md`.
- Reviews the plan as it exists in the ticket at that moment.
- Becomes less nitpicky once `dwp-plan-version >= 3`; another iteration should be requested only for substantive issues.

Allowed output decisions:
- `implement`
- `iterate-plan`
- `call-human`

State transitions:
- `implement`
- `iterate-plan`
- `call-human`
- `error` on command failure

Trailers written on success:
- `dwp-ticket`
- `dwp-plan-version` (preserved)
- `dwp-planner-session-id` (preserved)

## `iterate-plan`

Purpose:
- Revise an existing ticket plan after review feedback.

Use when:
- `review-plan` requested changes.
- The existing planner session should continue.

Expected inputs:
- Trailer: `dwp-ticket: <path-to-ticket>`
- Trailer: `dwp-plan-version: <n>`
- Trailer: `dwp-planner-session-id: <session-id>`
- Body: reviewer feedback for the next plan iteration

Behavior:
- Continues the planner opencode session with title `<commit-hash>-iterate-plan`.
- Reads the ticket and the reviewer feedback from the body.
- Updates the existing `## Plan` section in the ticket.
- Writes a structured output file at `.dwp/logs/dwp-output-<commit-hash>.md`.

Allowed output decisions:
- `review-plan`
- `call-human`

State transitions:
- `review-plan`
- `call-human`
- `error` on command failure

Trailers written on success:
- `dwp-ticket`
- `dwp-plan-version` incremented by 1
- `dwp-planner-session-id` (preserved)

## `clean`

Purpose:
- Clean up the worktree and mark the workflow as done.

Use when:
- The workflow is finished and the temporary worktree should be removed.

Behavior:
- Creates an empty commit with message `chore: aynig is done`.
- Removes the worktree at `$AYNIG_WORKTREE_PATH`.

State transitions:
- None managed through `aynig set-state`; this is a cleanup helper.
