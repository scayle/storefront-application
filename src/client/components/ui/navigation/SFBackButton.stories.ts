import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFBackButton from './SFBackButton.vue'

/**
 * SFBackButton is the unified back control used across the storefront (PLP,
 * PDP, order detail and the checkout header). It renders a borderless back
 * icon, either icon-only on a transparent 40×40 tap target or with a trailing
 * label that shows a gray background on hover.
 *
 * Key features:
 * - Link mode (`to`) for fixed destinations.
 * - History-back mode (`use-history-back`) that navigates through browser
 *   history and degrades to `fallback-link` when no history is available.
 * - Optional label via the `label` prop or the default slot.
 */
export default {
  title: 'UI/Navigation/SFBackButton',
  component: SFBackButton,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFBackButton>) => ({
    components: { SFBackButton },
    setup() {
      return { args }
    },
    template: `<SFBackButton v-bind="args" />`,
  }),
} satisfies Meta<typeof SFBackButton>

type Story = StoryObj<typeof SFBackButton>

/**
 * Icon-only back button linking to a fixed destination.
 */
export const Default = {
  args: {
    to: '/',
  },
} satisfies Story

/**
 * Back button with a trailing label, as used in the checkout header.
 */
export const WithLabel = {
  args: {
    to: '/',
    label: 'Back to shop',
  },
} satisfies Story

/**
 * History-back mode used on the product detail page, falling back to a
 * category link when there is no browser history.
 */
export const HistoryBack = {
  args: {
    useHistoryBack: true,
    fallbackLink: '/',
  },
} satisfies Story
