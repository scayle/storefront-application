import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import {
  PROMPTED_COUNTRY_SWITCH_KEY,
  SWITCHED_SHOPS_KEY,
  useCountryDetection,
} from './useCountryDetection'

const suggestedShop = {
  code: 'en',
  name: 'English',
  locale: 'en-US',
  url: 'https://example.com/en',
}

const shopSuggestion = { region: 'US', languages: [suggestedShop] }

const pageMocks = vi.hoisted(() => ({
  reactivePage: null as {
    props: {
      customer?: Record<string, unknown> | null
      shopSuggestion?: {
        region: string
        languages: (typeof suggestedShop)[]
      } | null
    }
  } | null,
}))

vi.mock('@inertiajs/vue3', async () => {
  const { reactive } = await import('vue')
  pageMocks.reactivePage = reactive({ props: {} })
  return { usePage: vi.fn(() => pageMocks.reactivePage) }
})

const sessionStore = vi.hoisted(
  () => new Map<string, ReturnType<typeof ref<boolean>>>(),
)

vi.mock('@vueuse/core', async (importActual) => {
  const actual = await importActual<typeof import('@vueuse/core')>()
  const { ref: vueRef } = await import('vue')
  return {
    ...actual,
    useSessionStorage: (key: string, initial: boolean) => {
      if (!sessionStore.has(key)) {
        sessionStore.set(key, vueRef(initial))
      }
      return sessionStore.get(key)!
    },
  }
})

beforeEach(() => {
  sessionStore.clear()
  const page = pageMocks.reactivePage!
  page.props.customer = null
  page.props.shopSuggestion = shopSuggestion
})

describe('useCountryDetection', () => {
  it('is inactive with no suggestions while the deferred prop has not arrived', () => {
    pageMocks.reactivePage!.props.shopSuggestion = undefined
    const result = useCountryDetection()

    expect(result.suggestedShops.value).toEqual([])
    expect(result.detectedRegion.value).toBeUndefined()
    expect(result.suggestionActive.value).toBe(false)
  })

  it('is inactive when the server has nothing to suggest', () => {
    pageMocks.reactivePage!.props.shopSuggestion = null
    const result = useCountryDetection()

    expect(result.suggestedShops.value).toEqual([])
    expect(result.suggestionActive.value).toBe(false)
  })

  it('is active with suggestions for a signed-out user', () => {
    const result = useCountryDetection()

    expect(result.detectedRegion.value).toBe('US')
    expect(result.suggestedShops.value).toEqual([suggestedShop])
    expect(result.suggestionActive.value).toBe(true)
  })

  it.for([
    {
      name: 'the customer prop is still loading',
      arrange: () => {
        pageMocks.reactivePage!.props.customer = undefined
      },
    },
    {
      name: 'the customer is signed in',
      arrange: () => {
        pageMocks.reactivePage!.props.customer = { id: 1 }
      },
    },
    {
      name: 'the session already prompted the user',
      arrange: () => {
        sessionStore.set(PROMPTED_COUNTRY_SWITCH_KEY, ref(true))
      },
    },
    {
      name: 'the session already switched shops',
      arrange: () => {
        sessionStore.set(SWITCHED_SHOPS_KEY, ref(true))
      },
    },
  ])('is inactive when $name', ({ arrange }) => {
    arrange()

    const result = useCountryDetection()

    expect(result.suggestionActive.value).toBe(false)
  })

  it('markUserAsPrompted sets hasPromptedUser and deactivates the suggestion', () => {
    const result = useCountryDetection()
    expect(result.hasPromptedUser.value).toBe(false)

    result.markUserAsPrompted()

    expect(result.hasPromptedUser.value).toBe(true)
    expect(result.suggestionActive.value).toBe(false)
  })

  it('markShopAsSwitched sets hasSwitchedShops and deactivates the suggestion', () => {
    const result = useCountryDetection()
    expect(result.hasSwitchedShops.value).toBe(false)

    result.markShopAsSwitched()

    expect(result.hasSwitchedShops.value).toBe(true)
    expect(result.suggestionActive.value).toBe(false)
  })

  it('activates when the deferred prop arrives after mount', () => {
    pageMocks.reactivePage!.props.shopSuggestion = undefined
    const result = useCountryDetection()
    expect(result.suggestionActive.value).toBe(false)

    pageMocks.reactivePage!.props.shopSuggestion = shopSuggestion

    expect(result.suggestionActive.value).toBe(true)
  })
})
