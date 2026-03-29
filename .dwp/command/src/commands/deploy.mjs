import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setState } from '../shared/aynig.mjs'
import { getBody } from '../shared/env.mjs'
import { renderPromptTemplate } from '../shared/prompts.mjs'
import { createRuntime } from '../shared/runtime.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandDir = path.resolve(__dirname, '..', '..')
const promptPath = path.join(commandDir, 'prompts', 'deploy.md')

export async function main({ env = process.env, runtime = createRuntime() } = {}) {
  const body = getBody(env)
  const prompt = body || (await renderPromptTemplate(runtime, promptPath, {})).trim()

  await setState(runtime, {
    cwd: process.cwd(),
    state: 'call-human',
    subject: 'deploy: ready for human deployment',
    keepTrailers: true,
    prompt,
  })
}
