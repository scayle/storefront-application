import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { mocked } from 'storybook/test'
import { reactive } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { routes } from '@shared/routes'
import { createVisitClaim } from '../../../../.storybook/inertia-mock'
import SFAccountSideMenu from './SFAccountSideMenu.vue'

/**
 * SFAccountSideMenu is the desktop navigation of the My Account pages, shown by
 * `SFAccountLayout` from the `lg` breakpoint up. Its items and their order come
 * from `useAccountMenu`, which it shares with the mobile `SFAccountTabs` row.
 *
 * The item for the current page is highlighted and marked `aria-current`.
 * Which one that is comes from the page url, so the story sets `usePage().url`.
 * Clicking an item makes it the active one.
 */
export default {
  title: 'Account/SFAccountSideMenu',
  component: SFAccountSideMenu,
  render: () => ({
    components: { SFAccountSideMenu },
    setup() {
      const page = reactive({ ...usePage() })
      mocked(usePage).mockReturnValue(page)
      const claim = createVisitClaim((url) => {
        page.url = url.pathname
      })
      return { claim }
    },
    // The width `SFAccountLayout` gives the menu.
    template: `
      <div @pointerdown.capture="claim" @keydown.capture="claim">
        <SFAccountSideMenu class="w-64" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFAccountSideMenu>

type Story = StoryObj<typeof SFAccountSideMenu>

/** On the subscriptions page, so the middle item is the active one. */
export const Default: Story = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      url: routes.accountSubscriptions,
    })
  },
}
