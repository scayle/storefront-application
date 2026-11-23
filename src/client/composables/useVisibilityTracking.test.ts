import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useVisibilityTracking } from './useVisibilityTracking'

const observer = vi.hoisted(() => ({
  target: undefined as unknown,
  callback: null as null | ((entries: { isIntersecting: boolean }[]) => void),
}))

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useIntersectionObserver: (
      target: unknown,
      callback: (entries: { isIntersecting: boolean }[]) => void,
    ) => {
      observer.target = target
      observer.callback = callback
      return { stop: vi.fn() }
    },
  }
})

beforeEach(() => {
  observer.target = undefined
  observer.callback = null
})

describe('useVisibilityTracking', () => {
  it('reports true on viewport entry and false on exit', () => {
    const onChange = vi.fn()
    useVisibilityTracking(null, onChange)

    observer.callback?.([{ isIntersecting: true }])
    observer.callback?.([{ isIntersecting: false }])

    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('reports false when the observer yields no entry', () => {
    const onChange = vi.fn()
    useVisibilityTracking(null, onChange)

    observer.callback?.([])

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does not observe a target that resolves to a non-element node', () => {
    // A multi-root component such as `SFLink` exposes a comment placeholder as
    // its `$el` (nodeType 8). `IntersectionObserver.observe` rejects non-elements.
    const commentLike = shallowRef({ nodeType: 8 } as unknown as HTMLElement)
    useVisibilityTracking(commentLike, vi.fn())

    expect(
      toValue(observer.target as MaybeRefOrGetter<unknown>),
    ).toBeUndefined()
  })

  it('observes a target that resolves to an element', () => {
    const element = { nodeType: 1 } as unknown as HTMLElement
    useVisibilityTracking(shallowRef(element), vi.fn())

    expect(toValue(observer.target as MaybeRefOrGetter<unknown>)).toBe(element)
  })
})
