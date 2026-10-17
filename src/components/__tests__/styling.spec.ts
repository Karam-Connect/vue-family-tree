import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VueFamilyTree from '../VueFamilyTree.vue'

const style = (el: Element) => (el as HTMLElement).style

describe('styling', () => {
  it('passes class and style through to the root element', () => {
    const wrapper = mount(VueFamilyTree, {
      attrs: { class: 'my-tree', style: 'border: 2px solid red' },
    })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['vue-family-tree', 'my-tree']))
    expect(style(wrapper.element).border).toBe('2px solid red')
  })

  // Inline styles beat classes, so defaults must live in the stylesheet
  it('sets no inline size, position, overflow or cursor that would block user classes', async () => {
    const wrapper = mount(VueFamilyTree)
    await wrapper.vm.$nextTick()
    const s = style(wrapper.element)

    for (const prop of ['width', 'height', 'position', 'overflow', 'cursor'] as const) {
      expect(s[prop], prop).toBe('')
    }
  })

  it('marks the root as a viewport only when enable-drag is on', () => {
    expect(mount(VueFamilyTree).classes()).toContain('vue-family-tree_viewport')
    expect(mount(VueFamilyTree, { props: { config: { drag: { enabled: false } } } }).classes()).not.toContain('vue-family-tree_viewport')
  })

  it('sets the drag cursor only while dragging', async () => {
    const wrapper = mount(VueFamilyTree, { attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 0, clientY: 0, buttons: 1 })
    await wrapper.trigger('mousemove', { clientX: 20, clientY: 0, buttons: 1 })
    expect(style(wrapper.element).cursor).toBe('grabbing')

    await wrapper.trigger('mouseup')
    expect(style(wrapper.element).cursor).toBe('')
    wrapper.unmount()
  })

  describe('connector lines', () => {
    // Singles and couples draw their line to the children differently; jsdom can't measure it, so pin the classes
    it('tells singles from couples, including a couple with a hidden partner', () => {
      const tree = [
        { firstPerson: { id: 1, name: 'Solo' }, children: [{ firstPerson: { id: 2, name: 'Kid' } }] },
        { firstPerson: { id: 3, name: 'A' }, secondPerson: { id: 4, name: 'B' } },
        { firstPerson: { id: 5, name: 'C' }, secondPerson: { id: 6, name: 'D', hidden: true } },
      ]
      const kinds = mount(VueFamilyTree, { props: { tree } })
        .findAll('.vue-family-tree__parents')
        .map(el => el.classes().find(c => c === 'vue-family-tree__parents_single' || c === 'vue-family-tree__parents_couple'))

      expect(kinds).toEqual([
        'vue-family-tree__parents_single', 'vue-family-tree__parents_single',
        'vue-family-tree__parents_couple', 'vue-family-tree__parents_single',
      ])
    })

    const vars = (el: Element) => ({
      color: style(el).getPropertyValue('--vue-family-tree-line-color'),
      width: style(el).getPropertyValue('--vue-family-tree-line-width'),
    })

    it('exposes line-color and line-width as CSS variables on the root', () => {
      const wrapper = mount(VueFamilyTree, { props: { config: { lines: { color: 'tomato', width: 3 } } } })

      expect(vars(wrapper.element)).toEqual({ color: 'tomato', width: '3px' })
    })

    it('accepts CSS lengths for line-width', () => {
      const wrapper = mount(VueFamilyTree, { props: { config: { lines: { width: '0.2rem' } } } })

      expect(vars(wrapper.element).width).toBe('0.2rem')
    })

    // Unset props must not set the variables inline, or they'd beat a user class setting them
    it('leaves the variables unset by default', () => {
      expect(vars(mount(VueFamilyTree).element)).toEqual({ color: '', width: '' })
      expect(style(mount(VueFamilyTree).element).getPropertyValue('--vue-family-tree-card-width')).toBe('')
    })

    it('exposes line-style as a CSS variable, with thick as solid at three times the width', () => {
      const lineStyle = (value?: string) => {
        const s = style(mount(VueFamilyTree, { props: { config: { lines: { style: value as never } } } }).element)
        return [s.getPropertyValue('--vue-family-tree-line-style'), s.getPropertyValue('--_vft-line-scale')]
      }

      expect(lineStyle('dashed')).toEqual(['dashed', ''])
      expect(lineStyle('dotted')).toEqual(['dotted', ''])
      expect(lineStyle('thick')).toEqual(['solid', '3'])
      expect(lineStyle()).toEqual(['', ''])
    })

    it('exposes card-width as a CSS variable, numbers as px', () => {
      const cardWidth = (value: number | string) =>
        style(mount(VueFamilyTree, { props: { config: { cards: { width: value } } } }).element).getPropertyValue('--vue-family-tree-card-width')

      expect(cardWidth(220)).toBe('220px')
      expect(cardWidth('14rem')).toBe('14rem')
    })
  })

  describe('card classes', () => {
    const nested = [{
      firstPerson: { id: '1', name: 'Parent' },
      children: [{ firstPerson: { id: '2', name: 'Child' }, children: [{ firstPerson: { id: '3', name: 'Grandchild' } }] }],
    }]

    it('applies card-class, card-image-class and card-name-class to default cards at every depth', () => {
      const wrapper = mount(VueFamilyTree, {
        props: { tree: nested, config: { cards: { class: 'my-card', imageClass: 'my-image', nameClass: 'my-name' } } },
      })
      const cards = wrapper.findAll('.vue-family-card')

      expect(cards).toHaveLength(3)
      for (const card of cards) {
        expect(card.classes()).toContain('my-card')
        expect(card.find('.vue-family-card__image').classes()).toContain('my-image')
        expect(card.find('.vue-family-card__name').classes()).toContain('my-name')
      }
    })

    it('updates card classes reactively', async () => {
      const wrapper = mount(VueFamilyTree, { props: { tree: nested, config: { cards: { class: 'a' } } } })

      await wrapper.setProps({ config: { cards: { class: 'b' } } })

      expect(wrapper.findAll('.vue-family-card').every(c => c.classes().includes('b'))).toBe(true)
    })
  })

  describe('deceased', () => {
    const tree = [{
      firstPerson: { id: 1, name: 'Alive' },
      secondPerson: { id: 2, name: 'Gone', deceased: true },
    }]

    it('adds the deceased modifier to the default card', () => {
      const cards = mount(VueFamilyTree, { props: { tree } }).findAll('.vue-family-card')

      expect(cards.map(c => c.classes().includes('vue-family-card_deceased'))).toEqual([false, true])
    })

    it('shows the genogram symbol for the gender only on deceased cards', () => {
      const tree = [
        { firstPerson: { id: 1, name: 'M', gender: 'male', died: 1990 },
          secondPerson: { id: 2, name: 'F', gender: 'female', deceased: true } },
        { firstPerson: { id: 3, name: 'U', deceased: true } },
        { firstPerson: { id: 4, name: 'Alive', gender: 'male' } },
      ]
      const symbols = mount(VueFamilyTree, { props: { tree } }).findAll('.vue-family-card').map(card => {
        const symbol = card.find('.vue-family-card__symbol')
        return symbol.exists() ? symbol.classes().find(c => c.startsWith('vue-family-card__symbol_')) : undefined
      })

      expect(symbols).toEqual([
        'vue-family-card__symbol_square', 'vue-family-card__symbol_circle', 'vue-family-card__symbol_diamond', undefined,
      ])
    })

    it('shows the lifespan under the name, and nothing without dates', () => {
      const tree = [{
        firstPerson: { id: 1, name: 'A', born: 1945, died: 2020 },
        secondPerson: { id: 2, name: 'B' },
      }]
      const lifespans = mount(VueFamilyTree, { props: { tree } }).findAll('.vue-family-card')
        .map(card => card.find('.vue-family-card__lifespan').exists() ? card.find('.vue-family-card__lifespan').text() : null)

      expect(lifespans).toEqual(['1945–2020', null])
    })

    it('adds the deceased modifier to the person wrapper, so custom cards can use it', () => {
      const wrapper = mount(VueFamilyTree, {
        props: { tree },
        slots: { card: '<template #card="{ item }"><span>{{ item.name }}</span></template>' },
      })
      const people = wrapper.findAll('.vue-family-tree__person')

      expect(people.map(p => p.classes().includes('vue-family-tree__person_deceased'))).toEqual([false, true])
    })
  })
})
