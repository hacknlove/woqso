import { describe, expect, it, vi } from 'vitest'
import { runProcess } from '../../src/shared/process.mjs'
import { createRuntime } from '../../src/shared/runtime.mjs'

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
})
