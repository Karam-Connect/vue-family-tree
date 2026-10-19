import type { FamilyMember, FamilyNode, LegendItem } from '../types'
import { isDeceased, symbolShape } from './member'
import { isChain, visibility, type VisibilityOptions } from './visibility'

/** Every legend entry, in the order the legend lists them */
export const legendItemOrder: LegendItem[] = ['married', 'partners', 'separated', 'divorced', 'deceased', 'placeholder']

const shapeOrder = ['square', 'circle', 'diamond'] as const
export type SymbolShape = typeof shapeOrder[number]

/**
 * The symbols a tree actually draws, with the same rules as the tree (hidden people, `config.filter`,
 * `partners.showFormer`), and the deceased symbol's shapes among them
 */
export const legendOf = (tree: FamilyNode[], options: VisibilityOptions = {}) => {
  const { isVisible, unionsOf, visiblePeople, hasVisibleChildren, placeholder } = visibility(options)
  const items = new Set<LegendItem>()
  const shapes = new Set<SymbolShape>()

  // A placeholder's card is invisible, so it shows no deceased symbol either
  const see = (person: FamilyMember) => {
    if (placeholder(person)) items.add('placeholder')
    else if (isDeceased(person)) {
      items.add('deceased')
      shapes.add(symbolShape(person))
    }
  }

  const walk = (nodes: FamilyNode[]) => {
    for (const node of nodes.filter(isVisible)) {
      if (isChain(node)) {
        see(node.firstPerson!)
        for (const union of unionsOf(node)) {
          items.add(union.relationship)
          // A union without a partner shows an unknown-partner placeholder
          if (union.partner) see(union.partner)
          else items.add('placeholder')
          if (union.hasChildren) walk(union.children)
        }
      } else {
        const people = visiblePeople(node)
        people.forEach(see)
        if (people.length === 2) items.add('married')
        if (hasVisibleChildren(node)) walk(node.children!)
      }
    }
  }
  walk(tree)

  return {
    items: legendItemOrder.filter(item => items.has(item)),
    shapes: shapeOrder.filter(shape => shapes.has(shape)),
  }
}

export const allShapes: SymbolShape[] = [...shapeOrder]
