import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnnouncer } from './useAnnouncer'

describe('useAnnouncer', () => {
  const { announce, clear, politeMessages, assertiveMessages } = useAnnouncer()

  // The `client` test project runs in a node (SSR) env; announce is SSR-inert,
  // so force the client branch. Fake timers drive both the debounce and the
  // message-prune timeouts deterministically.
  beforeEach(() => {
    vi.stubEnv('SSR', false)
    vi.useFakeTimers()
    clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('appends a polite message to the polite queue', () => {
    announce('12 products found')

    expect(politeMessages.value).toHaveLength(1)
    expect(politeMessages.value[0]?.text).toBe('12 products found')
    expect(assertiveMessages.value).toHaveLength(0)
  })

  it('routes assertive announcements to the assertive queue only', () => {
    announce('Request failed', { politeness: 'assertive' })

    expect(assertiveMessages.value).toHaveLength(1)
    expect(assertiveMessages.value[0]?.text).toBe('Request failed')
    expect(politeMessages.value).toHaveLength(0)
  })

  it('re-announces an identical consecutive message as a separate node', () => {
    announce('Saved')
    announce('Saved')

    // Two distinct nodes (distinct ids), each a fresh insertion the AT reads —
    // no emptying or trailing-period trick required.
    expect(politeMessages.value).toHaveLength(2)
    expect(politeMessages.value.map((entry) => entry.text)).toEqual([
      'Saved',
      'Saved',
    ])
    expect(politeMessages.value[0]?.id).not.toBe(politeMessages.value[1]?.id)
  })

  it('coalesces rapid debounced calls to the last message', () => {
    announce('A', { debounce: 300 })
    announce('B', { debounce: 300 })
    announce('C', { debounce: 300 })
    expect(politeMessages.value).toHaveLength(0)

    vi.advanceTimersByTime(300)
    expect(politeMessages.value).toHaveLength(1)
    expect(politeMessages.value[0]?.text).toBe('C')
  })

  it('prunes a message once its lifetime elapses', () => {
    announce('gone soon')
    expect(politeMessages.value).toHaveLength(1)

    vi.advanceTimersByTime(5000)
    expect(politeMessages.value).toHaveLength(0)
  })

  it('clear() empties both queues', () => {
    announce('hi')
    announce('err', { politeness: 'assertive' })
    expect(politeMessages.value).toHaveLength(1)
    expect(assertiveMessages.value).toHaveLength(1)

    clear()
    expect(politeMessages.value).toHaveLength(0)
    expect(assertiveMessages.value).toHaveLength(0)
  })

  // The queues live at module scope, so on the server they are shared across
  // every request the Node process handles. Both writers guard on `SSR`; a
  // stray server-side call must leave another request's messages alone.
  it('announce() writes nothing to the queues during SSR', () => {
    announce('client message')

    vi.stubEnv('SSR', true)
    announce('server message')

    expect(politeMessages.value).toHaveLength(1)
    expect(politeMessages.value[0]?.text).toBe('client message')
  })

  it('clear() keeps the queues during SSR', () => {
    announce('client message')

    vi.stubEnv('SSR', true)
    clear()

    expect(politeMessages.value).toHaveLength(1)
    expect(politeMessages.value[0]?.text).toBe('client message')
  })
})
