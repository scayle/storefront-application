import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type {
  ContentfulContentElement,
  TypeAccordionItemComponentWithoutUnresolvableLinksResponse,
} from '@shared/types/cms/contentful'
import AccordionItemComponent from './AccordionItemComponent.vue'

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const entry = (contentTypeId: string, fields: Record<string, unknown> = {}) =>
  ({
    sys: {
      id: `${contentTypeId}-1`,
      contentType: { sys: { id: contentTypeId } },
    },
    fields,
  }) as unknown as ContentfulContentElement

const textBlock = (id: string, content: string) => ({
  sys: { id, contentType: { sys: { id: 'TextComponent' } } },
  fields: { content },
})

const item = (fields: Record<string, unknown> = { title: 'Delivery' }) =>
  ({
    sys: {
      id: 'accordion-item-1',
      contentType: { sys: { id: 'AccordionItemComponent' } },
    },
    fields,
  }) as unknown as TypeAccordionItemComponentWithoutUnresolvableLinksResponse

const mountItem = (
  contentElement: TypeAccordionItemComponentWithoutUnresolvableLinksResponse = item(),
) => mount(AccordionItemComponent, { props: { contentElement } })

describe('Contentful AccordionItemComponent', () => {
  it('renders the authored title in the accordion summary', () => {
    expect(mountItem().get('[data-testid="accordion-summary"]').text()).toBe(
      'Delivery',
    )
  })

  it('renders an empty summary when the title is missing', () => {
    expect(
      mountItem(item({})).get('[data-testid="accordion-summary"]').text(),
    ).toBe('')
  })

  it('renders the nested blocks in authored order', () => {
    const text = mountItem(
      item({
        title: 'Delivery',
        content: [
          textBlock('text-1', 'Ships in two days'),
          textBlock('text-2', 'Free returns'),
        ],
      }),
    ).text()

    expect(text).toContain('Ships in two days')
    expect(text).toContain('Free returns')
    expect(text.indexOf('Ships in two days')).toBeLessThan(
      text.indexOf('Free returns'),
    )
  })

  it('renders no blocks when the item has no content yet', () => {
    const wrapper = mountItem()

    expect(wrapper.find('details').exists()).toBe(true)
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders no blocks when the content field is not an array', () => {
    // A single-reference field edited into a multi-reference one delivers the
    // bare entry rather than a list.
    const wrapper = mountItem(
      item({ title: 'Delivery', content: entry('TextComponent') }),
    )

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('keys the accordion on the entry id', () => {
    expect(mountItem().get('details').attributes('id')).toBe('accordion-item-1')
  })

  it('annotates the entry so the Contentful editor can highlight the field', () => {
    const wrapper = mountItem()

    expect(wrapper.attributes('data-contentful-entry-id')).toBe(
      'accordion-item-1',
    )
    expect(wrapper.attributes('data-contentful-field-id')).toBe('content')
  })
})
