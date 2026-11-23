import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMockOrder } from '@test/mock-data/orders'
import { useOrderEvents } from './useOrderEvents'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  consent: { value: true },
}))

const cmpPending = ref(false)

vi.mock('./useTracking', () => ({
  useTracking: () => ({ push: mocks.push }),
}))

vi.mock('@client/composables/useConsent', () => ({
  useConsent: () => ({ consent: mocks.consent }),
}))

vi.mock('@client/composables/useConsentManager', () => ({
  useConsentManager: () => ({ cmpPending }),
}))

// Session storage is where the once-per-order guard lives, so these tests need
// the DOM environment. Each call stands for one page load: it creates a new
// composable instance over the same storage, as a reload or a revisit does.
const loadOrderSuccessPage = (id: number) =>
  useOrderEvents().trackPurchase(createMockOrder({ id }))

describe('useOrderEvents purchase guard', () => {
  beforeEach(() => {
    mocks.consent.value = true
    cmpPending.value = false
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes the purchase of each order once per tab with consent', async () => {
    await loadOrderSuccessPage(10362)
    await loadOrderSuccessPage(10363)
    await loadOrderSuccessPage(10362)

    expect(mocks.push).toHaveBeenCalledTimes(2)
  })

  it('pushes every time and stores nothing without consent', async () => {
    mocks.consent.value = false

    await loadOrderSuccessPage(10362)
    await loadOrderSuccessPage(10362)

    expect(mocks.push).toHaveBeenCalledTimes(2)
    expect(sessionStorage).toHaveLength(0)
  })

  it('waits for the consent platform before deciding on a full page load', async () => {
    // The page mounts before Usercentrics reports, so consent reads false.
    mocks.consent.value = false
    cmpPending.value = true
    const firstLoad = loadOrderSuccessPage(10362)

    mocks.consent.value = true
    cmpPending.value = false
    await firstLoad
    await loadOrderSuccessPage(10362)

    expect(mocks.push).toHaveBeenCalledTimes(1)
  })

  it('pushes without storing when the consent platform never reports', async () => {
    vi.useFakeTimers()
    mocks.consent.value = false
    cmpPending.value = true

    const load = loadOrderSuccessPage(10362)
    await vi.runAllTimersAsync()
    await load

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(sessionStorage).toHaveLength(0)
  })
})
