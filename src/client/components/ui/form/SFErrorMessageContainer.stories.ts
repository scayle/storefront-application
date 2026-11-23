import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFErrorMessageContainer from './SFErrorMessageContainer.vue'

/**
 * SFErrorMessageContainer shows a form-level error, such as a failed password
 * change, as an error `SFHint`. It fades in when `message` is set and renders
 * nothing while `message` is empty, so a form can keep it mounted at all times
 * and only update the message.
 */
export default {
  title: 'UI/Form/SFErrorMessageContainer',
  component: SFErrorMessageContainer,
  parameters: { layout: 'centered' },
  args: {
    message: 'The current password you entered is incorrect.',
  },
} satisfies Meta<typeof SFErrorMessageContainer>

type Story = StoryObj<typeof SFErrorMessageContainer>

/** An error message as a form shows it after a failed submit. */
export const WithMessage: Story = {}

/** Shows and hides the message with a button, to preview the fade transition. */
export const ToggleMessage: Story = {
  render: (args) => ({
    components: { SFErrorMessageContainer },
    setup() {
      const isShown = ref(false)
      return { args, isShown }
    },
    template: `
      <div class="flex min-h-20 flex-col items-start gap-4">
        <button type="button" class="text-sm underline" @click="isShown = !isShown">
          {{ isShown ? 'Hide error' : 'Show error' }}
        </button>
        <SFErrorMessageContainer :message="isShown ? args.message : null" />
      </div>
    `,
  }),
}
