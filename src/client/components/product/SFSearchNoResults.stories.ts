import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive } from 'vue'
import { expect, mocked } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { AppliedFilters, NavigationItem } from '@scayle/storefront/types'
import SFSearchNoResults from './SFSearchNoResults.vue'

const navigation: NavigationItem[] = [
  {
    id: 1,
    name: 'Women',
    href: '/c/women-1',
    openInNewWindow: false,
    children: [],
    disabled: false,
  },
  {
    id: 2,
    name: 'Men',
    href: '/c/men-2',
    openInNewWindow: false,
    children: [],
    disabled: false,
  },
  {
    id: 3,
    name: 'Kids',
    href: '/c/kids-3',
    openInNewWindow: false,
    children: [],
    disabled: false,
  },
]

const termOnly: AppliedFilters = {
  term: 'xyzabc',
  attributes: {},
  booleans: {},
  count: 0,
}

const termAndColor: AppliedFilters = {
  term: 'xyzabc',
  attributes: { color: ['red'] },
  booleans: {},
  count: 1,
}

const setNavigation = (items: NavigationItem[]) => {
  const page = usePage()
  mocked(usePage).mockReturnValue(
    reactive({ ...page, props: { ...page.props, navigation: items } }),
  )
}

/**
 * SFSearchNoResults replaces the product grid when a search returns no
 * products. The page headline already shows the term, so the box does not
 * repeat it. Below the tips it offers a way out:
 *
 * - "Continue shopping", linking to the homepage, always.
 * - "Reset filters" when filters are applied, keeping the term.
 * - A link per main category from the header navigation, hidden when the
 *   navigation is empty.
 */
export default {
  title: 'Product/SFSearchNoResults',
  component: SFSearchNoResults,
  args: {
    appliedFilters: termOnly,
    productListId: 'xyzabc',
  },
  argTypes: {
    appliedFilters: { control: false },
  },
  beforeEach() {
    setNavigation(navigation)
  },
} satisfies Meta<typeof SFSearchNoResults>

type Story = StoryObj<typeof SFSearchNoResults>

/** A search with only a term: tips, the homepage link and the main categories. */
export const TermOnly: Story = {
  play: async ({ canvas }) => {
    for (const item of navigation) {
      await expect(canvas.getByRole('link', { name: item.name })).toBeVisible()
    }
    await expect(
      canvas.queryByRole('button', { name: 'Reset filters' }),
    ).toBeNull()
  },
}

/** A term with a filter applied: "Reset filters" joins the homepage link. */
export const WithFilters: Story = {
  args: { appliedFilters: termAndColor },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Reset filters' }),
    ).toBeVisible()
  },
}

/** The navigation fetch failed: no category links, the homepage link stays. */
export const WithoutNavigation: Story = {
  beforeEach() {
    setNavigation([])
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Continue shopping' }),
    ).toBeVisible()
    await expect(canvas.queryByRole('group', { name: 'Categories' })).toBeNull()
  },
}
