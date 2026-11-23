import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFHeadlineItemCount from './SFHeadlineItemCount.vue'

/**
 * SFHeadlineItemCount renders the “(N items)” suffix shown next to page
 * headlines (PLP, wishlist, basket, search, orders). It pairs a visible,
 * `aria-hidden` count with an `sr-only` pluralized copy for assistive tech, and
 * renders nothing while the count is still `undefined` (e.g. deferred loading).
 */
export default {
  title: 'UI/Core/SFHeadlineItemCount',
  component: SFHeadlineItemCount,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFHeadlineItemCount>) => ({
    components: { SFHeadlineItemCount },
    setup() {
      return { args }
    },
    template: `
      <h1 class="heading-section-1 lg:heading-page flex items-baseline gap-1">
        Pants <SFHeadlineItemCount v-bind="args" />
      </h1>
    `,
  }),
} satisfies Meta<typeof SFHeadlineItemCount>

type Story = StoryObj<typeof SFHeadlineItemCount>

/** Resolved count rendered as a parenthetical suffix. */
export const WithCount: Story = {
  args: { count: 34 },
}

/** Singular pluralization branch. */
export const SingleItem: Story = {
  args: { count: 1 },
}

/** Renders nothing while the count is still loading. */
export const Loading: Story = {
  args: { count: undefined },
}
