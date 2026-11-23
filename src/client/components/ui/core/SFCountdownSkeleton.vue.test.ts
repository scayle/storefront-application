import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { COUNTDOWN_LARGE_UNIT_COUNT } from '@client/utils/constants'
import { DAY_MS } from '@client/utils/time'
import SFCountdownSkeleton from './SFCountdownSkeleton.vue'

const mountWith = (size: 'small' | 'large', timeUntil?: string) =>
  mount(SFCountdownSkeleton, {
    props: { size, timeUntil },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { SFSkeletonLoader: { template: '<div data-testid="bar" />' } },
    },
  })

// Renders the markup the server emits, which is also what the client reproduces
// on its first, pre-hydration render. This markup must be deterministic and
// clock-independent to avoid a hydration mismatch.
const renderSSR = (size: 'small' | 'large', timeUntil?: string) => {
  const app = createSSRApp(SFCountdownSkeleton, { size, timeUntil })
  app.config.globalProperties.$t = (key: string) => key
  return renderToString(app)
}

describe('SFCountdownSkeleton', () => {
  it('renders the small pill placeholder with a single bar', () => {
    const wrapper = mountWith('small')
    expect(wrapper.find('[data-testid="countdown-skeleton"]').exists()).toBe(
      true,
    )
    expect(wrapper.findAll('[data-testid="bar"]')).toHaveLength(1)
  })

  // The layout never consults the live clock, so a countdown with more than
  // 24h left reserves the same urgent footprint as one with less.
  it.for([
    { case: '24h or less remains', timeUntil: DAY_MS / 2 },
    { case: 'more than 24h remains', timeUntil: DAY_MS * 3 },
    { case: 'no target time is provided', timeUntil: undefined },
  ])('reserves the urgent multi-cell layout when $case', ({ timeUntil }) => {
    const wrapper = mountWith(
      'large',
      timeUntil === undefined
        ? undefined
        : new Date(Date.now() + timeUntil).toISOString(),
    )

    // Each unit cell reserves two bars (value + label).
    expect(wrapper.findAll('[data-testid="bar"]')).toHaveLength(
      COUNTDOWN_LARGE_UNIT_COUNT * 2,
    )
  })

  // Regression: the SSR render and the client's first (pre-hydration) render
  // must not consult the live clock, otherwise the large variant can reserve a
  // different number of cells on the server vs. the client when `timeUntil`
  // sits near the 24h boundary, causing a Vue hydration mismatch.
  it('renders a clock-independent SSR layout near the 24h boundary', async () => {
    // One just over and one just under the 24h boundary: a render that reads
    // `Date.now()` would split these into standard (1 cell) vs. urgent (3).
    const justOver = new Date(Date.now() + DAY_MS + 2_000).toISOString()
    const justUnder = new Date(Date.now() + DAY_MS - 2_000).toISOString()

    const overHtml = await renderSSR('large', justOver)
    const underHtml = await renderSSR('large', justUnder)

    // SSR markup is identical on both sides of the boundary, and equal to the
    // urgent layout reserved without a target time.
    expect(overHtml).toBe(underHtml)
    expect(overHtml).toBe(await renderSSR('large'))
  })
})
