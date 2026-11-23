import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { Promotion } from '@scayle/storefront/types'
import type { ProductCardHighlightOverride } from '@client/components/product/productCardHighlight'
import { createMockListingProduct } from '@test/mock-data/products'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useProductCardHighlight } from './useProductCardHighlight'
import type { UseProductCardHighlightReturn } from './useProductCardHighlight'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage({ promotions: [] })
  return {
    usePage: vi.fn(() => mocks.reactivePage),
  }
})

// Carries the attribute value that `buildPromotion` targets by default.
const product = createMockListingProduct({
  attributeValuesByGroup: { '100': [200] },
})

function buildPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    name: 'Dress bundle deal',
    priority: 1,
    headline: '3 dresses for 99,99 €',
    link: '#',
    hideCountdown: false,
    conditions: '',
    color: { backgroundColor: '#e3000b', color: '#ffffff' },
    schedule: {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-11-01T00:00:00.000Z',
    },
    product: {
      attributeGroupId: 100,
      attributeId: 200,
      badgeLabel: '3xDress = 99,99 €',
    },
    highlightProductCards: true,
    ...overrides,
  }
}

// `promotions` left `undefined` stands for the deferred prop before it arrives.
function mountHighlight(
  highlightOverride?: MaybeRefOrGetter<
    ProductCardHighlightOverride | undefined
  >,
  promotions?: Promotion[],
) {
  mocks.reactivePage!.props.promotions = promotions
  let highlight!: UseProductCardHighlightReturn
  mount(
    defineComponent({
      setup() {
        highlight = useProductCardHighlight(() => product, highlightOverride)
        return () => null
      },
    }),
  )
  return highlight
}

describe('useProductCardHighlight', () => {
  it('resolves no highlight without an override or a matching promotion', () => {
    const highlight = mountHighlight()

    expect(highlight.activeHighlight.value).toBeUndefined()
    expect(highlight.isHighlightActive.value).toBe(false)
    expect(highlight.isHighlightFooterVisible.value).toBe(false)
    expect(highlight.highlightBadgeStyle.value).toBeUndefined()
  })

  it.for([
    {
      name: 'colors, label and countdown',
      override: {
        color: { backgroundColor: '#000000', color: '#ffffff' },
        badgeLabel: 'Spotlight',
        countdownEndDate: '2026-11-01T00:00:00.000Z',
      },
      expected: { hideDefaultBadge: false, footerVisible: true },
    },
    {
      name: 'colors only as a border without badge or footer',
      override: { color: { backgroundColor: '#000000', color: '#ffffff' } },
      expected: { hideDefaultBadge: true, footerVisible: false },
    },
    {
      name: 'a label without a countdown as a badge without footer',
      override: { badgeLabel: 'Spotlight' },
      expected: { hideDefaultBadge: false, footerVisible: false },
    },
  ])('resolves an override with $name', ({ override, expected }) => {
    const highlight = mountHighlight(override)

    expect(highlight.activeHighlight.value).toEqual({
      backgroundColor: override.color?.backgroundColor,
      color: override.color?.color,
      badgeLabel: override.badgeLabel,
      countdownEndDate: override.countdownEndDate,
      ...expected,
    })
  })

  it('prefers the override over a matching highlight promotion', () => {
    const highlight = mountHighlight(
      { color: { backgroundColor: '#000000', color: '#ffffff' } },
      [buildPromotion()],
    )

    expect(highlight.highlightBadgeStyle.value).toEqual({
      backgroundColor: '#000000',
      color: '#ffffff',
    })
  })

  it('follows a change of the override getter', () => {
    const override = ref<ProductCardHighlightOverride>()
    const highlight = mountHighlight(() => override.value)

    override.value = { badgeLabel: 'Spotlight' }

    expect(highlight.isHighlightActive.value).toBe(true)
  })

  it('highlights the card from a matching promotion that opts in', () => {
    const highlight = mountHighlight(undefined, [buildPromotion()])

    expect(highlight.activeHighlight.value).toEqual({
      backgroundColor: '#e3000b',
      color: '#ffffff',
      badgeLabel: '3xDress = 99,99 €',
      hideDefaultBadge: false,
      countdownEndDate: '2026-11-01T00:00:00.000Z',
      footerVisible: true,
    })
  })

  it('highlights the card once the deferred promotions arrive after mount', () => {
    const highlight = mountHighlight()

    mocks.reactivePage!.props.promotions = [buildPromotion()]

    expect(highlight.isHighlightActive.value).toBe(true)
  })

  it('keeps the footer but drops the countdown when the promotion hides it', () => {
    const highlight = mountHighlight(undefined, [
      buildPromotion({ hideCountdown: true }),
    ])

    expect(highlight.isHighlightFooterVisible.value).toBe(true)
    expect(highlight.activeHighlight.value?.countdownEndDate).toBeUndefined()
  })

  it('lists a matching promotion without highlighting the card when it does not opt in', () => {
    const promotion = buildPromotion({ highlightProductCards: false })
    const highlight = mountHighlight(undefined, [promotion])

    expect(highlight.promotions.value).toEqual([promotion])
    expect(highlight.isHighlightActive.value).toBe(false)
  })

  it('keeps the card plain until it mounts, matching the server render', () => {
    mocks.reactivePage!.props.promotions = [buildPromotion()]
    let highlight!: UseProductCardHighlightReturn
    let beforeMount: Record<string, unknown> | undefined
    mount(
      defineComponent({
        setup() {
          highlight = useProductCardHighlight(() => product, undefined)
          beforeMount = {
            promotions: highlight.promotions.value,
            activeHighlight: highlight.activeHighlight.value,
            isHighlightActive: highlight.isHighlightActive.value,
            isHighlightFooterVisible: highlight.isHighlightFooterVisible.value,
          }
          return () => null
        },
      }),
    )

    expect(beforeMount).toEqual({
      promotions: [],
      activeHighlight: undefined,
      isHighlightActive: false,
      isHighlightFooterVisible: false,
    })
    expect(highlight.isHighlightActive.value).toBe(true)
  })
})
