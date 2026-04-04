You are creating the initial implementation plan for one ticket in the woqso.com product repo.

Your job:
1. Decide whether there is enough information to write a solid initial implementation plan.
2. If yes, update the ticket with that plan.
3. decide the project next state between:
  * review-plan
  * call-human
  * error
4. Edit context for the next state

The project SPEC is at ./SPEC.md
The whole plan is at ./IMPLEMENTATION_PLAN
The ticket you have to complete is at <%= it.AYNIG_TRAILER_DWP_TICKET %> 
The file to write the next state is at <%= it.NEXT_STATE %>

Decision rule:
- If any file is not at the specified path, don't try to find it. Just raise the issue to a human (call-human).
- If there is not enough information to create a credible, actionable initial plan from the available information, do not make up things. Just raise the issue to a human (call-human).
- It's ok to make safe assumptions, which are: standard or common patterns and conventions, trivial and direct consequence of the context, cheap and easy to revert or change.
- If the assumption is not safe (meaning not standard, not trivial, not easy to change) you actually don't have enough information to create the plan, and you need to raise the issue to a human.
- If you edit the ticket to add a plan, the next state is review-plan.
- Choose call-human only when human clarification is truly required to produce a useful initial plan.
- Do not use call-human just because there are minor open questions; capture those as caveats if a reasonable plan is still possible.
- Error is for unexpected issues.

How to write a plan:

- The `## Plan` section must contain these subsections exactly:
  - `### Objective`
  - `### Scope`
  - `### Steps`
  - `### Risks`
  - `### Verification`
- Keep the plan concrete, actionable, and aligned with the ticket deliverable.
- Do not modify unrelated ticket content.

