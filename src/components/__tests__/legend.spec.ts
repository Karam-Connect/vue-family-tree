import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueFamilyTreeLegend, VueFamilyTreePlugin, isDeceased } from '../../index'
import { legendOf } from '../legend'
import type { FamilyNode } from '../../types'

const person = (id: string, extra = {}) => ({ id, name: id, ...extra })

describe('legendOf', () => {
  it('lists a couple as married, in the legend order', () => {
    const tree: FamilyNode[] = [{ firstPerson: person('a'), secondPerson: person('b') }]
    expect(legendOf(tree).items).toEqual(['married'])
  })

  it('lists each relationship status and the deceased shapes found, in a fixed order', () => {
    const tree: FamilyNode[] = [{
      firstPerson: person('a', { gender: 'female', died: 2000 }),
      partners: [
        { person: person('b', { gender: 'male', deceased: true }), relationship: 'divorced' },
        { person: person('c'), relationship: 'partners' },
      ],
    }]
    expect(legendOf(tree)).toEqual({ items: ['partners', 'divorced', 'deceased'], shapes: ['square', 'circle'] })
  })

  it('looks through descendants and ignores single people', () => {
    const tree: FamilyNode[] = [{
      firstPerson: person('a'),
      children: [{ firstPerson: person('b'), secondPerson: person('c'), relationship: 'separated' }],
    }]
    expect(legendOf(tree).items).toEqual(['separated'])
  })

  it('skips what the tree hides: hidden nodes, hidden partners, former partners with showFormer off', () => {
    const tree: FamilyNode[] = [
      { hidden: true, firstPerson: person('a'), secondPerson: person('b', { deceased: true }) },
      {
        firstPerson: person('c'),
        partners: [
          { person: person('d', { hidden: true }), relationship: 'partners' },
          { person: person('e'), relationship: 'divorced', children: [{ firstPerson: person('f', { deceased: true }) }] },
        ],
      },
    ]
    expect(legendOf(tree).items).toEqual(['divorced', 'deceased'])
    expect(legendOf(tree, { showFormer: false }).items).toEqual([])
  })

  it("lists the placeholder for 'card' filtered people, without their deceased symbol", () => {
    const tree: FamilyNode[] = [{ firstPerson: person('a'), secondPerson: person('b', { died: 1990 }) }]
    const filter = (p: { died?: unknown }) => (isDeceased(p as never) ? 'card' as const : true)
    expect(legendOf(tree, { filter }).items).toEqual(['married', 'placeholder'])
  })

  it('lists the placeholder for children whose other parent is unknown', () => {
    const tree: FamilyNode[] = [{
      firstPerson: person('a'),
      children: [{ firstPerson: person('b') }],
      partners: [{ person: person('c') }],
    }]
    expect(legendOf(tree).items).toEqual(['married', 'placeholder'])
  })
})

describe('VueFamilyTreeLegend', () => {
  const tree: FamilyNode[] = [{
    firstPerson: person('a', { gender: 'male', died: 2001 }),
    secondPerson: person('b'),
    relationship: 'divorced',
  }]

  const texts = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('.vue-family-legend__text').map(text => text.text())

  it('lists the symbols of the tree with their names', () => {
    const wrapper = mount(VueFamilyTreeLegend, { props: { tree } })

    expect(texts(wrapper)).toEqual(['Divorced', 'Deceased'])
    expect(wrapper.findAll('.vue-family-legend__line_divorced .vue-family-legend__marks')).toHaveLength(1)
    expect(wrapper.findAll('.vue-family-card__symbol').map(symbol => symbol.classes()))
      .toEqual([expect.arrayContaining(['vue-family-card__symbol_square'])])
  })

  it('lists everything, with all three shapes, without a tree', () => {
    const wrapper = mount(VueFamilyTreeLegend)

    expect(texts(wrapper)).toEqual(
      ['Married', 'Partners', 'Separated', 'Divorced', 'Deceased', 'Unknown or not shown'])
    expect(wrapper.findAll('.vue-family-card__symbol')).toHaveLength(3)
  })

  it('shows exactly the given items', () => {
    const wrapper = mount(VueFamilyTreeLegend, { props: { tree, items: ['placeholder', 'married'] } })
    expect(texts(wrapper)).toEqual(['Unknown or not shown', 'Married'])
  })

  it("uses the config's labels, also in the symbols' titles", () => {
    const config = { labels: { deceased: 'Verstorben', relationships: { divorced: 'Geschieden' } } }
    const wrapper = mount(VueFamilyTreeLegend, { props: { tree, config } })

    expect(texts(wrapper)).toEqual(['Geschieden', 'Verstorben'])
    expect(wrapper.find('.vue-family-card__symbol title').text()).toBe('Verstorben')
  })

  it("follows the config's line style", () => {
    const wrapper = mount(VueFamilyTreeLegend, { props: { tree, config: { lines: { style: 'dashed', color: '#123' } } } })
    const style = (wrapper.element as HTMLElement).style

    expect(style.getPropertyValue('--vue-family-tree-line-style')).toBe('dashed')
    expect(style.getPropertyValue('--vue-family-tree-line-color')).toBe('#123')
    expect(style.getPropertyValue('--_vft-partners-line-style')).toBe('dotted')
  })

  it('hides the samples from screen readers, which read the text', () => {
    const wrapper = mount(VueFamilyTreeLegend, { props: { tree } })
    expect(wrapper.findAll('.vue-family-legend__sample').every(sample => sample.attributes('aria-hidden') === 'true'))
      .toBe(true)
  })

  it('is registered by the plugin', () => {
    const wrapper = mount({ template: '<VueFamilyTreeLegend :items="[\'married\']" />' },
      { global: { plugins: [VueFamilyTreePlugin] } })
    expect(wrapper.find('.vue-family-legend').exists()).toBe(true)
  })
})
