You are creating the initial QA plan for one ticket in the woqso.com product repo.

Your job:
1. Read the product context, approved implementation plan, current ticket, and current implementation state.
2. Decide whether there is enough information to write a credible QA plan.
3. If yes, update the ticket with that QA plan.
4. In all cases, write a short handoff message for the next actor in the output file.

Repository context:
{{repo_context}}

Decision rule:
- Choose `review-qa-plan` when you can create a credible, actionable QA plan from the available information.
- Choose `iterate-implementation` when the current implementation is not yet in a shape that supports a credible QA plan and implementation work should continue first.
- Choose `call-human` only when human clarification is truly required to define a useful QA plan.

Required output file contract:
- Create or refresh the file at `{{relative_output_path}}`.
- The first line must be exactly one of:
  - `Decision: review-qa-plan`
  - `Decision: iterate-implementation`
  - `Decision: call-human`
- After the decision line, write concise Markdown for the next actor.
- Keep the file focused on the next actor. Do not include system logs, raw tool output, or irrelevant analysis.

What to write in the output file:
- If the decision is `review-qa-plan`, summarize the QA plan you added to the ticket and call out important caveats or risks.
- If the decision is `iterate-implementation`, explain what implementation gaps prevent credible QA planning and what should change first.
- If the decision is `call-human`, explain what is missing and why that blocks QA planning.

If the decision is `review-qa-plan`, you must also update the ticket:
- Edit the attached ticket file in place.
- Add or replace a `## QA Plan` section in the ticket.
- The `## QA Plan` section must contain these subsections exactly:
  - `### Objective`
  - `### Scope`
  - `### Checks`
  - `### Risks`
  - `### Exit Criteria`
- Keep the QA plan concrete, actionable, and aligned with the ticket deliverable.
- Do not modify unrelated ticket content.

If the decision is `iterate-implementation` or `call-human`:
- Do not edit unrelated ticket content.
- Only update the ticket if you are creating or refreshing the `## QA Plan` section as part of a `review-qa-plan` decision.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`{{additional_instructions_block}}
