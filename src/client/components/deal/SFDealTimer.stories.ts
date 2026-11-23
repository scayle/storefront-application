import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { DAY_MS, HOUR_MS, MINUTE_MS } from '@client/utils/time'
import SFDealTimer from './SFDealTimer.vue'

const standardEndDate = new Date(
  Date.now() + 2 * DAY_MS + 5 * HOUR_MS,
).toISOString()

const urgentEndDate = new Date(
  Date.now() + 5 * HOUR_MS + 30 * MINUTE_MS,
).toISOString()

/**
 * SFDealTimer counts down to the end of a deal, in the deal's colors. Product
 * cards show its slim variant inside `SFHighlightFooter`.
 *
 * Key features:
 * - More than 24 hours left: shows the number of days left
 * - 24 hours or fewer left: shows a ticking hours, minutes and seconds countdown
 * - Slim variant drops the icon, the border and the "Ends in" label
 * - Hides itself once the end date has passed
 */
export default {
  title: 'Deal/SFDealTimer',
  component: SFDealTimer,
  parameters: { layout: 'centered' },
  args: {
    timeUntil: standardEndDate,
    colorStyle: { backgroundColor: '#FFC65F', color: '#171717' },
  },
} satisfies Meta<typeof SFDealTimer>

type Story = StoryObj<typeof SFDealTimer>

/** More than 24 hours left: the timer shows the number of days left. */
export const Standard: Story = {}

/** 24 hours or fewer left: the timer ticks down hours, minutes and seconds. */
export const Urgent: Story = {
  args: { timeUntil: urgentEndDate },
}

/** Slim variant of the urgent timer, as product cards show it in the highlight footer. */
export const Slim: Story = {
  args: { timeUntil: urgentEndDate, isSlim: true },
}

/**
 * End date in the past: the timer renders nothing once mounted, so this story
 * shows an empty canvas.
 */
export const Expired: Story = {
  args: { timeUntil: new Date(Date.now() - HOUR_MS).toISOString() },
}
