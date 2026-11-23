import type {
  ComponentPropsAndSlots,
  Meta,
  StoryObj,
} from '@storybook/vue3-vite'
import { usePage } from '@inertiajs/vue3'
import { ref } from 'vue'
import { expect, mocked, userEvent, waitFor, within } from 'storybook/test'
import SFButton from '@client/components/ui/core/SFButton.vue'
import { germanyShops } from '../../../../.storybook/shop-mock'
import SFShopSwitcherSlideIn from './SFShopSwitcherSlideIn.vue'

/**
 * Opens the slide-in through its toggle button and returns the canvas once the
 * dialog is visible.
 */
const openSlideIn = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  await userEvent.click(
    canvas.getByRole('button', { name: 'Open shop switcher' }),
  )
  await waitFor(() =>
    expect(canvas.getByTestId('shop-switcher-slide-in')).toBeVisible(),
  )
  return canvas
}

/**
 * SFShopSwitcherSlideIn lists the shops the user can switch to. Every
 * `SFShopSwitcher` trigger opens it through the shared `useShopSwitcherSlideIn()`
 * overlay, so the stories wrap it in a toggle button instead of mounting the
 * overlay themselves.
 *
 * It reads the shops from the `availableCountries` and `availableLanguages` page
 * props and the current locale from the storefront country, which `preview.ts`
 * seeds from `.storybook/shop-mock.ts`.
 */
export default {
  title: 'Shop Switcher/SFShopSwitcherSlideIn',
  component: SFShopSwitcherSlideIn,
  parameters: { layout: 'centered' },
  args: {
    open: false,
  },
  argTypes: {
    open: { control: false },
  },
  render: (args: ComponentPropsAndSlots<typeof SFShopSwitcherSlideIn>) => ({
    components: { SFShopSwitcherSlideIn, SFButton },
    setup() {
      const isOpen = ref(args.open ?? false)
      return { args, isOpen }
    },
    template: `
      <SFButton @click="isOpen = true">Open shop switcher</SFButton>
      <SFShopSwitcherSlideIn
        v-bind="args"
        v-model:open="isOpen"
      />
    `,
  }),
} satisfies Meta<typeof SFShopSwitcherSlideIn>

type Story = StoryObj<typeof SFShopSwitcherSlideIn>

/**
 * Active shop is the United States. The country has a single shop, so the
 * slide-in shows only the country list: the current country marked, the others
 * as links.
 */
export const SingleLanguageCountry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openSlideIn(canvasElement)

    await expect(canvas.getByText('United States, current shop')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Germany' })).toBeVisible()
  },
}

/**
 * Active shop is a German one. Germany has a German and an English shop, so
 * the language choice appears above the country list, and the countries are
 * named in the active shop's locale.
 */
export const SeveralLanguages: Story = {
  globals: {
    locale: 'de-DE',
  },
  beforeEach: () => {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      props: {
        ...page.props,
        availableLanguages: germanyShops,
        storefront: {
          ...page.props.storefront,
          country: { ...page.props.storefront.country, locale: 'de-DE' },
        },
      },
    })
  },
  play: async ({ canvasElement }) => {
    const canvas = await openSlideIn(canvasElement)

    await expect(canvas.getByText('Deutsch, current shop')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'English' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Österreich' })).toBeVisible()
  },
}
