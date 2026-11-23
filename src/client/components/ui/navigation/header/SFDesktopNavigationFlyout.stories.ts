import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFDesktopNavigationFlyout from './SFDesktopNavigationFlyout.vue'

const itemWithColumns: NavigationItem = {
  id: 1,
  name: 'Women',
  href: '/c/women',
  openInNewWindow: false,
  children: [
    {
      id: 11,
      name: 'Dresses',
      href: '/c/women/dresses',
      openInNewWindow: false,
      children: [
        {
          id: 111,
          name: 'Evening',
          href: '/c/women/dresses/evening',
          openInNewWindow: false,
          children: [],
          icon: undefined,
          linkColor: undefined,
          disabled: false,
        },
        {
          id: 112,
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
      id: 12,
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
}

/**
 * SFDesktopNavigationFlyout shows a dropdown panel for a navigation item with children.
 * Renders columns (categories) with optional rows of sub-links. Used in the main header.
 */
const meta = {
  title: 'UI/Navigation/Header/SFDesktopNavigationFlyout',
  component: SFDesktopNavigationFlyout,
  argTypes: {
    item: {
      control: 'object',
      description: 'Navigation item with children (columns and rows).',
    },
    onClose: {
      action: 'close',
      description: 'Emitted when a link is clicked or flyout should close.',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFDesktopNavigationFlyout>) => ({
    components: { SFDesktopNavigationFlyout },
    setup() {
      return { args }
    },
    template:
      '<SFDesktopNavigationFlyout v-bind="args" @close="args.onClose" />',
  }),
} satisfies Meta<typeof SFDesktopNavigationFlyout>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default flyout with two columns and sub-links under the first column.
 */
export const Default: Story = {
  args: {
    item: itemWithColumns,
  },
}

/**
 * Single column with multiple sub-links.
 */
export const SingleColumn: Story = {
  args: {
    item: {
      id: 1,
      name: 'Sale',
      href: '/sale',
      openInNewWindow: false,
      children: [
        {
          id: 10,
          name: 'Women Sale',
          href: '/sale/women',
          openInNewWindow: false,
          children: [
            {
              id: 101,
              name: 'Dresses',
              href: '/sale/women/dresses',
              openInNewWindow: false,
              children: [],
              icon: undefined,
              linkColor: undefined,
              disabled: false,
            },
            {
              id: 102,
              name: 'Shoes',
              href: '/sale/women/shoes',
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
    },
  },
}

/**
 * Columns without nested children (only column headers as links).
 */
export const ColumnsOnly: Story = {
  args: {
    item: {
      id: 1,
      name: 'Shop',
      href: '/shop',
      openInNewWindow: false,
      children: [
        {
          id: 11,
          name: 'New In',
          href: '/new',
          openInNewWindow: false,
          children: [],
          icon: undefined,
          linkColor: undefined,
          disabled: false,
        },
        {
          id: 12,
          name: 'Brands',
          href: '/brands',
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
  },
}
