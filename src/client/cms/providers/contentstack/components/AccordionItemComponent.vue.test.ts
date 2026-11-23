import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { AccordionItemComponent as AccordionItemComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import AccordionItemComponent from './AccordionItemComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const item = (fields: Record<string, unknown> = {}) =>
  ({
    uid: 'accordion-item-1',
    _content_type_uid: 'accordion_item-component',
    title: 'Delivery',
    ...fields,
  }) as unknown as AccordionItemComponentType

const textBlock = (uid: string, content: string) => ({
  uid,
  _content_type_uid: 'text-component',
  title: 'Text',
  content,
})

const mountItem = (contentElement: AccordionItemComponentType = item()) =>
  mount(AccordionItemComponent, {
    props: { contentElement },
    global: { directives: cmsDirectives },
  })

describe('Contentstack AccordionItemComponent', () => {
  // `title` is the editor-facing name of the entry; `display_title` is what
  // the storefront shows when the author set it. An author who clears the
  // field leaves an empty string behind, not an absent key.
  it.for([
    {
      case: 'the display title when set',
      fields: { display_title: 'Shipping & Delivery' },
      expected: 'Shipping & Delivery',
    },
    {
      case: 'the internal title without a display title',
      fields: {},
      expected: 'Delivery',
    },
    {
      case: 'the internal title when the display title is blank',
      fields: { display_title: '' },
      expected: 'Delivery',
    },
    {
      case: 'nothing when neither title is set',
      fields: { title: undefined },
      expected: '',
    },
  ])('shows $case in the summary', ({ fields, expected }) => {
    expect(
      mountItem(item(fields)).get('[data-testid="accordion-summary"]').text(),
    ).toBe(expected)
  })

  it('renders the nested blocks in authored order', () => {
    const text = mountItem(
      item({
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

  it('keys the accordion on the entry uid', () => {
    expect(mountItem().get('details').attributes('id')).toBe('accordion-item-1')
  })

  it('annotates the item with the live-preview attribute of its content field', () => {
    const wrapper = mountItem(
      item({
        $: {
          content: { 'data-cslp': 'accordion_item-component.item-1.content' },
        },
      }),
    )

    expect(wrapper.attributes('data-cslp')).toBe(
      'accordion_item-component.item-1.content',
    )
  })
})
