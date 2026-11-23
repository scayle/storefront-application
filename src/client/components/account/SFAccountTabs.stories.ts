import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { mocked } from 'storybook/test'
import { reactive } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { routes } from '@shared/routes'
import { createVisitClaim } from '../../../../.storybook/inertia-mock'
import SFAccountTabs from './SFAccountTabs.vue'

/**
 * SFAccountTabs is the mobile navigation of the My Account pages, a scrollable
 * row of tabs that `SFAccountLayout` shows below the `lg` breakpoint. Its items
 * and their order come from `useAccountMenu`, which it shares with the desktop
 * `SFAccountSideMenu`.
 *
 * On mount the row scrolls the tab for the current page into view, so a tab
 * that does not fit the screen is still visible after navigating to its page.
 * Which tab is active comes from the page url, so the story sets
 * `usePage().url`. Clicking a tab makes it the active one.
 */
export default {
  title: 'Account/SFAccountTabs',
  component: SFAccountTabs,
  render: () => ({
    components: { SFAccountTabs },
    setup() {
      const page = reactive({ ...usePage() })
      mocked(usePage).mockReturnValue(page)
      const claim = createVisitClaim((url) => {
        page.url = url.pathname
      })
      return { claim }
    },
    // A fixed width keeps the last tab off screen at mount. The pinned viewport
    // applies only after the first render on a fresh load, and the docs column
    // is wide enough to fit every tab.
    template: `
      <div @pointerdown.capture="claim" @keydown.capture="claim">
        <SFAccountTabs class="w-80 max-w-full" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFAccountTabs>

type Story = StoryObj<typeof SFAccountTabs>

/**
 * On the profile page, whose tab is the last one and starts off screen. The row
 * scrolls it into view on mount.
 */
export const ActiveTabOffScreen: Story = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({ ...page, url: routes.accountProfile })
  },
}
