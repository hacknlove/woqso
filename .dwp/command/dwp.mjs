#!/usr/bin/env node

// KISS DWP command runtime
// One file that implements all workflow commands.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// -----------------
// Runtime + logging
// -----------------

export function normalizeLogLevel(level) {
  const levels = ['debug', 'info', 'warn', 'error']
  return levels.includes(level) ? level : 'error'
}

export function createLogger({ level = 'info', write } = {}) {
  const levels = ['debug', 'info', 'warn', 'error']
  const minIndex = Math.max(0, levels.indexOf(normalizeLogLevel(level || 'info')))
  const sink = write ?? ((line) => process.stderr.write(`${line}\n`))
  const logAt = (lvl, message) => {
    if (levels.indexOf(lvl) < minIndex) return
    sink(`[${lvl}] ${message}`)
  }
  return {
    debug: (m) => logAt('debug', m),
    info: (m) => logAt('info', m),
    warn: (m) => logAt('warn', m),
    error: (m) => logAt('error', m),
  }
}

function createDefaultExecFile(logger, baseEnv) {
  return function execFile(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const { maxBuffer = Infinity, timeout = 0, ...spawnOptions } = options
      if (!spawnOptions.stdio) spawnOptions.stdio = ['ignore', 'pipe', 'pipe']
      if (!spawnOptions.env) spawnOptions.env = { ...(baseEnv || {}), ...(options.env || {}) }

      const child = spawn(command, args, spawnOptions)
      const stdoutChunks = []
      const stderrChunks = []
      let stdoutLength = 0
      let stderrLength = 0
      let settled = false
      let timeoutId

      const appendChunk = (chunks, chunk, currentLength) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        chunks.push(buffer)
        return currentLength + buffer.length
      }

      const finishError = (error) => {
        if (settled) return
        if (timeoutId) clearTimeout(timeoutId)
        settled = true
        error.stdout = Buffer.concat(stdoutChunks).toString()
        error.stderr = Buffer.concat(stderrChunks).toString()
        reject(error)
      }

      const finishOk = () => {
        if (settled) return
        if (timeoutId) clearTimeout(timeoutId)
        settled = true
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString(),
          stderr: Buffer.concat(stderrChunks).toString(),
        })
      }

      child.stdout?.on('data', (chunk) => {
        stdoutLength = appendChunk(stdoutChunks, chunk, stdoutLength)
        logger?.debug?.(`[${command}] stdout: ${String(chunk).trimEnd()}`)
        if (stdoutLength + stderrLength > maxBuffer) {
          child.kill()
          finishError(new Error(`maxBuffer exceeded: ${maxBuffer}`))
        }
      })

      child.stderr?.on('data', (chunk) => {
        stderrLength = appendChunk(stderrChunks, chunk, stderrLength)
        logger?.debug?.(`[${command}] stderr: ${String(chunk).trimEnd()}`)
        if (stdoutLength + stderrLength > maxBuffer) {
          child.kill()
          finishError(new Error(`maxBuffer exceeded: ${maxBuffer}`))
        }
      })

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          logger?.warn?.(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`)
          child.kill('SIGTERM')
          finishError(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`))
        }, timeout)
      }

      child.on('error', finishError)
      child.on('close', (code, signal) => {
        if (settled) return
        if (code !== 0) {
          const reason = signal ? `signal ${signal}` : `code ${code}`
          const error = new Error(`Command failed: ${command} ${args.join(' ')} (${reason})`)
          error.code = code
          error.signal = signal
          finishError(error)
          return
        }
        finishOk()
      })
    })
  }
}

export function createRuntime(overrides = {}) {
  const env = overrides.env ?? process.env
  const logger =
    overrides.logger ??
    createLogger({
      level: env.AYNIG_LOG_LEVEL,
      write: overrides.writeLog,
    })

  return {
    env,
    fs: overrides.fs ?? fs,
    execFile: overrides.execFile ?? createDefaultExecFile(logger, env),
    logger,
  }
}

// -----------------
// Env helpers
// -----------------

export function requireValue(value, message) {
  if (!value) throw new Error(message)
  return value
}

export function getBody(env) {
  return env.AYNIG_BODY ?? ''
}

export function getCommitHash(env) {
  return env.AYNIG_COMMIT_HASH
}

export function getTrailer(name, env) {
  return env[`AYNIG_TRAILER_${name}`]
}

// -----------------
// Files + prompts
// -----------------

export async function ensureDir(runtime, dirPath) {
  await runtime.fs.mkdir(dirPath, { recursive: true })
}

export async function readText(runtime, filePath) {
  return runtime.fs.readFile(filePath, 'utf8')
}

export async function writeText(runtime, filePath, content) {
  await runtime.fs.writeFile(filePath, content, 'utf8')
}

export async function ensureFile(runtime, filePath, message) {
  try {
    await runtime.fs.access(filePath)
  } catch {
    throw new Error(message)
  }
}

export async function resetFile(runtime, filePath) {
  await runtime.fs.writeFile(filePath, '', 'utf8')
}

export async function renderPromptTemplate(runtime, templatePath, vars) {
  const template = await readText(runtime, templatePath)
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = vars[key]
    return value == null ? '' : String(value)
  })
}

// -----------------
// Process helpers
// -----------------

export async function runProcess(runtime, command, args, options = {}) {
  const merged = { ...options }
  const baseEnv = runtime?.env ?? process.env
  merged.env = { ...(baseEnv || {}), ...(options.env || {}) }
  return runtime.execFile(command, args, merged)
}

// -----------------
// Decisions
// -----------------

export function parseDecision(output, allowedDecisions) {
  const firstLine = (output || '').split(/\r?\n/, 1)[0] ?? ''
  const match = firstLine.match(/^Decision:\s*(.+)$/)
  if (!match) {
    throw new Error(`Invalid output decision: ${firstLine}`)
  }
  const decision = match[1].trim()
  if (!allowedDecisions.includes(decision)) {
    throw new Error(`Invalid output decision: ${firstLine}`)
  }
  return decision
}

// -----------------
// Git / paths
// -----------------

export async function getRepoRoot(runtime) {
  const { stdout } = await runtime.execFile('git', ['rev-parse', '--show-toplevel'])
  return stdout.trim()
}

export function resolveTicketPath(repoRoot, ticketInput) {
  return path.isAbsolute(ticketInput) ? ticketInput : path.join(repoRoot, ticketInput)
}

export function resolveRelativePath(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath)
}

export function getTicketMetadata(repoRoot, ticketPath) {
  const relativeTicketPath = resolveRelativePath(repoRoot, ticketPath)
  const ticketName = path.basename(ticketPath, path.extname(ticketPath))
  return { relativeTicketPath, ticketName }
}

export async function stageTicket(runtime, ticketPath, repoRoot) {
  // Some tests expect `git add <absTicketPath>`.
  await runtime.execFile('git', ['add', ticketPath], { cwd: repoRoot })
}

export async function stageRepoExcludingLogs(runtime, repoRoot) {
  await runtime.execFile('git', ['-C', repoRoot, 'add', '-A', '--', '.', ':(exclude).dwp/logs'], { cwd: repoRoot })
}

export function buildOutputPaths(repoRoot, commitHash) {
  const logsDir = path.join(repoRoot, '.dwp', 'logs')
  const outputPath = path.join(logsDir, `dwp-output-${commitHash}.md`)
  return { logsDir, outputPath }
}

// -----------------
// opencode
// -----------------

export async function runOpencode(runtime, { repoRoot, title, files, prompt, timeoutMs }) {
  runtime.logger?.debug?.(`Opencode prompt for ${title}:\n${prompt}`)
  const args = ['run', '--title', title]
  for (const file of files) {
    args.push('-f', file)
  }
  args.push('--', prompt)
  await runtime.execFile('opencode', args, { cwd: repoRoot, timeout: timeoutMs ?? 0 })
}

export async function findSessionId(runtime, { repoRoot, title }) {
  const { stdout } = await runtime.execFile('opencode', ['session', 'list'], { cwd: repoRoot })
  let sessions
  try {
    sessions = JSON.parse(stdout)
  } catch {
    throw new Error('Unable to parse opencode session list JSON')
  }
  const match = (sessions ?? []).find((entry) => entry?.title === title)
  return match?.id
}

// -----------------
// aynig
// -----------------

export async function setState(runtime, { cwd, state, subject, trailers, prompt, keepTrailers = false }) {
  const args = ['set-state', state, subject]
  if (keepTrailers) args.push('--keep-trailers')
  for (const trailer of trailers ?? []) {
    args.push('--trailer', trailer)
  }
  if (prompt) {
    args.push('--prompt', prompt)
  }
  await runtime.execFile('aynig', args, { cwd })
}

async function failWithError(runtime, { repoRoot, ticketPath, commandName, failureSummary, cause }) {
  const trailers = []
  if (ticketPath && repoRoot) {
    trailers.push(`dwp-ticket: ${resolveRelativePath(repoRoot, ticketPath)}`)
  }
  await setState(runtime, {
    cwd: repoRoot || process.cwd(),
    state: 'error',
    subject: `${commandName}: error`,
    trailers,
    prompt: `${failureSummary}\n\nCause: ${cause}`,
    keepTrailers: true,
  })
}

// -----------------
// Command registry
// -----------------

const PROMPTS_DIR = path.join(__dirname, 'prompts')
const REPO_CONTEXT_PATH = path.join(PROMPTS_DIR, 'fragments', 'repo-context.md')

function promptPath(name) {
  return path.join(PROMPTS_DIR, `${name}.md`)
}

function runTitle(commitHash, suffix) {
  return `${commitHash}-${suffix}`
}

// Shared command executor.
async function execTicketCommand({ state, env, runtime }) {
  const body = getBody(env)
  const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')
  const repoRoot = await getRepoRoot(runtime)

  const ticketInput = requireValue(getTrailer('DWP_TICKET', env), 'Missing dwp-ticket trailer')
  const ticketPath = resolveTicketPath(repoRoot, ticketInput)
  await ensureFile(runtime, ticketPath, `Ticket not found: ${ticketPath}`)

  const { relativeTicketPath, ticketName } = getTicketMetadata(repoRoot, ticketPath)
  const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)
  const relativeOutputPath = resolveRelativePath(repoRoot, outputPath)

  await ensureDir(runtime, logsDir)
  await resetFile(runtime, outputPath)

  const repoContext = await readText(runtime, REPO_CONTEXT_PATH)

  const config = COMMANDS[state]
  requireValue(config, `Unknown state: ${state}`)

  const title = runTitle(commitHash, config.sessionSuffix)
  const tpl = await renderPromptTemplate(runtime, promptPath(config.promptName), {
    repo_context: repoContext.trim(),
    relative_ticket_path: relativeTicketPath,
    relative_output_path: relativeOutputPath,
    additional_instructions_block: body ? `\n\nAdditional instructions:\n${body}` : '',
  })

  await runOpencode(runtime, {
    repoRoot,
    title,
    files: [
      path.join(repoRoot, 'SPEC.md'),
      path.join(repoRoot, 'IMPLEMENTATION_PLAN.md'),
      ticketPath,
      outputPath,
    ],
    prompt: tpl,
  })

  const sessionId = await findSessionId(runtime, { repoRoot, title })
  requireValue(sessionId, 'Unable to determine opencode session id')

  const outputBody = await readText(runtime, outputPath)
  requireValue(outputBody, `Output file was empty at ${relativeOutputPath}`)

  const decision = parseDecision(outputBody, config.allowedDecisions)

  // stage ticket/repo when requested
  if (config.stageTicket) {
    await stageTicket(runtime, ticketPath, repoRoot)
  }
  if (config.stageRepo) {
    await stageRepoExcludingLogs(runtime, repoRoot)
  }

  // trailers
  const trailers = []
  trailers.push(`dwp-ticket: ${relativeTicketPath}`)

  // versions
  const planVersion = getTrailer('DWP_PLAN_VERSION', env)
  const implVersion = getTrailer('DWP_IMPLEMENTATION_VERSION', env)
  const qaPlanVersion = getTrailer('DWP_QA_PLAN_VERSION', env)

  if (config.planVersionMode === 'set-1') trailers.push('dwp-plan-version: 1')
  if (config.planVersionMode === 'keep') trailers.push(`dwp-plan-version: ${requireValue(planVersion, 'Missing dwp-plan-version')}`)
  if (config.planVersionMode === 'inc') trailers.push(`dwp-plan-version: ${Number(requireValue(planVersion, 'Missing dwp-plan-version')) + 1}`)

  if (config.implVersionMode === 'set-1') trailers.push('dwp-implementation-version: 1')
  if (config.implVersionMode === 'keep') trailers.push(`dwp-implementation-version: ${requireValue(implVersion, 'Missing dwp-implementation-version')}`)
  if (config.implVersionMode === 'inc') trailers.push(`dwp-implementation-version: ${Number(requireValue(implVersion, 'Missing dwp-implementation-version')) + 1}`)

  if (config.qaPlanVersionMode === 'set-1') trailers.push('dwp-qa-plan-version: 1')
  if (config.qaPlanVersionMode === 'keep') trailers.push(`dwp-qa-plan-version: ${requireValue(qaPlanVersion, 'Missing dwp-qa-plan-version')}`)
  if (config.qaPlanVersionMode === 'inc') trailers.push(`dwp-qa-plan-version: ${Number(requireValue(qaPlanVersion, 'Missing dwp-qa-plan-version')) + 1}`)

  // sessions
  const plannerSessionId = getTrailer('DWP_PLANNER_SESSION_ID', env)
  const implementerSessionId = getTrailer('DWP_IMPLEMENTER_SESSION_ID', env)
  const qaPlannerSessionId = getTrailer('DWP_QA_PLANNER_SESSION_ID', env)

  if (config.writePlannerSessionId === 'new') trailers.push(`dwp-planner-session-id: ${sessionId}`)
  if (config.writePlannerSessionId === 'keep') trailers.push(`dwp-planner-session-id: ${requireValue(plannerSessionId, 'Missing dwp-planner-session-id')}`)

  if (config.writeImplementerSessionId === 'new') trailers.push(`dwp-implementer-session-id: ${sessionId}`)
  if (config.writeImplementerSessionId === 'keep') trailers.push(`dwp-implementer-session-id: ${requireValue(implementerSessionId, 'Missing dwp-implementer-session-id')}`)

  if (config.writeQaPlannerSessionId === 'new') trailers.push(`dwp-qa-planner-session-id: ${sessionId}`)
  if (config.writeQaPlannerSessionId === 'keep') trailers.push(`dwp-qa-planner-session-id: ${requireValue(qaPlannerSessionId, 'Missing dwp-qa-planner-session-id')}`)

  const nextSubject = config.subject(decision, ticketName)

  await setState(runtime, {
    cwd: repoRoot,
    state: decision,
    subject: nextSubject,
    trailers,
    prompt: outputBody,
    keepTrailers: config.keepTrailers,
  })
}

const COMMANDS = {
  'plan': {
    sessionSuffix: 'plan',
    promptName: 'plan',
    allowedDecisions: ['review-plan', 'call-human'],
    stageTicket: true,
    stageRepo: false,
    planVersionMode: 'set-1',
    implVersionMode: null,
    qaPlanVersionMode: null,
    writePlannerSessionId: 'new',
    writeImplementerSessionId: null,
    writeQaPlannerSessionId: null,
    keepTrailers: false,
    subject: (decision, ticketName) =>
      decision === 'review-plan' ? `plan: create ${ticketName} plan` : `plan: needs human input for ${ticketName}`,
  },
  'review-plan': {
    sessionSuffix: 'review-plan',
    promptName: 'review-plan',
    allowedDecisions: ['implement', 'iterate-plan', 'call-human'],
    stageTicket: false,
    planVersionMode: 'keep',
    writePlannerSessionId: 'keep',
    keepTrailers: false,
    subject: (decision, ticketName) => {
      if (decision === 'implement') return `review-plan: approve ${ticketName} plan`
      if (decision === 'iterate-plan') return `review-plan: revise ${ticketName} plan`
      return `review-plan: needs human input for ${ticketName}`
    },
  },
  'iterate-plan': {
    sessionSuffix: 'iterate-plan',
    promptName: 'iterate-plan',
    allowedDecisions: ['review-plan', 'call-human'],
    stageTicket: true,
    planVersionMode: 'inc',
    writePlannerSessionId: 'keep',
    keepTrailers: true,
    subject: (decision, ticketName) =>
      decision === 'review-plan' ? `iterate-plan: revise ${ticketName} plan` : `iterate-plan: needs human input for ${ticketName}`,
  },
  'implement': {
    sessionSuffix: 'implement',
    promptName: 'implement',
    allowedDecisions: ['review-implementation', 'revisit-plan', 'call-human'],
    stageTicket: false,
    stageRepo: true,
    planVersionMode: 'keep',
    implVersionMode: 'set-1',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'new',
    keepTrailers: false,
    subject: (decision, ticketName) => {
      if (decision === 'review-implementation') return `implement: implement ${ticketName}`
      if (decision === 'revisit-plan') return `implement: revisit plan for ${ticketName}`
      return `implement: needs human input for ${ticketName}`
    },
  },
  'revisit-plan': {
    sessionSuffix: 'revisit-plan',
    promptName: 'revisit-plan',
    allowedDecisions: ['iterate-implementation', 'call-human'],
    stageTicket: true,
    planVersionMode: 'inc',
    implVersionMode: 'keep',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    keepTrailers: true,
    subject: (decision, ticketName) =>
      decision === 'iterate-implementation'
        ? `revisit-plan: clarify ${ticketName} plan`
        : `revisit-plan: needs human input for ${ticketName}`,
  },
  'review-implementation': {
    sessionSuffix: 'review-implementation',
    promptName: 'review-implementation',
    allowedDecisions: ['qa-plan', 'iterate-implementation', 'call-human'],
    stageTicket: false,
    planVersionMode: 'keep',
    implVersionMode: 'keep',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    keepTrailers: false,
    subject: (decision, ticketName) => {
      if (decision === 'qa-plan') return `review-implementation: approve ${ticketName} for qa planning`
      if (decision === 'iterate-implementation') return `review-implementation: revise ${ticketName} implementation`
      return `review-implementation: needs human input for ${ticketName}`
    },
  },
  'iterate-implementation': {
    sessionSuffix: 'iterate-implementation',
    promptName: 'iterate-implementation',
    allowedDecisions: ['review-implementation', 'revisit-plan', 'call-human'],
    stageTicket: false,
    stageRepo: true,
    planVersionMode: 'keep',
    implVersionMode: 'inc',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    keepTrailers: true,
    subject: (decision, ticketName) => {
      if (decision === 'review-implementation') return `iterate-implementation: revise ${ticketName} implementation`
      if (decision === 'revisit-plan') return `iterate-implementation: revisit plan for ${ticketName}`
      return `iterate-implementation: needs human input for ${ticketName}`
    },
  },
  'qa-plan': {
    sessionSuffix: 'qa-plan',
    promptName: 'qa-plan',
    allowedDecisions: ['review-qa-plan', 'iterate-implementation', 'call-human'],
    stageTicket: true,
    planVersionMode: 'keep',
    implVersionMode: 'keep',
    qaPlanVersionMode: 'set-1',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    writeQaPlannerSessionId: 'new',
    keepTrailers: false,
    subject: (decision, ticketName) => {
      if (decision === 'review-qa-plan') return `qa-plan: create ${ticketName} QA plan`
      if (decision === 'iterate-implementation') return `qa-plan: implementation changes needed for ${ticketName}`
      return `qa-plan: needs human input for ${ticketName}`
    },
  },
  'review-qa-plan': {
    sessionSuffix: 'review-qa-plan',
    promptName: 'review-qa-plan',
    allowedDecisions: ['execute-qa', 'iterate-qa-plan', 'iterate-implementation', 'call-human'],
    stageTicket: false,
    planVersionMode: 'keep',
    implVersionMode: 'keep',
    qaPlanVersionMode: 'keep',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    writeQaPlannerSessionId: 'keep',
    keepTrailers: false,
    subject: (decision, ticketName) => {
      if (decision === 'execute-qa') return `review-qa-plan: approve ${ticketName} qa plan`
      if (decision === 'iterate-qa-plan') return `review-qa-plan: revise ${ticketName} qa plan`
      if (decision === 'iterate-implementation') return `review-qa-plan: implementation changes needed for ${ticketName}`
      return `review-qa-plan: needs human input for ${ticketName}`
    },
  },
  'iterate-qa-plan': {
    sessionSuffix: 'iterate-qa-plan',
    promptName: 'iterate-qa-plan',
    allowedDecisions: ['review-qa-plan', 'iterate-implementation', 'call-human'],
    stageTicket: true,
    planVersionMode: 'keep',
    implVersionMode: 'keep',
    qaPlanVersionMode: 'inc',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    writeQaPlannerSessionId: 'keep',
    keepTrailers: true,
    subject: (decision, ticketName) =>
      decision === 'review-qa-plan' ? `iterate-qa-plan: revise ${ticketName} QA plan` : `iterate-qa-plan: needs human input for ${ticketName}`,
  },
  'execute-qa': {
    sessionSuffix: 'execute-qa',
    promptName: 'execute-qa',
    allowedDecisions: ['deploy', 'iterate-qa-plan', 'iterate-implementation', 'call-human'],
    stageTicket: false,
    stageRepo: true,
    planVersionMode: 'keep',
    implVersionMode: 'keep',
    qaPlanVersionMode: 'keep',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    writeQaPlannerSessionId: 'keep',
    keepTrailers: false,
    subject: (decision, ticketName) => {
      if (decision === 'deploy') return `execute-qa: approve ${ticketName} for deploy`
      if (decision === 'iterate-qa-plan') return `execute-qa: revise QA plan for ${ticketName}`
      if (decision === 'iterate-implementation') return `execute-qa: implementation changes needed for ${ticketName}`
      return `execute-qa: needs human input for ${ticketName}`
    },
  },
  'deploy': {
    sessionSuffix: 'deploy',
    promptName: 'deploy',
    allowedDecisions: ['call-human'],
    stageTicket: false,
    planVersionMode: 'keep',
    implVersionMode: 'keep',
    qaPlanVersionMode: 'keep',
    writePlannerSessionId: 'keep',
    writeImplementerSessionId: 'keep',
    writeQaPlannerSessionId: 'keep',
    keepTrailers: true,
    subject: (_decision, _ticketName) => `deploy: ready for human deployment`,
  },
}

async function execProbeCommand({ env, runtime }) {
  const body = getBody(env)
  const commitHash = requireValue(getCommitHash(env), 'Missing AYNIG_COMMIT_HASH')
  const repoRoot = await getRepoRoot(runtime)
  const { logsDir, outputPath } = buildOutputPaths(repoRoot, commitHash)

  await ensureDir(runtime, logsDir)
  await resetFile(runtime, outputPath)

  const title = runTitle(commitHash, 'probe')

  // Run opencode with the body verbatim.
  // The prompt itself is responsible for telling opencode what to do.
  const timeoutMs = Number(env.DWP_PROBE_TIMEOUT_MS || 0) || 0

  await runOpencode(runtime, {
    repoRoot,
    title,
    files: [],
    prompt: body,
    timeoutMs,
  })

  // Always end in a non-workflow state.
  await setState(runtime, {
    cwd: repoRoot,
    state: 'done',
    subject: 'done',
    trailers: [],
    prompt: '',
    keepTrailers: false,
  })
}

export async function run(state, { env = process.env, runtime = createRuntime({ env }) } = {}) {
  let repoRoot = ''
  let ticketPath = ''
  try {
    // quick validation that repo context exists
    repoRoot = await getRepoRoot(runtime)

    if (state === 'probe') {
      await execProbeCommand({ env, runtime })
      return
    }

    const config = COMMANDS[state]
    requireValue(config, `Unknown state: ${state}`)

    // run opencode-backed ticket commands
    await execTicketCommand({ state, env, runtime })
  } catch (error) {
    try {
      // best effort: detect ticket
      if (!repoRoot) {
        repoRoot = await getRepoRoot(runtime)
      }
      const ticketInput = getTrailer('DWP_TICKET', env)
      if (repoRoot && ticketInput) {
        ticketPath = resolveTicketPath(repoRoot, ticketInput)
      }
    } catch {
      // ignore
    }

    await failWithError(runtime, {
      repoRoot,
      ticketPath,
      commandName: state,
      failureSummary: `Command failed while executing state '${state}'.`,
      cause: error?.message ?? String(error),
    })
    process.exitCode = 1
  }
}

// CLI mode: infer state from argv[2] or from invoked filename.
if (import.meta.url === `file://${process.argv[1]}`) {
  const state = process.argv[2] || path.basename(process.argv[1])
  await run(state)
}
