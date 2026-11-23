import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ButtonVariant, Size } from '@client/utils/constants'
import IconNavigationDown from '@assets/icons/navigation/down.svg'
import IconNavigationClose from '@assets/icons/navigation/close.svg'
import SFButton from './SFButton.vue'

/**
 * SFButton is a versatile button component for actions, forms, and toolbars.
 *
 * Key features:
 * - Multiple visual variants (Primary, Secondary, Plain, Accent, Raw)
 * - Sizes from sm to xl
 * - Leading and trailing icon slots (`prepend-icon`, `append-icon`); icon size follows button typography
 * - Asymmetric corner radius via `rounded-left` / `rounded-right` (attached fields, icon-only controls)
 * - Loading state for async operations
 *
 * Navigation uses SFLink (or a future link-with-button-styles component), not SFButton.
 */
export default {
  title: 'UI/Core/SFButton',
  component: SFButton,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: Object.values(ButtonVariant),
    },
    size: {
      control: { type: 'select' },
      options: Object.values(Size),
    },
    roundedLeft: {
      control: 'boolean',
    },
    roundedRight: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    onClick: {
      action: 'clicked',
      description:
        'Event handler for button clicks. Use this for handling user interactions and triggering actions.',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFButton>) => ({
    components: { SFButton },
    setup() {
      return { args }
    },
    template: `<SFButton v-bind="args">{{ args.default }}</SFButton>`,
  }),
} satisfies Meta<typeof SFButton>

type Story = StoryObj<typeof SFButton>

/**
 * Primary buttons are used for the main call-to-action in a section or page.
 * They have the highest visual emphasis and should be used sparingly to maintain their impact.
 */
export const Primary: Story = {
  args: {
    variant: ButtonVariant.PRIMARY,
    size: Size.MD,
    default: 'Primary',
  },
}

export const Secondary: Story = {
  args: {
    variant: ButtonVariant.SECONDARY,
    size: Size.MD,
    default: 'Secondary',
  },
}

/**
 * Plain buttons use a transparent background for low-emphasis actions
 * such as icon controls and text-adjacent triggers.
 */
export const Plain: Story = {
  args: {
    variant: ButtonVariant.PLAIN,
    size: Size.MD,
    default: 'Plain',
  },
}

export const Accent: Story = {
  args: {
    variant: ButtonVariant.ACCENT,
    size: Size.MD,
    default: 'Add to basket',
  },
}

/**
 * Raw buttons have minimal styling and are typically used for less important actions
 * or when you want the button to blend in with the surrounding content.
 */
export const Raw: Story = {
  args: {
    variant: ButtonVariant.RAW,
    size: Size.MD,
    default: 'Raw',
  },
}

/**
 * Buttons can include icons to enhance visual communication and improve usability.
 * Icons can be placed before the text to indicate the action type or provide visual context.
 */
export const ButtonWithIcon: Story = {
  args: {
    default: 'Button with Icon',
  },
  render: (args: ComponentPropsAndSlots<typeof SFButton>) => ({
    components: {
      SFButton,
      IconNavigationDown,
    },
    setup() {
      return { args }
    },
    template: `
    <SFButton v-bind="args">
      <template #prepend-icon>
        <IconNavigationDown />
      </template>
      {{ args.default }}
    </SFButton>`,
  }),
}

/**
 * Appended icons are placed after the text and are commonly used for actions
 * that indicate direction or additional information (like dropdowns or external links).
 */
export const ButtonWithAppendedIcon: Story = {
  args: {
    default: 'Appended Icon',
  },
  render: (args: ComponentPropsAndSlots<typeof SFButton>) => ({
    components: {
      SFButton,
      IconNavigationDown,
    },
    setup() {
      return { args }
    },
    template: `
    <SFButton v-bind="args">
      <template #append-icon>
        <IconNavigationDown />
      </template>
      {{ args.default }}
    </SFButton>`,
  }),
}

/**
 * Loading uses the skeleton placeholder style and disables interaction. Label and icons stay visible.
 */
export const Loading: Story = {
  args: {
    variant: ButtonVariant.PRIMARY,
    size: Size.MD,
    loading: true,
    default: 'Loading',
  },
}

export const Disabled: Story = {
  args: {
    variant: ButtonVariant.PRIMARY,
    size: Size.MD,
    disabled: true,
    default: 'Disabled',
  },
}

/**
 * `rounded-right` rounds the top-right and bottom-right corners only.
 */
export const RoundedRight: Story = {
  args: {
    variant: ButtonVariant.PRIMARY,
    roundedRight: true,
    default: 'Rounded right',
  },
}

/**
 * `rounded-left` rounds the top-left and bottom-left corners only.
 */
export const RoundedLeft: Story = {
  args: {
    variant: ButtonVariant.PRIMARY,
    roundedLeft: true,
    default: 'Rounded left',
  },
}

/**
 * Icon-only buttons use `prepend-icon` or `append-icon` without a label.
 * Side rounding props are ignored for the `raw` variant; use `class` for custom shape when needed.
 */
export const IconOnly: Story = {
  args: {
    variant: ButtonVariant.ACCENT,
  },
  render: (args: ComponentPropsAndSlots<typeof SFButton>) => ({
    components: {
      SFButton,
      IconNavigationClose,
    },
    setup() {
      return { args }
    },
    template: `
    <SFButton v-bind="args" aria-label="Close">
      <template #prepend-icon>
        <IconNavigationClose />
      </template>
    </SFButton>`,
  }),
}
