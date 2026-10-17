import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VueFamilyTree from '../VueFamilyTree.vue'
import type { FamilyNode } from '../../types'

const tree: FamilyNode[] = [{
  firstPerson: { id: '1', name: 'John' },
  secondPerson: { id: '2', name: 'Jane' },
  children: [{ firstPerson: { id: '3', name: 'Kid' } }]
}]

afterEach(() => {
  document.body.innerHTML = ''
})

const mouse = (type: string, init: MouseEventInit) =>
  window.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init }))

const transformOf = (wrapper: ReturnType<typeof mount>) =>
  (wrapper.element.firstElementChild as HTMLElement).style.transform

describe('VueFamilyTree', () => {
  it('emits card-click when a default card is clicked', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree } })

    await wrapper.findAll('.vue-family-card')[0].trigger('click')

    expect(wrapper.emitted('card-click')?.[0][0]).toEqual(tree[0].firstPerson)
  })

  it('emits card-click for default cards in nested branches', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree } })

    await wrapper.findAll('.vue-family-card')[2].trigger('click')

    expect(wrapper.emitted('card-click')?.[0][0]).toEqual(tree[0].children![0].firstPerson)
  })

  it('suppresses card-click after an upward vertical drag', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree }, attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 100, clientY: 100, buttons: 1 })
    await wrapper.trigger('mousemove', { clientX: 100, clientY: 90, buttons: 1 })
    await wrapper.findAll('.vue-family-card')[0].trigger('click')

    expect(wrapper.emitted('card-click')).toBeUndefined()
    expect((wrapper.element as HTMLElement).style.cursor).toBe('grabbing')
  })
})

describe('mouse drag', () => {
  it('keeps panning outside the tree and ends on release anywhere', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree }, attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 100, clientY: 100, buttons: 1 })
    mouse('mousemove', { clientX: 150, clientY: 120, buttons: 1 })
    mouse('mouseup', { clientX: 150, clientY: 120 })
    await wrapper.vm.$nextTick()

    expect(transformOf(wrapper)).toBe('translate(50px, 20px) scale(1)')
    expect(wrapper.emitted('dragend')).toHaveLength(1)
    expect((wrapper.element as HTMLElement).style.cursor).toBe('')

    // Moving back over the tree without a button pressed must not pan
    await wrapper.trigger('mousemove', { clientX: 200, clientY: 200 })
    expect(transformOf(wrapper)).toBe('translate(50px, 20px) scale(1)')
  })

  it('ends the drag if the button was released where the page could not see it', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree }, attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 100, clientY: 100, buttons: 1 })
    mouse('mousemove', { clientX: 120, clientY: 100, buttons: 1 })
    // mouseup happened outside the browser; next move arrives with no buttons pressed
    mouse('mousemove', { clientX: 300, clientY: 300, buttons: 0 })
    await wrapper.vm.$nextTick()

    expect(transformOf(wrapper)).toBe('translate(20px, 0px) scale(1)')
    expect(wrapper.emitted('dragend')).toHaveLength(1)
  })

  it('removes its window listeners when unmounted mid-drag', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree }, attachTo: document.body })
    await wrapper.trigger('mousedown', { clientX: 100, clientY: 100, buttons: 1 })
    const remove = vi.spyOn(window, 'removeEventListener')

    wrapper.unmount()

    const removed = remove.mock.calls.map(([type]) => type)
    expect(removed).toEqual(expect.arrayContaining(['mousemove', 'mouseup']))
    remove.mockRestore()
  })

  it('does not emit dragstart/dragend for a click without movement', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree }, attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 100, clientY: 100, buttons: 1 })
    mouse('mouseup', { clientX: 100, clientY: 100 })

    expect(wrapper.emitted('dragstart')).toBeUndefined()
    expect(wrapper.emitted('dragend')).toBeUndefined()
  })

  it('stops an active mouse drag when gestures are switched to `none`', async () => {
    const wrapper = mount(VueFamilyTree, { props: { tree, config: { gestures: 'greedy' } }, attachTo: document.body })

    await wrapper.trigger('mousedown', { clientX: 100, clientY: 100, buttons: 1 })
    mouse('mousemove', { clientX: 120, clientY: 100, buttons: 1 })
    await wrapper.setProps({ config: { gestures: 'none' } })
    mouse('mousemove', { clientX: 200, clientY: 100, buttons: 1 })
    await wrapper.vm.$nextTick()

    expect(transformOf(wrapper)).toBe('translate(20px, 0px) scale(1)')
    expect(wrapper.emitted('dragend')).toHaveLength(1)
  })
})
