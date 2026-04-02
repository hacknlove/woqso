import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildOutputPaths,
  createLogger,
  ensureDir,
  ensureFile,
  failWithError,
  findSessionId,
  getBody,
  getCommitHash,
  getRepoRoot,
  getTicketMetadata,
  getTrailer,
  parseDecision,
  readFile,
  renderTemplate,
  requireValue,
  resetFile,
  resolveRelativePath,
  resolveTicketPath,
  runOpencode,
  setState,
  stageRepoExcludingLogs,
  stageTicket,
  writeFile,
} from './shared/core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandDir = path.resolve(__dirname, '..')
const promptsDir = path.join(commandDir, 'prompts')
const repoContextPath = path.join(promptsDir, 'fragments', 'repo-context.md')

const NON_INTERACTIVE_GUARD = `SYSTEM:
You are running in non-interactive (batch) mode.
- Do NOT ask the user questions.
- Do NOT use the tool named "question".
- If required information is missing or ambiguous, do your best with reasonable assumptions.
- If you truly cannot proceed safely without user input, output "Decision: call-human" with a short explanation of what you need.
- Never wait for input. Always finish by writing the output file and exiting.
`

function applyNonInteractiveGuard(prompt) {
  return `${NON_INTERACTIVE_GUARD}\n${prompt}`
}

function promptPath(name) {
  return path.join(promptsDir, `${name}.md`)
}

function runTitle(commitHash, suffix) {
  return `${commitHash}-${suffix}`
}

function withAdditionalInstructions(body) {
  return body ? `\n\nAdditional instructions:\n${body}` : ''
}

function trimmedRepoContext(repoContext) {
  return repoContext.trim()
}

function withRequiredBody(body, message) {
  return requireValue(body, message)
}

function needsSessionId(buildTrailers) {
  return /session-id/.test(buildTrailers.toString())
}

const COMMANDS = {
  plan: {
    sessionSuffix: 'plan',
    promptName: 'plan',
    allowedDecisions: ['review-plan', 'call-human'],
    stage: 'ticket',
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, sessionId }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      'dwp-plan-version: 1',
      `dwp-planner-session-id: ${sessionId}`,
    ],
    subject: ({ decision, ticketName }) =>
      decision === 'review-plan' ? `plan: create ${ticketName} plan` : `plan: needs human input for ${ticketName}`,
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      additional_instructions_block: body ? `\n\nAdditional instructions:\n${body}` : '',
    }),
  },
  'review-plan': {
    sessionSuffix: 'review-plan',
    promptName: 'review-plan',
    allowedDecisions: ['implement', 'iterate-plan', 'call-human'],
    stage: null,
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'implement') return `review-plan: approve ${ticketName} plan`
      if (decision === 'iterate-plan') return `review-plan: revise ${ticketName} plan`
      return `review-plan: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing latest iteration notes for reviewer in commit body'),
    }),
  },
  'iterate-plan': {
    sessionSuffix: 'iterate-plan',
    promptName: 'iterate-plan',
    allowedDecisions: ['review-plan', 'call-human'],
    stage: 'ticket',
    keepTrailers: true,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${Number(requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')) + 1}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
    ],
    subject: ({ decision, ticketName }) =>
      decision === 'review-plan' ? `iterate-plan: revise ${ticketName} plan` : `iterate-plan: needs human input for ${ticketName}`,
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing reviewer feedback in commit body'),
    }),
  },
  implement: {
    sessionSuffix: 'implement',
    promptName: 'implement',
    allowedDecisions: ['review-implementation', 'revisit-plan', 'call-human'],
    stage: 'repo',
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, env, sessionId }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      'dwp-implementation-version: 1',
      `dwp-implementer-session-id: ${sessionId}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'review-implementation') return `implement: implement ${ticketName}`
      if (decision === 'revisit-plan') return `implement: revisit plan for ${ticketName}`
      return `implement: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      additional_instructions_block: body ? `\n\nAdditional instructions:\n${body}` : '',
    }),
  },
  'revisit-plan': {
    sessionSuffix: 'revisit-plan',
    promptName: 'revisit-plan',
    allowedDecisions: ['iterate-implementation', 'call-human'],
    stage: 'ticket',
    keepTrailers: true,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${Number(requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')) + 1}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
    ],
    subject: ({ decision, ticketName }) =>
      decision === 'iterate-implementation'
        ? `revisit-plan: clarify ${ticketName} plan`
        : `revisit-plan: needs human input for ${ticketName}`,
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing implementer feedback in commit body'),
    }),
  },
  'review-implementation': {
    sessionSuffix: 'review-implementation',
    promptName: 'review-implementation',
    allowedDecisions: ['qa-plan', 'iterate-implementation', 'call-human'],
    stage: null,
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'qa-plan') return `review-implementation: approve ${ticketName} for qa planning`
      if (decision === 'iterate-implementation') return `review-implementation: revise ${ticketName} implementation`
      return `review-implementation: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing implementer notes for reviewer in commit body'),
    }),
  },
  'iterate-implementation': {
    sessionSuffix: 'iterate-implementation',
    promptName: 'iterate-implementation',
    allowedDecisions: ['review-implementation', 'revisit-plan', 'call-human'],
    stage: 'repo',
    keepTrailers: true,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${Number(requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')) + 1}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'review-implementation') return `iterate-implementation: revise ${ticketName} implementation`
      if (decision === 'revisit-plan') return `iterate-implementation: revisit plan for ${ticketName}`
      return `iterate-implementation: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing reviewer feedback in commit body'),
    }),
  },
  'qa-plan': {
    sessionSuffix: 'qa-plan',
    promptName: 'qa-plan',
    allowedDecisions: ['review-qa-plan', 'iterate-implementation', 'call-human'],
    stage: 'ticket',
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, env, sessionId }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
      'dwp-qa-plan-version: 1',
      `dwp-qa-planner-session-id: ${sessionId}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'review-qa-plan') return `qa-plan: create ${ticketName} QA plan`
      if (decision === 'iterate-implementation') return `qa-plan: implementation changes needed for ${ticketName}`
      return `qa-plan: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      additional_instructions_block: body ? `\n\nAdditional instructions:\n${body}` : '',
    }),
  },
  'review-qa-plan': {
    sessionSuffix: 'review-qa-plan',
    promptName: 'review-qa-plan',
    allowedDecisions: ['execute-qa', 'iterate-qa-plan', 'iterate-implementation', 'call-human'],
    stage: null,
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
      `dwp-qa-plan-version: ${requireValue(getTrailer('DWP_QA_PLAN_VERSION', env), 'Missing dwp-qa-plan-version')}`,
      `dwp-qa-planner-session-id: ${requireValue(getTrailer('DWP_QA_PLANNER_SESSION_ID', env), 'Missing dwp-qa-planner-session-id')}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'execute-qa') return `review-qa-plan: approve ${ticketName} qa plan`
      if (decision === 'iterate-qa-plan') return `review-qa-plan: revise ${ticketName} qa plan`
      if (decision === 'iterate-implementation') return `review-qa-plan: implementation changes needed for ${ticketName}`
      return `review-qa-plan: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing QA planner notes for reviewer in commit body'),
    }),
  },
  'iterate-qa-plan': {
    sessionSuffix: 'iterate-qa-plan',
    promptName: 'iterate-qa-plan',
    allowedDecisions: ['review-qa-plan', 'iterate-implementation', 'call-human'],
    stage: 'ticket',
    keepTrailers: true,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
      `dwp-qa-plan-version: ${Number(requireValue(getTrailer('DWP_QA_PLAN_VERSION', env), 'Missing dwp-qa-plan-version')) + 1}`,
      `dwp-qa-planner-session-id: ${requireValue(getTrailer('DWP_QA_PLANNER_SESSION_ID', env), 'Missing dwp-qa-planner-session-id')}`,
    ],
    subject: ({ decision, ticketName }) =>
      decision === 'review-qa-plan'
        ? `iterate-qa-plan: revise ${ticketName} QA plan`
        : decision === 'iterate-implementation'
          ? `iterate-qa-plan: implementation changes needed for ${ticketName}`
          : `iterate-qa-plan: needs human input for ${ticketName}`,
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      body: requireValue(body, 'Missing QA reviewer feedback in commit body'),
    }),
  },
  'execute-qa': {
    sessionSuffix: 'execute-qa',
    promptName: 'execute-qa',
    allowedDecisions: ['deploy', 'iterate-qa-plan', 'iterate-implementation', 'call-human'],
    stage: 'repo',
    keepTrailers: false,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
      `dwp-qa-plan-version: ${requireValue(getTrailer('DWP_QA_PLAN_VERSION', env), 'Missing dwp-qa-plan-version')}`,
      `dwp-qa-planner-session-id: ${requireValue(getTrailer('DWP_QA_PLANNER_SESSION_ID', env), 'Missing dwp-qa-planner-session-id')}`,
    ],
    subject: ({ decision, ticketName }) => {
      if (decision === 'deploy') return `execute-qa: approve ${ticketName} for deploy`
      if (decision === 'iterate-qa-plan') return `execute-qa: revise QA plan for ${ticketName}`
      if (decision === 'iterate-implementation') return `execute-qa: implementation changes needed for ${ticketName}`
      return `execute-qa: needs human input for ${ticketName}`
    },
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath, body }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
      additional_instructions_block: body ? `\n\nAdditional instructions:\n${body}` : '',
    }),
  },
  deploy: {
    sessionSuffix: 'deploy',
    promptName: 'deploy',
    allowedDecisions: ['call-human'],
    stage: null,
    keepTrailers: true,
    buildTrailers: ({ relativeTicketPath, env }) => [
      `dwp-ticket: ${relativeTicketPath}`,
      `dwp-plan-version: ${requireValue(getTrailer('DWP_PLAN_VERSION', env), 'Missing dwp-plan-version')}`,
      `dwp-planner-session-id: ${requireValue(getTrailer('DWP_PLANNER_SESSION_ID', env), 'Missing dwp-planner-session-id')}`,
      `dwp-implementation-version: ${requireValue(getTrailer('DWP_IMPLEMENTATION_VERSION', env), 'Missing dwp-implementation-version')}`,
      `dwp-implementer-session-id: ${requireValue(getTrailer('DWP_IMPLEMENTER_SESSION_ID', env), 'Missing dwp-implementer-session-id')}`,
      `dwp-qa-plan-version: ${requireValue(getTrailer('DWP_QA_PLAN_VERSION', env), 'Missing dwp-qa-plan-version')}`,
      `dwp-qa-planner-session-id: ${requireValue(getTrailer('DWP_QA_PLANNER_SESSION_ID', env), 'Missing dwp-qa-planner-session-id')}`,
    ],
    subject: () => 'deploy: ready for human deployment',
    promptVars: ({ repoContext, relativeTicketPath, relativeOutputPath }) => ({
      repo_context: repoContext.trim(),
      relative_ticket_path: relativeTicketPath,
      relative_output_path: relativeOutputPath,
    }),
  },
}

async function execTicketCommand(state, env = process.env) {
  const logger = createLogger(env.AYNIG_LOG_LEVEL || 'info')
  let repoRoot = ''
  let ticketPath = ''

  try {
    const config = COMMANDS[state]
    requireValue(config, `Unknown state: ${state}`)

    const body = getBody(env)
    const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')
    const ticketInput = requireValue(getTrailer('DWP_TICKET', env), 'Missing dwp-ticket trailer')

    repoRoot = await getRepoRoot(process.cwd(), { env, logger })
    ticketPath = resolveTicketPath(repoRoot, ticketInput)
    await ensureFile(ticketPath, `Ticket not found: ${ticketPath}`)

    const { relativeTicketPath, ticketName } = getTicketMetadata(repoRoot, ticketPath)
    const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)
    const relativeOutputPath = resolveRelativePath(repoRoot, outputPath)
    const title = runTitle(commitHash, config.sessionSuffix)
    const repoContext = await readFile(repoContextPath)
    const template = await readFile(promptPath(config.promptName))

    await ensureDir(logsDir)
    await resetFile(outputPath)

    const prompt = renderTemplate(template, config.promptVars({
      repoContext,
      relativeTicketPath,
      relativeOutputPath,
      body,
      env,
    }))

    await runOpencode({
      repoRoot,
      title,
      files: [path.join(repoRoot, 'SPEC.md'), path.join(repoRoot, 'IMPLEMENTATION_PLAN.md'), ticketPath, outputPath],
      prompt: applyNonInteractiveGuard(prompt),
      env,
      logger,
      timeoutMs: Number(env.OPENCODE_TIMEOUT_MS || 0) || 10 * 60 * 1000,
    })

    const outputBody = await readFile(outputPath)
    requireValue(outputBody, `Output file was empty at ${relativeOutputPath}`)

    const decision = parseDecision(outputBody, config.allowedDecisions)
    const sessionId = needsSessionId(config.buildTrailers)
      ? requireValue(await findSessionId({ repoRoot, title, env, logger }), 'Unable to determine opencode session id')
      : ''

    if (config.stage === 'ticket') {
      await stageTicket(ticketPath, repoRoot, { env, logger })
    }
    if (config.stage === 'repo') {
      await stageRepoExcludingLogs(repoRoot, { env, logger })
    }

    await setState({
      cwd: repoRoot,
      state: decision,
      subject: config.subject({ decision, ticketName }),
      trailers: config.buildTrailers({ relativeTicketPath, env, sessionId }),
      prompt: outputBody,
      keepTrailers: config.keepTrailers,
      env,
      logger,
    })
  } catch (error) {
    await failWithError({
      repoRoot,
      ticketPath,
      commandName: state,
      failureSummary: `Command failed while executing state '${state}'.`,
      cause: error?.message ?? String(error),
      env,
      logger: createLogger(env.AYNIG_LOG_LEVEL || 'info'),
    })
    process.exitCode = 1
  }
}

async function execProbeCommand(env = process.env) {
  const logger = createLogger(env.AYNIG_LOG_LEVEL || 'info')
  const body = getBody(env)
  const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')
  const repoRoot = await getRepoRoot(process.cwd(), { env, logger })
  const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)

  await ensureDir(logsDir)
  await resetFile(outputPath)

  await runOpencode({
    repoRoot,
    title: runTitle(commitHash, 'probe'),
    files: [],
    prompt: applyNonInteractiveGuard(body),
    env,
    logger,
    timeoutMs: Number(env.OPENCODE_TIMEOUT_MS || 0) || 0,
  })

  await stageRepoExcludingLogs(repoRoot, { env, logger })
  await setState({ cwd: repoRoot, state: 'done', subject: 'done', trailers: [], prompt: '', env, logger })
}

export async function run(state, { env = process.env } = {}) {
  if (state === 'probe') {
    await execProbeCommand(env)
    return
  }
  await execTicketCommand(state, env)
}
