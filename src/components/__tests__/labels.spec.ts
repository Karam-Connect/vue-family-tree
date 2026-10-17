import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import VueFamilyTree from '../VueFamilyTree.vue'
import type { FamilyNode, FamilyTreeConfig } from '../../types'

const tree: FamilyNode[] = [{
  firstPerson: { id: 1, name: 'John', gender: 'male', born: 1921, died: 1990 },
  secondPerson: { id: 2, name: 'Jane', born: 1925 },
  children: [{ firstPerson: { id: 3, name: 'Kid', died: '?' } }],
}]

const lifespans = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.vue-family-card__lifespan').map(el => el.text())

afterEach(() => {
  document.body.innerHTML = ''
})

describe('labels', () => {
  it('defaults to English', () => {
    const wrapper = mount(VueFamilyTree, { props: { tree } })

    expect(lifespans(wrapper)).toEqual(['1921–1990', 'b. 1925', 'd. ?'])
    expect(wrapper.find('.vue-family-card__symbol').find('title').text()).toBe('Deceased')
  })

  it('uses string prefixes and the deceased label', () => {
    const wrapper = mount(VueFamilyTree, {
      props: { tree, config: { labels: { deceased: 'Verstorben', born: 'geb.', died: 'gest.' } } },
    })

    expect(lifespans(wrapper)).toEqual(['1921–1990', 'geb. 1925', 'gest. ?'])
    expect(wrapper.find('.vue-family-card__symbol').find('title').text()).toBe('Verstorben')
  })

  it('uses functions for full control over wording, order and digits', () => {
    const arabicDigits = (text: string) => text.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
    const wrapper = mount(VueFamilyTree, {
      props: {
        tree,
        config: {
          labels: {
            born: year => `مواليد ${arabicDigits(year)}`,
            died: year => `${year} †`,
            lifespan: (born, died) => `${arabicDigits(born)} - ${arabicDigits(died)}`,
          },
        },
      },
    })

    expect(lifespans(wrapper)).toEqual(['١٩٢١ - ١٩٩٠', 'مواليد ١٩٢٥', '? †'])
  })

  it('keeps defaults for entries left undefined', () => {
    const wrapper = mount(VueFamilyTree, { props: { tree, config: { labels: { born: undefined, died: 'gest.' } } } })

    expect(lifespans(wrapper)).toEqual(['1921–1990', 'b. 1925', 'gest. ?'])
  })

  // vue-i18n re-evaluates `t()` on a locale switch and passes a new config object
  it('updates when the labels change', async () => {
    const config = reactive<FamilyTreeConfig>({ labels: { born: 'b.' } })
    const wrapper = mount(VueFamilyTree, { props: { tree, config } })

    config.labels!.born = 'geb.'
    await nextTick()
    expect(lifespans(wrapper)[1]).toBe('geb. 1925')

    await wrapper.setProps({ config: { labels: { born: 'né' } } })
    expect(lifespans(wrapper)[1]).toBe('né 1925')
  })

  it('translates the gesture hints', async () => {
    const wrapper = mount(VueFamilyTree, {
      props: {
        tree,
        config: {
          gestures: 'cooperative',
          labels: { touchHint: 'Zwei Finger verwenden', wheelHint: key => `${key} + Mausrad zum Zoomen` },
        },
      },
      attachTo: document.body,
    })

    wrapper.element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 }))
    await nextTick()
    expect(wrapper.find('.vue-family-tree__hint').text()).toMatch(/^(⌘|Ctrl) \+ Mausrad zum Zoomen$/)

    const touch = (type: string, points: [number, number][]) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', {
        value: points.map(([x, y]) => ({ clientX: x, clientY: y, target: wrapper.element })),
      })
      wrapper.element.dispatchEvent(event)
    }
    touch('touchstart', [[100, 100]])
    touch('touchmove', [[100, 50]])
    await nextTick()
    expect(wrapper.find('.vue-family-tree__hint').text()).toBe('Zwei Finger verwenden')
  })

  it('isolates names so they keep their own direction', () => {
    const wrapper = mount(VueFamilyTree, { props: { tree } })

    // The name's own text, without the symbol's <title>
    const names = wrapper.findAll('.vue-family-card__name bdi').map(el =>
      [...el.element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(''))

    expect(names).toEqual(['John', 'Jane', 'Kid'])
  })
})
