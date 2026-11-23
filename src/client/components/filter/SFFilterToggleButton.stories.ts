import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref, useId } from 'vue'
import SFFilterToggleButton from './SFFilterToggleButton.vue'

/**
 * SFFilterToggleButton opens and closes the filter slide-in on product
 * listing and search result pages. It shows the number of applied filters as
 * a badge and folds that number into its accessible name, since the badge is
 * hidden from screen readers. Below the `lg` breakpoint it spans the full
 * width of its container.
 *
 * The page binds the filter overlay's `triggerAttrs` on the button, which set
 * `aria-expanded`, `aria-controls` and, while the slide-in loads on its first
 * open, `aria-busy`. In Storybook a placeholder stands in for the slide-in, so
 * the button has a dialog to control and pressing it shows whether it is open.
 */
export default {
  title: 'Filter/SFFilterToggleButton',
  component: SFFilterToggleButton,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFFilterToggleButton>) => ({
    components: { SFFilterToggleButton },
    setup() {
      const isOpen = ref(false)
      // Generated rather than a fixed arg, so the stories on the docs page
      // each control their own placeholder.
      const panelId = useId()
      return { args, isOpen, panelId }
    },
    template: `
      <div class="flex flex-col items-start gap-4">
        <SFFilterToggleButton
          v-bind="args"
          :label="args.label ?? $t('filter.show_filter')"
          :aria-controls="panelId"
          :aria-expanded="isOpen"
          @toggle="isOpen = !isOpen"
        />
        <!-- v-show keeps the element while closed, so aria-controls always points at it -->
        <div
          v-show="isOpen"
          :id="panelId"
          role="dialog"
          aria-label="Filters"
          class="rounded-md border border-gray-300 p-4"
        >
          The filter slide-in opens here.
        </div>
      </div>
    `,
  }),
} satisfies Meta<typeof SFFilterToggleButton>

type Story = StoryObj<typeof SFFilterToggleButton>

/**
 * No filter is applied, so the button shows only its label and the label is
 * its accessible name.
 */
export const WithoutAppliedFilters: Story = {
  args: {
    appliedFiltersCount: 0,
  },
}

/**
 * Three filters are applied. The badge shows the count, and the accessible
 * name reads "Show Filters, 3 active".
 */
export const WithAppliedFilters: Story = {
  args: {
    appliedFiltersCount: 3,
  },
}

/**
 * The first open is waiting for the slide-in's code to load. The overlay sets
 * `aria-busy`, and the button pulses until the slide-in opens.
 */
export const Loading: Story = {
  args: {
    appliedFiltersCount: 0,
  },
  render: (args) => ({
    components: { SFFilterToggleButton },
    setup: () => ({ args }),
    template: `
      <SFFilterToggleButton
        v-bind="args"
        :label="$t('filter.show_filter')"
        aria-busy="true"
      />
    `,
  }),
}
