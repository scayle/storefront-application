import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFMobileSidebar from './SFMobileSidebar.vue'

const navItems: NavigationItem[] = [
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
 * SFMobileSidebar is the full-screen overlay containing search, mobile navigation, store finder, and account actions.
 * Depends on Inertia page props for optional user for logout.
 */
const meta = {
  title: 'UI/Navigation/Header/SFMobileSidebar',
  component: SFMobileSidebar,
  parameters: { layout: 'centered' },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the sidebar is visible.',
    },
    navigationItems: {
      control: 'object',
      description: 'Navigation tree for the mobile menu.',
    },
    onClose: {
      action: 'close',
      description:
        'Emitted when sidebar should close (e.g. link click, route change).',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFMobileSidebar>) => ({
    components: { SFMobileSidebar },
    setup() {
      return { args }
    },
    template:
      '<div class="relative h-[400px] w-[360px] border border-gray-200 overflow-hidden"><SFMobileSidebar v-bind="args" @close="args.onClose" /></div>',
  }),
} satisfies Meta<typeof SFMobileSidebar>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Sidebar open with navigation and placeholders (search, store finder, shop switcher).
 */
export const Default: Story = {
  args: {
    id: 'mobile-sidebar-story',
    open: true,
    navigationItems: navItems,
  },
}
