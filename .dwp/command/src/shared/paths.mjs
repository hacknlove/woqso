import path from 'node:path'

export function resolveTicketPath(repoRoot, ticketInput) {
  return path.isAbsolute(ticketInput) ? ticketInput : path.join(repoRoot, ticketInput)
}

export async function ensureFile(runtime, filePath, message) {
  try {
    const stats = await runtime.fs.stat(filePath)
    if (!stats.isFile()) {
      throw new Error(message)
    }
  } catch {
    throw new Error(message)
  }
}

export function buildOutputPaths(repoRoot, commitHash) {
  const logsDir = path.join(repoRoot, '.dwp', 'logs')
  const outputPath = path.join(logsDir, `dwp-output-${commitHash}.md`)
  return { logsDir, outputPath }
}

export function getTicketMetadata(repoRoot, ticketPath) {
  const ticketFile = path.basename(ticketPath)
  return {
    ticketFile,
    ticketName: ticketFile.replace(/\.md$/, ''),
    relativeTicketPath: path.relative(repoRoot, ticketPath),
  }
}
