import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFTextInput from './SFTextInput.vue'

/**
 * SFTextInput is the canonical single-line text field from the SCAYLE Storefront
 * Design System. It provides the shared floating-label anatomy and states
 * (default, hover, focus, filled, disabled, error). Use `SFPasswordInput` for
 * password affordances. Pass `type="date"` for native date fields.
 *
 * Validation errors are rendered by `SFValidatedInputGroup`, which passes
 * `hasErrors` and `aria-describedby` into the input. Helper text is hidden
 * while the field is invalid so both messages share the same vertical space.
 *
 * Styling is driven by the semantic tokens in `design-tokens.css`.
 */
const meta = {
  title: 'UI/Form/SFTextInput',
  component: SFTextInput,
  parameters: { layout: 'centered' },
  args: {
    placeholder: 'Email address',
    helperText: 'We will never share your email.',
  },
  render: (args: ComponentPropsAndSlots<typeof SFTextInput>) => ({
    components: { SFTextInput },
    setup() {
      const value = ref(args.modelValue ?? '')
      return { args, value }
    },
    template: `
      <div class="w-96 p-6">
        <SFTextInput v-bind="args" v-model="value" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFTextInput>

export default meta

type Story = StoryObj<typeof SFTextInput>

/**
 * Empty default field. The label sits inside the input as the placeholder
 * and floats above on focus or once a value is entered.
 */
export const Default: Story = {}

/**
 * Pre-filled default field. The label is docked above the input and the
 * field carries the white background with the `border-gray-400` token.
 */
export const Filled: Story = {
  args: { modelValue: 'text@example.com' },
}

/**
 * Required field. Adds an asterisk after the label.
 */
export const Required: Story = {
  args: { required: true },
}

/**
 * Disabled field. Uses `bg-disabled-background`, `text-disabled` and
 * `border-disabled-border` tokens and blocks pointer events.
 */
export const Disabled: Story = {
  args: { disabled: true, modelValue: '' },
}

/**
 * Read-only field. Looks filled but keeps the value uneditable.
 */
export const Readonly: Story = {
  args: { readonly: true, modelValue: 'text@example.com' },
}

/**
 * Date input type. Uses the browser native date picker.
 */
export const DateInput: Story = {
  args: {
    placeholder: 'Birth date',
    type: 'date',
    modelValue: '',
  },
}

/**
 * Error state. Applies alert border and label styling. Use with
 * `SFValidatedInputGroup` for the error message below the field.
 */
export const ErrorState: Story = {
  args: {
    hasErrors: true,
    modelValue: 'not-an-email',
    helperText: 'We will never share your email.',
  },
}

/**
 * Custom leading icon and helper text via slots.
 */
export const WithLeadingIcon: Story = {
  args: {
    placeholder: 'Coupon code',
    helperText: 'Apply at checkout.',
  },
  render: (args) => ({
    components: { SFTextInput },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template: `
      <div class="max-w-sm p-6">
        <SFTextInput v-bind="args" v-model="value">
          <template #leading-icon>
            <span aria-hidden="true">$</span>
          </template>
        </SFTextInput>
      </div>
    `,
  }),
}

/**
 * Overview specimen rendering every state for the default field so the
 * design system can be reviewed at a glance.
 */
export const StateMatrix: Story = {
  render: () => ({
    components: { SFTextInput },
    setup() {
      const filledValue = ref('test@example.com')
      return { filledValue }
    },
    template: `
      <div class="grid max-w-3xl grid-cols-2 gap-6 p-6">
        <SFTextInput placeholder="Default (empty)" />
        <SFTextInput placeholder="Filled" :model-value="filledValue" @update:model-value="filledValue = $event" />
        <SFTextInput placeholder="Required" required />
        <SFTextInput placeholder="Error" has-errors :model-value="filledValue" @update:model-value="filledValue = $event" />
        <SFTextInput placeholder="Disabled" disabled />
        <SFTextInput placeholder="Readonly" readonly :model-value="filledValue" @update:model-value="filledValue = $event" />
      </div>
    `,
  }),
}
