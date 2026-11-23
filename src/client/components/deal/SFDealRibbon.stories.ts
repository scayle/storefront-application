import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { Promotion } from '@scayle/storefront/types'
import { DAY_MS, HOUR_MS } from '@client/utils/time'
import SFDealRibbon from './SFDealRibbon.vue'

const promotion: Promotion = {
  id: 'summer-sale',
  name: 'Summer Sale',
  priority: 1,
  headline: 'Summer Sale',
  subline: 'Up to 50% off selected styles',
  link: '/sale',
  hideCountdown: false,
  conditions: '',
  color: { backgroundColor: '#FFC65F', color: '#171717' },
  schedule: {
    from: new Date().toISOString(),
    to: new Date(Date.now() + 2 * DAY_MS + 5 * HOUR_MS).toISOString(),
  },
}

/**
 * SFDealRibbon is the bar above the header that announces the current campaign,
 * or the first promotion when no campaign runs. The layout renders at most one
 * ribbon.
 *
 * Key features:
 * - Shows the deal's headline, and its subline on large screens
 * - Links to the deal's page when the deal has a link
 * - Counts down to the end of the deal unless the countdown is hidden
 * - Has a close button that hides it
 */
export default {
  title: 'Deal/SFDealRibbon',
  component: SFDealRibbon,
  parameters: { layout: 'fullscreen' },
  args: { deal: promotion },
} satisfies Meta<typeof SFDealRibbon>

type Story = StoryObj<typeof SFDealRibbon>

/** Promotion with a subline, a link and a countdown. */
export const Default: Story = {}

/** Promotion with the countdown hidden. */
export const WithoutCountdown: Story = {
  args: { deal: { ...promotion, hideCountdown: true } },
}

/**
 * Promotion with neither subline nor link: the ribbon is not clickable and, on
 * large screens, shows only the headline.
 */
export const HeadlineOnly: Story = {
  args: { deal: { ...promotion, subline: undefined, link: '' } },
}
