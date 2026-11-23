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
import SFMobileSortSelection from './SFMobileSortSelection.vue'

// The options a category listing offers, in the order the listing controller returns them.
const sortOptions: SortOption[] = [
  { key: 'default', config: DEFAULT_SORT },
  { key: 'newest', config: SORT_DATE_NEWEST },
  { key: 'price_desc', config: SORT_PRICE_DESC },
  { key: 'price_asc', config: SORT_PRICE_ASC },
  { key: 'reduction_desc', config: SORT_REDUCTION_DESC },
]

/**
 * SFMobileSortSelection shows the sort options as a row of pill buttons. The
 * filter slide-in renders it in its sorting group below the `lg` breakpoint,
 * where the desktop sort dropdown is hidden. The selected option has an
 * accent border.
 *
 * Pressing an option navigates to the current URL with a new `sort` query
 * parameter and reloads only the listing props. In Storybook the navigation
 * is captured instead, and the story selects the pressed option.
 */
export default {
  title: 'Sorting/SFMobileSortSelection',
  component: SFMobileSortSelection,
  globals: {
    viewport: { value: 'mobile2', isRotated: false },
  },
  render: (args: ComponentPropsAndSlots<typeof SFMobileSortSelection>) => ({
    components: { SFMobileSortSelection },
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
      <div @pointerdown.capture="claim" @keydown.capture="claim">
        <SFMobileSortSelection v-bind="args" :selected-sort="selectedSort" />
      </div>
    `,
  }),
} satisfies Meta<typeof SFMobileSortSelection>

type Story = StoryObj<typeof SFMobileSortSelection>

/**
 * The listing sorted by newest first. Press another option to select it.
 */
export const Default: Story = {
  args: {
    sortOptions,
    selectedSort: sortOptions[1],
  },
}
