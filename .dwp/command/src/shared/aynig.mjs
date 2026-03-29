import { runProcess } from './process.mjs'

export async function setState(runtime, { cwd, state, subject, trailers = [], prompt, keepTrailers = false }) {
  const args = ['set-state', '--dwp-state', state, '--subject', subject]

  if (keepTrailers) {
    args.push('--keep-trailers')
  }

  for (const trailer of trailers) {
    args.push('--trailer', trailer)
  }

  args.push('--prompt', prompt)
  await runProcess(runtime, 'aynig', args, { cwd })
}
