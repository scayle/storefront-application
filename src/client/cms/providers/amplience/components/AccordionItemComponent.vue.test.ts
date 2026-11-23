import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { AmplienceAccordionItem } from '@shared/types/cms/amplience'
import AccordionItemComponent from './AccordionItemComponent.vue'

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const item = (fields: Record<string, unknown> = {}) =>
  ({
    _meta: {
      schema: 'https://scayle.com/schemas/accordion-item-component.json',
      deliveryId: 'item-delivery-id',
    },
    title: 'Delivery',
    ...fields,
  }) as unknown as AmplienceAccordionItem

const textBlock = (content: string) => ({
  componentType: 'text',
  text: { _meta: { schema: 'x' }, content },
})

const mountItem = (contentElement: AmplienceAccordionItem = item()) =>
  mount(AccordionItemComponent, { props: { contentElement } })

describe('Amplience AccordionItemComponent', () => {
  it('renders the authored title in the accordion summary', () => {
    expect(mountItem().get('[data-testid="accordion-summary"]').text()).toBe(
      'Delivery',
    )
  })

  it('renders an empty summary when the title is missing', () => {
    // `title` is required by the schema, but a content item saved through the
    // delivery API can still arrive without it.
    expect(
      mountItem(item({ title: undefined }))
        .get('[data-testid="accordion-summary"]')
        .text(),
    ).toBe('')
  })

  it('renders the nested blocks in authored order', () => {
    const text = mountItem(
      item({
        content: [textBlock('Ships in two days'), textBlock('Free returns')],
      }),
    ).text()

    expect(text).toContain('Ships in two days')
    expect(text).toContain('Free returns')
    expect(text.indexOf('Ships in two days')).toBeLessThan(
      text.indexOf('Free returns'),
    )
  })

  it('renders no blocks when the item has no content yet', () => {
    const wrapper = mountItem(item({ content: undefined }))

    expect(wrapper.find('details').exists()).toBe(true)
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('gives each item on the page a unique id, since Amplience has no per-block id', () => {
    // Nested items share their parent content item's `deliveryId`, so the
    // component falls back to `useId` for the `<details>` id. Both items are
    // mounted in one app so they draw from the same id counter, as they do on
    // a real page.
    const wrapper = mount(
      defineComponent({
        components: { AccordionItemComponent },
        setup: () => ({ contentElement: item() }),
        template: `<div>
          <AccordionItemComponent :content-element="contentElement" />
          <AccordionItemComponent :content-element="contentElement" />
        </div>`,
      }),
    )

    const ids = wrapper.findAll('details').map((el) => el.attributes('id'))

    expect(ids).toHaveLength(2)
    expect(ids[0]).toBeTruthy()
    expect(new Set(ids).size).toBe(2)
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const wrapper = mountItem()

    expect(wrapper.attributes('data-amplience-entry-id')).toBe(
      'item-delivery-id',
    )
    expect(wrapper.attributes('data-amplience-field-id')).toBe('content')
  })
})
