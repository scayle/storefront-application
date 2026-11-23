import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, mocked, waitFor, within } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { AvailableLanguage } from '@scayle/storefront/types'
import {
  austriaShops,
  switzerlandShops,
} from '../../../../.storybook/shop-mock'
import SFCountryDetection from './SFCountryDetection.vue'

/**
 * SFCountryDetection is the modal that suggests a better shop when the country
 * the server detected for the request differs from the active shop. `Layout`
 * opens it through `useOverlay()` once the deferred `shopSuggestion` page prop
 * holds a suggestion and the user is signed out, so its code loads only for
 * users who see it. It offers the shop of the detected country, one button per
 * language when that country has several, next to a button to stay on the
 * current shop.
 *
 * The stories render it open. It renders in its own frame on the docs page,
 * since the modal would otherwise cover the page.
 */
export default {
  title: 'Country Detection/SFCountryDetection',
  component: SFCountryDetection,
  parameters: {
    docs: { story: { inline: false, height: '400px' } },
  },
  args: {
    open: true,
  },
} satisfies Meta<typeof SFCountryDetection>

type Story = StoryObj<typeof SFCountryDetection>

const suggest = (region: string, languages: AvailableLanguage[]) => {
  const page = usePage()
  mocked(usePage).mockReturnValue({
    ...page,
    props: { ...page.props, shopSuggestion: { region, languages } },
  })
}

const expectDialogVisible = async (canvasElement: HTMLElement) => {
  await waitFor(() =>
    expect(
      within(canvasElement).getByTestId('country-detection-dialog'),
    ).toBeVisible(),
  )
}

/**
 * Signed-out user on the United States shop whose request comes from Austria.
 * Austria has one shop, so the modal offers it by country name.
 */
export const SingleLanguage: Story = {
  beforeEach() {
    suggest('AT', austriaShops)
  },
  play: ({ canvasElement }) => expectDialogVisible(canvasElement),
}

/**
 * Signed-out user on the United States shop whose request comes from
 * Switzerland. Switzerland has a German and a French shop, so the modal offers
 * one button per language, each named in its own language.
 */
export const MultiLanguage: Story = {
  beforeEach() {
    suggest('CH', switzerlandShops)
  },
  play: ({ canvasElement }) => expectDialogVisible(canvasElement),
}
