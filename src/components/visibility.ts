import type { FamilyMember, FamilyNode, FamilyTreeConfig, RelationshipStatus } from '../types'

// A node with `partners` is drawn as a chain: its first person, then one union per partner. So is a couple with a
// status mark or dates, which the classic couple's short line has no room for.
const hasUnionDetails = (node: FamilyNode) =>
  (!!node.relationship && node.relationship !== 'married') || node.start != null || node.end != null

export const isChain = (node: FamilyNode) => !!node.firstPerson && (!!node.partners?.length || hasUnionDetails(node))

export interface Union {
  /** Missing for children whose other parent isn't in the data */
  partner?: FamilyMember
  relationship: RelationshipStatus
  start?: number | string
  end?: number | string
  children: FamilyNode[]
  hasChildren: boolean
}

export interface VisibilityOptions {
  filter?: FamilyTreeConfig['filter']
  /** `config.partners.showFormer` (default `true`) */
  showFormer?: boolean
}

/**
 * Who and what the tree draws for a given `config.filter` and `partners.showFormer`. Branch.vue lays the tree out
 * with these rules, and the legend uses them to list only the symbols that appear.
 */
export const visibility = ({ filter, showFormer = true }: VisibilityOptions = {}) => {
  // `hidden` or a `false` filter removes a person; a `'card'` filter keeps their spot as a placeholder
  const shown = (person: FamilyMember) => !person.hidden && filter?.(person) !== false
  const placeholder = (person: FamilyMember) => filter?.(person) === 'card'

  // `secondPerson` / `children` are the first union, then `partners` in order. A union whose partner is hidden (or
  // filtered out with `false`) goes with its children; a `'card'` placeholder partner keeps them. With
  // `showFormer: false`, separated and divorced unions go the same way.
  const unionsOf = (node: FamilyNode): Union[] => {
    const unions = [
      ...(node.secondPerson || node.children?.length ? [{ ...node, partner: node.secondPerson }] : []),
      ...(node.partners ?? []).filter(partnership => !partnership.hidden).map(partnership => ({
        ...partnership, partner: partnership.person,
      })),
    ]
    return unions
      .filter(union => showFormer || (union.relationship !== 'separated' && union.relationship !== 'divorced'))
      .filter(union => !union.partner || shown(union.partner))
      .map(union => {
        const children = union.children ?? []
        return {
          partner: union.partner,
          relationship: union.relationship ?? 'married',
          start: union.start,
          end: union.end,
          children,
          hasChildren: children.some(isVisible),
        }
      })
  }

  const visiblePeople = (node: FamilyNode) =>
    [node.firstPerson, node.secondPerson].filter((person): person is FamilyMember => !!person && shown(person))

  // Hidden nodes take their whole subtree with them, as do nodes whose people are all hidden. A node of only
  // placeholders goes too unless it still has children to hold in place. A node that never had people (grouping
  // siblings) still renders. In a chain, the first person anchors everything: hiding them hides the node.
  const isVisible = (node: FamilyNode): boolean => {
    if (node.hidden) return false
    if (isChain(node)) {
      if (!shown(node.firstPerson!)) return false
      return !placeholder(node.firstPerson!) || unionsOf(node).some(union =>
        (union.partner && !placeholder(union.partner)) || union.hasChildren)
    }
    if (!(node.firstPerson || node.secondPerson)) return true
    const people = visiblePeople(node)
    if (!people.length) return false
    return !people.every(placeholder) || hasVisibleChildren(node)
  }

  // A parent left without visible children draws as a leaf
  const hasVisibleChildren = (node: FamilyNode): boolean => !!node.children?.some(isVisible)

  return { shown, placeholder, unionsOf, visiblePeople, isVisible, hasVisibleChildren }
}
