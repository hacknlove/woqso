import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { renderPromptTemplate } from '../../src/shared/prompts.mjs'
import { createRuntime } from '../../src/shared/runtime.mjs'

const tempDirs = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})

describe('renderPromptTemplate', () => {
  it('replaces placeholders with provided values', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwp-prompt-'))
    tempDirs.push(tempDir)
    const templatePath = path.join(tempDir, 'template.md')

    await fs.writeFile(templatePath, 'Hello {{ name }} from {{place}}', 'utf8')

    const result = await renderPromptTemplate(createRuntime(), templatePath, {
      name: 'planner',
      place: 'woqso',
    })

    expect(result).toBe('Hello planner from woqso')
  })
})
