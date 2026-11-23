import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import SFShopSwitcher from './SFShopSwitcher.vue'

/**
 * SFShopSwitcher is the button that opens the shop switcher slide-in, where the
 * user picks another country or language. It renders in the desktop header
 * and in the mobile sidebar, and only when the Storefront has a shop other than
 * the current one.
 *
 * It reads the shops from the `availableCountries` and `availableLanguages`
 * page props, which `preview.ts` seeds from `.storybook/shop-mock.ts`.
 */
export default {
  title: 'Shop Switcher/SFShopSwitcher',
  component: SFShopSwitcher,
  parameters: { layout: 'centered' },
  argTypes: {
    placement: {
      control: { type: 'select' },
      options: ['header', 'sidebar'],
    },
  },
} satisfies Meta<typeof SFShopSwitcher>

type Story = StoryObj<typeof SFShopSwitcher>

/** Header placement: the globe icon with the current country code. */
export const Header: Story = {
  args: { placement: 'header' },
}

/**
 * Sidebar placement: larger text with the full country name and a chevron, as
 * in the mobile navigation drawer.
 */
export const Sidebar: Story = {
  args: { placement: 'sidebar' },
}

/**
 * Flyout open after a click on the trigger, listing the countries to switch to.
 * Kept off the docs page, since the slide-in is a modal dialog that would cover
 * it.
 */
export const FlyoutOpen: Story = {
  tags: ['!autodocs'],
  args: { placement: 'header' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('language-listbox'))
    await waitFor(() =>
      expect(canvas.getByTestId('shop-switcher-slide-in')).toBeVisible(),
    )
  },
}
