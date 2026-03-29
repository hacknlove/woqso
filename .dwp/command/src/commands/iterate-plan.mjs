import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setState } from '../shared/aynig.mjs'
import { parseDecision } from '../shared/decisions.mjs'
import { getBody, getCommitHash, getTrailer, requireNumeric, requireValue } from '../shared/env.mjs'
import { failWithError } from '../shared/errors.mjs'
import { ensureDir, readText, resetFile } from '../shared/files.mjs'
import { getRepoRoot, resolveRelativePath, stageTicket } from '../shared/git.mjs'
import { runOpencode } from '../shared/opencode.mjs'
import { buildOutputPaths, ensureFile, getTicketMetadata, resolveTicketPath } from '../shared/paths.mjs'
import { renderPromptTemplate } from '../shared/prompts.mjs'
import { createRuntime } from '../shared/runtime.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandDir = path.resolve(__dirname, '..', '..')
const promptPath = path.join(commandDir, 'prompts', 'iterate-plan.md')

export async function main({ env = process.env, runtime = createRuntime() } = {}) {
  let repoRoot = ''
  let ticketPath = ''

  try {
    const body = requireValue(getBody(env), 'Missing reviewer feedback in commit body')
    const ticketInput = requireValue(getTrailer('DWP_TICKET', env), 'Missing dwp-ticket trailer')
    const plannerSessionId = requireValue(
      getTrailer('DWP_PLANNER_SESSION_ID', env),
      'Missing dwp-planner-session-id trailer; use plan for the initial version',
    )
    const currentPlanVersion = requireNumeric(
      getTrailer('DWP_PLAN_VERSION', env),
      `Invalid dwp-plan-version trailer: ${getTrailer('DWP_PLAN_VERSION', env)}`,
    )
    const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')

    repoRoot = await getRepoRoot(runtime)
    ticketPath = resolveTicketPath(repoRoot, ticketInput)
    await ensureFile(runtime, ticketPath, `Ticket not found: ${ticketPath}`)

    const { ticketName, relativeTicketPath } = getTicketMetadata(repoRoot, ticketPath)
    const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)
    const relativeOutputPath = resolveRelativePath(repoRoot, outputPath)
    const runTitle = `${commitHash}-iterate-plan`

    await ensureDir(runtime, logsDir)
    await resetFile(runtime, outputPath)

    const prompt = await renderPromptTemplate(runtime, promptPath, {
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body,
    })

    await runOpencode(runtime, {
      repoRoot,
      title: runTitle,
      sessionId: plannerSessionId,
      files: [ticketPath, outputPath],
      prompt,
    })

    const outputBody = await readText(runtime, outputPath)
    requireValue(outputBody, `Output file was empty at ${relativeOutputPath}`)

    const decision = parseDecision(outputBody, ['review-plan', 'call-human'])
    const nextPlanVersion = currentPlanVersion + 1
    const nextSubject =
      decision === 'review-plan'
        ? `iterate-plan: revise ${ticketName} plan`
        : `iterate-plan: needs human input for ${ticketName}`

    await stageTicket(runtime, ticketPath, repoRoot)
    await setState(runtime, {
      cwd: repoRoot,
      state: decision,
      subject: nextSubject,
      keepTrailers: true,
      trailers: [
        `dwp-ticket: ${relativeTicketPath}`,
        `dwp-plan-version: ${nextPlanVersion}`,
        `dwp-planner-session-id: ${plannerSessionId}`,
      ],
      prompt: outputBody,
    })
  } catch (error) {
    await failWithError({
      runtime,
      repoRoot,
      ticketPath,
      commandName: 'iterate-plan',
      failureSummary: 'Command failed while revising the plan.',
      cause: error.message,
      stageOnError: 'ticket',
    })
    process.exitCode = 1
  }
}
