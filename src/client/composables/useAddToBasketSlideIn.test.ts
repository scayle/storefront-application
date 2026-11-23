import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BasketItem } from '@scayle/storefront/types'
import { useAddToBasketSlideIn } from './useAddToBasketSlideIn'

const buildItem = (key: string) => ({ key }) as unknown as BasketItem

describe('useAddToBasketSlideIn', () => {
  // The `client` test project runs in a node (SSR) env, where `open` is inert
  // by design, so force the client branch for everything but the guard test
  // below.
  beforeEach(() => {
    vi.stubEnv('SSR', false)

    useAddToBasketSlideIn().close()
  })

  it('opens with the given basket line and closes again', () => {
    const { isOpen, addedItem, open, close } = useAddToBasketSlideIn()
    const item = buildItem('item-1')

    open(item)

    expect(isOpen.value).toBe(true)
    expect(addedItem.value).toBe(item)

    close()

    expect(isOpen.value).toBe(false)
    // The line is kept so the panel does not go blank mid-transition.
    expect(addedItem.value).toBe(item)
  })

  it('replaces the line when a second add opens the panel again', () => {
    const { addedItem, open } = useAddToBasketSlideIn()

    open(buildItem('item-1'))
    open(buildItem('item-2'))

    expect(addedItem.value?.key).toBe('item-2')
  })

  it('shares state across call sites, so the opener and the panel agree', () => {
    const opener = useAddToBasketSlideIn()
    const panel = useAddToBasketSlideIn()

    opener.open(buildItem('item-1'))

    expect(panel.isOpen.value).toBe(true)
    expect(panel.addedItem.value?.key).toBe('item-1')
  })

  // The state is a module singleton shared by every request an SSR process
  // handles, so a server-render write would surface in the next visitor's HTML.
  it('ignores writes during a server render', () => {
    vi.stubEnv('SSR', true)

    const { isOpen, addedItem, open } = useAddToBasketSlideIn()
    // `close()` keeps the last line on purpose, so compare against what the
    // state already held rather than against null.
    const itemBefore = addedItem.value

    open(buildItem('server-rendered'))

    expect(isOpen.value).toBe(false)
    expect(addedItem.value).toBe(itemBefore)
  })
})
