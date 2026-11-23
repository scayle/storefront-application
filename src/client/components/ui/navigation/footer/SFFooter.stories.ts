import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFFooter from './SFFooter.vue'

const footerSections: NavigationItem[] = [
  {
    id: 10,
    name: 'Customer Service',
    href: '',
    openInNewWindow: false,
    children: [
      {
        id: 101,
        name: 'Contact',
        href: '/contact',
        openInNewWindow: false,
        children: [],
        icon: undefined,
        linkColor: undefined,
        disabled: false,
      },
      {
        id: 102,
        name: 'FAQ',
        href: '/faq',
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
    id: 10,
    name: 'Help & Support',
    href: '',
    openInNewWindow: false,
    children: [
      {
        id: 101,
        name: 'Helpdesk',
        href: '/contact',
        openInNewWindow: false,
        children: [],
        icon: undefined,
        linkColor: undefined,
        disabled: false,
      },
      {
        id: 102,
        name: 'Shipping',
        href: '/faq',
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

const bottomLinks: NavigationItem[] = [
  {
    id: 201,
    name: 'Imprint',
    href: '/imprint',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
  {
    id: 202,
    name: 'Terms',
    href: '/terms',
    openInNewWindow: false,
    children: [],
    icon: undefined,
    linkColor: undefined,
    disabled: false,
  },
]

/**
 * SFFooter is the main site footer with logo, link sections, and bottom bar.
 * The link sections and bottom bar links come in as props, not from Inertia page props.
 */
const meta = {
  title: 'UI/Navigation/Footer/SFFooter',
  component: SFFooter,
  argTypes: {
    navigationItems: {
      control: 'object',
      description: 'Footer sections (each with children links).',
    },
    bottomNavigationItems: {
      control: 'object',
      description: 'Links in the bottom footer row.',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFFooter>) => ({
    components: { SFFooter },
    setup() {
      return { args }
    },
    template: '<SFFooter v-bind="args" />',
  }),
} satisfies Meta<typeof SFFooter>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default footer with one section and bottom links.
 */
export const Default: Story = {
  args: {
    navigationItems: [
      ...footerSections,
      {
        id: 20,
        name: 'Shop',
        href: '',
        openInNewWindow: false,
        children: [
          {
            id: 201,
            name: 'Women',
            href: '/c/women',
            openInNewWindow: false,
            children: [],
            icon: undefined,
            linkColor: undefined,
            disabled: false,
          },
          {
            id: 202,
            name: 'Men',
            href: '/c/men',
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
    bottomNavigationItems: bottomLinks,
  },
}
