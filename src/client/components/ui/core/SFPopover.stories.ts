import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFPopover from './SFPopover.vue'
//import SFButton from './SFButton.vue'

/**
 * SFPopover is a hover-triggered overlay component that displays additional content
 * when users hover over a trigger element. It's commonly used for tooltips, user menus,
 * quick actions, and contextual information that doesn't require immediate interaction.
 *
 * Key features:
 * - Hover-based activation with mouse enter/leave events
 * - Positioned relative to the trigger element
 * - Smooth fade-in animation from bottom
 * - Responsive design with hover-only display on supported devices
 * - Slot-based content for flexible customization
 * - Proper z-index layering for overlay positioning
 */
export default {
  title: 'UI/Core/SFPopover',
  component: SFPopover,
} satisfies Meta<typeof SFPopover>

type Story = StoryObj<typeof SFPopover>

/**
 * Basic popover with hover trigger. This is the most common usage pattern
 * for displaying additional information or actions on hover.
 */
export const Default: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFPopover>) => ({
    components: { SFPopover },
    setup() {
      const isOpen = ref(false)
      return { args, isOpen }
    },
    template: `
    <div style="padding: 16px 16px 120px 16px">
      <SFPopover v-model:is-open="isOpen" v-bind="args" @mouseenter="isOpen = true" @mouseleave="isOpen = false">
        <template #action>
          <button class="bg-accent text-white px-4 py-2 rounded-md">Hover for Details</button>
        </template>
        <template #content>
          <div class="p-4 min-w-48">
            <h3 class="font-semibold mb-2">Product Information</h3>
            <p class="text-sm text-secondary mb-2">This product is available in multiple sizes and colors.</p>
            <div class="text-sm text-gray-500">
              <p>• Free shipping on orders over $50</p>
              <p>• 30-day return policy</p>
              <p>• Customer support available</p>
            </div>
          </div>
        </template>
      </SFPopover>
    </div>`,
  }),
}
