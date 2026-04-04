You are reviewing the current QA plan for one ticket in the woqso.com product repo.

Your job:
1. Review the ticket as it exists now, including its current QA Plan section.
2. Use the latest QA planner notes as review context.
3. Decide whether the QA plan should be approved, revised again, sent back to implementation, or escalated to a human.
4. Write a short handoff for the next actor in the output file.

Repository context:
{{repo_context}}

Decision rule:
- Choose `execute-qa` when the current QA plan is good enough to execute.
- Choose `iterate-qa-plan` when the QA plan can be improved by another planning pass.
- Choose `iterate-implementation` when the QA review reveals substantive implementation gaps that should be fixed before QA execution.
- Choose `call-human` only when progress is genuinely blocked on human clarification or a product decision that cannot be inferred from the repo context.
- When `dwp-qa-plan-version` is 3 or higher, tolerate minor issues and request another QA plan iteration only for substantive problems.

Required output file contract:
- Write the review to `{{relative_output_path}}`.
- The first line of the file must be exactly one of:
  - `Decision: execute-qa`
  - `Decision: iterate-qa-plan`
  - `Decision: iterate-implementation`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- Do not include system logs, raw tool output, or irrelevant analysis.

What to write in the output file:
- If the decision is `execute-qa`, explain why the QA plan is ready to run and mention important caveats.
- If the decision is `iterate-qa-plan`, explain what must change in the QA plan before execution.
- If the decision is `iterate-implementation`, explain what implementation gaps block meaningful QA and what implementation changes are needed.
- If the decision is `call-human`, explain what human input is required and why.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

QA Planner Notes:
{{body}}
