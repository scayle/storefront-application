import type { ComponentPropsAndSlots, StoryObj } from '@storybook/vue3-vite'
import { mocked } from 'storybook/test'
import { usePage } from '@inertiajs/vue3'
import type { ImageViewOption } from '@shared/types/ImageView'
import { IMAGE_VIEW_QUERY_KEY } from '@shared/constants/imageView'
import SFImageViewSelection from './SFImageViewSelection.vue'

// Views come from the shop's `imageType` attribute group at request time; the
// values here are placeholders, the labels show what a shop typically offers.
const options: ImageViewOption[] = [
  { value: 'type-a', label: 'Model' },
  { value: 'type-b', label: 'Flat lay' },
]

/**
 * SFImageViewSelection is the desktop image view selector on the PLP and the
 * Search Results Page, rendered next to the sorting control. It lists the
 * default view first, then the views the shop configures, and reads and writes
 * the selection through the `imageView` query parameter, so switching reorders
 * the product tile images without a server request.
 */
export default {
  title: 'Image View/SFImageViewSelection',
  component: SFImageViewSelection,
  parameters: { layout: 'centered' },
  render: (args: ComponentPropsAndSlots<typeof SFImageViewSelection>) => ({
    components: { SFImageViewSelection },
    setup() {
      return { args }
    },
    template:
      '<div class="h-48 w-64"><SFImageViewSelection v-bind="args" /></div>',
  }),
  args: { options },
}

type Story = StoryObj<typeof SFImageViewSelection>

/**
 * No view in the URL, so the default view is selected and the tiles keep the
 * image order maintained in the Panel.
 */
export const Default: Story = {}

/**
 * A view named in the URL, as after a switch or on a shared link. The trigger
 * shows its label and the option list marks it as selected.
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
