import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import type { NavigationItem } from '@scayle/storefront/types'
import SFFooterLinkSection from './SFFooterLinkSection.vue'

const sectionWithChildren: NavigationItem = {
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
}

/**
 * SFFooterLinkSection renders a collapsible section in the footer with a title and child links.
 * On mobile the section can be expanded/collapsed; on desktop it is always expanded.
 */
const meta = {
  title: 'UI/Navigation/Footer/SFFooterLinkSection',
  component: SFFooterLinkSection,
  argTypes: {
    section: {
      control: 'object',
      description: 'Section data (title + children links).',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFFooterLinkSection>) => ({
    components: { SFFooterLinkSection },
    setup() {
      return { args }
    },
    template: '<SFFooterLinkSection v-bind="args" />',
  }),
} satisfies Meta<typeof SFFooterLinkSection>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default footer link section with a title and two child links.
 */
export const Default: Story = {
  args: {
    section: {
      ...sectionWithChildren,
      name: 'Information',
      children: [
        {
          id: 1,
          name: 'About',
          href: '/about',
          openInNewWindow: false,
          children: [],
          icon: undefined,
          linkColor: undefined,
          disabled: false,
        },
        {
          id: 2,
          name: 'Shipping',
          href: '/shipping',
          openInNewWindow: false,
          children: [],
          icon: undefined,
          linkColor: undefined,
          disabled: false,
        },
        {
          id: 3,
          name: 'Returns',
          href: '/returns',
          openInNewWindow: false,
          children: [],
          icon: undefined,
          linkColor: undefined,
          disabled: false,
        },
      ],
    },
  },
}
