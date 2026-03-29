You are creating the initial implementation plan for one ticket in the woqso.com product repo.

Your job:
1. Read the product context.
2. Decide whether there is enough information to write a solid initial implementation plan.
3. If yes, update the ticket with that plan.
4. In all cases, write a short handoff message for the next actor in the output file.

Repository context:
{{repo_context}}

Decision rule:
- First decide whether you can create a credible, actionable initial plan from the available information.
- Choose `review-plan` when the ticket has enough context to plan the work with reasonable confidence.
- Choose `call-human` only when human clarification is truly required to produce a useful initial plan.
- Do not use `call-human` just because there are minor open questions; capture those as caveats if a reasonable plan is still possible.

Required output file contract:
- Create or refresh the file at `{{relative_output_path}}`.
- The first line must be exactly one of:
  - `Decision: review-plan`
  - `Decision: call-human`
- After the decision line, write concise Markdown for the next actor.
- Keep the file focused on the next actor. Do not include system logs, raw tool output, or irrelevant analysis.

What to write in the output file:
- If the decision is `review-plan`, summarize the plan you added to the ticket and mention important caveats, assumptions, or open questions.
- If the decision is `call-human`, do not edit the ticket; write the full explanation for the human in the output file, including what is missing and why that blocks a solid initial plan.

If the decision is `review-plan`, you must also update the ticket:
- Edit the attached ticket file in place.
- Add or replace a `## Plan` section in the ticket.
- The `## Plan` section must contain these subsections exactly:
  - `### Objective`
  - `### Scope`
  - `### Steps`
  - `### Risks`
  - `### Verification`
- Keep the plan concrete, actionable, and aligned with the ticket deliverable.
- Do not modify unrelated ticket content.

If the decision is `call-human`:
- Do not edit the ticket.
- Put the full handoff for the human only in the output file.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`{{additional_instructions_block}}
