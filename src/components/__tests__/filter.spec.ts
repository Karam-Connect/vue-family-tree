import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import VueFamilyTree, { isDeceased } from '../../index'
import type { FamilyMember, FamilyNode, FamilyTreeConfig } from '../../types'

const person = (id: number, extra: Partial<FamilyMember> = {}) => ({ id, name: `Person ${id}`, ...extra })

// Grandpa (deceased) and Grandma; their son Gleb (deceased) married to Vika; Gleb's children
const tree: FamilyNode[] = [{
  firstPerson: person(1, { died: 1990 }),
  secondPerson: person(2),
  children: [{
    firstPerson: person(3, { deceased: true }),
    secondPerson: person(4),
    children: [{ firstPerson: person(5) }, { firstPerson: person(6) }],
  }],
}]

const mountWith = (config: FamilyTreeConfig) => mount(VueFamilyTree, { props: { tree, config } })

// Every person slot in render order, with its state
const slots = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('.vue-family-tree__person').map(el => {
  const name = el.find('.vue-family-card__name bdi').element.lastChild!.textContent
  return el.classes().includes('vue-family-tree__person_filtered') ? `(${name})` : name
})

describe('config.filter', () => {
  it("'card' leaves a placeholder and keeps partners and descendants", () => {
    const wrapper = mountWith({ filter: p => (isDeceased(p) ? 'card' : true) })

    expect(slots(wrapper)).toEqual(['(Person 1)', 'Person 2', '(Person 3)', 'Person 4', 'Person 5', 'Person 6'])
    // Still a couple, so Vika stays Gleb's partner rather than becoming Grandpa's child
    expect(wrapper.findAll('.vue-family-tree__parents_couple')).toHaveLength(2)
  })

  it("drops a 'card' person who holds nothing in place (no partner, no children)", () => {
    const leaves: FamilyNode[] = [{
      firstPerson: person(1),
      children: [
        { firstPerson: person(2, { deceased: true }) },
        { firstPerson: person(3, { deceased: true }), children: [{ firstPerson: person(4) }] },
      ],
    }]
    const wrapper = mount(VueFamilyTree, {
      props: { tree: leaves, config: { filter: p => (isDeceased(p) ? 'card' : true) } },
    })

    // Person 2 is gone; Person 3 stays as a placeholder because Person 4 hangs from them
    expect(slots(wrapper)).toEqual(['Person 1', '(Person 3)', 'Person 4'])
  })

  it('makes placeholders inert, so they take no clicks and are skipped by screen readers', async () => {
    const wrapper = mountWith({ filter: p => (isDeceased(p) ? 'card' : true) })
    const placeholder = wrapper.find('.vue-family-tree__person_filtered .vue-family-tree__card')

    expect(placeholder.attributes()).toHaveProperty('inert')
    expect(wrapper.find('.vue-family-tree__person:not(.vue-family-tree__person_filtered) .vue-family-tree__card')
      .attributes()).not.toHaveProperty('inert')
  })

  it('false hides a person like `hidden`, with their branch once nobody in the node is left', () => {
    const partnerOnly = mountWith({ filter: p => p.id !== 4 })
    expect(slots(partnerOnly)).toEqual(['Person 1', 'Person 2', 'Person 3', 'Person 5', 'Person 6'])

    const wholeNode = mountWith({ filter: p => p.id !== 3 && p.id !== 4 })
    expect(slots(wholeNode)).toEqual(['Person 1', 'Person 2'])
  })

  it('applies on top of `hidden`: a filter can hide more, never bring back a hidden person', () => {
    const hiddenTree: FamilyNode[] = [{ firstPerson: person(1, { hidden: true }), secondPerson: person(2) }]
    const wrapper = mount(VueFamilyTree, { props: { tree: hiddenTree, config: { filter: () => true } } })

    expect(slots(wrapper)).toEqual(['Person 2'])
  })

  it('updates when the filter changes', async () => {
    const config = reactive<FamilyTreeConfig>({})
    const wrapper = mount(VueFamilyTree, { props: { tree, config } })
    expect(wrapper.findAll('.vue-family-tree__person_filtered')).toHaveLength(0)

    config.filter = p => (isDeceased(p) ? 'card' : true)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.vue-family-tree__person_filtered')).toHaveLength(2)

    config.filter = undefined
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.vue-family-tree__person_filtered')).toHaveLength(0)
  })
})
