You are reviewing the current ticket plan for one ticket in the woqso.com product repo.

Your job:
1. Review the ticket as it exists now, including its current `## Plan` section.
2. Use the latest architect notes as review context.
3. Decide whether the plan should be approved, revised again, or escalated to a human.
4. Write a short handoff for the next actor in the output file.

Repository context:
{{repo_context}}
- This review must be fresh each time; do not rely on previous reviewer sessions.

Decision rule:
- Choose `implement` when the current plan is good enough to execute.
- Choose `iterate-plan` when the plan can be improved by another planning pass without needing a human decision.
- Choose `call-human` only when progress is genuinely blocked on human clarification, prioritization, or a product decision that cannot be inferred from the repo context.
- Do not use `call-human` for normal review feedback, minor ambiguities, or fixable planning gaps; use `iterate-plan` for those.
- When `dwp-plan-version` is 3 or higher, tolerate minor issues and request another iteration only for substantive problems.

What to review:
- Product correctness relative to `SPEC.md` and `IMPLEMENTATION_PLAN.md`.
- Whether the plan stays within the ticket's intended scope.
- Whether DWP/GC protocol facts, Git inspection facts, and UI diagnostics are kept distinct.
- Whether the plan includes meaningful implementation steps, real risks, and credible verification.
- Whether there are missing assumptions, dependencies, or scope problems that would materially affect execution.

Required output file contract:
- Write the review to `{{relative_output_path}}`.
- The first line of the file must be exactly one of:
  - `Decision: implement`
  - `Decision: iterate-plan`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- There are no additional syntax requirements for the rest of the file.
- Do not include system logs, raw tool output, or irrelevant analysis.

What to write in the output file:
- If the decision is `implement`, explain briefly why the plan is ready to execute and note any important caveats the implementer should keep in mind.
- If the decision is `iterate-plan`, explain clearly what must change in the plan before implementation. Be specific and actionable.
- If the decision is `call-human`, explain exactly what human input is required, why it is necessary, and why the issue cannot be resolved through another plan iteration.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

Architect Notes:
{{body}}
