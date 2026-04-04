import { spawn } from 'node:child_process'

export function runOpenCode({
  prompt,
  cwd = process.cwd(),
  timeoutMs = 5 * 60 * 1000,
  env = {},
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'opencode',
      ['run', prompt],
      {
        cwd,
        env: {
          ...process.env,
          ...env,
          CI: '1',
          NO_COLOR: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      }
    )

    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      reject(new Error(`opencode timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
    })

    child.stderr.on('data', (chunk) => {
        process.stdout.write(chunk);
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ err })
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      resolve({ code })
    })
})
}