import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFHeaderNavigationItem from './SFHeaderNavigationItem.vue'

const simpleItem: NavigationItem = {
  id: 1,
  name: 'Sale',
  href: '/sale',
  openInNewWindow: false,
  children: [],
  icon: undefined,
  linkColor: undefined,
  disabled: false,
}

const itemWithChildren: NavigationItem = {
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
      children: [
        {
          id: 211,
          name: 'Evening',
          href: '/c/women/dresses/evening',
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
  ],
  icon: undefined,
  linkColor: undefined,
  disabled: false,
}

/**
 * SFHeaderNavigationItem renders a single top-level nav item in the desktop header.
 * Shows a flyout on hover/click when the item has children. Active state is derived from current route.
 */
const meta = {
  title: 'UI/Navigation/Header/SFHeaderNavigationItem',
  component: SFHeaderNavigationItem,
  argTypes: {
    navigationItem: {
      control: 'object',
      description: 'The navigation item (link or category with children).',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: (args: ComponentPropsAndSlots<typeof SFHeaderNavigationItem>) => ({
    components: { SFHeaderNavigationItem },
    setup() {
      return { args }
    },
    template:
      '<ul class="flex h-16 list-none"><SFHeaderNavigationItem v-bind="args" /></ul>',
  }),
} satisfies Meta<typeof SFHeaderNavigationItem>

export default meta
type Story = StoryObj<typeof SFHeaderNavigationItem>

/**
 * Simple link without children (no flyout).
 */
export const Default = {
  args: {
    navigationItem: simpleItem,
  },
} satisfies Story

/**
 * Item with children; hover or focus opens the flyout.
 */
export const WithFlyout = {
  args: {
    navigationItem: itemWithChildren,
  },
} satisfies Story

/**
 * Category link that matches current URL (active state). Preview mock has url "/".
 */
export const ActiveLink = {
  args: {
    navigationItem: {
      ...simpleItem,
      name: 'Home',
      href: '/',
    },
  },
} satisfies Story
