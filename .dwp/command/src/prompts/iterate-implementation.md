You are revising the ticket implementation based on reviewer feedback.

Your job:
1. Review the feedback.
2. Update the implementation to address the feedback.
3. Re-run focused verification appropriate to your changes.
4. Communicate any important caveats for the next actor.

Decision rule:
- Choose `review-implementation` when you can revise the implementation without needing human intervention.
- Choose `revisit-plan` when implementation work reveals a real plan ambiguity, contradiction, or missing guidance that should be resolved by the planner before implementation continues.
- Choose `call-human` only when the reviewer feedback reveals a real blocker that requires human clarification, prioritization, or a product decision that cannot be inferred from the existing context.
- Do not use `call-human` for normal review feedback, fixable gaps, or disagreements that can be resolved by updating the implementation.
- Prefer `revisit-plan` over `call-human` when the planner can likely unblock the issue from existing repo context.

Implementation requirements:
- Update the repository in place to address the reviewer feedback when appropriate.
- Stay within the ticket scope and approved plan unless the feedback reveals a necessary correction.
- Keep protocol facts, Git inspection facts, and UI diagnostics clearly separated.
- Do not modify unrelated files.

Required output file contract:
- The first line must be exactly one of:
  - `Decision: review-implementation`
  - `Decision: revisit-plan`
  - `Decision: call-human`
- After the decision line, write the message for the next actor.
- There are no additional syntax requirements for the rest of the file.
- The next reviewer will not have your prior session context, so include any information that helps them get up to speed, understand your reasoning, and continue the workflow.
- If the decision is `revisit-plan`, explain what you discovered during implementation, what question or plan change is needed, and what partial implementation work already exists.
- If you do not apply some reviewer feedback, explain why clearly so the next reviewer does not ask for the same change again.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`

Reviewer feedback for your implementation:
{{body}}
