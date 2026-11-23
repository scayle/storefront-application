import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { usePage } from '@inertiajs/vue3'
import { mocked } from 'storybook/test'
import SFLogoLink from './SFLogoLink.vue'

/**
 * SFLogoLink is the shop logo in the header and footer, linking to the home
 * page. It takes no props: the current page URL decides its state.
 *
 * On the home page it is announced as disabled and does nothing for keyboard
 * and screen reader activation, while a pointer click scrolls back to the top.
 * Everywhere else it navigates home.
 *
 * The default Storybook page URL is `/`, so the stories show the home page
 * state unless they mock a different URL.
 */
export default {
  title: 'UI/Navigation/SFLogoLink',
  component: SFLogoLink,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SFLogoLink>

type Story = StoryObj<typeof SFLogoLink>

/** Off the home page: a link to the home page. */
export const OffHomePage: Story = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({ ...page, url: '/c/women' })
  },
}

/** On the home page: announced as disabled, labeled "You are on the homepage". */
export const OnHomePage: Story = {}
