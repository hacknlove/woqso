import { runProcess } from './process.mjs'

export async function runOpencode(runtime, { repoRoot, title, files, prompt, sessionId }) {
  runtime.logger?.info(`Starting opencode session ${title}`)
  runtime.logger?.debug(`Opencode prompt for ${title}:\n${prompt}`)
  const args = ['run', '-m', 'openai/gpt-5.4', '--dir', repoRoot]

  if (sessionId) {
    args.push('--session', sessionId)
  }

  args.push('--title', title)

  for (const file of files) {
    args.push('-f', file)
  }

  args.push(prompt)
  await runProcess(runtime, 'opencode', args, { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 })
}

export async function findSessionId(runtime, { repoRoot, title }) {
  runtime.logger?.debug(`Looking up opencode session for ${title}`)
  const { stdout } = await runProcess(
    runtime,
    'opencode',
    ['session', 'list', '--max-count', '50', '--format', 'json'],
    { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 },
  )

  const sessions = JSON.parse(stdout)
  const session = sessions.find((entry) => entry.title === title && entry.directory === repoRoot)
  runtime.logger?.debug(`Resolved opencode session for ${title}: ${session?.id ?? '<none>'}`)
  return session?.id ?? ''
}
