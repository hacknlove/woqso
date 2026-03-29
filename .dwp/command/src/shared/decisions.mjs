export function parseDecision(outputBody, allowedDecisions) {
  const [firstLine = ''] = outputBody.split(/\n/, 1)
  const decisionLine = firstLine.trim()
  const prefix = 'Decision: '

  if (!decisionLine.startsWith(prefix)) {
    throw new Error(`Invalid output decision: ${decisionLine}`)
  }

  const decision = decisionLine.slice(prefix.length)

  if (!allowedDecisions.includes(decision)) {
    throw new Error(`Invalid output decision: ${decisionLine}`)
  }

  return decision
}
