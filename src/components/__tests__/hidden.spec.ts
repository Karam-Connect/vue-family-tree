import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import VueFamilyTree from '../VueFamilyTree.vue'
import type { FamilyNode } from '../../types'

const person = (id: number) => ({ id, name: `Person ${id}` })

const names = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.vue-family-tree__person').map(el => el.text())

describe('hidden nodes', () => {
  it('skips a hidden node and all of its descendants', () => {
    const tree: FamilyNode[] = [{
      firstPerson: person(1),
      children: [
        { firstPerson: person(2), hidden: true, children: [{ firstPerson: person(3) }] },
        { firstPerson: person(4) },
      ],
    }]

    expect(names(mount(VueFamilyTree, { props: { tree } }))).toEqual(['Person 1', 'Person 4'])
  })

  it('hides root-level nodes', () => {
    const tree: FamilyNode[] = [{ firstPerson: person(1), hidden: true }, { firstPerson: person(2) }]

    expect(names(mount(VueFamilyTree, { props: { tree } }))).toEqual(['Person 2'])
  })

  it('draws a couple whose children are all hidden as childless', () => {
    const tree: FamilyNode[] = [{
      firstPerson: person(1),
      secondPerson: person(2),
      children: [{ firstPerson: person(3), hidden: true }],
    }]
    const wrapper = mount(VueFamilyTree, { props: { tree } })

    expect(wrapper.find('.vue-family-tree__parents_with-children').exists()).toBe(false)
    // No empty child branch left behind to pad the layout
    expect(wrapper.findAll('.vue-family-tree__branch')).toHaveLength(1)
  })

  describe('on a person', () => {
    it('draws the remaining partner as a single and keeps the children', () => {
      const tree: FamilyNode[] = [{
        firstPerson: person(1),
        secondPerson: { ...person(2), hidden: true },
        children: [{ firstPerson: person(3) }],
      }]
      const wrapper = mount(VueFamilyTree, { props: { tree } })

      expect(names(wrapper)).toEqual(['Person 1', 'Person 3'])
      expect(wrapper.find('.vue-family-tree__parents_couple').exists()).toBe(false)
      expect(wrapper.find('.vue-family-tree__family_couple').exists()).toBe(false)
    })

    it('skips the node and its descendants when every person in it is hidden', () => {
      const tree: FamilyNode[] = [{
        firstPerson: person(1),
        children: [
          { firstPerson: { ...person(2), hidden: true }, secondPerson: { ...person(3), hidden: true },
            children: [{ firstPerson: person(4) }] },
          { firstPerson: person(5) },
        ],
      }]

      expect(names(mount(VueFamilyTree, { props: { tree } }))).toEqual(['Person 1', 'Person 5'])
    })

    it('still renders a node that has no people, only children', () => {
      const tree: FamilyNode[] = [{ children: [{ firstPerson: person(1) }, { firstPerson: person(2) }] }]

      expect(names(mount(VueFamilyTree, { props: { tree } }))).toEqual(['Person 1', 'Person 2'])
    })

    it('updates when a person is hidden on reactive data', async () => {
      const tree = reactive<FamilyNode[]>([{ firstPerson: person(1), secondPerson: person(2) }])
      const wrapper = mount(VueFamilyTree, { props: { tree } })

      tree[0]!.secondPerson!.hidden = true
      await nextTick()
      expect(names(wrapper)).toEqual(['Person 1'])
    })
  })

  it('updates when hidden is toggled on reactive data', async () => {
    const tree = reactive<FamilyNode[]>([{
      firstPerson: person(1),
      children: [{ firstPerson: person(2) }],
    }])
    const wrapper = mount(VueFamilyTree, { props: { tree } })
    const child = tree[0]!.children![0]!

    child.hidden = true
    await nextTick()
    expect(names(wrapper)).toEqual(['Person 1'])

    child.hidden = false
    await nextTick()
    expect(names(wrapper)).toEqual(['Person 1', 'Person 2'])
  })
})
