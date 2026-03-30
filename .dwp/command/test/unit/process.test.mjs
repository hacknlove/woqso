import { describe, expect, it, vi } from 'vitest'
import { createRuntime, runProcess } from '../../dwp.mjs'

describe('runProcess', () => {
  it('forwards the runtime environment to child processes', async () => {
    const execFile = vi.fn().mockResolvedValue({ stdout: '', stderr: '' })
    const runtime = createRuntime({
      execFile,
      env: { AYNIG_LOG_LEVEL: 'debug', CUSTOM_FLAG: '1' },
      writeLog: () => {},
    })

    await runProcess(runtime, 'git', ['status'], { cwd: '/tmp/repo' })

    expect(execFile).toHaveBeenCalledWith(
      'git',
      ['status'],
      expect.objectContaining({
        cwd: '/tmp/repo',
        env: expect.objectContaining({ AYNIG_LOG_LEVEL: 'debug', CUSTOM_FLAG: '1' }),
      }),
    )
  })

  it('logs child stdout and stderr at debug level', async () => {
    const messages = []
    const runtime = createRuntime({
      env: { AYNIG_LOG_LEVEL: 'debug' },
      writeLog: (message) => messages.push(message),
    })

    await runProcess(
      runtime,
      process.execPath,
      ['-e', "process.stdout.write('out'); process.stderr.write('err')"],
      { cwd: '/tmp' },
    )

    expect(messages).toContain(`[debug] [${process.execPath}] stdout: out`)
    expect(messages).toContain(`[debug] [${process.execPath}] stderr: err`)
  })

  it('fails with a timeout error when the child hangs', async () => {
    const messages = []
    const runtime = createRuntime({
      env: { AYNIG_LOG_LEVEL: 'debug' },
      writeLog: (message) => messages.push(message),
    })

    await expect(
      runProcess(runtime, process.execPath, ['-e', 'setTimeout(() => {}, 1000)'], {
        cwd: '/tmp',
        timeout: 50,
      }),
    ).rejects.toThrow(`Command timed out after 50ms: ${process.execPath} -e setTimeout(() => {}, 1000)`)

    expect(messages).toContain(
      `[warn] Command timed out after 50ms: ${process.execPath} -e setTimeout(() => {}, 1000)`,
    )
  })

  it('closes stdin by default for spawned children', async () => {
    const runtime = createRuntime({
      env: { AYNIG_LOG_LEVEL: 'debug' },
      writeLog: () => {},
    })

    const { stdout } = await runProcess(
      runtime,
      process.execPath,
      ['-e', "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('stdin-closed'))"],
      { cwd: '/tmp', timeout: 500 },
    )

    expect(stdout).toBe('stdin-closed')
  })
})
