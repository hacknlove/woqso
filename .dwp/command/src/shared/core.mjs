import path from 'node:path'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

export function requireValue(value, message) {
  if (!value) throw new Error(message)
  return value
}

export function getEnv(name, env = process.env) {
  return env[name]
}

export function getTrailer(name, env = process.env) {
  return env[`AYNIG_TRAILER_${name}`]
}

export function getBody(env = process.env) {
  return env.AYNIG_BODY ?? ''
}

export function getCommitHash(env = process.env) {
  return env.AYNIG_COMMIT_HASH ?? ''
}

export function createLogger(level = process.env.AYNIG_LOG_LEVEL || 'info') {
  const levels = ['debug', 'info', 'warn', 'error']
  const min = Math.max(0, levels.indexOf(level))
  const should = (name) => levels.indexOf(name) >= min
  const write = (name, message) => {
    if (!should(name)) return
    process.stderr.write(`[${name}] ${message}\n`)
  }
  return {
    debug: (m) => write('debug', m),
    info: (m) => write('info', m),
    warn: (m) => write('warn', m),
    error: (m) => write('error', m),
  }
}

export async function run(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    timeout = 0,
    idleTimeout = 0,
    maxBuffer = 10 * 1024 * 1024,
    logger = createLogger(),
  } = options

  const childEnv = {
    ...env,
    CI: env.CI ?? 'true',
    npm_config_yes: env.npm_config_yes ?? 'true',
  }

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const stdoutChunks = []
    const stderrChunks = []
    let stdoutLength = 0
    let stderrLength = 0
    let settled = false
    let timeoutId = null
    let idleTimeoutId = null

    const clearTimers = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (idleTimeoutId) clearTimeout(idleTimeoutId)
    }

    const finishError = (error) => {
      if (settled) return
      settled = true
      clearTimers()
      error.stdout = Buffer.concat(stdoutChunks).toString()
      error.stderr = Buffer.concat(stderrChunks).toString()
      reject(error)
    }

    const finishOk = () => {
      if (settled) return
      settled = true
      clearTimers()
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
      })
    }

    const resetIdle = () => {
      if (!idleTimeout || idleTimeout <= 0) return
      if (idleTimeoutId) clearTimeout(idleTimeoutId)
      idleTimeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        finishError(new Error(`Command idle timed out after ${idleTimeout}ms: ${command} ${args.join(' ')}`))
      }, idleTimeout)
    }

    const append = (chunks, chunk, current) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buffer)
      return current + buffer.length
    }

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        finishError(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`))
      }, timeout)
    }

    resetIdle()

    child.stdout?.on('data', (chunk) => {
      resetIdle()
      stdoutLength = append(stdoutChunks, chunk, stdoutLength)
      logger.debug(`[${command}] stdout: ${String(chunk).trimEnd()}`)
      if (stdoutLength + stderrLength > maxBuffer) {
        child.kill('SIGTERM')
        finishError(new Error(`maxBuffer exceeded: ${maxBuffer}`))
      }
    })

    child.stderr?.on('data', (chunk) => {
      resetIdle()
      stderrLength = append(stderrChunks, chunk, stderrLength)
      logger.debug(`[${command}] stderr: ${String(chunk).trimEnd()}`)
      if (stdoutLength + stderrLength > maxBuffer) {
        child.kill('SIGTERM')
        finishError(new Error(`maxBuffer exceeded: ${maxBuffer}`))
      }
    })

    child.on('error', finishError)
    child.on('close', (code, signal) => {
      if (settled) return
      if (code !== 0) {
        const reason = signal ? `signal ${signal}` : `code ${code}`
        finishError(new Error(`Command failed: ${command} ${args.join(' ')} (${reason})`))
        return
      }
      finishOk()
    })
  })
}

export async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf8')
}

export async function writeFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8')
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function ensureFile(filePath, message) {
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(message)
  }
}

export async function resetFile(filePath) {
  await fs.writeFile(filePath, '', 'utf8')
}

export function renderTemplate(template, vars) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => vars[key] ?? '')
}

export async function getRepoRoot(cwd = process.cwd(), options = {}) {
  const { stdout } = await run('git', ['rev-parse', '--show-toplevel'], { cwd, ...options })
  return stdout.trim()
}

export function resolveTicketPath(repoRoot, ticketInput) {
  return path.isAbsolute(ticketInput) ? ticketInput : path.join(repoRoot, ticketInput)
}

export function resolveRelativePath(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath)
}

export function getTicketMetadata(repoRoot, ticketPath) {
  return {
    relativeTicketPath: resolveRelativePath(repoRoot, ticketPath),
    ticketName: path.basename(ticketPath, path.extname(ticketPath)),
  }
}

export async function stageTicket(ticketPath, repoRoot, options = {}) {
  await run('git', ['add', ticketPath], { cwd: repoRoot, ...options })
}

export async function stageRepoExcludingLogs(repoRoot, options = {}) {
  try {
    await run('git', ['-C', repoRoot, 'add', '-A', '--', '.', ':(exclude).dwp/logs'], { cwd: repoRoot, ...options })
    return
  } catch {
    await run('git', ['-C', repoRoot, 'add', '-A'], { cwd: repoRoot, ...options })
    try {
      await run('git', ['-C', repoRoot, 'reset', '--', '.dwp/logs'], { cwd: repoRoot, ...options })
    } catch {}
  }
}

export function buildOutputPaths(repoRoot, commitHash) {
  const logsDir = path.join(repoRoot, '.dwp', 'logs')
  return {
    logsDir,
    outputPath: path.join(logsDir, `dwp-output-${commitHash}.md`),
  }
}

export function parseDecision(output, allowed) {
  const firstLine = (output || '').split(/\r?\n/, 1)[0] ?? ''
  const match = firstLine.match(/^Decision:\s*(.+)$/)
  if (!match) throw new Error(`Invalid output decision: ${firstLine}`)
  const decision = match[1].trim()
  if (!allowed.includes(decision)) throw new Error(`Invalid output decision: ${firstLine}`)
  return decision
}

export function getOpencodeBin(env = process.env) {
  return env.OPENCODE_BIN || 'opencode'
}

export function getOpencodeModel(env = process.env) {
  return env.OPENCODE_MODEL || 'openai/gpt-5.4'
}

export async function runOpencode({ repoRoot, title, files = [], prompt, env = process.env, logger = createLogger(), timeoutMs = 10 * 60 * 1000 }) {
  const args = ['run', '-m', getOpencodeModel(env), '--dir', repoRoot, '--title', title]
  for (const file of files) args.push('-f', file)
  args.push('--', prompt)
  await run(getOpencodeBin(env), args, {
    cwd: repoRoot,
    env,
    logger,
    timeout: timeoutMs,
    idleTimeout: Number(env.OPENCODE_IDLE_TIMEOUT_MS || 0) || 0,
  })
}

export async function findSessionId({ repoRoot, title, env = process.env, logger = createLogger() }) {
  const { stdout } = await run(getOpencodeBin(env), ['session', 'list', '--max-count', '50', '--format', 'json'], {
    cwd: repoRoot,
    env,
    logger,
  })
  const sessions = JSON.parse(stdout)
  const session = sessions.find((entry) => entry.title === title && entry.directory === repoRoot)
  return session?.id ?? ''
}

export async function setState({ cwd, state, subject, trailers = [], prompt = '', keepTrailers = false, env = process.env, logger = createLogger() }) {
  const aynigBin = env.AYNIG_BIN || 'aynig'
  const args = ['set-state', '--dwp-state', state, '--subject', subject]
  if (keepTrailers) args.push('--keep-trailers')
  for (const trailer of trailers) args.push('--trailer', trailer)
  args.push('--prompt', prompt)
  await run(aynigBin, args, { cwd, env, logger })
}

export async function failWithError({ repoRoot = '', ticketPath = '', commandName, failureSummary, cause, env = process.env, logger = createLogger() }) {
  if (!repoRoot) return
  const trailers = []
  if (ticketPath) trailers.push(`dwp-ticket: ${resolveRelativePath(repoRoot, ticketPath)}`)
  await setState({
    cwd: repoRoot,
    state: 'error',
    subject: `${commandName}: error`,
    trailers,
    prompt: `${failureSummary}\n\nCause: ${cause}`,
    keepTrailers: true,
    env,
    logger,
  })
}
