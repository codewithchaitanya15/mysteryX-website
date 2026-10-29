const fail = (message) => { const e = new Error(`Generated case failed validation: ${message}`); e.status = 502; throw e; };
function normalizeCertainty(value) {
  if (typeof value !== 'string') return null;
  const certainty = value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (['confirmed', 'certain', 'verified', 'corroborated', 'established', 'high', 'high confidence'].includes(certainty)) return 'confirmed';
  if (['disputed', 'uncertain', 'unconfirmed', 'unverified', 'contested', 'alleged', 'possible', 'speculative', 'medium', 'low', 'low confidence'].includes(certainty)) return 'disputed';
  return null;
}

export function validateMystery(data, { difficulty, evidenceCount }) {
  const expected = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;
  if (!data?.title || !data.summary || !data.solution?.explanation) fail('missing required case fields');
  if (!Array.isArray(data.suspects) || data.suspects.length !== expected) fail(`expected ${expected} suspects`);
  if (!Array.isArray(data.evidence) || data.evidence.length !== evidenceCount) fail(`expected ${evidenceCount} evidence items`);
  const suspects = new Set(data.suspects.map(x => x.id)); const evidence = new Set(data.evidence.map(x => x.id));
  if (suspects.size !== data.suspects.length || evidence.size !== data.evidence.length) fail('duplicate identifiers');
  if (!suspects.has(data.solution.culpritId)) fail('culprit does not match a suspect');
  const categories = new Set(['conversation','photograph','cctv','witness','record']);
  for (const item of data.evidence) {
    if (!categories.has(item.category)) fail('unknown evidence category');
    if (item.relatedSuspectIds?.some(id => !suspects.has(id))) fail('unknown suspect reference');
  }
  for (const event of data.timeline ?? []) {
    if (!evidence.has(event.evidenceId)) fail('timeline references unknown evidence');
    if (event.suspectIds?.some(id => !suspects.has(id))) fail('timeline references unknown suspect');
    event.certainty = normalizeCertainty(event.certainty);
    if (!event.certainty) fail('invalid timeline certainty');
  }
  const dated = data.timeline.filter(x => Number.isFinite(Date.parse(x.timestamp)));
  if (dated.length === data.timeline.length && dated.some((x, i) => i > 0 && Date.parse(x.timestamp) < Date.parse(dated[i - 1].timestamp))) fail('timeline is not chronological');
  if (!data.solution.supportingEvidenceIds?.length || data.solution.supportingEvidenceIds.some(id => !evidence.has(id))) fail('invalid solution evidence references');
  if (!Array.isArray(data.timeline) || data.timeline.length < 2) fail('insufficient timeline events');
  return data;
}
