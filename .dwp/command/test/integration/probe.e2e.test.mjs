import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { run } from '../../dwp.mjs'

const execFile = promisify(execFileCb)

const fixtures = []

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true })
    }),
  )
})

async function makeExecutable(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
  await fs.chmod(filePath, 0o755)
}

describe('probe (E2E-ish)', () => {
  it('runs opencode with the body verbatim and stdin reaches EOF quickly (no interactive hang)', async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dwp-probe-'))
    fixtures.push(repoRoot)

    // Real git repo for getRepoRoot.
    await execFile('git', ['init'], { cwd: repoRoot })

    const binDir = path.join(repoRoot, 'bin')
    const logsDir = path.join(repoRoot, '.dwp', 'logs')
    await fs.mkdir(logsDir, { recursive: true })

    const opencodeCalls = path.join(logsDir, 'opencode-calls.json')
    const aynigCalls = path.join(logsDir, 'aynig-calls.json')

    // Fake opencode:
    // - writes argv to file
    // - verifies stdin reaches EOF quickly (stdin may still be "readable" even when connected to /dev/null)
    await makeExecutable(
      path.join(binDir, 'opencode'),
      `#!/usr/bin/env node\n` +
        `import fs from 'node:fs/promises'\n` +
        `const out = process.env.DWP_OPENCODE_CALLS\n` +
        `const args = process.argv.slice(2)\n` +
        `let ended = false\n` +
        `const record = { args, stdinReadable: !!process.stdin.readable, isTTY: !!process.stdin.isTTY }\n` +
        `process.stdin.on('end', () => { ended = true })\n` +
        `process.stdin.resume()\n` +
        `setTimeout(async () => {\n` +
        `  record.stdinEndedQuickly = ended\n` +
        `  await fs.writeFile(out, JSON.stringify(record, null, 2), 'utf8')\n` +
        `  process.exit(ended ? 0 : 2)\n` +
        `}, 120)\n`,
    )

    // Fake aynig: capture args and exit.
    await makeExecutable(
      path.join(binDir, 'aynig'),
      `#!/usr/bin/env node\n` +
        `import fs from 'node:fs/promises'\n` +
        `const out = process.env.DWP_AYNIG_CALLS\n` +
        `await fs.writeFile(out, JSON.stringify({ args: process.argv.slice(2) }, null, 2), 'utf8')\n` +
        `process.exit(0)\n`,
    )

    const prompt = 'Decision: whatever\n\nHello from probe.\\nThis is literal.'

    await run('probe', {
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        DWP_OPENCODE_CALLS: opencodeCalls,
        DWP_AYNIG_CALLS: aynigCalls,
        DWP_PROBE_TIMEOUT_MS: '2000',
        AYNIG_COMMIT_HASH: 'e2e123',
        AYNIG_BODY: prompt,
      },
    })

    const opencode = JSON.parse(await fs.readFile(opencodeCalls, 'utf8'))
    expect(opencode.args[0]).toBe('run')
    expect(opencode.args).toContain('--title')
    expect(opencode.args).toContain('e2e123-probe')
    expect(opencode.args.at(-2)).toBe('--')
    expect(opencode.args.at(-1)).toBe(prompt)
    // The key property: stdin reaches EOF quickly (not waiting for user input).
    expect(opencode.stdinEndedQuickly).toBe(true)

    const aynig = JSON.parse(await fs.readFile(aynigCalls, 'utf8'))
    expect(aynig.args[0]).toBe('set-state')
    expect(aynig.args).toContain('done')
  })
})
