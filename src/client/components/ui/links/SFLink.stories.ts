import type {
  Meta,
  ComponentPropsAndSlots,
  StoryObj,
} from '@storybook/vue3-vite'
import SFLink from './SFLink.vue'

/**
 * SFLink is the storefront navigation link. Default styling follows the Figma
 * Standard text link spec (underline, primary color, accent on hover). Use `raw`
 * when the parent supplies its own layout and colors (navigation pills, toasts).
 */
export default {
  title: 'UI/Links/SFLink',
  component: SFLink,
  parameters: { layout: 'centered' },
  argTypes: {
    raw: { control: 'boolean' },
    disabled: { control: 'boolean' },
    target: {
      control: { type: 'select' },
      options: ['_self', '_blank', '_parent', '_top'],
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFLink>) => ({
    components: { SFLink },
    setup() {
      return { args }
    },
    template: `<SFLink v-bind="args">{{ args.default }}</SFLink>`,
  }),
} satisfies Meta<typeof SFLink>

type Story = StoryObj<typeof SFLink>

/**
 * Standard link in body copy. Typography inherits from the parent paragraph.
 */
export const Default: Story = {
  args: {
    to: '/',
    raw: false,
    target: '_self',
    default: 'Standard link',
  },
  render: (args) => ({
    components: { SFLink },
    setup() {
      return { args }
    },
    template: `
      <p class="text-md text-secondary">
        Shop our
        <SFLink v-bind="args">{{ args.default }}</SFLink>
        collection.
      </p>
    `,
  }),
}

/**
 * Standard link inside a larger headline to show inherited font size and weight.
 */
export const InHeadline: Story = {
  args: {
    to: '/',
    raw: false,
    default: 'details',
  },
  render: (args) => ({
    components: { SFLink },
    setup() {
      return { args }
    },
    template: `
      <h2 class="text-2xl font-bold text-primary">
        Order confirmed.
        <SFLink v-bind="args">{{ args.default }}</SFLink>
      </h2>
    `,
  }),
}

/**
 * Disabled Standard state: gray text, underline, non-interactive.
 */
export const Disabled: Story = {
  args: {
    to: '/',
    disabled: true,
    default: 'Disabled link',
  },
}

/**
 * Raw mode: no SFLink styles. Caller classes apply (navigation, toasts, etc.).
 */
export const Raw: Story = {
  args: {
    to: '/',
    raw: true,
    default: 'Raw link',
  },
  render: (args) => ({
    components: { SFLink },
    setup() {
      return { args }
    },
    template: `
      <span class="text-md font-semibold text-secondary">
        <SFLink v-bind="args" class="underline">{{ args.default }}</SFLink>
      </span>
    `,
  }),
}
