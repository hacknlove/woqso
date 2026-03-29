import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { createLogger } from './logger.mjs'

function createDefaultExecFile(logger) {
  return function defaultExecFile(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const { maxBuffer = Infinity, timeout = 0, ...spawnOptions } = options
      if (!spawnOptions.stdio) {
        spawnOptions.stdio = ['ignore', 'pipe', 'pipe']
      }
      const child = spawn(command, args, spawnOptions)
    const stdoutChunks = []
    const stderrChunks = []
    let stdoutLength = 0
    let stderrLength = 0
    let settled = false
    let timeoutId

    const finishWithError = (error) => {
      if (settled) {
        return
      }

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      settled = true
      error.stdout = Buffer.concat(stdoutChunks).toString()
      error.stderr = Buffer.concat(stderrChunks).toString()
      reject(error)
    }

    const finishSuccessfully = (stdout, stderr) => {
      if (settled) {
        return
      }

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      settled = true
      resolve({ stdout, stderr })
    }

    const appendChunk = (chunks, chunk, currentLength) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buffer)
      return currentLength + buffer.length
    }

    child.stdout?.on('data', (chunk) => {
      stdoutLength = appendChunk(stdoutChunks, chunk, stdoutLength)
      logger?.debug(`[${command}] stdout: ${String(chunk).trimEnd()}`)

      if (stdoutLength + stderrLength > maxBuffer) {
        child.kill()
        finishWithError(new Error(`stdout maxBuffer length exceeded: ${maxBuffer}`))
      }
    })

    child.stderr?.on('data', (chunk) => {
      stderrLength = appendChunk(stderrChunks, chunk, stderrLength)
      logger?.debug(`[${command}] stderr: ${String(chunk).trimEnd()}`)

      if (stdoutLength + stderrLength > maxBuffer) {
        child.kill()
        finishWithError(new Error(`stderr maxBuffer length exceeded: ${maxBuffer}`))
      }
    })

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        logger?.warn(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`)
        child.kill('SIGTERM')
        finishWithError(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`))
      }, timeout)
    }

    child.on('error', finishWithError)

    child.on('close', (code, signal) => {
      if (settled) {
        return
      }

      const stdout = Buffer.concat(stdoutChunks).toString()
      const stderr = Buffer.concat(stderrChunks).toString()

      if (code !== 0) {
        const reason = signal ? `signal ${signal}` : `code ${code}`
        const error = new Error(`Command failed: ${command} ${args.join(' ')} (${reason})`)
        error.code = code
        error.signal = signal
        error.stdout = stdout
        error.stderr = stderr
        settled = true
        reject(error)
        return
      }

      logger?.debug(`Command completed: ${command} ${args.join(' ')}`)
      finishSuccessfully(stdout, stderr)
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
    execFile: overrides.execFile ?? createDefaultExecFile(logger),
    logger,
  }
}
