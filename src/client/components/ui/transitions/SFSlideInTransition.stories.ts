import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, computed } from 'vue'
import SFSlideInTransition from './SFSlideInTransition.vue'

/**
 * SFSlideInTransition creates a slide animation from a specified direction.
 * It uses transform transitions for smooth performance.
 * Perfect for sidebars, navigation menus, or content that should enter from an edge.
 */
const meta = {
  title: 'UI/Transitions/SFSlideInTransition',
  component: SFSlideInTransition,
  argTypes: {
    duration: {
      control: { type: 'select' },
      options: [75, 100, 150, 200, 300, 500, 700, 1000],
    },
    from: {
      control: { type: 'select' },
      options: ['left', 'right', 'top', 'bottom'],
    },
  },
  render: (args) => ({
    components: { SFSlideInTransition },
    setup() {
      const visible = ref(false)
      setTimeout(() => {
        visible.value = true
      }, 500)

      const positionClasses = computed(() => {
        switch (args.from) {
          case 'top':
            return 'top-0 left-1/2 -translate-x-1/2'
          case 'bottom':
            return 'bottom-0 left-1/2 -translate-x-1/2'
          case 'left':
            return 'left-0 top-1/2 -translate-y-1/2'
          case 'right':
            return 'right-0 top-1/2 -translate-y-1/2'
          default:
            return 'right-0 top-1/2 -translate-y-1/2'
        }
      })

      return { args, visible, positionClasses }
    },
    template: `
    <div class="p-8 w-full h-96 relative flex items-center justify-center overflow-hidden bg-gray-100">
        <SFSlideInTransition v-bind="args">
          <div v-if="visible" class="border border-primary p-6 rounded-lg shadow-lg max-w-sm bg-white absolute" :class="positionClasses">
            <h3 class="text-lg font-semibold mb-2">Slide In From {{ args.from }}</h3>
            <p>This content slides in from the {{ args.from }} edge with a {{
              args.duration || 200
            }}ms duration.</p>
          </div>
        </SFSlideInTransition>
        <button
          class="absolute bottom-4 right-4 z-10 bg-primary text-white px-4 py-2 rounded hover:bg-secondary transition-colors"
          @click="visible = !visible"
        >
          Toggle
        </button>
      </div>
    `,
  }),
} satisfies Meta<typeof SFSlideInTransition>

export default meta
type Story = StoryObj<typeof SFSlideInTransition>

/**
 * Default slide transition from the left.
 */
export const FromLeft = {
  args: {
    duration: 200,
    from: 'left',
  },
} satisfies Story

/**
 * Slide transition from the right.
 */
export const FromRight = {
  args: {
    duration: 200,
    from: 'right',
  },
} satisfies Story

/**
 * Slide transition from the top.
 */
export const FromTop = {
  args: {
    duration: 200,
    from: 'top',
  },
} satisfies Story

/**
 * Slide transition from the bottom.
 */
export const FromBottom = {
  args: {
    duration: 200,
    from: 'bottom',
  },
} satisfies Story
