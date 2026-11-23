import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFNavigationTreeItem from './SFNavigationTreeItem.vue'

/**
 * SFNavigationTreeItem is a component used to render navigation items in a tree structure.
 * It supports links, icons, and different states like active or disabled.
 */
const meta = {
  title: 'UI/Navigation/SFNavigationTreeItem',
  component: SFNavigationTreeItem,
  parameters: { layout: 'centered' },
  argTypes: {
    isActive: {
      control: 'boolean',
      description: 'Whether the item is currently active',
    },
    raw: {
      control: 'boolean',
      description: 'Whether to render without default styles',
    },
    disabledLink: {
      control: 'boolean',
      description: 'Whether the link is disabled',
    },
    navigationItem: {
      control: 'object',
      description: 'The navigation item data',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFNavigationTreeItem>) => ({
    components: { SFNavigationTreeItem },
    setup() {
      return { args }
    },
    template: '<SFNavigationTreeItem v-bind="args" />',
  }),
} satisfies Meta<typeof SFNavigationTreeItem>

export default meta
type Story = StoryObj<typeof meta>

const defaultNavigationItem: NavigationItem = {
  id: 1,
  name: 'Home',
  href: '/',
  openInNewWindow: false,
  children: [],
  icon: undefined,
  linkColor: undefined,
  disabled: false,
}

/**
 * Default state of the navigation item.
 */
export const Default: Story = {
  args: {
    navigationItem: defaultNavigationItem,
  },
}

/**
 * Active state of the navigation item.
 */
export const Active: Story = {
  args: {
    navigationItem: defaultNavigationItem,
    isActive: true,
  },
}

/**
 * Navigation item with an icon.
 */
export const WithIcon: Story = {
  args: {
    navigationItem: {
      ...defaultNavigationItem,
      name: 'Account',
      icon: 'logo.svg',
    },
  },
}

/**
 * External link opening in a new window.
 */
export const External: Story = {
  args: {
    navigationItem: {
      ...defaultNavigationItem,
      name: 'External Link',
      href: 'https://google.com',
      openInNewWindow: true,
    },
  },
}

/**
 * Navigation item with a custom link color.
 */
export const CustomColor: Story = {
  args: {
    navigationItem: {
      ...defaultNavigationItem,
      name: 'Sale',
      linkColor: '#d42411',
    },
  },
}

/**
 * Raw variant without default styles.
 */
export const Raw: Story = {
  args: {
    navigationItem: defaultNavigationItem,
    raw: true,
  },
}

/**
 * Disabled link state (renders as non-link).
 */
export const Disabled: Story = {
  args: {
    navigationItem: defaultNavigationItem,
    disabledLink: true,
  },
}

/**
 * Item without href (renders as span/div).
 */
export const NoHref: Story = {
  args: {
    navigationItem: {
      ...defaultNavigationItem,
      name: 'Label Only',
      href: '',
    },
  },
}
