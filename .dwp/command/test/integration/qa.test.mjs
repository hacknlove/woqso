import { afterEach, describe, expect, it } from 'vitest'
import { run } from '../../src/index.mjs'
import { createRepoFixture, destroyRepoFixture, setupCommandMocks } from './helpers.mjs'

const repoRoots = []

afterEach(async () => {
  await Promise.all(repoRoots.splice(0).map((repoRoot) => destroyRepoFixture(repoRoot)))
})

describe('qa commands', () => {
  it('qa-plan creates the first QA plan and emits qa planner metadata', async () => {
    const { repoRoot, binDir } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const mocks = await setupCommandMocks({
      repoRoot,
      binDir,
      outputDecisions: {
        'ghi123-qa-plan': 'Decision: review-qa-plan\n\nAdded a concrete QA plan.',
      },
      sessionId: 'qa-1',
    })

    await run('qa-plan', {
      env: {
        ...mocks.env,
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_COMMIT_HASH: 'ghi123',
      },
    })

    const calls = await mocks.readCalls()
    const setStateCall = calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('review-qa-plan')
    expect(setStateCall.args).toContain('dwp-qa-plan-version: 1')
    expect(setStateCall.args).toContain('dwp-qa-planner-session-id: qa-1')
  })

  it('review-qa-plan can send work to execute-qa', async () => {
    const { repoRoot, binDir } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const mocks = await setupCommandMocks({
      repoRoot,
      binDir,
      outputDecisions: {
        'ghi124-review-qa-plan': 'Decision: execute-qa\n\nThe QA plan is ready to run.',
      },
    })

    await run('review-qa-plan', {
      env: {
        ...mocks.env,
        AYNIG_BODY: 'The QA plan now covers the key checks.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_QA_PLAN_VERSION: '1',
        AYNIG_TRAILER_DWP_QA_PLANNER_SESSION_ID: 'qa-1',
        AYNIG_COMMIT_HASH: 'ghi124',
      },
    })

    const calls = await mocks.readCalls()
    const setStateCall = calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('execute-qa')
    expect(setStateCall.args).toContain('review-qa-plan: approve sample-ticket qa plan')
  })

  it('iterate-qa-plan increments the qa plan version after revisions', async () => {
    const { repoRoot, binDir } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const mocks = await setupCommandMocks({
      repoRoot,
      binDir,
      outputDecisions: {
        'ghi125-iterate-qa-plan': 'Decision: review-qa-plan\n\nUpdated the QA plan after feedback.',
      },
    })

    await run('iterate-qa-plan', {
      env: {
        ...mocks.env,
        AYNIG_BODY: 'Cover the renderer preload boundary too.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_QA_PLAN_VERSION: '1',
        AYNIG_TRAILER_DWP_QA_PLANNER_SESSION_ID: 'qa-1',
        AYNIG_COMMIT_HASH: 'ghi125',
      },
    })

    const calls = await mocks.readCalls()
    const setStateCall = calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('review-qa-plan')
    expect(setStateCall.args).toContain('dwp-qa-plan-version: 2')
  })

  it('execute-qa can pass the work to deploy', async () => {
    const { repoRoot, binDir } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const mocks = await setupCommandMocks({
      repoRoot,
      binDir,
      outputDecisions: {
        'ghi126-execute-qa': 'Decision: deploy\n\nChecks passed and the work is ready for handoff.',
      },
    })

    await run('execute-qa', {
      env: {
        ...mocks.env,
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_QA_PLAN_VERSION: '1',
        AYNIG_TRAILER_DWP_QA_PLANNER_SESSION_ID: 'qa-1',
        AYNIG_COMMIT_HASH: 'ghi126',
      },
    })

    const calls = await mocks.readCalls()
    const setStateCall = calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('deploy')
    expect(setStateCall.args).toContain('execute-qa: approve sample-ticket for deploy')
  })

  it('deploy hands off to call-human with a default message', async () => {
    const { repoRoot, binDir } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const mocks = await setupCommandMocks({
      repoRoot,
      binDir,
      outputDecisions: {
        'ghi127-deploy': 'Decision: call-human\n\nReady for human deployment.',
      },
    })

    await run('deploy', {
      env: {
        ...mocks.env,
        AYNIG_COMMIT_HASH: 'ghi127',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_IMPLEMENTATION_VERSION: '1',
        AYNIG_TRAILER_DWP_IMPLEMENTER_SESSION_ID: 'impl-1',
        AYNIG_TRAILER_DWP_QA_PLAN_VERSION: '1',
        AYNIG_TRAILER_DWP_QA_PLANNER_SESSION_ID: 'qa-1',
      },
    })

    const calls = await mocks.readCalls()
    const setStateCall = calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('call-human')
    expect(setStateCall.args).toContain('deploy: ready for human deployment')
  })
})
