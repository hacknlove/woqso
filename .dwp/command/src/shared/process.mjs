export async function runProcess(runtime, command, args, options = {}) {
  try {
    return await runtime.execFile(command, args, options)
  } catch (error) {
    const details = [error.message]

    if (error.stderr) {
      details.push(String(error.stderr).trim())
    }

    throw new Error(details.filter(Boolean).join('\n'))
  }
}
