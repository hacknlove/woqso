export async function runProcess(runtime, command, args, options = {}) {
  runtime.logger?.debug(`exec ${command} ${args.join(' ')}`)

  try {
    return await runtime.execFile(command, args, {
      ...options,
      env: {
        ...runtime.env,
        ...options.env,
      },
    })
  } catch (error) {
    const details = [error.message]

    if (error.stderr) {
      details.push(String(error.stderr).trim())
    }

    const message = details.filter(Boolean).join('\n')
    runtime.logger?.error(message)
    throw new Error(message)
  }
}
