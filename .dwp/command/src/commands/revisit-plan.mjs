import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setState } from '../shared/aynig.mjs'
import { parseDecision } from '../shared/decisions.mjs'
import { getBody, getCommitHash, getTrailer, requireNumeric, requireValue } from '../shared/env.mjs'
import { failWithError } from '../shared/errors.mjs'
import { ensureDir, readText, resetFile } from '../shared/files.mjs'
import { getRepoRoot, resolveRelativePath, stageRepoExcludingLogs } from '../shared/git.mjs'
import { runOpencode } from '../shared/opencode.mjs'
import { buildOutputPaths, ensureFile, getTicketMetadata, resolveTicketPath } from '../shared/paths.mjs'
import { renderPromptTemplate } from '../shared/prompts.mjs'
import { createRuntime } from '../shared/runtime.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandDir = path.resolve(__dirname, '..', '..')
const promptPath = path.join(commandDir, 'prompts', 'revisit-plan.md')
const repoContextPath = path.join(commandDir, 'prompts', 'fragments', 'repo-context.md')

export async function main({ env = process.env, runtime = createRuntime() } = {}) {
  let repoRoot = ''
  let ticketPath = ''

  try {
    const body = requireValue(getBody(env), 'Missing implementer questions or plan feedback in commit body')
    const ticketInput = requireValue(getTrailer('DWP_TICKET', env), 'Missing dwp-ticket trailer')
    const plannerSessionId = requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id trailer')
    const currentPlanVersion = requireNumeric(
      getTrailer('DWP_PLAN_VERSION', env),
      `Invalid dwp-plan-version trailer: ${getTrailer('DWP_PLAN_VERSION', env)}`,
    )
    const implementerSessionId = requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id trailer')
    const currentImplementationVersion = requireNumeric(
      getTrailer('DWP_IMPLEMENTATION_VERSION', env),
      `Invalid dwp-implementation-version trailer: ${getTrailer('DWP_IMPLEMENTATION_VERSION', env)}`,
    )
    const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')

    repoRoot = await getRepoRoot(runtime)
    ticketPath = resolveTicketPath(repoRoot, ticketInput)
    await ensureFile(runtime, ticketPath, `Ticket not found: ${ticketPath}`)

    const { ticketName, relativeTicketPath } = getTicketMetadata(repoRoot, ticketPath)
    const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)
    const relativeOutputPath = resolveRelativePath(repoRoot, outputPath)
    const runTitle = `${commitHash}-revisit-plan`
    const repoContext = await readText(runtime, repoContextPath)

    await ensureDir(runtime, logsDir)
    await resetFile(runtime, outputPath)

    const prompt = await renderPromptTemplate(runtime, promptPath, {
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body,
    })

    await runOpencode(runtime, {
      repoRoot,
      title: runTitle,
      sessionId: plannerSessionId,
      files: [path.join(repoRoot, 'SPEC.md'), path.join(repoRoot, 'IMPLEMENTATION_PLAN.md'), ticketPath, outputPath],
      prompt,
    })

    const outputBody = await readText(runtime, outputPath)
    requireValue(outputBody, `Output file was empty at ${relativeOutputPath}`)

    const decision = parseDecision(outputBody, ['iterate-implementation', 'call-human'])
    const nextSubject =
      decision === 'iterate-implementation'
        ? `revisit-plan: update ${ticketName} plan`
        : `revisit-plan: needs human input for ${ticketName}`

    await stageRepoExcludingLogs(runtime, repoRoot)
    await setState(runtime, {
      cwd: repoRoot,
      state: decision,
      subject: nextSubject,
      trailers: [
        `dwp-ticket: ${relativeTicketPath}`,
        `dwp-plan-version: ${currentPlanVersion + 1}`,
        `dwp-planner-session-id: ${plannerSessionId}`,
        `dwp-implementation-version: ${currentImplementationVersion}`,
        `dwp-implementer-session-id: ${implementerSessionId}`,
      ],
      prompt: outputBody,
    })
  } catch (error) {
    await failWithError({
      runtime,
      repoRoot,
      ticketPath,
      commandName: 'revisit-plan',
      failureSummary: 'Command failed while revisiting the plan.',
      cause: error.message,
      stageOnError: 'repo',
    })
    process.exitCode = 1
  }
}
