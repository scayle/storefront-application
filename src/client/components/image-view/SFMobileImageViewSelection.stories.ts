import type { ComponentPropsAndSlots, StoryObj } from '@storybook/vue3-vite'
import { mocked } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { ImageViewOption } from '@shared/types/ImageView'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import SFMobileImageViewSelection from './SFMobileImageViewSelection.vue'

// Views come from the shop's `imageType` attribute group at request time; the
// values here are placeholders, the labels show what a shop typically offers.
const options: ImageViewOption[] = [
  { value: 'type-a', label: 'Model' },
  { value: 'type-b', label: 'Flat lay' },
]

/**
 * SFMobileImageViewSelection is the mobile image view selector, rendered as a
 * group of buttons inside the filter slide-in below the sorting options. The
 * selected view is marked with `aria-pressed`. Like the desktop dropdown, it
 * reads and writes the selection through the `imageView` query parameter.
 */
export default {
  title: 'Image View/SFMobileImageViewSelection',
  component: SFMobileImageViewSelection,
  parameters: { layout: 'centered' },
  render: (
    args: ComponentPropsAndSlots<typeof SFMobileImageViewSelection>,
  ) => ({
    components: { SFMobileImageViewSelection },
    setup() {
      return { args }
    },
    template:
      '<div class="w-80"><SFMobileImageViewSelection v-bind="args" /></div>',
  }),
  args: { options },
}

type Story = StoryObj<typeof SFMobileImageViewSelection>

/**
 * No view in the URL, so the default view's button is the pressed one.
 */
export const Default: Story = {}

/**
 * A view named in the URL, as after a switch or on a shared link. Its button
 * is the pressed one.
 */
export const ViewSelected: Story = {
  beforeEach() {
    const page = usePage()
    mocked(usePage).mockReturnValue({
      ...page,
      url: `/?${IMAGE_VIEW_QUERY_KEY}=type-a`,
    })
  },
}
