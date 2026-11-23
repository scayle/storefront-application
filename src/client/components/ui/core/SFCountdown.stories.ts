import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from '@client/utils/time'
import SFCountdown from './SFCountdown.vue'

/**
 * SFCountdown is a real-time countdown component that displays remaining time until a specified date.
 * It's commonly used for promotional campaigns, sales events, product launches, and time-sensitive offers
 * to create urgency and encourage user engagement.
 *
 * Key features:
 * - Real-time countdown with automatic updates every second
 * - Configurable unit display (days, hours, minutes, seconds)
 * - Short and long unit format options
 * - Automatic hiding of zero values and irrelevant units
 * - Finished event emission when countdown reaches zero
 * - Tabular number formatting for consistent alignment
 */
export default {
  title: 'UI/Core/SFCountdown',
  component: SFCountdown,
  parameters: { layout: 'centered' },
  argTypes: {
    unitSize: {
      control: { type: 'select' },
      options: ['short', 'long'],
    },
  },
  args: {
    onFinished: fn(),
  },
  render: (args: ComponentPropsAndSlots<typeof SFCountdown>) => ({
    components: { SFCountdown },
    setup() {
      const toTimeString = (timestamp: number) =>
        new Date(timestamp).toISOString()
      return { args, toTimeString }
    },
    template: `<SFCountdown :show-units="args.showUnits" :unit-size="args.unitSize" :time-until="toTimeString(args.timeUntil)" @finished="args.onFinished" />`,
  }),
} satisfies Meta<typeof SFCountdown>

type Story = StoryObj<typeof SFCountdown>

/**
 * Basic countdown with long unit labels. This is the most common usage pattern
 * for promotional campaigns and sales events where clarity is important.
 */
export const Default: Story = {
  args: {
    timeUntil: new Date(
      Date.now() + 2 * DAY_MS + 5 * HOUR_MS + 30 * MINUTE_MS + 45 * SECOND_MS,
    ).toISOString(), // 2 days, 5 hours, 30 minutes, 45 seconds
    showUnits: true,
    unitSize: 'long',
  },
}

/**
 * Very short duration countdown showing only minutes and seconds.
 * Useful for time-sensitive actions or quick promotions.
 */
export const MinutesOnly: Story = {
  args: {
    timeUntil: new Date(
      Date.now() + 5 * MINUTE_MS + 30 * SECOND_MS,
    ).toISOString(), // 5 minutes, 30 seconds
    showUnits: true,
    unitSize: 'long',
  },
}

/**
 * Short unit labels with colon separators. Displays abbreviated units
 * (hrs, min, sec) with colon separators between groups, matching the
 * urgent countdown timer format used in deal banners.
 */
export const ShortUnitsWithSeparators: Story = {
  args: {
    timeUntil: new Date(
      Date.now() + 5 * HOUR_MS + 30 * MINUTE_MS + 45 * SECOND_MS,
    ).toISOString(), // 5 hours, 30 minutes, 45 seconds
    showUnits: true,
    showSeparators: true,
    unitSize: 'short',
  },
}

/**
 * Countdown that will finish soon to demonstrate the finished event.
 * This example shows how the component handles the transition to zero.
 */
export const FinishingSoon: Story = {
  args: {
    timeUntil: new Date(Date.now() + 10 * SECOND_MS).toISOString(), // 10 seconds
    showUnits: true,
    unitSize: 'long',
  },
}
