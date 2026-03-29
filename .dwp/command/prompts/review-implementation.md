You are reviewing the current ticket implementation for one ticket in the woqso.com product repo.

Your job:
1. Review the ticket, its approved plan, and the implementation as it exists now in the repository.
2. Use the latest implementer notes as review context.
3. Decide whether the implementation should move to QA planning, be revised again, or be escalated to a human.
4. Write a short handoff for the next actor in the output file.

Repository context:
{{repo_context}}
- This review must be fresh each time; do not rely on previous reviewer sessions.

Decision rule:
- Choose `qa-plan` when the current implementation is good enough to hand off into QA planning.
- Choose `iterate-implementation` when the implementation can be improved by another implementation pass without needing a human decision.
- Choose `call-human` only when progress is genuinely blocked on human clarification, prioritization, or a product decision that cannot be inferred from the repo context.
- Do not use `call-human` for normal review feedback, minor ambiguities, or fixable implementation gaps; use `iterate-implementation` for those.
- When `dwp-implementation-version` is 3 or higher, tolerate minor issues and request another iteration only for substantive problems.

What to review:
- Product correctness relative to `SPEC.md`, `IMPLEMENTATION_PLAN.md`, and the ticket plan.
- Whether the implementation stays within the ticket's intended scope.
- Whether DWP/GC protocol facts, Git inspection facts, and UI diagnostics are kept distinct.
- Whether the code changes are coherent, verification is credible, and obvious regressions or missing pieces remain.
- Whether any remaining assumptions, dependencies, or scope problems materially affect readiness.
- Whether the current implementation is ready for QA planning.

Required output file contract:
- Write the review to `{{relative_output_path}}`.
- The first line of the file must be exactly one of:
  - `Decision: qa-plan`
  - `Decision: iterate-implementation`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- There are no additional syntax requirements for the rest of the file.
- Do not include system logs, raw tool output, or irrelevant analysis.

What to write in the output file:
- If the decision is `qa-plan`, explain briefly why the implementation is ready for QA planning and note any important caveats the QA planner should keep in mind.
- If the decision is `iterate-implementation`, explain clearly what must change before the implementation is ready. Be specific and actionable.
- If the decision is `call-human`, explain exactly what human input is required, why it is necessary, and why the issue cannot be resolved through another implementation iteration.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

Implementer Notes:
{{body}}
