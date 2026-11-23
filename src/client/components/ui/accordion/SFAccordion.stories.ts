import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Size } from '@client/utils/constants'
import SFAccordion from './SFAccordion.vue'

/**
 * SFAccordion is a collapsible content component matching the V3 design system
 * Accordion spec. From the `sm` breakpoint upward it places the title and the
 * expanded content in two columns; `forceOneColumn` keeps them stacked at every
 * viewport size for narrow surfaces. The `md` size trims the row height and the
 * type size for accordions that sit next to other page content. A disabled
 * state is also available. The native `<details>`/`<summary>` elements preserve
 * keyboard and screen-reader accessibility.
 */
const meta = {
  title: 'UI/Accordion/SFAccordion',
  component: SFAccordion,
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    size: {
      control: { type: 'select' },
      options: [Size.MD, Size.LG],
    },
  },
  render: (args) => ({
    components: { SFAccordion },
    setup() {
      return { args }
    },
    template: `
    <SFAccordion v-bind="args">
      <p class="border border-gray-300 p-2 text-md">
        This is the accordion content that appears when the section is expanded.
      </p>
    </SFAccordion>`,
  }),
} satisfies Meta<typeof SFAccordion>

export default meta
type Story = StoryObj<typeof SFAccordion>

export const Enabled = {
  args: {
    title: 'Title of accordion',
    id: 'accordion-enabled',
  },
} satisfies Story

export const Disabled = {
  args: {
    title: 'Title of accordion',
    id: 'accordion-disabled',
    disabled: true,
  },
} satisfies Story

export const Expanded = {
  args: {
    title: 'Title of accordion',
    id: 'accordion-expanded',
  },
  play: ({ canvasElement }) => {
    canvasElement.querySelectorAll('details').forEach((el) => {
      el.setAttribute('open', '')
    })
  },
} satisfies Story

/**
 * `forceOneColumn` keeps the title and the content stacked at every viewport
 * size, for narrow surfaces such as the product detail page's info column.
 * Expanded on load, since the two layout modes only diverge once the content
 * is visible: the default puts it in a second column from `sm` up.
 */
export const ForceOneColumn = {
  args: {
    title: 'Title of accordion',
    id: 'accordion-force-one-column',
    forceOneColumn: true,
  },
  play: ({ canvasElement }) => {
    canvasElement.querySelectorAll('details').forEach((el) => {
      el.setAttribute('open', '')
    })
  },
} satisfies Story

/**
 * The `md` size as the product detail page uses it, stacked in one column:
 * a 64px title row with no vertical padding around it, a 16px title, and
 * 14px content. Expanded on load to show the content spacing.
 */
export const MediumSize = {
  args: {
    title: 'Title of accordion',
    id: 'accordion-medium-size',
    forceOneColumn: true,
    size: Size.MD,
  },
  play: ({ canvasElement }) => {
    canvasElement.querySelectorAll('details').forEach((el) => {
      el.setAttribute('open', '')
    })
  },
} satisfies Story

export const LongTitle = {
  args: {
    title:
      'Super long accordion title placeholder that should wrap onto multiple lines without breaking the header layout',
    id: 'accordion-long-title',
  },
} satisfies Story

export const WithDescriptionAndList = {
  render: (args) => ({
    components: { SFAccordion },
    setup() {
      return { args }
    },
    template: `
    <SFAccordion v-bind="args">
      <div class="flex flex-col gap-3 text-md">
        <p>
          This accordion component provides an easy way to organize and hide
          information, allowing users to expand sections as needed.
        </p>
        <ul class="list-disc pl-6">
          <li>Accordion list item</li>
          <li>Accordion list item</li>
          <li>Accordion list item</li>
          <li>Accordion list item</li>
        </ul>
      </div>
    </SFAccordion>`,
  }),
  args: {
    title: 'Title of accordion',
    id: 'accordion-description-list',
  },
} satisfies Story

export const ComplexContent = {
  render: (args) => ({
    components: { SFAccordion },
    setup() {
      return { args }
    },
    template: `
    <SFAccordion v-bind="args">
      <div class="space-y-4 border border-gray-300 p-2">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold">Size Guide</h4>
          <button class="text-sm text-accent underline" type="button">Download PDF</button>
        </div>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div class="font-semibold">Small</div>
            <div class="text-secondary">Chest: 36-38"</div>
            <div class="text-secondary">Waist: 28-30"</div>
          </div>
          <div>
            <div class="font-semibold">Medium</div>
            <div class="text-secondary">Chest: 38-40"</div>
            <div class="text-secondary">Waist: 30-32"</div>
          </div>
          <div>
            <div class="font-semibold">Large</div>
            <div class="text-secondary">Chest: 40-42"</div>
            <div class="text-secondary">Waist: 32-34"</div>
          </div>
        </div>
      </div>
    </SFAccordion>`,
  }),
  args: {
    title: 'Size Guide',
    id: 'accordion-complex',
  },
} satisfies Story
