import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VueFamilyTree from '../VueFamilyTree.vue'

const tree = [{ firstPerson: { id: 1, name: 'A' } }]

// jsdom has no layout: a 1000px wrapper around a 1600px tree
const fakeLayout = () =>
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.classList.contains('vue-family-tree') ? 1000 : 1600
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 600, width, height: 600, toJSON: () => ({}) } as DOMRect
  })

const startX = (wrapper: ReturnType<typeof mount>) =>
  (wrapper.element.firstElementChild as HTMLElement).style.transform.match(/translate\((-?[\d.]+)px/)![1]

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('RTL', () => {
  it('starts a mirrored tree right-aligned in the viewport', async () => {
    fakeLayout()
    const wrapper = mount(VueFamilyTree, { props: { tree }, attrs: { style: 'direction: rtl' }, attachTo: document.body })
    await nextTick()

    expect(startX(wrapper)).toBe('-600')
  })

  it('keeps the left-aligned start in LTR', async () => {
    fakeLayout()
    const wrapper = mount(VueFamilyTree, { props: { tree }, attachTo: document.body })
    await nextTick()

    expect(startX(wrapper)).toBe('0')
  })
})
