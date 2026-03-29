import { describe, expect, it } from 'vitest'
import { runOpencode } from '../../src/shared/opencode.mjs'

describe('runOpencode', () => {
  it('logs the prompt at debug level before running opencode', async () => {
    const messages = []
    const runtime = {
      env: {},
      logger: {
        info() {},
        debug(message) {
          messages.push(message)
        },
      },
      execFile: async () => ({ stdout: '', stderr: '' }),
    }

    await runOpencode(runtime, {
      repoRoot: '/repo',
      title: 'abc123-plan',
      files: ['/repo/SPEC.md'],
      prompt: 'hello prompt',
    })

    expect(messages).toContain('Opencode prompt for abc123-plan:\nhello prompt')
  })
})
