import { describe, expect, it } from 'vitest'
import { getOpencodeBin, getOpencodeModel, parseDecision } from '../../src/shared/core.mjs'

describe('shared core helpers', () => {
  it('prefers environment overrides for opencode bin and model', () => {
    expect(getOpencodeBin({ OPENCODE_BIN: '/tmp/opencode-custom' })).toBe('/tmp/opencode-custom')
    expect(getOpencodeModel({ OPENCODE_MODEL: 'openai/gpt-5.5' })).toBe('openai/gpt-5.5')
  })

  it('falls back to default opencode bin and model', () => {
    expect(getOpencodeBin({})).toBe('opencode')
    expect(getOpencodeModel({})).toBe('openai/gpt-5.4')
  })

  it('parses valid decisions', () => {
    expect(parseDecision('Decision: review-plan\n\nBody', ['review-plan', 'call-human'])).toBe('review-plan')
  })

  it('rejects invalid decisions', () => {
    expect(() => parseDecision('Decision: implement\n\nBody', ['review-plan', 'call-human'])).toThrow(
      'Invalid output decision: Decision: implement',
    )
  })
})
