import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor, within } from 'storybook/test'
import SFScrollToTopButton from './SFScrollToTopButton.vue'

/**
 * SFScrollToTopButton is the floating button on the product listing page and
 * in the product detail page's mobile add-to-basket bar. It shows once the window is
 * scrolled away from the top and scrolls back up on click.
 *
 * The story wraps it in a tall page of placeholder rows and the product
 * listing page's fixed corner position. The rows make the scroll position
 * visible where the OS hides the scrollbar. Because the button follows the
 * window's scroll, the docs page renders the story in its own frame instead
 * of inline.
 */
export default {
  title: 'UI/Navigation/SFScrollToTopButton',
  component: SFScrollToTopButton,
  parameters: {
    docs: { story: { inline: false, height: '320px' } },
  },
  decorators: [
    () => ({
      template: `
        <div class="min-h-[200vh] space-y-4 p-6">
          <p class="text-secondary">Scroll down to reveal the button.</p>
          <div
            v-for="row in 24"
            :key="row"
            class="text-secondary flex h-16 items-center rounded-lg bg-gray-100 px-4"
          >
            Row {{ row }}
          </div>
          <div class="fixed right-4 bottom-8">
            <story />
          </div>
        </div>
      `,
    }),
  ],
} satisfies Meta<typeof SFScrollToTopButton>

type Story = StoryObj<typeof SFScrollToTopButton>

/** Scrolls the window down so the button fades in. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    window.scrollTo({ top: 500 })
    // The browser fires `scroll` on the next rendered frame, which a background
    // tab or an offscreen docs frame holds back.
    window.dispatchEvent(new Event('scroll'))
    await waitFor(() =>
      expect(canvas.getByTestId('scroll-to-top-button')).toBeVisible(),
    )
  },
}
