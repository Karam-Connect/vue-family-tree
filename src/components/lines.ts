import type { FamilyTreeConfig } from '../types'

const cssLength = (value?: number | string) => (typeof value === 'number' ? `${value}px` : value)

/**
 * `config.lines` and `cards.width` as the CSS variables the tree and the legend draw with. Unset values are left
 * out, so the variables fall back to user CSS and then to the defaults.
 */
export const lineVariables = ({ lines = {}, cards }: Pick<FamilyTreeConfig, 'lines' | 'cards'>) => ({
  '--vue-family-tree-line-color': lines.color,
  '--vue-family-tree-line-width': cssLength(lines.width),
  '--vue-family-tree-line-style': lines.style === 'thick' ? 'solid' : lines.style,
  '--_vft-line-scale': lines.style === 'thick' ? 3 : undefined,
  // Unmarried partners: dotted on a dashed tree, so they still stand out
  '--_vft-partners-line-style': lines.style === 'dashed' ? 'dotted' : undefined,
  '--vue-family-tree-card-width': cssLength(cards?.width),
})
