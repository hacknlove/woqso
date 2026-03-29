# Node Migration Plan

## Goals

- Migrate the workflow-heavy DWP commands from Bash to Node.
- Keep AYNIG command discovery unchanged by preserving executable entrypoints at `.dwp/command/<state>`.
- Isolate workflow runtime concerns under `.dwp/command/` so they do not mix with the product app runtime.
- Extract long prompts into Markdown templates with simple placeholder replacement.
- Add focused unit and integration tests for business-relevant workflow histories.

## Constraints

- AYNIG resolves commands directly from `.dwp/command/<state>` and executes those files.
- The root project will eventually have its own package boundary; workflow dependencies must stay local to `.dwp/command/`.
- First migration pass should preserve current workflow semantics.
- Tests should validate expected business behavior, not chase exhaustive edge coverage.

## Target Architecture

```text
.dwp/
  NODE_MIGRATION_PLAN.md
  command/
    package.json
    package-lock.json
    plan
    review-plan
    iterate-plan
    implement
    revisit-plan
    review-implementation
    iterate-implementation
    qa-plan
    review-qa-plan
    iterate-qa-plan
    execute-qa
    deploy
    call-human
    clean
    src/
      commands/
      shared/
    prompts/
      fragments/
    test/
      unit/
      integration/
      fixtures/
```

## Milestones

1. Bootstrap isolated `.dwp/command/` Node package with Vitest.
2. Implement shared runtime helpers and prompt template rendering.
3. Migrate planning flow: `plan`, `review-plan`, `iterate-plan`.
4. Migrate implementation flow: `implement`, `revisit-plan`, `review-implementation`, `iterate-implementation`.
5. Migrate QA flow: `qa-plan`, `review-qa-plan`, `iterate-qa-plan`, `execute-qa`.
6. Migrate `deploy`.
7. Document the package and verify behavior parity.

## Task Checklist

### Foundation

- [x] Add `.dwp/command/package.json` with local scripts and Vitest.
- [x] Add executable Node entrypoint pattern for AYNIG-visible commands.
- [x] Create shared runtime modules for env, validation, paths, files, prompts, decisions, `opencode`, `aynig`, `git`, and error handling.
- [x] Remove `jq` dependency from migrated commands by parsing `opencode session list` in Node.

### Prompt Templates

- [x] Extract planning prompts to Markdown templates.
- [x] Extract implementation prompts to Markdown templates.
- [ ] Extract QA prompts to Markdown templates.
- [ ] Extract deploy handoff prompt to Markdown template.
- [x] Add shared prompt fragments where duplicated context is stable.

### Planning Flow

- [x] Migrate `plan`.
- [ ] Add `plan` tests for:
  - [x] happy path to `review-plan`
  - [ ] blocked path to `call-human`
  - [x] representative failure to `error`
- [x] Migrate `review-plan`.
- [ ] Add `review-plan` tests for:
  - [x] approve to `implement`
  - [ ] request changes to `iterate-plan`
- [x] Migrate `iterate-plan`.
- [ ] Add `iterate-plan` tests for:
  - [x] revise plan and increment version
  - [ ] escalate to `call-human`

### Implementation Flow

- [x] Migrate `implement`.
- [ ] Add `implement` tests for:
  - [x] happy path to `review-implementation`
  - [ ] plan ambiguity path to `revisit-plan`
- [x] Migrate `revisit-plan`.
- [ ] Add `revisit-plan` tests for:
  - [x] clarify plan and return to `iterate-implementation`
  - [x] increment `dwp-plan-version`
- [x] Migrate `review-implementation`.
- [ ] Add `review-implementation` tests for:
  - [x] approve to `qa-plan`
  - [ ] request changes to `iterate-implementation`
- [x] Migrate `iterate-implementation`.
- [ ] Add `iterate-implementation` tests for:
  - [x] revise implementation and increment version
  - [ ] return to `revisit-plan`

### QA Flow

- [ ] Migrate `qa-plan`.
- [ ] Add `qa-plan` tests for:
  - [ ] create `## QA Plan` and move to `review-qa-plan`
  - [ ] send work back to `iterate-implementation`
- [ ] Migrate `review-qa-plan`.
- [ ] Add `review-qa-plan` tests for:
  - [ ] approve to `execute-qa`
  - [ ] request QA plan changes
  - [ ] request implementation changes
- [ ] Migrate `iterate-qa-plan`.
- [ ] Add `iterate-qa-plan` tests for:
  - [ ] revise QA plan and increment version
  - [ ] return to implementation when needed
- [ ] Migrate `execute-qa`.
- [ ] Add `execute-qa` tests for:
  - [ ] pass to `deploy`
  - [ ] request QA plan changes
  - [ ] request implementation changes

### Deploy and Remaining Shell Helpers

- [ ] Migrate `deploy`.
- [ ] Add `deploy` test for handoff to `call-human`.
- [ ] Keep `call-human` in shell for now and document why.
- [ ] Keep `clean` in shell for now and document why.

### Verification and Docs

- [x] Add unit tests for shared helpers.
- [x] Add integration tests with mocked CLI responses and filesystem state.
- [ ] Add `.dwp/command/README.md` for maintainers.
- [x] Verify executable permissions and runner compatibility.
- [x] Run package checks and tests.

## Test Philosophy

- Unit tests cover shared primitives and strict parsing behavior.
- Integration tests cover business-relevant workflow histories.
- CLI processes and filesystem state are mocked rather than executed end-to-end.
- Tests should prove expected workflow behavior without chasing full code coverage.

## Current Phase

- Implementation flow is migrated. QA flow is next.

## Notes

- Prefer direct executable Node entrypoints over shell wrappers or `npm run`.
- Preserve exact command filenames so AYNIG dispatch does not change.
- Keep prompt wording stable during the first migration pass unless a formatting change is required by template extraction.
