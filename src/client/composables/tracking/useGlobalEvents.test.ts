import { describe, expect, it, vi } from 'vitest'
import { useGlobalEvents } from './useGlobalEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

describe('useGlobalEvents', () => {
  it('pushes a page_view event', () => {
    const { trackPageView } = useGlobalEvents()

    trackPageView()

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith({ event: 'page_view' })
  })

  it('merges extra data into the page_view event', () => {
    const { trackPageView } = useGlobalEvents()

    trackPageView({ foo: 'bar' })

    expect(mocks.push).toHaveBeenCalledWith({
      event: 'page_view',
      foo: 'bar',
    })
  })
})
