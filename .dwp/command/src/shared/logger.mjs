const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export function normalizeLogLevel(level) {
  return Object.hasOwn(LEVELS, level) ? level : 'error'
}

export function createLogger({ level = 'error', write = (message) => process.stderr.write(`${message}\n`) } = {}) {
  const normalizedLevel = normalizeLogLevel(level)
  const threshold = LEVELS[normalizedLevel]

  function log(messageLevel, message) {
    if (LEVELS[messageLevel] < threshold) {
      return
    }

    write(`[${messageLevel}] ${message}`)
  }

  return {
    level: normalizedLevel,
    debug(message) {
      log('debug', message)
    },
    info(message) {
      log('info', message)
    },
    warn(message) {
      log('warn', message)
    },
    error(message) {
      log('error', message)
    },
  }
}
