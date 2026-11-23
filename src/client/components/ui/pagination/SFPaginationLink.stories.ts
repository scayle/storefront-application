import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconNavigationLeft from '@assets/icons/navigation/left.svg'
import SFPaginationLink from './SFPaginationLink.vue'

const page = { number: 2, to: '?page=2', isActive: false }

/**
 * SFPaginationLink is one page item in `SFPagination` on product listing
 * pages, where each page has its own URL. It renders an Inertia `<Link>` that
 * reloads only the listing props and scrolls back to the top on success.
 *
 * The current page renders as a `<span>` with `aria-current="page"` rather than
 * a link to itself. A disabled item (previous or next at the first or last
 * page) renders as a non-interactive `<span>` with `aria-disabled`, since a
 * disabled `<Link>` would still navigate on Enter.
 */
export default {
  title: 'UI/Pagination/SFPaginationLink',
  component: SFPaginationLink,
  parameters: { layout: 'centered' },
  args: {
    page,
    ariaLabel: 'Go to page 2',
    disabled: false,
  },
  render: (args) => ({
    components: { SFPaginationLink },
    setup() {
      return { args }
    },
    template: `<div class="h-10"><SFPaginationLink v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof SFPaginationLink>

type Story = StoryObj<typeof SFPaginationLink>

/** A link to another page of the listing. */
export const Default: Story = {}

/** The current page, highlighted with the accent border and not a link. */
export const Active: Story = {
  args: {
    page: { ...page, isActive: true },
  },
}

/** A previous link on the first page: dimmed, announced as disabled and not focusable. */
export const Disabled: Story = {
  args: {
    page: { ...page, number: 1, to: '?page=1' },
    ariaLabel: 'Go to the previous page',
    disabled: true,
  },
  render: (args) => ({
    components: { SFPaginationLink, IconNavigationLeft },
    setup() {
      return { args }
    },
    template: `
      <div class="h-10">
        <SFPaginationLink v-bind="args">
          <IconNavigationLeft class="fill-secondary size-4" />
        </SFPaginationLink>
      </div>
    `,
  }),
}
