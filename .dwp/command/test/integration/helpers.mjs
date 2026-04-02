import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

async function makeExecutable(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
  await fs.chmod(filePath, 0o755)
}

export async function createRepoFixture() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dwp-command-'))
  const ticketPath = path.join(repoRoot, 'tickets', 'sample-ticket.md')
  const logsDir = path.join(repoRoot, '.dwp', 'logs')
  const commandLogsDir = path.join(repoRoot, '.test-bin-logs')
  const binDir = path.join(repoRoot, 'bin')

  await fs.mkdir(path.dirname(ticketPath), { recursive: true })
  await fs.mkdir(logsDir, { recursive: true })
  await fs.mkdir(commandLogsDir, { recursive: true })
  await fs.writeFile(path.join(repoRoot, 'SPEC.md'), '# Spec\n', 'utf8')
  await fs.writeFile(path.join(repoRoot, 'IMPLEMENTATION_PLAN.md'), '# Implementation Plan\n', 'utf8')
  await fs.writeFile(ticketPath, '# Ticket\n', 'utf8')

  return { repoRoot, ticketPath, logsDir, commandLogsDir, binDir }
}

export async function destroyRepoFixture(repoRoot) {
  await fs.rm(repoRoot, { recursive: true, force: true })
}

export async function setupCommandMocks({ repoRoot, binDir, outputDecisions = {}, sessionId = 'session-123' }) {
  const commandLogPath = path.join(repoRoot, '.test-bin-logs', 'commands.jsonl')
  const sessionList = Object.keys(outputDecisions).map((title, index) => ({
    title,
    directory: repoRoot,
    id: index === 0 ? sessionId : `${sessionId}-${index + 1}`,
  }))

  await makeExecutable(
    path.join(binDir, 'git'),
    `#!/usr/bin/env node
` +
      `import fs from 'node:fs/promises'
` +
      `import path from 'node:path'
` +
      `const logPath = ${JSON.stringify(commandLogPath)}
` +
      `const args = process.argv.slice(2)
` +
      `await fs.mkdir(path.dirname(logPath), { recursive: true })
` +
      `await fs.appendFile(logPath, JSON.stringify({ command: 'git', args }) + '\n', 'utf8')
` +
      `if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
` +
      `  process.stdout.write(${JSON.stringify(repoRoot + '\n')})
` +
      `  process.exit(0)
` +
      `}
` +
      `if (args[0] === 'add') process.exit(0)
` +
      `if (args[0] === '-C' && args[2] === 'add') process.exit(0)
` +
      `if (args[0] === '-C' && args[2] === 'reset') process.exit(0)
` +
      `process.exit(0)
`,
  )

  await makeExecutable(
    path.join(binDir, 'opencode'),
    `#!/usr/bin/env node
` +
      `import fs from 'node:fs/promises'
` +
      `import path from 'node:path'
` +
      `const logPath = ${JSON.stringify(commandLogPath)}
` +
      `const outputDecisions = ${JSON.stringify(outputDecisions)}
` +
      `const sessionList = ${JSON.stringify(sessionList)}
` +
      `const args = process.argv.slice(2)
` +
      `await fs.mkdir(path.dirname(logPath), { recursive: true })
` +
      `await fs.appendFile(logPath, JSON.stringify({ command: 'opencode', args }) + '\n', 'utf8')
` +
      `if (args[0] === 'run') {
` +
      `  const title = args[args.indexOf('--title') + 1]
` +
      `  const files = []
` +
      `  for (let i = 0; i < args.length; i += 1) {
` +
      `    if (args[i] === '-f' && args[i + 1]) files.push(args[i + 1])
` +
      `  }
` +
      `  const outputPath = files.at(-1)
` +
      `  const body = outputDecisions[title]
` +
      `  if (!body) {
` +
      `    console.error('Missing mocked opencode output for ' + title)
` +
      `    process.exit(2)
` +
      `  }
` +
      `  if (outputPath) await fs.writeFile(outputPath, body, 'utf8')
` +
      `  process.exit(0)
` +
      `}
` +
      `if (args[0] === 'session' && args[1] === 'list') {
` +
      `  process.stdout.write(JSON.stringify(sessionList))
` +
      `  process.exit(0)
` +
      `}
` +
      `process.exit(0)
`,
  )

  await makeExecutable(
    path.join(binDir, 'aynig'),
    `#!/usr/bin/env node
` +
      `import fs from 'node:fs/promises'
` +
      `import path from 'node:path'
` +
      `const logPath = ${JSON.stringify(commandLogPath)}
` +
      `const args = process.argv.slice(2)
` +
      `await fs.mkdir(path.dirname(logPath), { recursive: true })
` +
      `await fs.appendFile(logPath, JSON.stringify({ command: 'aynig', args }) + '\n', 'utf8')
` +
      `process.exit(0)
`,
  )

  return {
    commandLogPath,
    env: {
      PATH: `${binDir}:${process.env.PATH}`,
      OPENCODE_BIN: 'opencode',
      AYNIG_BIN: 'aynig',
    },
    async readCalls() {
      const raw = await fs.readFile(commandLogPath, 'utf8')
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    },
  }
}
