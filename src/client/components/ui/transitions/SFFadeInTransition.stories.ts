import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFFadeInTransition from './SFFadeInTransition.vue'

/**
 * SFFadeInTransition provides a simple fade in/out animation for content.
 * It uses opacity transitions with a linear easing and includes an out-in mode
 * for sequential transitions. Ideal for content that needs to smoothly appear
 * and disappear without directional movement.
 */
const meta = {
  title: 'UI/Transitions/SFFadeInTransition',
  component: SFFadeInTransition,
  argTypes: {
    duration: {
      control: { type: 'select' },
      options: [75, 100, 150, 200, 300, 500, 700, 1000],
    },
  },
  render: (args) => ({
    components: { SFFadeInTransition },
    setup() {
      const visible = ref(false)
      setTimeout(() => {
        visible.value = true
      }, 500)
      return { args, visible }
    },
    template: `
    <div class="p-8 w-full h-56 relative">
      <SFFadeInTransition v-bind="args">
        <div v-if="visible" class="border border-primary p-6 rounded-lg shadow-lg">
          <h3 class="text-lg font-semibold mb-2">Fade In Content</h3>
          <p>This content fades in and out smoothly with a ${
            args.duration || 200
          }ms duration.</p>
        </div>
      </SFFadeInTransition>
      <button class="absolute bottom-4 right-4 z-10 bg-primary text-white px-4 py-2 rounded hover:bg-secondary transition-colors" @click="visible = !visible">Toggle</button>
    </div>
    `,
  }),
} satisfies Meta<typeof SFFadeInTransition>

export default meta
type Story = StoryObj<typeof SFFadeInTransition>

/**
 * Default fade transition with 200ms duration provides a smooth, natural
 * appearance that feels responsive without being jarring.
 */
export const Default = {
  args: {
    duration: 200,
  },
} satisfies Story
