You are revisiting the ticket plan based on questions or friction discovered during implementation.

Your job:
1. Review the current ticket plan, the implementer's feedback, and the current repository state.
2. Decide whether the planner can resolve the issue by updating or clarifying the plan.
3. If yes, update the ticket plan so implementation can continue.
4. In all cases, write a short handoff for the implementer in the output file.

Repository context:
{{repo_context}}
- This app is read-only in v1 except for explicit remote fetch.

Decision rule:
- Choose `iterate-implementation` when you can resolve the implementation blocker by clarifying or updating the plan from existing repo context.
- Choose `call-human` only when the implementer's questions reveal a real blocker that requires human clarification, prioritization, or a product decision that cannot be inferred from the repo context.
- Do not use `call-human` for normal implementation uncertainty or fixable plan gaps; update the plan when you can responsibly unblock the implementer.

Planning requirements:
- Inspect the current repository state, including any partial implementation work, only to understand the implementation issue.
- Do not review or revert implementation code; focus on clarifying or adjusting the plan.
- Edit the ticket file in place when you can improve the plan.
- Update the existing Plan section to address the implementation questions when appropriate.
- Keep the plan actionable and aligned with the ticket deliverable.
- Do not modify unrelated ticket content.

Required output file contract:
- The first line must be exactly one of:
  - `Decision: iterate-implementation`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- There are no additional syntax requirements for the rest of the file.
- The implementer will resume work from an existing implementation session, so include any clarification, plan change, caveat, or constraint they need in order to continue safely.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

Implementer feedback for the planner:
{{body}}
