import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, useId } from 'vue'
import SFCheckbox from '../ui/form/SFCheckbox.vue'
import SFSwitch from '../ui/form/SFSwitch.vue'
import SFFilterGroup from './SFFilterGroup.vue'

const materials = [
  { id: 'cotton', name: 'Cotton' },
  { id: 'linen', name: 'Linen' },
  { id: 'wool', name: 'Wool' },
  { id: 'polyester', name: 'Polyester' },
]

/**
 * SFFilterGroup is one section of the filter slide-in: a header with the
 * filter name, a badge counting the applied values, a reset button, and the
 * filter's controls in the default slot. The badge and the reset button only
 * appear once a value is applied, unless `showAction` forces the reset button,
 * as the price filter does for a narrowed range. Without a `label` the header
 * is left out, as for a boolean filter that is a single switch.
 *
 * The stories keep the applied values in local state, so checking a value
 * updates the badge and the reset button clears the group.
 */
const meta = {
  title: 'Filter/SFFilterGroup',
  component: SFFilterGroup,
  argTypes: {
    // Counted from the checked values in the story.
    badge: { control: false },
  },
} satisfies Meta<typeof SFFilterGroup>

export default meta
type Story = StoryObj<typeof meta>

const renderMaterialGroup =
  (initiallyApplied: string[]): Story['render'] =>
  (args) => ({
    components: { SFFilterGroup, SFCheckbox },
    setup() {
      const applied = ref([...initiallyApplied])
      // Checkbox ids are unique per story, since the docs page renders every
      // story at once.
      const idPrefix = useId()
      return { args, applied, idPrefix, materials }
    },
    template: `
      <SFFilterGroup
        v-bind="args"
        class="max-w-md"
        :badge="applied.length"
        @click-reset="applied = []"
      >
        <div class="flex flex-col gap-3">
          <SFCheckbox
            v-for="material in materials"
            :id="idPrefix + '-' + material.id"
            :key="material.id"
            v-model="applied"
            :item="material.id"
            :label="material.name"
          />
        </div>
      </SFFilterGroup>
    `,
  })

/**
 * No value of the filter is applied, so the header shows only the filter name.
 * Check a value to show the badge and the reset button.
 */
export const WithoutAppliedFilters: Story = {
  args: { label: 'Material' },
  render: renderMaterialGroup([]),
}

/**
 * Two values are applied, so the header counts them and offers a reset
 * button, which clears the group.
 */
export const WithAppliedFilters: Story = {
  args: { label: 'Material' },
  render: renderMaterialGroup(['cotton', 'linen']),
}

/**
 * A group without a label has no header, badge or reset button. The filter
 * slide-in renders a boolean filter, such as Sale, this way.
 */
export const WithoutLabel: Story = {
  render: (args) => ({
    components: { SFFilterGroup, SFSwitch },
    setup() {
      const isApplied = ref(false)
      const switchId = useId()
      return { args, isApplied, switchId }
    },
    template: `
      <SFFilterGroup v-bind="args" class="max-w-md">
        <SFSwitch :id="switchId" v-model="isApplied" label="Sale" />
      </SFFilterGroup>
    `,
  }),
}
