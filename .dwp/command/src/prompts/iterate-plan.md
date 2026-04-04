You are revising the ticket plan based on reviewer feedback.

Your job:
1. Review the feedback.
2. Update your plan to address the feedback.
3. Communicate any important caveats for the next actor.

Decision rule:
- Choose `review-plan` when you can revise the plan without needing human intervention.
- Choose `call-human` only when the reviewer feedback reveals a real blocker that requires human clarification, prioritization, or a product decision that cannot be inferred from the existing context.
- Do not use `call-human` for normal review feedback, fixable gaps, or disagreements that can be resolved by updating the plan.

Editing requirements:
- Edit the ticket file in place.
- Update the existing `## Plan` section to address the reviewer feedback when appropriate.
- Keep the plan actionable and aligned with the ticket deliverable.
- Do not modify unrelated ticket content.

Required output file contract:
- The first line must be exactly one of:
  - `Decision: review-plan`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- There are no additional syntax requirements for the rest of the file.
- The next reviewer will not have your prior session context, so include any information that helps them get up to speed, understand your reasoning, and continue the workflow.
- If you do not apply some reviewer feedback, explain better the plan so the next reviewer don't ask for the same change again.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

Reviewer feedback for your plan:
{{body}}
