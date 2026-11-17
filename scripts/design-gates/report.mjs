// Short human summary of probe.json: one line per gate, then failures, skipped
// gates, pending checks and items needing inspection.
const MAX_LISTED = 15

const line = (item) => {
  const where = item.selector ? `\`${item.selector}\`` : ''
  const extras = [
    'viewport',
    'width',
    'stop',
    'ratio',
    'need',
    'fg',
    'bg',
    'w',
    'h',
    'reason',
    'estimate',
  ]
    .filter((key) => item[key] !== undefined && item[key] !== null)
    .map(
      (key) =>
        `${key} ${typeof item[key] === 'object' ? JSON.stringify(item[key]) : item[key]}`,
    )
  const text = item.text ? `"${String(item.text).slice(0, 70)}"` : ''
  return `- ${[where, text, extras.join(' · ')].filter(Boolean).join(' ')}`
}

function listSection(title, items) {
  if (!items.length) return []
  const shown = items.slice(0, MAX_LISTED).map(line)
  if (items.length > MAX_LISTED)
    shown.push(`- … ${items.length - MAX_LISTED} more in probe.json`)
  return [`**${title}**`, '', ...shown, '']
}

export function renderMarkdown(result) {
  const gates = Object.values(result.gates)
  const out = [
    '# Design-gate probe summary',
    '',
    `Page: ${result.page} · ${result.chrome} · ${result.startedAt}`,
    '',
    '## Gates',
    '',
    ...gates.map(
      (gate) =>
        `- **${gate.id} ${gate.title}: ${gate.status.toUpperCase()}** · ${gate.summary}`,
    ),
    '',
    '## C6.1 type and line length',
    '',
  ]
  for (const [viewport, data] of Object.entries(result.c61)) {
    const body = data.bodyText
    out.push(
      `- **${viewport}**: ${data.distinctSizes} sizes (${data.sizes.join(', ')}); h1 ${data.h1Size}px, largest ${data.largest.size}px (h1 largest: ${data.h1IsLargest}); body text ${body.fontSizeMin}px min, ${body.fontSizeMedian}px median; full lines ${body.lineCharsMedian} ch median, ${body.lineCharsMax} ch max; ${body.over75.length} blocks over 75 ch; ${data.under14px.length} text elements under 14px`,
    )
  }
  out.push('', '## Screenshots', '')
  for (const set of result.screenshots) {
    out.push(
      `- ${set.viewport}: ${set.shots.length} files, CSS width ${set.cssWidth} (verified: ${set.widthVerified}), page height ${set.scrollHeight}px`,
    )
  }
  const pending = gates.filter((gate) => gate.pending?.length)
  if (pending.length) {
    out.push('', '## Pending while the page is empty', '')
    for (const gate of pending)
      for (const item of gate.pending)
        out.push(
          `- ${gate.id} ${gate.title}: ${item.text}${item.reason ? ` (${item.reason})` : ''}`,
        )
  }
  out.push('', '## Failures', '')
  for (const gate of gates)
    out.push(...listSection(`${gate.id} ${gate.title}`, gate.failures))
  out.push('## Needs inspection', '')
  for (const gate of gates)
    out.push(...listSection(`${gate.id} ${gate.title}`, gate.manual))
  const errors = Object.entries(result.probeErrors).filter(
    ([, list]) => list.length,
  )
  if (errors.length) {
    out.push('## Probe errors', '')
    for (const [id, list] of errors) out.push(`- ${id}: ${list.join('; ')}`)
    out.push('')
  }
  return `${out.join('\n')}\n`
}
