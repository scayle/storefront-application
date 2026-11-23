import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from '@client/utils/time'
import SFCountdownSmall from './SFCountdownSmall.vue'

/**
 * SFCountdownSmall is the compact countdown display used by the Countdown Timer
 * CMS component. It reuses SFCountdown for the ticking digits and applies the
 * same State A/B logic.
 *
 * - State A (standard, more than 24h remaining): "X Days left".
 * - State B (urgent, 24h or fewer remaining): "Ends in:" + ticking HH:MM:SS.
 */
export default {
  title: 'UI/Core/SFCountdownSmall',
  component: SFCountdownSmall,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFCountdownSmall>) => ({
    components: { SFCountdownSmall },
    setup() {
      const toTimeString = (timestamp: number) =>
        new Date(timestamp).toISOString()
      return { args, toTimeString }
    },
    template: `<SFCountdownSmall :time-until="toTimeString(args.timeUntil)" />`,
  }),
} satisfies Meta<typeof SFCountdownSmall>

type Story = StoryObj<typeof SFCountdownSmall>

/**
 * Standard state (more than 24h remaining) showing the "X Days left" label.
 */
export const Standard: Story = {
  args: {
    timeUntil: new Date(Date.now() + 3 * DAY_MS + 5 * HOUR_MS).toISOString(),
  },
}

/**
 * Urgent state (24h or fewer remaining) showing the ticking HH:MM:SS.
 */
export const Urgent: Story = {
  args: {
    timeUntil: new Date(
      Date.now() + 5 * HOUR_MS + 30 * MINUTE_MS + 45 * SECOND_MS,
    ).toISOString(),
  },
}
