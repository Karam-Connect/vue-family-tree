import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VueFamilyTree from '../VueFamilyTree.vue'
import type { FamilyNode, FamilyTreeConfig } from '../../types'

const tree: FamilyNode[] = [{ firstPerson: { id: '1', name: 'John' } }]

let wrapper: VueWrapper | undefined
afterEach(() => wrapper?.unmount())

const mountTree = (config: FamilyTreeConfig = {}) =>
  (wrapper = mount(VueFamilyTree, { props: { tree, config }, attachTo: document.body }))

const transformOf = (tree: VueWrapper) => (tree.element.firstElementChild as HTMLElement).style.transform

// The browser scrolls the clipped viewport to a card that gets keyboard focus outside the view
const scrollViewport = async (tree: VueWrapper, left: number, top: number) => {
  tree.element.scrollLeft = left
  tree.element.scrollTop = top
  await tree.trigger('scroll')
}

describe('viewport scroll (keyboard focus)', () => {
  it('turns a scroll of the viewport into a pan and resets the scroll', async () => {
    const tree = mountTree()
    await scrollViewport(tree, 120, 40)

    expect(transformOf(tree)).toBe('translate(-120px, -40px) scale(1)')
    expect(tree.element.scrollLeft).toBe(0)
    expect(tree.element.scrollTop).toBe(0)
  })

  it('leaves the scroll alone when dragging is off', async () => {
    const tree = mountTree({ drag: { enabled: false } })
    await scrollViewport(tree, 120, 40)

    expect(tree.element.scrollLeft).toBe(120)
  })
})

describe('library sources', () => {
  // vue-tsc copies import paths into the emitted .d.ts as written, and consumers can't resolve the `@/` alias
  it('import with relative paths, not the `@/` alias', () => {
    const sources = import.meta.glob(['../**/*.{ts,vue}', '../../{index,types}.ts', '!../__tests__/**'], {
      query: '?raw', import: 'default', eager: true,
    }) as Record<string, string>

    expect(Object.keys(sources).length).toBeGreaterThan(5)
    const aliased = Object.keys(sources).filter(file => /from ['"]@\//.test(sources[file]!))
    expect(aliased).toEqual([])
  })
})

describe('centerOn', () => {
  const family: FamilyNode[] = [{
    firstPerson: { id: 1, name: 'Ruth' },
    secondPerson: { id: 2, name: 'Samuel' },
    children: [{ firstPerson: { id: 3, name: 'Grace' } }],
  }]

  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect

  it('marks each person with their id, but not placeholders', () => {
    wrapper = mount(VueFamilyTree, {
      props: { tree: [{ firstPerson: { id: 'a', name: 'A' }, partners: [{ person: { id: 'b', name: 'B' } }], children: [{ firstPerson: { id: 'c', name: 'C' } }] }] },
      attachTo: document.body,
    })
    const ids = wrapper.findAll('.vue-family-tree__person').map(person => person.attributes('data-person-id'))
    expect(ids.filter(Boolean).sort()).toEqual(['a', 'b', 'c'])
    expect(wrapper.findAll('.vue-family-tree__person_unknown')[0]?.attributes('data-person-id')).toBeUndefined()
  })

  it("pans so the person's card is in the middle of the viewport", async () => {
    wrapper = mount(VueFamilyTree, { props: { tree: family }, attachTo: document.body })
    wrapper.element.getBoundingClientRect = () => rect(0, 0, 400, 300)
    const grace = wrapper.find('[data-person-id="3"]').element
    grace.getBoundingClientRect = () => rect(500, 400, 100, 120)

    expect(await (wrapper.vm as any).centerOn(3)).toBe(true)
    await wrapper.vm.$nextTick()
    // Card center (550, 460) moves to the viewport center (200, 150)
    expect(transformOf(wrapper)).toBe('translate(-350px, -310px) scale(1)')
    expect(wrapper.emitted('center-map')).toHaveLength(1)
  })

  it('resolves false for someone without a card', async () => {
    wrapper = mount(VueFamilyTree, { props: { tree: family }, attachTo: document.body })
    expect(await (wrapper.vm as any).centerOn('nobody')).toBe(false)
    expect(wrapper.emitted('center-map')).toBeUndefined()
  })
})
