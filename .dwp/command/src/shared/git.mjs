import path from 'node:path'
import { runProcess } from './process.mjs'

export async function getRepoRoot(runtime, cwd = process.cwd()) {
  const { stdout } = await runProcess(runtime, 'git', ['rev-parse', '--show-toplevel'], { cwd })
  return stdout.trim()
}

export async function stageTicket(runtime, ticketPath, cwd) {
  await runProcess(runtime, 'git', ['add', ticketPath], { cwd })
}

export async function stageRepoExcludingLogs(runtime, repoRoot) {
  await runProcess(runtime, 'git', ['-C', repoRoot, 'add', '-A', '--', '.', ':(exclude).dwp/logs'], {
    cwd: repoRoot,
  })
}

export function resolveRelativePath(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath)
}
