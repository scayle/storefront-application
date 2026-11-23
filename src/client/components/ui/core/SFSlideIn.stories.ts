import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import IconNavigationClose from '@assets/icons/checkmark/outline.svg'
import IconUtilityLanguage from '@assets/icons/utility/language.svg'
import SFSlideIn from './SFSlideIn.vue'

/**
 * Off-canvas panel aligned with the Storefront Design System. Slides in from the
 * right on desktop (390–460px widths, full height with a gap on the right edge) and from the
 * bottom on mobile (75% viewport height). Control visibility with `v-model:isOpen`.
 * Use the default slot for body content, `#icon` before the label, `#header` for custom
 * chrome, and `#footer` for footer buttons.
 */
const meta = {
  title: 'UI/Core/SFSlideIn',
  component: SFSlideIn,
  argTypes: {
    label: {
      control: 'text',
      description:
        'Panel title in the built-in header and `aria-labelledby` target. With `#header`, used as `aria-label` only.',
    },
    description: {
      control: 'text',
      description:
        'Optional supporting text below the label in the built-in header.',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Desktop panel width (390px / 420px / 460px).',
    },
    closeOnRouteChange: {
      control: 'boolean',
      description: 'Closes the panel when the route changes.',
    },
    isOpen: {
      control: 'boolean',
      description: 'Controls panel visibility.',
    },
    onOpen: {
      action: 'open',
      description: 'Emitted when the panel opens.',
    },
    onClose: {
      action: 'close',
      description: 'Emitted when the panel closes.',
    },
  },
  args: {
    label: 'Panel title',
    description:
      'Supporting description shown below the title in the built-in header.',
    size: 'sm',
    closeOnRouteChange: true,
    isOpen: false,
  },
} satisfies Meta<typeof SFSlideIn>

export default meta
type Story = StoryObj<typeof SFSlideIn>

const SCROLLABLE_BLOCK_COUNT = 16

const scrollableContent = `
  <div class="flex flex-col gap-4 p-6">
    <p
      v-for="index in ${SCROLLABLE_BLOCK_COUNT}"
      :key="index"
      class="body-default-secondary rounded-lg border border-gray-200 bg-gray-100 p-4"
    >
      Scrollable content block {{ index }}. Scroll to verify the header stays sticky.
    </p>
  </div>
`

const footerSlot = `
  <template #footer="{ close }">
    <button
      type="button"
      @click="close"
      class="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100"
    >
      Cancel
    </button>
    <button
      type="button"
      @click="close"
      class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
    >
      Apply
    </button>
  </template>
`

function createSlideInStory(extraTemplate = '') {
  return (args: Story['args']) => ({
    components: { SFSlideIn },
    setup() {
      const isOpen = ref(args?.isOpen ?? false)
      watch(
        () => args?.isOpen,
        (value) => {
          if (value !== undefined) {
            isOpen.value = value
          }
        },
      )
      return { isOpen, args }
    },
    template: `
      <div class="flex h-96 w-full items-center justify-center rounded border border-dashed border-gray-300 bg-gray-100">
        <button
          type="button"
          @click="isOpen = true"
          class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
        >
          Open slide-in
        </button>

        <SFSlideIn
          v-model:isOpen="isOpen"
          :label="args.label"
          :description="args.description"
          :size="args.size"
          :close-on-route-change="args.closeOnRouteChange"
        >
          ${extraTemplate}
          ${scrollableContent}
        </SFSlideIn>
      </div>
    `,
  })
}

/**
 * Built-in header with title and description. Body content scrolls inside the panel.
 */
export const WithTitleAndDescription = {
  render: createSlideInStory(),
} satisfies Story

/**
 * Built-in header with title, description, and an icon before the label. Body scrolls.
 */
export const WithTitleDescriptionAndIcon = {
  render: (args) => ({
    components: {
      SFSlideIn,
      IconUtilityLanguage,
    },
    setup() {
      const isOpen = ref(args?.isOpen ?? false)
      return { isOpen, args }
    },
    template: `
      <div class="flex h-96 w-full items-center justify-center rounded border border-dashed border-gray-300 bg-gray-100">
        <button
          type="button"
          @click="isOpen = true"
          class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
        >
          Open slide-in
        </button>

        <SFSlideIn
          v-model:isOpen="isOpen"
          :label="args.label"
          :description="args.description"
          :size="args.size"
        >
          <template #icon>
            <IconUtilityLanguage />
          </template>
          ${scrollableContent}
        </SFSlideIn>
      </div>
    `,
  }),
} satisfies Story

/**
 * Built-in header with title and description, scrollable body, and a footer action bar.
 */
export const WithTitleDescriptionAndFooter = {
  render: createSlideInStory(footerSlot),
} satisfies Story

/**
 * Custom `#header` slot instead of the built-in title layout. Body scrolls; `label` is used
 * for dialog `aria-label` only.
 */
export const WithCustomHeader = {
  args: {
    label: 'Shop and language',
    description: undefined,
  },
  render: (args) => ({
    components: {
      SFSlideIn,
      IconNavigationClose,
      IconUtilityLanguage,
    },
    setup() {
      const isOpen = ref(args?.isOpen ?? false)
      return { isOpen, args }
    },
    template: `
      <div class="flex h-96 w-full items-center justify-center rounded border border-dashed border-gray-300 bg-gray-100">
        <button
          type="button"
          @click="isOpen = true"
          class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
        >
          Open slide-in
        </button>

        <SFSlideIn
          v-model:isOpen="isOpen"
          :label="args.label"
          :size="args.size"
        >
          <template #header="{ close }">
            <div class="flex w-full items-center justify-between pr-0">
              <p class="heading-section-2 flex items-center gap-2 text-accent">
                <IconUtilityLanguage class="size-6" aria-hidden="true" />
                {{ args.label }}
              </p>
              <button
                type="button"
                class="text-accent hover:text-primary flex size-8 cursor-pointer items-center justify-center rounded-full"
                :aria-label="'Close panel'"
                @click="close"
              >
                <IconNavigationClose class="size-6" aria-hidden="true" />
              </button>
            </div>
          </template>
          ${scrollableContent}
        </SFSlideIn>
      </div>
    `,
  }),
} satisfies Story
