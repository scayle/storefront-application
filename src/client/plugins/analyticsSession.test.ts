import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOUR_MS, MINUTE_MS } from '@client/utils/time'
import {
  captureAnalyticsSessionStart,
  initAnalyticsSession,
  readAnalyticsSession,
  removeStoredAnalyticsSession,
  touchAnalyticsSession,
} from './analyticsSession'

const STORAGE_KEY = 'scayle-analytics-session'
const ORIGIN = 'https://shop.example'

let stored: Map<string, string>
let windowStub: EventTarget

const storedSession = () => JSON.parse(stored.get(STORAGE_KEY) ?? 'null')

const init = (path = '/de', referrer = '') =>
  initAnalyticsSession({ href: `${ORIGIN}${path}`, origin: ORIGIN }, referrer)

describe('analyticsSession', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-24T12:00:00Z'))
    stored = new Map()
    windowStub = Object.assign(new EventTarget(), {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
        removeItem: (key: string) => stored.delete(key),
      },
    })
    vi.stubGlobal('window', windowStub)
    let uuid = 0
    vi.stubGlobal('crypto', { randomUUID: () => `session-${++uuid}` })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts the page load session in memory and stores it on the first touch', () => {
    init('/de?utm_source=first&gclid=abc')

    // Before consent: readable, not stored.
    expect(readAnalyticsSession()).toEqual({
      id: 'session-1',
      lastEventAt: Date.now(),
      start: expect.objectContaining({
        landing_page_path: '/de',
        utm_source: 'first',
      }),
    })
    expect(stored.size).toBe(0)

    const session = touchAnalyticsSession('/de/c/shoes')

    expect(session).toMatchObject({
      id: 'session-1',
      start: {
        landing_page_path: '/de',
        utm_source: 'first',
      },
    })
    expect(storedSession()).toEqual(session)
  })

  it('keeps a stored session and its attribution for less than an hour after its last event', () => {
    // Written by another tab, or by the previous page load.
    stored.set(
      STORAGE_KEY,
      JSON.stringify({
        id: 'stored',
        lastEventAt: Date.now() - 59 * MINUTE_MS,
        start: { landing_page_path: '/de', utm_source: 'first' },
      }),
    )
    init('/de/c/shoes?utm_source=second')

    expect(touchAnalyticsSession('/de/c/shoes')).toEqual({
      id: 'stored',
      lastEventAt: Date.now(),
      start: { landing_page_path: '/de', utm_source: 'first' },
    })
  })

  it('starts the page load session over a stored session an hour old', () => {
    stored.set(
      STORAGE_KEY,
      JSON.stringify({
        id: 'stored',
        lastEventAt: Date.now() - HOUR_MS,
        start: { landing_page_path: '/de' },
      }),
    )
    init('/de/c/shoes')

    expect(touchAnalyticsSession('/de/c/shoes')).toMatchObject({
      id: 'session-1',
      start: { landing_page_path: '/de/c/shoes' },
    })
  })

  it('starts a clean session on the current page an hour after the last event', () => {
    init('/de?utm_source=first')
    touchAnalyticsSession('/de')
    vi.setSystemTime(Date.now() + HOUR_MS)

    expect(readAnalyticsSession()).toBeUndefined()
    // Reading moves nothing: the expired entry is still the stored one.
    expect(storedSession()).toMatchObject({ id: 'session-1' })

    expect(touchAnalyticsSession('/de/c/shoes')).toEqual({
      id: 'session-2',
      lastEventAt: Date.now(),
      start: { landing_page_path: '/de/c/shoes' },
    })
  })

  it('starts a clean session on the current page when nothing went out for an hour after the page load', () => {
    // Say the consent manager was still loading all that time.
    init('/de?utm_source=first', 'https://www.google.com/')
    vi.setSystemTime(Date.now() + HOUR_MS)

    expect(touchAnalyticsSession('/de/c/shoes')).toEqual({
      id: 'session-2',
      lastEventAt: Date.now(),
      start: { landing_page_path: '/de/c/shoes' },
    })
  })

  it('ends the session when its stored entry runs out, whatever the in-memory copy says', () => {
    init()
    touchAnalyticsSession('/de')
    const session = storedSession()
    session.lastEventAt -= HOUR_MS
    stored.set(STORAGE_KEY, JSON.stringify(session))

    expect(readAnalyticsSession()).toBeUndefined()
  })

  it('keeps the session in memory for the page load where the browser blocks storage', () => {
    vi.stubGlobal(
      'window',
      Object.defineProperty(new EventTarget(), 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        },
      }),
    )
    init()

    const first = touchAnalyticsSession('/de')
    vi.setSystemTime(Date.now() + 30 * MINUTE_MS)
    const second = touchAnalyticsSession('/de/c/shoes')

    expect(second.id).toBe(first.id)
    expect(second.start).toMatchObject({ landing_page_path: '/de' })
  })

  it('keeps one session for the page load when the first write fails on a full quota', () => {
    init()
    Object.assign(windowStub, {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: () => {
          throw new DOMException('Quota exceeded.', 'QuotaExceededError')
        },
        removeItem: (key: string) => stored.delete(key),
      },
    })

    const first = touchAnalyticsSession('/de')
    // Past the hour since the page load, within the hour of each send.
    vi.setSystemTime(Date.now() + 45 * MINUTE_MS)
    touchAnalyticsSession('/de')
    vi.setSystemTime(Date.now() + 45 * MINUTE_MS)

    expect(touchAnalyticsSession('/de').id).toBe(first.id)
  })

  it.each([
    ['a string id', { start: { landing_page_path: '/de' } }],
    ['a start object', { id: 'stored' }],
  ])('replaces a stored entry without %s', (_, entry) => {
    stored.set(
      STORAGE_KEY,
      JSON.stringify({ ...entry, lastEventAt: Date.now() }),
    )
    init()

    expect(touchAnalyticsSession('/de').id).toBe('session-1')
    expect(storedSession()).toMatchObject({ id: 'session-1' })
  })

  it('does not write back a session another tab removed', () => {
    init()
    touchAnalyticsSession('/de')

    stored.delete(STORAGE_KEY)
    windowStub.dispatchEvent(
      Object.assign(new Event('storage'), {
        key: STORAGE_KEY,
        newValue: null,
      }),
    )

    expect(readAnalyticsSession()).toBeUndefined()
    expect(touchAnalyticsSession('/de/c/shoes')).toEqual({
      id: 'session-2',
      lastEventAt: Date.now(),
      start: { landing_page_path: '/de/c/shoes' },
    })
  })

  it('keeps its session when another tab writes an entry it cannot use', () => {
    init()
    const session = touchAnalyticsSession('/de')

    // A valid write would read the same without the in-memory copy, since
    // the stored entry wins. Only an unusable one shows the copy survived.
    const written = JSON.stringify({ id: 'other', lastEventAt: Date.now() })
    stored.set(STORAGE_KEY, written)
    windowStub.dispatchEvent(
      Object.assign(new Event('storage'), {
        key: STORAGE_KEY,
        newValue: written,
      }),
    )

    expect(readAnalyticsSession()).toEqual(session)
  })

  it('removes the stored session and keeps the page load session in memory', () => {
    init()
    const session = touchAnalyticsSession('/de')

    removeStoredAnalyticsSession()

    expect(stored.has(STORAGE_KEY)).toBe(false)
    expect(readAnalyticsSession()).toEqual(session)
  })
})

describe('captureAnalyticsSessionStart', () => {
  const location = (href: string) => ({ href, origin: ORIGIN })

  it('leaves every field unset for a plain direct entry', () => {
    expect(captureAnalyticsSessionStart(location(`${ORIGIN}/de`), '')).toEqual({
      landing_page_path: '/de',
      utm_content: undefined,
      utm_medium: undefined,
      utm_source: undefined,
      utm_campaign: undefined,
      referrer: undefined,
    })
  })

  it('keeps the landing path and utm values, without the landing query, and cuts the referrer at its query', () => {
    const start = captureAnalyticsSessionStart(
      location(
        `${ORIGIN}/signin?hash=secret&utm_source=newsletter&gclid=abc#access_token=x`,
      ),
      'https://partner.example/a?token=secret&utm_medium=cpc#top',
    )

    expect(start).toEqual({
      landing_page_path: '/signin',
      utm_content: undefined,
      utm_medium: undefined,
      utm_source: 'newsletter',
      utm_campaign: undefined,
      referrer: 'https://partner.example/a',
    })
  })

  it('keeps an app referrer that has an opaque origin', () => {
    expect(
      captureAnalyticsSessionStart(
        location(`${ORIGIN}/de`),
        'android-app://com.google.android.gm/',
      ).referrer,
    ).toBe('android-app://com.google.android.gm/')
  })

  it.each([
    ['is not a URL', 'not a url'],
    ['is on the same origin', `${ORIGIN}/signin?hash=secret`],
  ])('leaves the referrer unset when it %s', (_name, referrer) => {
    expect(
      captureAnalyticsSessionStart(location(`${ORIGIN}/de`), referrer).referrer,
    ).toBeUndefined()
  })
})
