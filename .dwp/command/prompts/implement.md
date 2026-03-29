You are creating the initial implementation for one ticket in the woqso.com product repo.

Your job:
1. Read the product context and the approved ticket plan.
2. Decide whether you can make a credible first implementation pass from the available information.
3. If yes, implement the ticket in the repository and run focused verification.
4. In all cases, write a short handoff message for the next actor in the output file.

Repository context:
{{repo_context}}
- This app is read-only in v1 except for explicit remote fetch.

Decision rule:
- First decide whether you can create a credible, reviewable implementation pass from the available information.
- Choose `review-implementation` when you can implement the ticket with reasonable confidence and leave the repo in a state ready for code review.
- Choose `revisit-plan` when implementation work reveals a real plan ambiguity, contradiction, or missing guidance that should be resolved by the planner before implementation continues.
- Choose `call-human` only when human clarification is truly required to implement the approved plan responsibly.
- Do not use `call-human` just because there are minor open questions; make the most reasonable implementation choices you can infer from the repo and call out caveats in the handoff.
- Prefer `revisit-plan` over `call-human` when the planner can likely unblock the issue from existing repo context.

Implementation requirements:
- Implement the approved ticket plan in the repository.
- Stay within the ticket scope.
- Keep protocol facts, Git inspection facts, and UI heuristics clearly separated in code and product language.
- Do not modify unrelated files.
- Run focused verification that is appropriate for the changes you make.

Required output file contract:
- Create or refresh the file at `{{relative_output_path}}`.
- The first line must be exactly one of:
  - `Decision: review-implementation`
  - `Decision: revisit-plan`
  - `Decision: call-human`
- After the decision line, write concise Markdown for the next actor.
- Keep the file focused on the next actor. Do not include system logs, raw tool output, or irrelevant analysis.

What to write in the output file:
- If the decision is `review-implementation`, summarize what you implemented, list the verification you ran and the result, and mention important caveats, assumptions, or follow-up risks for the reviewer.
- If the decision is `revisit-plan`, explain what you discovered during implementation, what question or plan change is needed, what partial implementation work already exists, and what the planner should resolve before implementation continues.
- If the decision is `call-human`, explain what is missing and why that blocks a responsible implementation pass.

Files:
- Target ticket: `{{relative_ticket_path}}`
- Output file: `{{relative_output_path}}`{{additional_instructions_block}}
