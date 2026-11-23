import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import SFPaginationButton from './SFPaginationButton.vue'

const page = { number: 2, to: '?page=2', isActive: false }

/**
 * SFPaginationButton is one page item in `SFPagination` when the parent handles
 * page changes itself through the `select` event, for example in client-side
 * pagination, instead of navigating to a page URL with `SFPaginationLink`.
 *
 * The current page renders as a `<span>` with `aria-current="page"` rather than
 * a button to itself. A disabled item (previous or next at the first or last
 * page) stays a `<button>` with `aria-disabled`, taken out of the tab order,
 * and `disabled` wins over the current-page state.
 */
export default {
  title: 'UI/Pagination/SFPaginationButton',
  component: SFPaginationButton,
  parameters: { layout: 'centered' },
  args: {
    page,
    ariaLabel: 'Go to page 2',
    disabled: false,
    onSelect: fn(),
  },
  render: (args) => ({
    components: { SFPaginationButton },
    setup() {
      return { args }
    },
    template: `<div class="h-10"><SFPaginationButton v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFPaginationButton>

type Story = StoryObj<typeof SFPaginationButton>

/** A page the user can switch to. Clicking it emits `select` with the page number. */
export const Default: Story = {}

/** The current page, highlighted with the accent border and not clickable. */
export const Active: Story = {
  args: {
    page: { ...page, isActive: true },
  },
}

/** A previous button on the first page: dimmed and announced as disabled. */
export const Disabled: Story = {
  args: {
    page: { ...page, number: 1, to: '?page=1' },
    ariaLabel: 'Go to the previous page',
    disabled: true,
  },
  render: (args) => ({
    components: { SFPaginationButton, IconNavigationLeft },
    setup() {
      return { args }
    },
    template: `
      <div class="h-10">
        <SFPaginationButton v-bind="args">
          <IconNavigationLeft class="fill-secondary size-4" />
        </SFPaginationButton>
      </div>
    `,
  }),
}
