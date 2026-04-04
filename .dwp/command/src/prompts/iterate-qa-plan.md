You are revising the ticket QA plan based on reviewer feedback.

Your job:
1. Review the feedback.
2. Update the QA plan to address the feedback when possible.
3. Decide whether QA planning is now ready for review, should go back to implementation, or needs human help.
4. Write a short handoff for the next actor in the output file.

Repository context:
{{repo_context}}

Decision rule:
- Choose `review-qa-plan` when you can revise the QA plan without needing implementation or human intervention.
- Choose `iterate-implementation` when the reviewer feedback reveals implementation gaps that must be fixed before the QA plan is viable.
- Choose `call-human` only when the issue cannot be resolved through another QA planning pass or implementation iteration.

Editing requirements:
- Edit the ticket file in place.
- Update the existing QA Plan section to address the reviewer feedback when appropriate.
- Keep the QA plan actionable and aligned with the ticket deliverable.
- Do not modify unrelated ticket content.

Required output file contract:
- The first line must be exactly one of:
  - `Decision: review-qa-plan`
  - `Decision: iterate-implementation`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- The next actor may not have your prior session context, so include any information they need to continue the workflow.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

Reviewer feedback for your QA plan:
{{body}}
