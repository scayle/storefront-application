import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { useRegle } from '@regle/core'
import { email, required } from '@regle/rules'
import { computed, ref } from 'vue'
import SFValidatedInputGroup from './SFValidatedInputGroup.vue'
import SFTextInput from './SFTextInput.vue'

/**
 * SFValidatedInputGroup wraps form inputs to provide validation error display.
 * It renders the default slot and shows error messages below if any errors are present.
 */
export default {
  title: 'UI/Form/SFValidatedInputGroup',
  component: SFValidatedInputGroup,
  argTypes: {
    errors: {
      control: 'object',
      description: 'Array of error messages',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFValidatedInputGroup>) => ({
    components: { SFValidatedInputGroup },
    setup() {
      const errors = ref<
        ComponentPropsAndSlots<typeof SFValidatedInputGroup>['errors']
      >(args.errors || [])
      const toggleErrors = () => {
        errors.value = errors.value?.length ? [] : ['This field is required']
      }
      return { errors, toggleErrors }
    },
    template: `
      <SFValidatedInputGroup :errors="errors">
        <div class="bg-status-warning/10 p-2 space-y-2 rounded-md">
          <p>Content to validate</p>
          <div>
            <button class="cursor-pointer bg-primary text-white px-2 py-1.5 rounded-md text-sm" @click="toggleErrors">Toggle Errors</button>
          </div>
        </div>
      </SFValidatedInputGroup>
    `,
  }),
} satisfies Meta<typeof SFValidatedInputGroup>

type Story = StoryObj<typeof SFValidatedInputGroup>

/**
 * Default state with no errors initially.
 * The wrapped content is shown, and errors will appear below if added to the errors prop.
 */
export const Default: Story = {
  args: {
    errors: [],
  },
}

/**
 * A realistic email validation example using regle.
 * Errors only appear after the user has interacted with the field (on blur).
 */
export const EmailValidation: Story = {
  render: () => ({
    components: { SFValidatedInputGroup, SFTextInput },
    setup() {
      const { r$ } = useRegle(
        { email: '' },
        {
          email: { required, email },
        },
      )

      const errors = computed(() => r$.$fields.email.$errors)

      return { r$, errors }
    },
    template: `
      <div class="w-80">
        <SFValidatedInputGroup :errors="errors">
          <template #default="{ isValid, errorId }">
            <SFTextInput
              v-model="r$.$fields.email.$value"
              placeholder="Email"
              type="email"
              :has-errors="!isValid"
              :aria-describedby="errorId"
              @blur="r$.$fields.email.$touch()"
            />
          </template>
        </SFValidatedInputGroup>
      </div>
    `,
  }),
  args: {},
}
