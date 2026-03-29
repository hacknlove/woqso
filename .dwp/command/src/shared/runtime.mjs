import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { createLogger } from './logger.mjs'

function defaultExecFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { maxBuffer = Infinity, ...spawnOptions } = options
    const child = spawn(command, args, spawnOptions)
    const stdoutChunks = []
    const stderrChunks = []
    let stdoutLength = 0
    let stderrLength = 0
    let settled = false

    const finishWithError = (error) => {
      if (settled) {
        return
      }

      settled = true
      error.stdout = Buffer.concat(stdoutChunks).toString()
      error.stderr = Buffer.concat(stderrChunks).toString()
      reject(error)
    }

    const appendChunk = (chunks, chunk, currentLength) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buffer)
      return currentLength + buffer.length
    }

    child.stdout?.on('data', (chunk) => {
      stdoutLength = appendChunk(stdoutChunks, chunk, stdoutLength)

      if (stdoutLength + stderrLength > maxBuffer) {
        child.kill()
        finishWithError(new Error(`stdout maxBuffer length exceeded: ${maxBuffer}`))
      }
    })

    child.stderr?.on('data', (chunk) => {
      stderrLength = appendChunk(stderrChunks, chunk, stderrLength)

      if (stdoutLength + stderrLength > maxBuffer) {
        child.kill()
        finishWithError(new Error(`stderr maxBuffer length exceeded: ${maxBuffer}`))
      }
    })

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

      settled = true
      resolve({ stdout, stderr })
    })
  })
}

export function createRuntime(overrides = {}) {
  const env = overrides.env ?? process.env

  return {
    env,
    fs: overrides.fs ?? fs,
    execFile: overrides.execFile ?? defaultExecFile,
    logger:
      overrides.logger ??
      createLogger({
        level: env.AYNIG_LOG_LEVEL,
        write: overrides.writeLog,
      }),
  }
}
