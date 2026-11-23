import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import type { SortOption } from '@scayle/storefront/types'
import {
  DEFAULT_SORT,
  SORT_DATE_NEWEST,
  SORT_PRICE_ASC,
  SORT_PRICE_DESC,
  SORT_REDUCTION_DESC,
} from '@scayle/storefront/shared'
import { createVisitClaim } from '../../../../.storybook/inertia-mock'
import SFSortSelection from './SFSortSelection.vue'

// The options a category listing offers, in the order the listing controller returns them.
const sortOptions: SortOption[] = [
  { key: 'default', config: DEFAULT_SORT },
  { key: 'newest', config: SORT_DATE_NEWEST },
  { key: 'price_desc', config: SORT_PRICE_DESC },
  { key: 'price_asc', config: SORT_PRICE_ASC },
  { key: 'reduction_desc', config: SORT_REDUCTION_DESC },
]

/**
 * SFSortSelection is the sort dropdown on desktop product listing pages. It
 * lists the sort options the listing controller resolved and marks the
 * selected one with a checkmark.
 *
 * Picking an option navigates to the current URL with a new `sort` query
 * parameter and reloads only the listing props. In Storybook the navigation
 * is captured instead, and the story selects the picked option.
 */
export default {
  title: 'Sorting/SFSortSelection',
  component: SFSortSelection,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFSortSelection>) => ({
    components: { SFSortSelection },
    setup() {
      const selectedSort = ref(args.selectedSort)
      watch(
        () => args.selectedSort,
        (sort) => (selectedSort.value = sort),
      )
      const claim = createVisitClaim((url) => {
        const key = url.searchParams.get('sort')
        selectedSort.value = args.sortOptions.find(
          (option) => option.key === key,
        )
      })
      return { args, claim, selectedSort }
    },
    template: `
      <div class="h-80 w-50" @pointerdown.capture="claim" @keydown.capture="claim">
        <SFSortSelection v-bind="args" :selected-sort="selectedSort" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFSortSelection>

type Story = StoryObj<typeof SFSortSelection>

/**
 * The listing sorted by newest first. Open the dropdown and pick another
 * option to select it.
 */
export const Default: Story = {
  args: {
    sortOptions,
    selectedSort: sortOptions[1],
  },
}
