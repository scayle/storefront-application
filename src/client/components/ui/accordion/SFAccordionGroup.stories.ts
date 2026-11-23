import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SFAccordion from './SFAccordion.vue'
import SFAccordionGroup from './SFAccordionGroup.vue'

/**
 * SFAccordionGroup stacks a collection of SFAccordion entries with a shared
 * outer border and dividers between items, matching the Figma "Group"
 * composition.
 */
const meta = {
  title: 'UI/Accordion/SFAccordionGroup',
  component: SFAccordionGroup,
} satisfies Meta<typeof SFAccordionGroup>

export default meta
type Story = StoryObj<typeof SFAccordionGroup>

export const Default = {
  render: () => ({
    components: { SFAccordion, SFAccordionGroup },
    template: `
    <SFAccordionGroup>
      <SFAccordion title="Title of accordion" id="group-default-1">
        <p class="text-md">Accordion content one.</p>
      </SFAccordion>
      <SFAccordion title="Title of accordion" id="group-default-2">
        <p class="text-md">Accordion content two.</p>
      </SFAccordion>
      <SFAccordion title="Title of accordion" id="group-default-3">
        <p class="text-md">Accordion content three.</p>
      </SFAccordion>
    </SFAccordionGroup>`,
  }),
} satisfies Story

export const WithDisabledItem = {
  render: () => ({
    components: { SFAccordion, SFAccordionGroup },
    template: `
    <SFAccordionGroup>
      <SFAccordion title="Title of accordion" id="group-disabled-1">
        <p class="text-md">First item is interactive.</p>
      </SFAccordion>
      <SFAccordion title="Disabled item" id="group-disabled-2" disabled>
        <p class="text-md">This content is not reachable.</p>
      </SFAccordion>
      <SFAccordion title="Title of accordion" id="group-disabled-3">
        <p class="text-md">Third item is interactive.</p>
      </SFAccordion>
    </SFAccordionGroup>`,
  }),
} satisfies Story
