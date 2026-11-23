import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GTM_LOAD_DEADLINE_MS,
  GTM_SCRIPT_ID,
  loadGtmWhenIdle,
  pushGtmStartEvent,
} from './gtmBootstrap'

afterEach(() => {
  delete window.dataLayer
  document.getElementById(GTM_SCRIPT_ID)?.remove()
  vi.useRealTimers()
})

describe('pushGtmStartEvent', () => {
  it('creates dataLayer and pushes the gtm.start marker', () => {
    pushGtmStartEvent(1_700_000_000_000)

    expect(window.dataLayer).toEqual([
      { 'gtm.start': 1_700_000_000_000, event: 'gtm.js' },
    ])
  })

  it('appends to an existing dataLayer without resetting it', () => {
    window.dataLayer = [{ event: 'already-there' }]

    pushGtmStartEvent(42)

    expect(window.dataLayer).toEqual([
      { event: 'already-there' },
      { 'gtm.start': 42, event: 'gtm.js' },
    ])
  })
})

describe('loadGtmWhenIdle', () => {
  const stubIdleCallback = () => {
    const requestIdleCallback = vi.fn<typeof window.requestIdleCallback>()
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)
    return requestIdleCallback
  }

  it('adds no script before the browser is idle', () => {
    stubIdleCallback()

    loadGtmWhenIdle('GTM-TEST')

    expect(document.getElementById(GTM_SCRIPT_ID)).toBeNull()
  })

  it('caps the idle wait at the load deadline', () => {
    const requestIdleCallback = stubIdleCallback()

    loadGtmWhenIdle('GTM-TEST')

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: GTM_LOAD_DEADLINE_MS,
    })
  })

  it('appends an async container script to the head once idle', () => {
    const requestIdleCallback = stubIdleCallback()

    loadGtmWhenIdle('GTM-TEST')
    requestIdleCallback.mock.calls[0]![0]({} as IdleDeadline)

    const script = document.getElementById(GTM_SCRIPT_ID) as HTMLScriptElement
    expect(script.parentElement).toBe(document.head)
    expect(script.async).toBe(true)
    expect(script.getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-TEST',
    )
  })

  it('adds the container script once when called twice', () => {
    const requestIdleCallback = stubIdleCallback()

    loadGtmWhenIdle('GTM-TEST')
    loadGtmWhenIdle('GTM-TEST')
    for (const [callback] of requestIdleCallback.mock.calls) {
      callback({} as IdleDeadline)
    }

    expect(document.querySelectorAll(`#${GTM_SCRIPT_ID}`)).toHaveLength(1)
  })

  it('loads at the deadline without requestIdleCallback', () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)

    loadGtmWhenIdle('GTM-TEST')
    vi.advanceTimersByTime(GTM_LOAD_DEADLINE_MS - 1)
    expect(document.getElementById(GTM_SCRIPT_ID)).toBeNull()
    vi.advanceTimersByTime(1)

    expect(document.getElementById(GTM_SCRIPT_ID)).not.toBeNull()
  })
})
