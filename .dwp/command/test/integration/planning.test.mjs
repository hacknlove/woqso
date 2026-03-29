import fs from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { main as iteratePlan } from '../../src/commands/iterate-plan.mjs'
import { main as plan } from '../../src/commands/plan.mjs'
import { main as reviewPlan } from '../../src/commands/review-plan.mjs'
import { createExecFileMock, createRepoFixture, destroyRepoFixture } from './helpers.mjs'

const repoRoots = []

afterEach(async () => {
  await Promise.all(repoRoots.splice(0).map((repoRoot) => destroyRepoFixture(repoRoot)))
})

describe('planning commands', () => {
  it('plan creates review-plan transition with planner session metadata', async () => {
    const { repoRoot, ticketPath } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'abc123-plan': 'Decision: review-plan\n\nPlan ready for review.',
      },
      sessionId: 'planner-1',
    })

    await plan({
      env: {
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_COMMIT_HASH: 'abc123',
        AYNIG_BODY: 'Prefer the read-only v1 scope.',
      },
      runtime: exec.runtime,
    })

    const output = await fs.readFile(`${repoRoot}/.dwp/logs/dwp-output-abc123.md`, 'utf8')
    expect(output).toContain('Decision: review-plan')

    const ticketAdd = exec.calls.find((call) => call.command === 'git' && call.args[0] === 'add')
    expect(ticketAdd.args[1]).toBe(ticketPath)

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('review-plan')
    expect(setStateCall.args).toContain('plan: create sample-ticket plan')
    expect(setStateCall.args).toContain('dwp-plan-version: 1')
    expect(setStateCall.args).toContain('dwp-planner-session-id: planner-1')
  })

  it('review-plan approves the current plan for implementation', async () => {
    const { repoRoot } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'abc124-review-plan': 'Decision: implement\n\nLooks good to implement.',
      },
    })

    await reviewPlan({
      env: {
        AYNIG_BODY: 'The latest architect notes are positive.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_COMMIT_HASH: 'abc124',
      },
      runtime: exec.runtime,
    })

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('implement')
    expect(setStateCall.args).toContain('review-plan: approve sample-ticket plan')
    expect(setStateCall.args).toContain('dwp-plan-version: 2')
    expect(setStateCall.args).toContain('dwp-planner-session-id: planner-1')
  })

  it('iterate-plan revises the plan and increments the plan version', async () => {
    const { repoRoot, ticketPath } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'abc125-iterate-plan': 'Decision: review-plan\n\nRevised the plan and addressed feedback.',
      },
    })

    await iteratePlan({
      env: {
        AYNIG_BODY: 'Please tighten the verification section.',
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_TRAILER_DWP_PLANNER_SESSION_ID: 'planner-1',
        AYNIG_TRAILER_DWP_PLAN_VERSION: '2',
        AYNIG_COMMIT_HASH: 'abc125',
      },
      runtime: exec.runtime,
    })

    const ticketAdd = exec.calls.find((call) => call.command === 'git' && call.args[0] === 'add')
    expect(ticketAdd.args[1]).toBe(ticketPath)

    const setStateCall = exec.calls.find((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('--keep-trailers')
    expect(setStateCall.args).toContain('review-plan')
    expect(setStateCall.args).toContain('dwp-plan-version: 3')
  })

  it('plan falls back to the error state when the model writes an invalid decision', async () => {
    const { repoRoot } = await createRepoFixture()
    repoRoots.push(repoRoot)

    const exec = createExecFileMock({
      repoRoot,
      outputDecisions: {
        'abc126-plan': 'Decision: implement\n\nUnexpected output.',
      },
      sessionId: 'planner-2',
    })

    await plan({
      env: {
        AYNIG_TRAILER_DWP_TICKET: 'tickets/sample-ticket.md',
        AYNIG_COMMIT_HASH: 'abc126',
      },
      runtime: exec.runtime,
    })

    const setStateCall = exec.calls.findLast((call) => call.command === 'aynig')
    expect(setStateCall.args).toContain('error')
    expect(setStateCall.args).toContain('plan: error')
    expect(setStateCall.args).toContain('--keep-trailers')
  })
})
