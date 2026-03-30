import { afterEach, describe, expect, it } from 'vitest'
import { run } from '../../dwp.mjs'
import { createExecFileMock, createRepoFixture, destroyRepoFixture } from './helpers.mjs'

const repoRoots = []

afterEach(async () => {
  await Promise.all(repoRoots.splice(0).map((repoRoot) => destroyRepoFixture(repoRoot)))
})

describe('implementation commands', () => {
  it('implement creates the first implementation pass and stages repo changes', async () => {
    const { repoRoot } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'def123-implement': 'Decision: review-implementation\n\nImplemented the ticket and ran checks.',
      },
      sessionId: 'impl-1',
    })

    await run('implement', {
      env: {
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_COMMIT_HASH: 'def123',
      },
      runtime: exec.runtime,
    })

    const gitAdd = exec.calls.find((call) => call.command === 'git' && call.args.includes(':(exclude).dwp/logs'))
    expect(gitAdd).toBeTruthy()

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('review-implementation')
    expect(setStateCall.args).toContain('dwp-implementation-version: 1')
    expect(setStateCall.args).toContain('dwp-implementer-session-id: impl-1')
  })

  it('revisit-plan clarifies the plan and increments the plan version', async () => {
    const { repoRoot } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'def124-revisit-plan': 'Decision: iterate-implementation\n\nClarified the plan for the implementer.',
      },
    })

    await run('revisit-plan', {
      env: {
        AYNIG_BODY: 'The plan is ambiguous around verification scope.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_COMMIT_HASH: 'def124',
      },
      runtime: exec.runtime,
    })

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('iterate-implementation')
    expect(setStateCall.args).toContain('dwp-plan-version: 3')
    expect(setStateCall.args).toContain('dwp-implementation-version: 1')
  })

  it('review-implementation approves the code for qa planning', async () => {
    const { repoRoot } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'def125-review-implementation': 'Decision: qa-plan\n\nReady for QA planning.',
      },
    })

    await run('review-implementation', {
      env: {
        AYNIG_BODY: 'Implemented the core behavior and ran focused verification.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_COMMIT_HASH: 'def125',
      },
      runtime: exec.runtime,
    })

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('qa-plan')
    expect(setStateCall.args).toContain('review-implementation: approve sample-ticket for qa planning')
  })

  it('iterate-implementation increments implementation version on successful revision', async () => {
    const { repoRoot } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'def126-iterate-implementation': 'Decision: review-implementation\n\nAddressed feedback and reran checks.',
      },
    })

    await run('iterate-implementation', {
      env: {
        AYNIG_BODY: 'Tighten error handling around state parsing.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_COMMIT_HASH: 'def126',
      },
      runtime: exec.runtime,
    })

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('review-implementation')
    expect(setStateCall.args).toContain('dwp-implementation-version: 2')
  })
})
