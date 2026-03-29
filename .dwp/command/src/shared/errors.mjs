import { setState } from './aynig.mjs'
import { stageRepoExcludingLogs, stageTicket } from './git.mjs'

export async function failWithError({
  runtime,
  repoRoot,
  commandName,
  failureSummary,
  cause,
  stageOnError = 'none',
  ticketPath,
}) {
  try {
    if (stageOnError === 'ticket' && ticketPath) {
      await stageTicket(runtime, ticketPath, repoRoot)
    }

    if (stageOnError === 'repo' && repoRoot) {
      await stageRepoExcludingLogs(runtime, repoRoot)
    }
  } catch {
    // Best effort only; the error transition is more important than staging.
  }

  await setState(runtime, {
    cwd: repoRoot ?? process.cwd(),
    state: 'error',
    subject: `${commandName}: error`,
    keepTrailers: true,
    prompt: `${failureSummary}\n\nCause:\n${cause}`,
  })
}
