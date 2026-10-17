import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VueFamilyTree from '../VueFamilyTree.vue'
import type { FamilyNode, FamilyTreeConfig, GestureHandling } from '../../types'

const tree: FamilyNode[] = [{ firstPerson: { id: '1', name: 'John' } }]

const mountTree = (gestures: GestureHandling, config: FamilyTreeConfig = {}) =>
  mount(VueFamilyTree, { props: { tree, config: { gestures, ...config } }, attachTo: document.body })

// A point's optional third item is the element the finger started on (default: el, i.e. inside the tree)
type TouchPoint = [number, number] | [number, number, Element]

const touch = (el: Element, type: string, points: TouchPoint[]) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: points.map(([x, y, target = el]) => ({ clientX: x, clientY: y, target })),
  })
  el.dispatchEvent(event)
  return event
}

const wheel = (el: Element, init: WheelEventInit) => {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  el.dispatchEvent(event)
  return event
}

const transformOf = (wrapper: ReturnType<typeof mountTree>) =>
  (wrapper.element.firstElementChild as HTMLElement).style.transform

const style = (wrapper: ReturnType<typeof mountTree>) => (wrapper.element as HTMLElement).style

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('gesture-handling: cooperative', () => {
  it('lets one finger scroll the page and shows the two-finger hint', async () => {
    const wrapper = mountTree('cooperative')
    const before = transformOf(wrapper)

    touch(wrapper.element, 'touchstart', [[100, 100]])
    const move = touch(wrapper.element, 'touchmove', [[100, 50]])
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(false)
    expect(transformOf(wrapper)).toBe(before)
    expect(wrapper.find('.vue-family-tree__hint').text()).toBe('Use two fingers to move the tree')
    expect(style(wrapper).touchAction).toBe('pan-x pan-y')
  })

  it('hides the hint after a delay', async () => {
    vi.useFakeTimers()
    const wrapper = mountTree('cooperative')

    touch(wrapper.element, 'touchstart', [[100, 100]])
    touch(wrapper.element, 'touchmove', [[100, 50]])
    await vi.advanceTimersByTimeAsync(1600)

    expect(wrapper.find('.vue-family-tree__hint').exists()).toBe(false)
  })

  it('pans with two fingers and blocks the page from scrolling', async () => {
    const wrapper = mountTree('cooperative')

    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    const move = touch(wrapper.element, 'touchmove', [[130, 140], [230, 140]])
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(true)
    expect(transformOf(wrapper)).toBe('translate(30px, 40px) scale(1)')
    expect(wrapper.emitted('dragstart')).toHaveLength(1)
  })

  it('pinch zooms around the midpoint between the fingers', async () => {
    const wrapper = mountTree('cooperative')

    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    touch(wrapper.element, 'touchmove', [[50, 100], [250, 100]])
    await wrapper.vm.$nextTick()

    // distance 100 -> 200 doubles the scale; midpoint (150, 100) stays fixed
    expect(transformOf(wrapper)).toBe('translate(-150px, -100px) scale(2)')
    expect(wrapper.emitted('zoom')?.[0]).toEqual([2])
  })

  it('does not jump when one finger lifts mid-gesture', async () => {
    const wrapper = mountTree('greedy')

    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    touch(wrapper.element, 'touchend', [[200, 100]])
    touch(wrapper.element, 'touchmove', [[210, 100]])
    await wrapper.vm.$nextTick()

    expect(transformOf(wrapper)).toBe('translate(10px, 0px) scale(1)')
  })

  it('scrolls the page on plain wheel and shows the zoom hint', async () => {
    const wrapper = mountTree('cooperative')

    const event = wheel(wrapper.element, { deltaY: 100 })
    await wrapper.vm.$nextTick()

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.emitted('zoom')).toBeUndefined()
    expect(wrapper.find('.vue-family-tree__hint').text()).toMatch(/\+ scroll to zoom/)
  })

  it('zooms on ctrl + wheel (and trackpad pinch)', async () => {
    const wrapper = mountTree('cooperative')

    const event = wheel(wrapper.element, { deltaY: -100, ctrlKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.emitted('zoom')?.[0][0]).toBeGreaterThan(1)
  })

  it('suppresses card-click right after a two-finger pan', async () => {
    const wrapper = mountTree('cooperative')

    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    touch(wrapper.element, 'touchmove', [[130, 100], [230, 100]])
    touch(wrapper.element, 'touchend', [])
    await wrapper.find('.vue-family-card').trigger('click')

    expect(wrapper.emitted('card-click')).toBeUndefined()
  })
})

describe('gesture-handling: greedy', () => {
  it('pans with one finger', async () => {
    const wrapper = mountTree('greedy')

    touch(wrapper.element, 'touchstart', [[100, 100]])
    const move = touch(wrapper.element, 'touchmove', [[120, 90]])
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(true)
    expect(transformOf(wrapper)).toBe('translate(20px, -10px) scale(1)')
    expect(style(wrapper).touchAction).toBe('none')
  })

  it('zooms on plain wheel, clamped to zoom.max', async () => {
    const wrapper = mountTree('greedy', { zoom: { max: 1.5 } })

    wheel(wrapper.element, { deltaY: -5000 })

    expect(wrapper.emitted('zoom')?.[0]).toEqual([1.5])
  })
})

describe('gesture-handling: none', () => {
  it('ignores touch and wheel gestures', async () => {
    const wrapper = mountTree('none')
    const before = transformOf(wrapper)

    touch(wrapper.element, 'touchstart', [[100, 100]])
    const move = touch(wrapper.element, 'touchmove', [[150, 150]])
    const event = wheel(wrapper.element, { deltaY: -100, ctrlKey: true })
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(transformOf(wrapper)).toBe(before)
    expect(style(wrapper).touchAction).toBe('')
  })
})

describe('gesture-handling: auto', () => {
  afterEach(() => {
    delete (document.documentElement as any).scrollHeight
  })

  it('is greedy when the page does not scroll', async () => {
    const wrapper = mountTree('auto')
    await wrapper.vm.$nextTick()

    expect(style(wrapper).touchAction).toBe('none')
  })

  it('is cooperative when the page scrolls', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true })
    const wrapper = mountTree('auto')
    await wrapper.vm.$nextTick()

    expect(style(wrapper).touchAction).toBe('pan-x pan-y')
  })
})

describe('zoom methods', () => {
  it('zoomIn / zoomOut step around the wrapper center', async () => {
    const wrapper = mountTree('greedy', { zoom: { step: 0.5 } })
    const vm = wrapper.vm as unknown as { zoomIn: () => void; zoomOut: () => void }

    vm.zoomIn()
    vm.zoomOut()

    expect(wrapper.emitted('zoom')).toEqual([[1.5], [1]])
  })
})

// Regression tests for the Copilot review on PR #1
describe('gesture lifecycle', () => {
  const clickCard = (wrapper: ReturnType<typeof mountTree>) =>
    wrapper.find('.vue-family-card').trigger('click')

  it('keeps clicks suppressed when a new pan starts before the previous release timer fires', async () => {
    vi.useFakeTimers()
    const wrapper = mountTree('greedy')

    touch(wrapper.element, 'touchstart', [[100, 100]])
    touch(wrapper.element, 'touchmove', [[120, 100]])
    touch(wrapper.element, 'touchend', [])
    await vi.advanceTimersByTimeAsync(100)
    touch(wrapper.element, 'touchstart', [[100, 100]])
    touch(wrapper.element, 'touchmove', [[120, 100]])
    // The first pan's release timer would fire here
    await vi.advanceTimersByTimeAsync(100)
    await clickCard(wrapper)

    expect(wrapper.emitted('card-click')).toBeUndefined()
  })

  it('pinch zooms around the starting midpoint and follows it as it moves', async () => {
    const wrapper = mountTree('cooperative')

    // midpoint (150, 100) -> (160, 120), distance 100 -> 200
    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    touch(wrapper.element, 'touchmove', [[60, 120], [260, 120]])
    await wrapper.vm.$nextTick()

    // The content point under (150, 100) at scale 1 is now under (160, 120) at scale 2
    expect(transformOf(wrapper)).toBe('translate(-140px, -80px) scale(2)')
  })

  it('ignores fingers that started outside the tree', async () => {
    const outside = document.body.appendChild(document.createElement('div'))
    const wrapper = mountTree('cooperative')

    // One finger on the tree, one outside: not a two-finger gesture on the tree
    touch(wrapper.element, 'touchstart', [[100, 100], [400, 400, outside]])
    const move = touch(wrapper.element, 'touchmove', [[120, 100], [420, 400, outside]])
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(false)
    expect(transformOf(wrapper)).toBe('translate(0px, 0px) scale(1)')
  })

  it('ends the pan when the last tree finger lifts, even if a finger outside is still down', async () => {
    vi.useFakeTimers()
    const outside = document.body.appendChild(document.createElement('div'))
    const wrapper = mountTree('greedy')

    touch(wrapper.element, 'touchstart', [[100, 100]])
    touch(wrapper.element, 'touchmove', [[120, 100]])
    touch(wrapper.element, 'touchend', [[400, 400, outside]])
    await vi.advanceTimersByTimeAsync(200)
    await clickCard(wrapper)

    expect(wrapper.emitted('dragend')).toHaveLength(1)
    expect(wrapper.emitted('card-click')).toHaveLength(1)
  })

  it('cannot pan in `none` mode by lifting and replacing a finger', async () => {
    const wrapper = mountTree('none')

    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    touch(wrapper.element, 'touchend', [[200, 100]])
    touch(wrapper.element, 'touchstart', [[100, 100], [200, 100]])
    const move = touch(wrapper.element, 'touchmove', [[150, 150], [250, 150]])
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(false)
    expect(transformOf(wrapper)).toBe('translate(0px, 0px) scale(1)')
  })

  it('stops an active touch pan when gestures are switched to `none`', async () => {
    const wrapper = mountTree('greedy')

    touch(wrapper.element, 'touchstart', [[100, 100]])
    touch(wrapper.element, 'touchmove', [[120, 100]])
    await wrapper.setProps({ config: { gestures: 'none' } })
    const move = touch(wrapper.element, 'touchmove', [[200, 100]])
    await wrapper.vm.$nextTick()

    expect(move.defaultPrevented).toBe(false)
    expect(transformOf(wrapper)).toBe('translate(20px, 0px) scale(1)')
    expect(wrapper.emitted('dragend')).toHaveLength(1)
  })

  it('releases click suppression when enable-drag is turned off mid-pan', async () => {
    vi.useFakeTimers()
    const wrapper = mountTree('greedy')

    touch(wrapper.element, 'touchstart', [[100, 100]])
    touch(wrapper.element, 'touchmove', [[120, 100]])
    await wrapper.setProps({ config: { gestures: 'greedy', drag: { enabled: false } } })
    touch(wrapper.element, 'touchend', [])
    await vi.advanceTimersByTimeAsync(200)
    await clickCard(wrapper)

    expect(wrapper.emitted('card-click')).toHaveLength(1)
  })
})

describe('zoom bounds', () => {
  type ZoomVm = { setZoom: (scale: number) => void; zoomIn: () => void }
  const SCALE_PATTERN = /^translate\(-?[\d.]+px, -?[\d.]+px\) scale\(([\d.]+)\)$/

  // jsdom drops an invalid (NaN) transform and keeps the old value, so assert on emitted scales too
  it('never reaches scale 0 with zoom.min = 0, and keeps a valid transform afterwards', async () => {
    const wrapper = mountTree('greedy', { zoom: { min: 0 } })
    const vm = wrapper.vm as unknown as ZoomVm

    vm.setZoom(0)
    vm.zoomIn()
    vm.setZoom(2)
    await wrapper.vm.$nextTick()

    const scales = (wrapper.emitted('zoom') ?? []).map(([s]) => s as number)
    expect(scales.every(s => s > 0), String(scales)).toBe(true)
    expect(transformOf(wrapper)).toMatch(SCALE_PATTERN)
    expect(transformOf(wrapper)).toMatch(/scale\(2\)$/)
  })

  it('ignores NaN zoom requests', async () => {
    const wrapper = mountTree('greedy')

    ;(wrapper.vm as unknown as ZoomVm).setZoom(NaN)
    await wrapper.vm.$nextTick()

    expect(transformOf(wrapper)).toBe('translate(0px, 0px) scale(1)')
    expect(wrapper.emitted('zoom')).toBeUndefined()
  })
})
