import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS } from '@client/utils/time'
import SFCountdownLarge from './SFCountdownLarge.vue'

/**
 * SFCountdownLarge is the large-format countdown display used by the Countdown
 * Timer CMS component. It mirrors SFCountdown's State A/B logic but renders the
 * remaining time in larger, boxed digits with unit labels.
 *
 * - State A (standard, more than 24h remaining): "X Days left".
 * - State B (urgent, 24h or fewer remaining): boxed HH:MM:SS, ticking every second.
 */
export default {
  title: 'UI/Core/SFCountdownLarge',
  component: SFCountdownLarge,
  parameters: { layout: 'centered' },
  args: {
    onFinished: fn(),
  },
  render: (args: ComponentPropsAndSlots<typeof SFCountdownLarge>) => ({
    components: { SFCountdownLarge },
    setup() {
      const toTimeString = (timestamp: number) =>
        new Date(timestamp).toISOString()
      return { args, toTimeString }
    },
    template: `<SFCountdownLarge :time-until="toTimeString(args.timeUntil)" @finished="args.onFinished" />`,
  }),
} satisfies Meta<typeof SFCountdownLarge>

type Story = StoryObj<typeof SFCountdownLarge>

/**
 * Standard state (more than 24h remaining) showing the "X Days left" label.
 */
export const Standard: Story = {
  args: {
    timeUntil: new Date(Date.now() + 3 * DAY_MS + 5 * HOUR_MS).toISOString(),
  },
}

/**
 * Urgent state (24h or fewer remaining) showing the boxed, ticking HH:MM:SS.
 */
export const Urgent: Story = {
  args: {
    timeUntil: new Date(
      Date.now() + 5 * HOUR_MS + 30 * MINUTE_MS + 45 * SECOND_MS,
    ).toISOString(),
  },
}
