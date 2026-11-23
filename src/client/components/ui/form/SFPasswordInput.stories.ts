import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFPasswordInput from './SFPasswordInput.vue'

/**
 * SFPasswordInput wraps `SFTextInput` with a trailing show/hide password toggle.
 * Use inside `SFValidatedInputGroup` for login and account password fields.
 */
const meta = {
  title: 'UI/Form/SFPasswordInput',
  component: SFPasswordInput,
  parameters: { layout: 'centered' },
  args: {
    placeholder: 'Password',
    helperText: 'At least 8 characters.',
  },
  render: (args) => ({
    components: { SFPasswordInput },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template: `
      <div class="w-96">
        <SFPasswordInput v-bind="args" v-model="value" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFPasswordInput>

export default meta

type Story = StoryObj<typeof SFPasswordInput>

/**
 * Password field with a trailing eye / eye-off toggle.
 */
export const Default: Story = {}

/**
 * Password field with a trailing text link such as "Forgot password?".
 */
export const WithTrailingLink: Story = {
  args: {
    placeholder: 'Password',
    helperText: undefined,
  },
  render: (args) => ({
    components: { SFPasswordInput },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template: `
      <div class="w-96">
        <SFPasswordInput v-bind="args" v-model="value">
          <template #trailing-link>
            <a href="#" class="text-accent">Forgot?</a>
          </template>
        </SFPasswordInput>
      </div>
    `,
  }),
}
