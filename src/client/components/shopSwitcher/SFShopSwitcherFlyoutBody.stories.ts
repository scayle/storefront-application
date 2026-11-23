import type { Meta, StoryObj } from '@storybook/vue3-vite'
import {
  storybookCountries,
  switzerlandShops,
  unitedStatesShops,
} from '../../../../.storybook/shop-mock'
import SFShopSwitcherFlyoutBody from './SFShopSwitcherFlyoutBody.vue'

/**
 * SFShopSwitcherFlyoutBody is the content of the shop switcher slide-in that
 * `SFShopSwitcher` opens. It lists the languages of the current country, when
 * there is more than one, and every country with a shop. The current language
 * and country are marked instead of linked. Each other entry links to its shop.
 */
export default {
  title: 'Shop Switcher/SFShopSwitcherFlyoutBody',
  component: SFShopSwitcherFlyoutBody,
  args: {
    availableLanguages: unitedStatesShops,
    availableCountries: storybookCountries,
    currentLocale: new Intl.Locale('en-US'),
  },
  argTypes: {
    currentLocale: { control: false },
  },
} satisfies Meta<typeof SFShopSwitcherFlyoutBody>

type Story = StoryObj<typeof SFShopSwitcherFlyoutBody>

/**
 * Current country with two languages, shown as a language choice above the
 * country list. The current language and country are marked.
 */
export const SeveralLanguages: Story = {
  args: {
    availableLanguages: switzerlandShops,
    currentLocale: new Intl.Locale('de-CH'),
  },
}

/**
 * Several countries to switch to, with the current one marked by a checkmark.
 * The current country has one language, so the language list is hidden.
 */
export const SeveralCountries: Story = {}
