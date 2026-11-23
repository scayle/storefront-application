import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useKeydownActions } from './useKeydownActions'

// The composable only reads `key` and calls `preventDefault`/`stopPropagation`,
// and this project runs in a node env without the DOM `KeyboardEvent` global.
const keydown = (key: string): KeyboardEvent =>
  ({
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as KeyboardEvent

describe('useKeydownActions', () => {
  it('normalizes arrow/space/named keys to the shared alias names', () => {
    const up = vi.fn()
    const space = vi.fn()
    const escape = vi.fn()
    const onKeydown = useKeydownActions({ up, space, escape })

    onKeydown(keydown('ArrowUp'))
    onKeydown(keydown(' '))
    onKeydown(keydown('Escape'))

    expect(up).toHaveBeenCalledOnce()
    expect(space).toHaveBeenCalledOnce()
    expect(escape).toHaveBeenCalledOnce()
  })

  it('lowercases keys with no alias', () => {
    const a = vi.fn()
    const pageup = vi.fn()
    const onKeydown = useKeydownActions({ a, pageup })

    onKeydown(keydown('A'))
    onKeydown(keydown('PageUp'))

    expect(a).toHaveBeenCalledOnce()
    expect(pageup).toHaveBeenCalledOnce()
  })

  it('passes the original event to the matched action', () => {
    const down = vi.fn()
    const onKeydown = useKeydownActions({ down })
    const event = keydown('ArrowDown')

    onKeydown(event)

    expect(down).toHaveBeenCalledWith(event)
  })

  it('calls preventDefault by default when an action matched', () => {
    const onKeydown = useKeydownActions({ down: vi.fn() })
    const event = keydown('ArrowDown')

    onKeydown(event)

    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('leaves unmatched keys untouched (no action, no preventDefault)', () => {
    const down = vi.fn()
    const onKeydown = useKeydownActions({ down })
    const event = keydown('Tab')

    onKeydown(event)

    expect(down).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })

  it('skips preventDefault when the option is false', () => {
    const onKeydown = useKeydownActions(
      { down: vi.fn() },
      { preventDefault: false },
    )
    const event = keydown('ArrowDown')

    onKeydown(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('stops propagation only when the option is enabled', () => {
    const withStop = useKeydownActions(
      { down: vi.fn() },
      { stopPropagation: true },
    )
    const stopped = keydown('ArrowDown')
    withStop(stopped)
    expect(stopped.stopPropagation).toHaveBeenCalledOnce()

    const withoutStop = useKeydownActions({ down: vi.fn() })
    const notStopped = keydown('ArrowDown')
    withoutStop(notStopped)
    expect(notStopped.stopPropagation).not.toHaveBeenCalled()
  })

  it('merges custom aliases over the defaults (defaults still resolve)', () => {
    const play = vi.fn()
    const up = vi.fn()
    const onKeydown = useKeydownActions(
      { play, up },
      { aliases: { k: 'play' } },
    )

    onKeydown(keydown('k'))
    expect(play).toHaveBeenCalledOnce()

    // A default alias must survive alongside the custom one — guards against a
    // regression that replaces the default map instead of merging into it.
    onKeydown(keydown('ArrowUp'))
    expect(up).toHaveBeenCalledOnce()
  })

  it('resolves a dynamic action map (ref/getter) on every event', () => {
    const openAction = vi.fn()
    const closedAction = vi.fn()
    const isOpen = ref(false)
    const onKeydown = useKeydownActions(() =>
      isOpen.value ? { down: openAction } : { down: closedAction },
    )

    onKeydown(keydown('ArrowDown'))
    expect(closedAction).toHaveBeenCalledOnce()
    expect(openAction).not.toHaveBeenCalled()

    isOpen.value = true
    onKeydown(keydown('ArrowDown'))
    expect(openAction).toHaveBeenCalledOnce()
  })
})
