export function trim(value) {
  return String(value ?? '').replace(/\r/g, '').trim()
}

export function getBody(env = process.env) {
  return trim(env.AYNIG_BODY)
}

export function getCommitHash(env = process.env) {
  return trim(env.AYNIG_COMMIT_HASH)
}

export function getTrailer(name, env = process.env) {
  return trim(env[`AYNIG_TRAILER_${name}`])
}

export function requireValue(value, message) {
  if (!value) {
    throw new Error(message)
  }

  return value
}

export function requireNumeric(value, message) {
  if (!/^\d+$/.test(value)) {
    throw new Error(message)
  }

  return Number.parseInt(value, 10)
}
