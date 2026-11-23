import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { NavigationItem } from '@scayle/storefront/types'
import SFHeader from './SFHeader.vue'

const defaultNavItems: NavigationItem[] = [
  {
    id: 1,
    name: 'Home',
    href: '/',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
  {
    id: 2,
    name: 'Women',
    href: '/c/women',
    openInNewWindow: false,
    children: [
      {
        id: 21,
        name: 'Dresses',
        href: '/c/women/dresses',
        openInNewWindow: false,
        children: [],
        icon: undefined,
        linkColor: undefined,
        disabled: false,
      },
    ],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
]

/**
 * SFHeader is the main site header with logo, desktop nav (with flyouts), search, and action icons.
 * On small screens it shows a hamburger that opens the mobile sidebar. Uses Inertia page props for navigation and URLs.
 */
const meta = {
  title: 'UI/Navigation/Header/SFHeader',
  component: SFHeader,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    navigationItems: defaultNavItems,
  },
  render: (args) => ({
    components: { SFHeader },
    setup: () => ({ args }),
    template: '<SFHeader v-bind="args" class="w-full"/>',
  }),
} satisfies Meta<typeof SFHeader>

export default meta
type Story = StoryObj<typeof SFHeader>

/**
 * Default header with navigation from preview mock (Home, Women with children).
 */
export const Default = {
  args: {
    navigationItems: defaultNavItems,
  },
} satisfies Story

/**
 * Header with the mobile sidebar open. The play function presses the menu
 * toggle, which loads the sidebar on its first open.
 */
export const MobileSidebarOpen = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  args: {
    navigationItems: defaultNavItems,
  },
  // The sidebar reads the navigation from the shared page props.
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: { ...page.props, navigation: defaultNavItems },
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('side-navigation-button'))
    await waitFor(() =>
      expect(canvas.getByTestId('mobile-sidebar')).toBeVisible(),
    )
  },
} satisfies Story

/**
 * Header at a viewport width of 280px, below the 320px reflow reference width.
 * The spacing between the menu button, logo and icons shrinks to 8px, so the
 * basket icon stays inside the page margin.
 */
export const NarrowViewport = {
  parameters: {
    viewport: {
      options: {
        narrow: { name: '280px', styles: { width: '280px', height: '640px' } },
      },
    },
  },
  globals: {
    viewport: { value: 'narrow', isRotated: false },
  },
  args: {
    navigationItems: defaultNavItems,
  },
  play: async ({ canvas }) => {
    // The pinned viewport applies after the first render.
    await waitFor(() => expect(window.innerWidth).toBe(280))
    const basketLink = canvas.getByTestId('basket-link')
    // Fails without `max-[20rem]` on the header row, where the basket icon
    // leaves the viewport, and when `body` has a `min-width` again.
    await expect(basketLink.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    )
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    )
  },
} satisfies Story

const longNavItems: NavigationItem[] = [
  'Women',
  'Men',
  'Kids',
  'Sports',
  'Beauty',
  'Outdoor',
  'Brands',
  'Sale',
].map((name, index) => ({
  id: index + 1,
  name,
  href: `/c/${name.toLowerCase()}`,
  openInNewWindow: false,
  children: [],
  icon: undefined,
  linkColor: undefined,
  disabled: false,
}))

/**
 * Eight navigation items on a 1280px screen. The play function focuses the
 * search field, which widens only into the free space and leaves the last
 * navigation link uncovered.
 */
export const FocusedSearchWithLongNavigation = {
  globals: {
    viewport: { value: 'desktop', isRotated: false },
  },
  args: {
    navigationItems: longNavItems,
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    // The pinned viewport applies after the first render, the search field
    // is hidden below `lg` until then.
    const search = await canvas.findByRole('search')
    await userEvent.click(canvas.getByRole('combobox', { name: 'Search' }))
    await Promise.all(
      canvasElement
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    )
    const lastLink = canvas.getByRole('link', { name: 'Sale' })
    await expect(lastLink.getBoundingClientRect().right).toBeLessThanOrEqual(
      search.getBoundingClientRect().left,
    )
    // `min-w-40` on the header's search field
    await expect(search.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      160,
    )
  },
} satisfies Story

/**
 * Header in isolation with minimal chrome for layout review.
 */
export const Layout: Story = {
  args: {
    navigationItems: defaultNavItems,
  },
  globals: {
    backgrounds: { value: 'gray' },
  },
}
