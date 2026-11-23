import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { buildPagination } from '@scayle/storefront/shared'
import type { Pagination } from '@scayle/storefront/types'
import { VISIBLE_PAGE_COUNT } from '@shared/constants/pagination'
import SFPagination from './SFPagination.vue'

function paginationStub(
  overrides: { page?: number; last?: number } = {},
): Pagination {
  const last = overrides.last ?? 3
  return buildPagination({
    totalItems: last * 10,
    itemsPerPage: 10,
    currentPage: overrides.page ?? 1,
    totalPageCount: last,
    visiblePageCount: VISIBLE_PAGE_COUNT,
  })
}

/**
 * SFPagination is a comprehensive pagination component that displays page navigation controls.
 * It automatically handles page calculations, navigation arrows, and ellipsis for large page counts.
 * The component provides extensive slot customization for different pagination layouts.
 */
export default {
  title: 'UI/Pagination/SFPagination',
  component: SFPagination,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFPagination>) => ({
    components: { SFPagination },
    setup() {
      return { args }
    },
    template: `<SFPagination v-bind="args" />`,
  }),
} satisfies Meta<typeof SFPagination>

type Story = StoryObj<typeof SFPagination>

/**
 * Basic pagination with few pages.
 * Shows the component with a small number of pages where all are visible.
 */
export const Default: Story = {
  args: {
    pagination: paginationStub({ last: 3 }),
  },
}

/**
 * Pagination with many pages.
 * Demonstrates how the component handles large page counts with ellipsis.
 */
export const ManyPages: Story = {
  args: {
    pagination: paginationStub({ last: 15 }),
  },
  render: (args: ComponentPropsAndSlots<typeof SFPagination>) => ({
    components: { SFPagination },
    setup() {
      return { args }
    },
    template: `<SFPagination v-bind="args" />`,
  }),
}

/**
 * Pagination with single page.
 * Demonstrates the component behavior when there's only one page.
 */
export const SinglePage: Story = {
  args: {
    pagination: paginationStub({ last: 1, page: 1 }),
  },
}

/**
 * Pagination with custom slots.
 * Shows how to customize the pagination layout using slots.
 */
export const CustomSlots: Story = {
  render: (args: ComponentPropsAndSlots<typeof SFPagination>) => ({
    components: { SFPagination },
    setup() {
      return { args }
    },
    template: `
    <SFPagination v-bind="args">
      <template #previous-button="{ hasPreviousPage, previousPage }">
        <button
          :disabled="!hasPreviousPage"
          class="flex px-3 py-2 text-sm disabled:opacity-50"
        >
          ← Previous
        </button>
      </template>

      <template #next-button="{ hasNextPage, nextPage }">
        <button
          :disabled="!hasNextPage"
          class="flex px-3 py-2 text-sm disabled:opacity-50"
        >
          Next →
        </button>
      </template>
    </SFPagination>`,
  }),
  args: {
    pagination: paginationStub({ last: 8, page: 1 }),
  },
}
