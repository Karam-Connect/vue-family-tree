import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import VueFamilyTree from '../VueFamilyTree.vue'
import type { FamilyMember, FamilyNode, FamilyTreeConfig } from '../../types'

let id = 0
const p = (name: string, extra: Partial<FamilyMember> = {}): FamilyMember => ({ id: ++id, name, ...extra })
const kids = (...names: string[]): FamilyNode[] => names.map(name => ({ firstPerson: p(name) }))

const yusuf = (): FamilyNode => ({
  firstPerson: p('Yusuf'),
  secondPerson: p('Amira'),
  children: kids('Omar', 'Huda'),
  partners: [
    { person: p('Layla'), children: kids('Samir') },
    { person: p('Sara'), relationship: 'divorced', children: kids('Rami', 'Nour') },
  ],
})

type Wrapper = ReturnType<typeof mount>

const nameOf = (person: { find: Wrapper['find'] }) =>
  person.find('.vue-family-card__name bdi').element.lastChild!.textContent

// The chain as [person, ...unions], each union with its partner (or "?" for unknown) and children
const chain = (wrapper: Wrapper) => {
  const root = wrapper.find('.vue-family-tree__chain')
  return {
    person: nameOf(root.find('.vue-family-tree__chain-start')),
    unions: root.findAll(':scope > .vue-family-tree__unions > .vue-family-tree__union').map(union => {
      const partner = union.find(':scope > .vue-family-tree__person')
      return {
        partner: partner.classes().includes('vue-family-tree__person_unknown') ? '?' : nameOf(partner),
        relationship: union.classes().find(c => c.startsWith('vue-family-tree__union_'))!.replace('vue-family-tree__union_', ''),
        children: union.findAll(':scope > .vue-family-tree__union-children .vue-family-tree__person').map(nameOf),
      }
    }),
  }
}

const mountTree = (tree: FamilyNode[], config: FamilyTreeConfig = {}) =>
  mount(VueFamilyTree, { props: { tree, config } })

describe('partners', () => {
  it('draws the person, then one union per partner in order, each with its own children', () => {
    expect(chain(mountTree([yusuf()]))).toEqual({
      person: 'Yusuf',
      unions: [
        { partner: 'Amira', relationship: 'married', children: ['Omar', 'Huda'] },
        { partner: 'Layla', relationship: 'married', children: ['Samir'] },
        { partner: 'Sara', relationship: 'divorced', children: ['Rami', 'Nour'] },
      ],
    })
  })

  it('takes the first union\'s status from `relationship` on the node', () => {
    const node = { ...yusuf(), relationship: 'partners' as const }

    expect(chain(mountTree([node])).unions[0]!.relationship).toBe('partners')
  })

  it('gives children without a recorded partner an unknown, inert partner placeholder', () => {
    const tree: FamilyNode[] = [{ firstPerson: p('Ali'), children: kids('a1'), partners: [{ person: p('Noor') }] }]
    const wrapper = mountTree(tree)

    expect(chain(wrapper).unions.map(u => [u.partner, u.children])).toEqual([['?', ['a1']], ['Noor', []]])
    expect(wrapper.find('.vue-family-tree__person_unknown .vue-family-tree__card').attributes()).toHaveProperty('inert')
  })

  it('keeps nodes without `partners` in the classic layout', () => {
    const wrapper = mountTree([{ firstPerson: p('A'), secondPerson: p('B'), children: kids('C') }])

    expect(wrapper.find('.vue-family-tree__chain').exists()).toBe(false)
    expect(wrapper.find('.vue-family-tree__parents_couple').exists()).toBe(true)
  })

  it('draws a chain inside a union\'s children', () => {
    const tree: FamilyNode[] = [{ firstPerson: p('Hana'), partners: [{ person: p('Karim'), children: [yusuf()] }] }]
    const wrapper = mountTree(tree)

    expect(wrapper.findAll('.vue-family-tree__chain')).toHaveLength(2)
    expect(nameOf(wrapper.findAll('.vue-family-tree__chain-start')[1]!)).toBe('Yusuf')
  })

  describe('hiding', () => {
    it('hides a hidden partnership with its children', () => {
      const node = yusuf()
      node.partners![0]!.hidden = true

      expect(chain(mountTree([node])).unions.map(u => u.partner)).toEqual(['Amira', 'Sara'])
    })

    it('hides the children of a hidden partner, so it stays clear whose they are', () => {
      const node = yusuf()
      node.partners![1]!.person.hidden = true

      expect(chain(mountTree([node])).unions.map(u => u.partner)).toEqual(['Amira', 'Layla'])
      expect(mountTree([node]).text()).not.toContain('Rami')
    })

    it("keeps a 'card' placeholder partner's union and children", () => {
      const wrapper = mountTree([yusuf()], { filter: person => (person.name === 'Sara' ? 'card' : true) })
      const sara = wrapper.findAll('.vue-family-tree__union')[2]!

      expect(sara.find(':scope > .vue-family-tree__person').classes()).toContain('vue-family-tree__person_filtered')
      expect(chain(wrapper).unions[2]!.children).toEqual(['Rami', 'Nour'])
    })

    it('hides the whole chain when its first person is hidden', () => {
      const node = yusuf()
      node.firstPerson!.hidden = true

      expect(mountTree([node]).find('.vue-family-tree__person').exists()).toBe(false)
    })

    it('hides separated and divorced partners with their children when `showFormer` is off', () => {
      const node = yusuf()
      node.partners!.push({ person: p('Mona'), relationship: 'separated' })
      const shown = (config: FamilyTreeConfig) => chain(mountTree([node], config)).unions.map(u => u.partner)

      expect(shown({})).toEqual(['Amira', 'Layla', 'Sara', 'Mona'])
      expect(shown({ partners: { showFormer: false } })).toEqual(['Amira', 'Layla'])
      expect(mountTree([node], { partners: { showFormer: false } }).text()).not.toContain('Rami')
    })

    it('hides a former `secondPerson` with `showFormer` off, keeping the person', () => {
      const node: FamilyNode = { firstPerson: p('A'), secondPerson: p('B'), relationship: 'divorced', children: kids('C') }
      const wrapper = mountTree([node], { partners: { showFormer: false } })

      expect(wrapper.findAll('.vue-family-tree__person').map(nameOf)).toEqual(['A'])
    })

    it('updates when `showFormer` changes', async () => {
      const config = reactive<FamilyTreeConfig>({ partners: { showFormer: false } })
      const wrapper = mountTree([yusuf()], config)

      config.partners!.showFormer = true
      await wrapper.vm.$nextTick()
      expect(chain(wrapper).unions.map(u => u.partner)).toEqual(['Amira', 'Layla', 'Sara'])
    })

    it('updates when a partnership is toggled on reactive data', async () => {
      const tree = reactive([yusuf()])
      const wrapper = mountTree(tree)

      tree[0]!.partners![0]!.hidden = true
      await wrapper.vm.$nextTick()
      expect(chain(wrapper).unions.map(u => u.partner)).toEqual(['Amira', 'Sara'])
    })
  })

  it('emits card-click for partners and their children', async () => {
    const wrapper = mountTree([yusuf()])

    await wrapper.findAll('.vue-family-tree__union')[1]!.find('.vue-family-card').trigger('click')
    await wrapper.findAll('.vue-family-tree__union')[1]!.find('.vue-family-tree__union-children .vue-family-card').trigger('click')

    expect(wrapper.emitted('card-click')!.map(([member]) => (member as FamilyMember).name)).toEqual(['Layla', 'Samir'])
  })

  it('passes partners and unknown-partner stand-ins through the card slot', () => {
    const tree: FamilyNode[] = [{ firstPerson: p('Ali'), children: kids('a1'), partners: [{ person: p('Noor') }] }]
    const wrapper = mount(VueFamilyTree, {
      props: { tree },
      slots: { card: '<template #card="{ item }"><i class="mine">{{ item.name }}</i></template>' },
    })

    // Ali, the unknown stand-in (sized from Ali's card), a1, Noor
    expect(wrapper.findAll('.mine').map(el => el.text())).toEqual(['Ali', 'Ali', 'a1', 'Noor'])
  })
})
