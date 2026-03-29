import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setState } from '../shared/aynig.mjs'
import { parseDecision } from '../shared/decisions.mjs'
import { getBody, getCommitHash, getTrailer, requireNumeric, requireValue } from '../shared/env.mjs'
import { failWithError } from '../shared/errors.mjs'
import { ensureDir, readText, resetFile } from '../shared/files.mjs'
import { getRepoRoot, resolveRelativePath } from '../shared/git.mjs'
import { runOpencode } from '../shared/opencode.mjs'
import { buildOutputPaths, ensureFile, getTicketMetadata, resolveTicketPath } from '../shared/paths.mjs'
import { renderPromptTemplate } from '../shared/prompts.mjs'
import { createRuntime } from '../shared/runtime.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandDir = path.resolve(__dirname, '..', '..')
const promptPath = path.join(commandDir, 'prompts', 'review-qa-plan.md')
const repoContextPath = path.join(commandDir, 'prompts', 'fragments', 'repo-context.md')

export async function main({ env = process.env, runtime = createRuntime() } = {}) {
  let repoRoot = ''

  try {
    const body = requireValue(getBody(env), 'Missing latest QA planner notes for reviewer in commit body')
    const ticketInput = requireValue(getTrailer('DWP_TICKET', env), 'Missing dwp-ticket trailer')
    const currentPlanVersion = requireNumeric(
      getTrailer('DWP_PLAN_VERSION', env),
      `Invalid current_plan_version trailer value: ${getTrailer('DWP_PLAN_VERSION', env)}`,
    )
    const plannerSessionId = requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id trailer')
    const currentImplementationVersion = requireNumeric(
      getTrailer('DWP_IMPLEMENTATION_VERSION', env),
      `Invalid current_implementation_version trailer value: ${getTrailer('DWP_IMPLEMENTATION_VERSION', env)}`,
    )
    const implementerSessionId = requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id trailer')
    const currentQaPlanVersion = requireNumeric(
      getTrailer('DWP_QA_PLAN_VERSION', env),
      `Invalid current_qa_plan_version trailer value: ${getTrailer('DWP_QA_PLAN_VERSION', env)}`,
    )
    const qaPlannerSessionId = requireValue(getTrailer('DWP_QA_PLANNER_SESSION_ID', env), 'Missing dwp-qa-planner-session-id trailer')
    const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')

    repoRoot = await getRepoRoot(runtime)
    const ticketPath = resolveTicketPath(repoRoot, ticketInput)
    await ensureFile(runtime, ticketPath, `Ticket not found: ${ticketPath}`)

    const { ticketName, relativeTicketPath } = getTicketMetadata(repoRoot, ticketPath)
    const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)
    const relativeOutputPath = resolveRelativePath(repoRoot, outputPath)
    const runTitle = `${commitHash}-review-qa-plan`
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
      files: [path.join(repoRoot, 'SPEC.md'), path.join(repoRoot, 'IMPLEMENTATION_PLAN.md'), ticketPath, outputPath],
      prompt,
    })

    const outputBody = await readText(runtime, outputPath)
    requireValue(outputBody, `Output file was empty: ${relativeOutputPath}`)
    const decision = parseDecision(outputBody, ['execute-qa', 'iterate-qa-plan', 'iterate-implementation', 'call-human'])

    const nextSubjectMap = {
      'execute-qa': `review-qa-plan: approve ${ticketName} qa plan`,
      'iterate-qa-plan': `review-qa-plan: request ${ticketName} qa plan changes`,
      'iterate-implementation': `review-qa-plan: request ${ticketName} implementation changes`,
      'call-human': `review-qa-plan: needs human input for ${ticketName}`,
    }

    await setState(runtime, {
      cwd: repoRoot,
      state: decision,
      subject: nextSubjectMap[decision],
      trailers: [
        `dwp-ticket: ${relativeTicketPath}`,
        `dwp-plan-version: ${currentPlanVersion}`,
        `dwp-planner-session-id: ${plannerSessionId}`,
        `dwp-implementation-version: ${currentImplementationVersion}`,
        `dwp-implementer-session-id: ${implementerSessionId}`,
        `dwp-qa-plan-version: ${currentQaPlanVersion}`,
        `dwp-qa-planner-session-id: ${qaPlannerSessionId}`,
      ],
      prompt: outputBody,
    })
  } catch (error) {
    await failWithError({
      runtime,
      repoRoot,
      commandName: 'review-qa-plan',
      failureSummary: 'Command failed while reviewing the QA plan.',
      cause: error.message,
    })
    process.exitCode = 1
  }
}
