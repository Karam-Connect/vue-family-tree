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
