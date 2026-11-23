import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFMobileNavigation from './SFMobileNavigation.vue'

const flatItems: NavigationItem[] = [
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
    name: 'Sale',
    href: '/sale',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
]

const itemsWithSubmenu: NavigationItem[] = [
  ...flatItems,
  {
    id: 3,
    name: 'Women',
    href: '/c/women',
    openInNewWindow: false,
    children: [
      {
        id: 31,
        name: 'Dresses',
        href: '',
        openInNewWindow: false,
        children: [
          {
            id: 311,
            name: 'Evening',
            href: '/c/women/dresses/evening',
            openInNewWindow: false,
            children: [],
            icon: undefined,
            linkColor: undefined,
            disabled: false,
          },
          {
            id: 312,
            name: 'Casual',
            href: '/c/women/dresses/casual',
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
      {
        id: 32,
        name: 'Tops',
        href: '/c/women/tops',
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
 * SFMobileNavigation renders the main and sub-level navigation lists inside the mobile sidebar.
 * Supports drill-down: tapping an item with children shows a sub-navigation panel with back button.
 */
const meta = {
  title: 'UI/Navigation/Header/SFMobileNavigation',
  component: SFMobileNavigation,
  parameters: { layout: 'centered' },
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description:
        'Whether the mobile nav is visible (resets sub-level when toggled).',
    },
    navigationItems: {
      control: 'object',
      description:
        'Top-level navigation items (links and categories with children).',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFMobileNavigation>) => ({
    components: { SFMobileNavigation },
    setup() {
      return { args }
    },
    template:
      '<div class="h-[400px] w-[320px] border border-gray-200"><SFMobileNavigation v-bind="args" @click-link="args.onClickLink" /></div>',
  }),
} satisfies Meta<typeof SFMobileNavigation>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Closed state; main nav list is visible but panel can be collapsed.
 */
export const Default: Story = {
  args: {
    isOpen: true,
    navigationItems: itemsWithSubmenu,
  },
}

/**
 * Flat list without categories (no drill-down).
 */
export const FlatLinks: Story = {
  args: {
    isOpen: true,
    navigationItems: flatItems,
  },
}

/**
 * Closed state; useful to see container without content emphasis.
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    navigationItems: itemsWithSubmenu,
  },
}
