import { execFile as nodeExecFile } from 'node:child_process'
import fs from 'node:fs/promises'

function defaultExecFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    nodeExecFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }

      resolve({ stdout, stderr })
    })
  })
}

export function createRuntime(overrides = {}) {
  return {
    fs: overrides.fs ?? fs,
    execFile: overrides.execFile ?? defaultExecFile,
  }
}
