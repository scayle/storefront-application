import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { HOUR_MS, MINUTE_MS } from '@client/utils/time'
import SFHighlightFooter from './SFHighlightFooter.vue'

/**
 * SFHighlightFooter is the colored bar along the bottom of a highlighted
 * product card. A card is highlighted by a promotion that opts into card
 * highlighting, or by a CMS product spotlight.
 *
 * Key features:
 * - Uses the highlight's background and text colors
 * - Shows the slim `SFDealTimer` when the highlight has a countdown end date
 */
export default {
  title: 'Deal/SFHighlightFooter',
  component: SFHighlightFooter,
  parameters: { layout: 'centered' },
  args: { backgroundColor: '#FFC65F', textColor: '#171717' },
  render: (args: ComponentPropsAndSlots<typeof SFHighlightFooter>) => ({
    components: { SFHighlightFooter },
    setup() {
      return { args }
    },
    template: '<div class="w-64"><SFHighlightFooter v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SFHighlightFooter>

type Story = StoryObj<typeof SFHighlightFooter>

/** Footer with a countdown to the end of the deal. */
export const WithCountdown: Story = {
  args: {
    countdownEndDate: new Date(
      Date.now() + 5 * HOUR_MS + 30 * MINUTE_MS,
    ).toISOString(),
  },
}

/**
 * Footer without a countdown, as a promotion with a hidden countdown shows it:
 * a thin strip in the highlight's background color.
 */
export const WithoutCountdown: Story = {}
