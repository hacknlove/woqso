import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRuntime } from '../../dwp.mjs'

export async function createRepoFixture() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dwp-command-'))
  const ticketPath = path.join(repoRoot, 'tickets', 'sample-ticket.md')

  await fs.mkdir(path.dirname(ticketPath), { recursive: true })
  await fs.mkdir(path.join(repoRoot, '.dwp', 'logs'), { recursive: true })
  await fs.writeFile(path.join(repoRoot, 'SPEC.md'), '# Spec\n', 'utf8')
  await fs.writeFile(path.join(repoRoot, 'IMPLEMENTATION_PLAN.md'), '# Implementation Plan\n', 'utf8')
  await fs.writeFile(ticketPath, '# Ticket\n', 'utf8')

  return { repoRoot, ticketPath }
}

export async function destroyRepoFixture(repoRoot) {
  await fs.rm(repoRoot, { recursive: true, force: true })
}

export function createExecFileMock({ repoRoot, outputDecisions = {}, sessionId = 'session-123' }) {
  const calls = []
  const sessionList = Object.keys(outputDecisions).map((title, index) => ({
    title,
    directory: repoRoot,
    id: index === 0 ? sessionId : `${sessionId}-${index + 1}`,
  }))

  const execFile = async (command, args) => {
    calls.push({ command, args })

    if (command === 'git' && args[0] === 'rev-parse') {
      return { stdout: `${repoRoot}\n`, stderr: '' }
    }

    if (command === 'git' && (args[0] === 'add' || (args[0] === '-C' && args[2] === 'add'))) {
      return { stdout: '', stderr: '' }
    }

    if (command === 'opencode' && args[0] === 'run') {
      const title = args[args.indexOf('--title') + 1]
      const outputPath = args[args.lastIndexOf('-f') + 1]
      const body = outputDecisions[title]
      if (!body) {
        throw new Error(`Missing mocked opencode output for ${title}`)
      }
      await fs.writeFile(outputPath, body, 'utf8')
      return { stdout: '', stderr: '' }
    }

    if (command === 'opencode' && args[0] === 'session') {
      return {
        stdout: JSON.stringify(execFile.sessionList ?? sessionList),
        stderr: '',
      }
    }

    if (command === 'aynig' && args[0] === 'set-state') {
      return { stdout: '', stderr: '' }
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
  }

  // Use a clean env so machine-local OPENCODE_* variables don't affect tests.
  const runtime = createRuntime({ execFile, fs, env: {} })

  return {
    runtime,
    calls,
    setSessionList(entries) {
      execFile.sessionList = entries
    },
    sessionId,
  }
}
