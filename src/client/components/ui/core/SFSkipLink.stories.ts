import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFSkipLink from './SFSkipLink.vue'

/** Template shared by every story. `Focused` passes classes that force the focused look. */
const renderSkipLink = (wrapperClasses = '') => `
  <div class="relative h-40 translate-x-0 overflow-hidden border border-gray-200 ${wrapperClasses}">
    <SFSkipLink v-bind="args" />
    <div class="flex gap-4 p-4 pt-20 text-sm">
      <div id="header-search">Search</div>
      <div id="header-basket">Basket</div>
      <div id="main-content">Main content</div>
    </div>
  </div>
`

/**
 * SFSkipLink is the bar of skip links at the very top of every layout, the
 * first thing a keyboard user reaches with Tab. It stays off screen until one
 * of its links receives focus, then slides in so all links show at once.
 *
 * "Skip to main content" is always there. `Layout` adds "Skip to search" and,
 * outside the basket page, "Skip to basket"; both are hidden below the `lg`
 * breakpoint because their targets only exist in the desktop header.
 *
 * The bar is `position: fixed`, so each story wraps it in a transformed box
 * that becomes its containing block, and renders the link targets so the
 * anchors resolve. Click into the canvas and press Tab to bring it in.
 */
export default {
  title: 'UI/Core/SFSkipLink',
  component: SFSkipLink,
  args: {
    search: false,
    basket: false,
  },
  render: (args) => ({
    components: { SFSkipLink },
    setup() {
      return { args }
    },
    template: renderSkipLink(),
  }),
} satisfies Meta<typeof SFSkipLink>

type Story = StoryObj<typeof SFSkipLink>

/** `SimpleLayout`: only "Skip to main content", hidden until focused. */
export const MainContentOnly: Story = {}

/** `Layout`: all three links, hidden until focused. */
export const AllLinks: Story = {
  args: { search: true, basket: true },
}

/**
 * The bar as it looks after a Tab press: slid into view, with the focus ring
 * on the first link. Real focus depends on the preview frame having focus, so
 * this story applies the slide-in and the `focus-style` utility directly
 * instead. The other stories show the real behavior when you press Tab.
 */
export const Focused: Story = {
  args: { search: true, basket: true },
  render: (args) => ({
    components: { SFSkipLink },
    setup() {
      return { args }
    },
    // The `nav` and `a` overrides copy the `focus-within` slide-in on the nav
    // and the focus-visible part of the `sf-skip-link` utility in `index.css`.
    // Update them when either changes.
    template: renderSkipLink(
      '[&_a:first-child]:focus-style [&_a:first-child]:border-primary [&_nav]:translate-y-0',
    ),
  }),
}
