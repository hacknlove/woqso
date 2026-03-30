import { describe, expect, it } from 'vitest'
import { parseDecision } from '../../dwp.mjs'

describe('parseDecision', () => {
  it('returns the declared decision when allowed', () => {
    expect(parseDecision('Decision: review-plan\n\nBody', ['review-plan', 'call-human'])).toBe('review-plan')
  })

  it('throws when the first line is not an allowed decision', () => {
    expect(() => parseDecision('Decision: implement\n\nBody', ['review-plan'])).toThrow(
      'Invalid output decision: Decision: implement',
    )
  })
})
