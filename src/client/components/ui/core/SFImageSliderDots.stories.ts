import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SFImageSliderDots from './SFImageSliderDots.vue'

/**
 * SFImageSliderDots is the dot rail under an image slider such as
 * `SFImageGallery`: one dot per image, with the active one stretched into a
 * pill. Clicking a dot emits `select` with its zero-based index.
 *
 * The rail is a single Tab stop with a roving tabindex: only the active dot is
 * focusable, and Arrow Left/Right (wrapping at the ends), Home and End move
 * both the focus and the active image.
 *
 * `controls` should name the id of the slides container, so the stories render
 * a placeholder with that id.
 */
export default {
  title: 'UI/Core/SFImageSliderDots',
  component: SFImageSliderDots,
  parameters: { layout: 'centered' },
  args: {
    count: 5,
    active: 0,
    controls: 'image-slider-slides',
  },
  render: (args) => ({
    components: { SFImageSliderDots },
    setup() {
      const active = ref(args.active)
      return { args, active }
    },
    template: `
      <div class="flex flex-col items-center gap-4">
        <div :id="args.controls" class="text-secondary text-sm">
          Image {{ active + 1 }} of {{ args.count }}
        </div>
        <SFImageSliderDots v-bind="args" :active="active" @select="active = $event" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFImageSliderDots>

type Story = StoryObj<typeof SFImageSliderDots>

/**
 * First image active. Click a dot, or Tab into the rail and use the arrow keys,
 * Home and End to move between images.
 */
export const Default: Story = {}
