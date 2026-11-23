import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { mocked } from 'storybook/test'
import { reactive } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { routes } from '@shared/routes'
import { createVisitClaim } from '../../../../.storybook/inertia-mock'
import SFAccountLayout from './SFAccountLayout.vue'

/**
 * SFAccountLayout frames every My Account page. From the `lg` breakpoint up it
 * shows `SFAccountSideMenu` next to the content; below it, the account headline
 * and the `SFAccountTabs` row sit above the content. Each account page passes
 * its content in the default slot, which the stories fill with a placeholder.
 *
 * The active menu item and tab come from the page url. The stories set it to
 * the orders route in the canvas only, which is why no item is active on this
 * page until you click one.
 */
export default {
  title: 'Account/SFAccountLayout',
  component: SFAccountLayout,
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { SFAccountLayout },
    setup() {
      const page = reactive({ ...usePage() })
      mocked(usePage).mockReturnValue(page)
      const claim = createVisitClaim((url) => {
        page.url = url.pathname
      })
      return { claim }
    },
    template: `
      <div @pointerdown.capture="claim" @keydown.capture="claim">
        <SFAccountLayout>
          <div class="rounded-md bg-gray-100 p-6">
            <h2 class="heading-section-2 mb-2">Page content</h2>
            <p class="body-default">Each account page renders its content here.</p>
          </div>
        </SFAccountLayout>
      </div>
    `,
  }),
  // Each tab row scrolls its active tab into view on mount, which on the docs
  // page also scrolls the page down to the lowest row.
  beforeEach({ viewMode }) {
    if (viewMode === 'story') {
      const page = usePage()
      mocked(usePage).mockReturnValue({ ...page, url: routes.accountOrders })
    }
  },
} satisfies Meta<typeof SFAccountLayout>

type Story = StoryObj<typeof SFAccountLayout>

/** Desktop width: the side menu on the left, the headline visually hidden. */
export const Desktop: Story = {
  globals: {
    viewport: { value: 'desktop', isRotated: false },
  },
}

/** Phone width: the headline and the tab row above the content. */
export const Mobile: Story = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
}
