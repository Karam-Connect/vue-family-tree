import type { FamilyMember, FamilyTreeLabels, RelationshipStatus } from '../types'

export const defaultLabels = {
  deceased: 'Deceased',
  born: 'b.',
  died: 'd.',
  lifespan: (born: string, died: string) => `${born}–${died}`,
  married: 'm.',
  separated: 'sep.',
  divorced: 'div.',
  relationships: { married: 'Married', partners: 'Partners', separated: 'Separated', divorced: 'Divorced' },
  placeholder: 'Unknown or not shown',
  touchHint: 'Use two fingers to move the tree',
  wheelHint: (key: string) => `Use ${key} + scroll to zoom`,
} satisfies ResolvedLabels

export type ResolvedLabels = Required<Omit<FamilyTreeLabels, 'relationships'>> & {
  relationships: Record<RelationshipStatus, string>
}

/** Fill unset (or `undefined`) entries with the English defaults */
export const resolveLabels = (labels: FamilyTreeLabels = {}): ResolvedLabels => {
  const resolved: ResolvedLabels = { ...defaultLabels }
  for (const [key, value] of Object.entries(labels)) {
    if (value != null && key !== 'relationships') (resolved as Record<string, unknown>)[key] = value
  }
  resolved.relationships = { ...defaultLabels.relationships }
  for (const [status, name] of Object.entries(labels.relationships ?? {})) {
    if (name != null) resolved.relationships[status as RelationshipStatus] = name
  }
  return resolved
}

/** `deceased: true`, or a death date (even an unknown one like `'?'`) */
export const isDeceased = (member: FamilyMember) =>
  !!member.deceased || (member.died != null && member.died !== '')

/** Genogram symbol shape: square for male, circle for female, diamond for anything else or unknown */
export const symbolShape = (member: FamilyMember): 'square' | 'circle' | 'diamond' =>
  member.gender === 'male' ? 'square' : member.gender === 'female' ? 'circle' : 'diamond'

// ISO dates show as their year; anything else ('?', 'c. 1900') as written. Text with letters is wrapped in Unicode
// isolates (FSI…PDI) so it keeps its own direction inside a line of the other direction ('c. 1900' in Arabic).
const year = (value: number | string) => {
  const text = String(value).trim()
  if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 4)
  return /\p{L}/u.test(text) ? `⁨${text}⁩` : text
}

const present = (value: number | string | undefined): value is number | string =>
  value != null && String(value).trim() !== ''

const single = (label: string | ((year: string) => string), value: string) =>
  typeof label === 'function' ? label(value) : `${label} ${value}`

/** Genogram-style lifespan: `1945–2020`, `b. 1980`, `d. ?`; empty when there are no dates */
export const lifespan = ({ born, died }: FamilyMember, labels: ResolvedLabels = defaultLabels) => {
  if (present(born) && present(died)) return labels.lifespan(year(born), year(died))
  if (present(born)) return single(labels.born, year(born))
  if (present(died)) return single(labels.died, year(died))
  return ''
}

/**
 * The dates above the line between partners: `m. 1980`, `m. 1980 · div. 1990`, `m. 1980–2010` (ended without a
 * divorce), `2001–` / `2001–2010` for partners; empty when there are no dates
 */
export const unionDates = (
  { relationship = 'married', start, end }: { relationship?: RelationshipStatus, start?: number | string, end?: number | string },
  labels: ResolvedLabels = defaultLabels,
) => {
  const from = present(start) ? year(start) : undefined
  const to = present(end) ? year(end) : undefined
  if (!from && !to) return ''
  if (relationship === 'partners') return labels.lifespan(from ?? '?', to ?? '')
  if (relationship === 'married') return single(labels.married, to ? labels.lifespan(from ?? '?', to) : from!)
  const ended = relationship === 'separated' ? labels.separated : labels.divorced
  return [from && single(labels.married, from), to && single(ended, to)].filter(Boolean).join(' · ')
}
