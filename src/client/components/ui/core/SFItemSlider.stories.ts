import type {
  Meta,
  StoryObj,
  ComponentPropsAndSlots,
} from '@storybook/vue3-vite'
import SFItemSlider from './SFItemSlider.vue'

// One background and text color pair per design token, each with readable contrast.
const colorItems = [
  { color: 'bg-primary text-white', text: 'Primary' },
  { color: 'bg-secondary text-white', text: 'Secondary' },
  { color: 'bg-accent text-white', text: 'Accent' },
  { color: 'bg-promotion text-primary', text: 'Promotion' },
  { color: 'bg-campaign text-primary', text: 'Campaign' },
  { color: 'bg-product-sale text-white', text: 'Product Sale' },
  { color: 'bg-status-success text-primary', text: 'Success' },
  { color: 'bg-status-alert text-white', text: 'Alert' },
  { color: 'bg-status-warning text-primary', text: 'Warning' },
  { color: 'bg-status-info text-primary', text: 'Info' },
]

/**
 * SFItemSlider is a versatile slider component that supports horizontal and vertical scrolling,
 * navigation arrows, skip links, and thumbnail navigation.
 *
 * It provides a wrapper for a list of items and handles the scrolling logic, including
 * accessibility features like skip links and keyboard navigation.
 */
export default {
  title: 'UI/Core/SFItemSlider',
  component: SFItemSlider,
  argTypes: {
    mode: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Scroll direction of the slider',
    },
    withArrows: {
      control: 'boolean',
      description: 'Whether to show navigation arrows',
    },
    hideDisabledArrows: {
      control: 'boolean',
      description: 'Whether to hide arrows when they are disabled',
    },
    scrollable: {
      control: 'boolean',
      description: 'Whether the slider allows scrolling',
    },
    sliderTabindex: {
      control: 'number',
      description: 'Tab index for the slider container',
    },
    fade: {
      control: 'boolean',
      description:
        'Horizontal mode only: gradient fade on each edge with more content to scroll towards',
    },
  },
  render: (args: ComponentPropsAndSlots<typeof SFItemSlider>) => ({
    components: { SFItemSlider },
    setup() {
      const items = colorItems
      return { args, items }
    },
    template: `
    <div>
      <SFItemSlider v-bind="args">
        <div
          v-for="(item, index) in items"
          :key="index"
          :class="[item.color, 'flex h-64 w-full shrink-0 items-center justify-center font-bold text-lg rounded-lg mx-2 snap-center']"
          tabindex="0"
        >
          {{ item.text }}
        </div>
      </SFItemSlider>
    </div>
    `,
  }),
} satisfies Meta<typeof SFItemSlider>

type Story = StoryObj<typeof SFItemSlider>

/**
 * Default horizontal slider with various colored items.
 */
export const Default = {
  args: {
    mode: 'horizontal',
    withArrows: true,
  },
} satisfies Story

/**
 * Vertical slider mode.
 */
export const Vertical = {
  args: {
    mode: 'vertical',
    withArrows: true,
  },
  render: (args: ComponentPropsAndSlots<typeof SFItemSlider>) => ({
    components: { SFItemSlider },
    setup() {
      const items = colorItems.slice(0, 6)
      return { args, items }
    },
    template: `
      <div>
        <SFItemSlider v-bind="args" class="h-96">
          <div
            v-for="(item, index) in items"
            :key="index"
            :class="[item.color, 'flex h-48 w-full shrink-0 items-center justify-center font-bold text-lg rounded-lg my-2 snap-center']"
            tabindex="0"
          >
            {{ item.text }}
          </div>
        </SFItemSlider>
      </div>
    `,
  }),
} satisfies Story

/**
 * Slider with a header slot.
 */
export const WithHeader = {
  args: {
    withArrows: true,
  },
  render: (args: ComponentPropsAndSlots<typeof SFItemSlider>) => ({
    components: { SFItemSlider },
    setup() {
      const items = colorItems.slice(0, 5)
      return { args, items }
    },
    template: `
    <div>
      <SFItemSlider v-bind="args">
        <template #header>
          <h2 class="text-xl font-bold mb-4 ml-2">Slider Header</h2>
        </template>
        <div
          v-for="(item, index) in items"
          tabindex="0"
          :key="index"
          :class="[item.color, 'flex h-64 w-48 shrink-0 items-center justify-center font-bold text-lg rounded-lg mx-2 snap-center']"
        >
          {{ item.text }}
        </div>
      </SFItemSlider>
    </div>
    `,
  }),
} satisfies Story

/**
 * Slider without arrows.
 */
export const NoArrows = {
  args: {
    withArrows: false,
    mode: 'horizontal',
  },
} satisfies Story

/**
 * Horizontal slider with edge gradient fades. The right fade signals more
 * content; it clears once the end is reached, and a left fade appears after
 * scrolling away from the start. Used by the account chip row and PLP chips.
 */
export const Fade = {
  args: {
    mode: 'horizontal',
    withArrows: false,
    fade: true,
  },
  render: (args: ComponentPropsAndSlots<typeof SFItemSlider>) => ({
    components: { SFItemSlider },
    setup() {
      const items = Array.from(
        { length: 12 },
        (_, index) => `Item ${index + 1}`,
      )
      return { args, items }
    },
    template: `
    <div class="max-w-md">
      <SFItemSlider v-bind="args" class="scrollbar-hide snap-x snap-mandatory">
        <a
          v-for="(item, index) in items"
          :key="index"
          href="#"
          class="bg-gray-200 text-secondary mr-2 inline-flex h-11 shrink-0 snap-start items-center justify-center rounded-xl px-8 font-semibold whitespace-nowrap"
        >
          {{ item }}
        </a>
      </SFItemSlider>
    </div>
    `,
  }),
} satisfies Story

/**
 * The fade defaults to white but is themable via the `--scroll-fade-color` CSS
 * variable. Set it on the slider (or any ancestor) to match a colored surface
 * so the gradient blends into the background instead of fading to white.
 */
export const FadeOnColoredSurface = {
  args: {
    mode: 'horizontal',
    withArrows: false,
    fade: true,
  },
  render: (args: ComponentPropsAndSlots<typeof SFItemSlider>) => ({
    components: { SFItemSlider },
    setup() {
      const items = Array.from(
        { length: 12 },
        (_, index) => `Item ${index + 1}`,
      )
      return { args, items }
    },
    template: `
    <div class="bg-secondary max-w-md rounded-xl p-4">
      <SFItemSlider
        v-bind="args"
        class="scrollbar-hide snap-x snap-mandatory"
        style="--scroll-fade-color: var(--color-secondary)"
      >
        <a
          v-for="(item, index) in items"
          :key="index"
          href="#"
          class="bg-primary mr-2 inline-flex h-11 shrink-0 snap-start items-center justify-center rounded-xl px-8 font-semibold whitespace-nowrap text-white"
        >
          {{ item }}
        </a>
      </SFItemSlider>
    </div>
    `,
  }),
} satisfies Story
