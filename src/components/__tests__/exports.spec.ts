import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp, defineComponent, h } from 'vue'
import VueFamilyTree, {
  VueFamilyTreeDeceasedSymbol, VueFamilyTreeLifespan, VueFamilyTreePlugin,
} from '../../index'
import type { FamilyMember, FamilyNode } from '../../types'

const tree: FamilyNode[] = [{
  firstPerson: { id: 1, name: 'John', gender: 'male', born: 1921, died: 1990 },
  secondPerson: { id: 2, name: 'Jane', gender: 'female', born: 1925 },
}]

// A custom card built from the exported pieces
const card = ({ item }: { item: FamilyMember }) => h('div', { class: 'my-card' }, [
  h(VueFamilyTreeDeceasedSymbol, { member: item }),
  item.name,
  h(VueFamilyTreeLifespan, { member: item }),
])

describe('exported card pieces', () => {
  it('render the symbol and dates in a custom card slot', () => {
    const cards = mount(VueFamilyTree, { props: { tree }, slots: { card } }).findAll('.my-card')

    expect(cards[0]!.find('.vue-family-card__symbol').classes()).toContain('vue-family-card__symbol_square')
    expect(cards[0]!.find('.vue-family-card__lifespan').text()).toBe('1921–1990')
    expect(cards[1]!.find('.vue-family-card__symbol').exists()).toBe(false)
    expect(cards[1]!.find('.vue-family-card__lifespan').text()).toBe('b. 1925')
  })

  it("use the tree's labels inside a custom card slot", () => {
    const labels = { deceased: 'Verstorben', born: 'geb.' }
    const cards = mount(VueFamilyTree, { props: { tree, config: { labels } }, slots: { card } }).findAll('.my-card')

    expect(cards[0]!.find('.vue-family-card__symbol').find('title').text()).toBe('Verstorben')
    expect(cards[1]!.find('.vue-family-card__lifespan').text()).toBe('geb. 1925')
  })

  it('fall back to English outside a tree, and render nothing without data', () => {
    const symbol = mount(VueFamilyTreeDeceasedSymbol, { props: { member: { id: 1, name: 'A', died: '?' } } })
    const empty = mount(VueFamilyTreeLifespan, { props: { member: { id: 2, name: 'B' } } })

    expect(symbol.find('title').text()).toBe('Deceased')
    expect(empty.find('.vue-family-card__lifespan').exists()).toBe(false)
  })

  it('pass a class through to the symbol', () => {
    const symbol = mount(VueFamilyTreeDeceasedSymbol, { props: { member: { id: 1, name: 'A', deceased: true } }, attrs: { class: 'big' } })

    expect(symbol.classes()).toEqual(expect.arrayContaining(['vue-family-card__symbol', 'big']))
  })

  it('are registered by the plugin', () => {
    const app = createApp(defineComponent({ render: () => null }))
    app.use(VueFamilyTreePlugin)

    for (const name of ['VueFamilyTree', 'VueFamilyTreeDeceasedSymbol', 'VueFamilyTreeLifespan']) {
      expect(app.component(name), name).toBeDefined()
    }
  })
})
