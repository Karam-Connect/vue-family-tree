import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VueFamilyTree from '../VueFamilyTree.vue'
import { unionDates } from '../member'
import type { FamilyMember, FamilyNode, FamilyTreeConfig } from '../../types'

let id = 0
const p = (name: string): FamilyMember => ({ id: ++id, name })

const yusuf = (): FamilyNode => ({
  firstPerson: p('Yusuf'),
  secondPerson: p('Amira'),
  start: 1980,
  partners: [
    { person: p('Layla'), relationship: 'partners', start: 2001 },
    { person: p('Sara'), relationship: 'divorced', start: '1990-06-01', end: 1996 },
    { person: p('Mona'), relationship: 'separated', end: 2010 },
  ],
})

const unions = (tree: FamilyNode[], config: FamilyTreeConfig = {}) =>
  mount(VueFamilyTree, { props: { tree, config } }).findAll('.vue-family-tree__union').map(union => ({
    dates: union.find('.vue-family-tree__union-dates').exists() ? union.find('.vue-family-tree__union-dates').text() : '',
    title: union.find('.vue-family-tree__union-status').attributes('title'),
  }))

describe('relationships', () => {
  it('shows each union\'s dates and names its status', () => {
    expect(unions([yusuf()])).toEqual([
      { dates: 'm. 1980', title: 'Married' },
      { dates: '2001–', title: 'Partners' },
      { dates: 'm. 1990 · div. 1996', title: 'Divorced' },
      { dates: 'sep. 2010', title: 'Separated' },
    ])
  })

  it('translates the date prefixes and status names', () => {
    const labels = {
      married: 'verh.',
      divorced: (year: string) => `${year} geschieden`,
      relationships: { divorced: 'Geschieden' },
    }

    expect(unions([yusuf()], { labels })[2]).toEqual({ dates: 'verh. 1990 · 1996 geschieden', title: 'Geschieden' })
    // Unset names stay English
    expect(unions([yusuf()], { labels })[0]!.title).toBe('Married')
  })

  it('draws a couple with a status or dates like a chain, so the marks and dates fit', () => {
    const couple = (extra: Partial<FamilyNode>) =>
      mount(VueFamilyTree, { props: { tree: [{ firstPerson: p('A'), secondPerson: p('B'), ...extra }] } })

    expect(couple({}).find('.vue-family-tree__chain').exists()).toBe(false)
    expect(couple({ relationship: 'married' }).find('.vue-family-tree__chain').exists()).toBe(false)
    expect(couple({ relationship: 'divorced' }).find('.vue-family-tree__union_divorced').exists()).toBe(true)
    expect(couple({ start: 1970 }).find('.vue-family-tree__union-dates').text()).toBe('m. 1970')
  })

  it('draws unmarried partners dotted on a dashed tree, so they still stand out', () => {
    const style = (config: FamilyTreeConfig) =>
      (mount(VueFamilyTree, { props: { tree: [yusuf()], config } }).element as HTMLElement)
        .style.getPropertyValue('--_vft-partners-line-style')

    expect(style({ lines: { style: 'dashed' } })).toBe('dotted')
    expect(style({ lines: { style: 'dotted' } })).toBe('')
  })
})

describe('unionDates', () => {
  it('formats every status', () => {
    expect(unionDates({})).toBe('')
    expect(unionDates({ start: 1980 })).toBe('m. 1980')
    expect(unionDates({ start: 1980, end: 2010 })).toBe('m. 1980–2010')
    expect(unionDates({ end: 2010 })).toBe('m. ?–2010')
    expect(unionDates({ relationship: 'partners', start: 2001, end: 2005 })).toBe('2001–2005')
    expect(unionDates({ relationship: 'partners', end: 2005 })).toBe('?–2005')
    expect(unionDates({ relationship: 'separated', start: 1980, end: 1990 })).toBe('m. 1980 · sep. 1990')
    expect(unionDates({ relationship: 'divorced', start: 'c. 1980' })).toBe('m. ⁨c. 1980⁩')
  })
})
