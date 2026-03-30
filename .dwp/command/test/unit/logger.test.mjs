import { describe, expect, it } from 'vitest'
import { createLogger, normalizeLogLevel } from '../../dwp.mjs'

describe('logger', () => {
  it('normalizes unsupported levels to error', () => {
    expect(normalizeLogLevel('verbose')).toBe('error')
  })

  it('suppresses messages below the configured threshold', () => {
    const messages = []
    const logger = createLogger({ level: 'warn', write: (message) => messages.push(message) })

    logger.info('hidden')
    logger.warn('shown')

    expect(messages).toEqual(['[warn] shown'])
  })
})
