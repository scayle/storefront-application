import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { AccordionItemComponent as AccordionItemComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import AccordionItemComponent from './AccordionItemComponent.vue'

const cmsDirectives = { editable: vEditable }

vi.mock(
  import('@client/cms/shared/richtext'),
  () => import('@test/mocks/richtext'),
)

const item = (fields: Record<string, unknown> = {}) =>
  ({
    _uid: 'accordion-item-1',
    component: 'AccordionItemComponent',
    title: 'Delivery',
    ...fields,
  }) as unknown as AccordionItemComponentType

const textBlock = (uid: string, content: string) => ({
  _uid: uid,
  component: 'TextComponent',
  content,
})

const mountItem = (contentElement: AccordionItemComponentType = item()) =>
  mount(AccordionItemComponent, {
    props: { contentElement },
    global: { directives: cmsDirectives },
  })

describe('Storyblok AccordionItemComponent', () => {
  it('renders the authored title in the accordion summary', () => {
    expect(mountItem().get('[data-testid="accordion-summary"]').text()).toBe(
      'Delivery',
    )
  })

  it('renders an empty summary when the title is missing', () => {
    expect(
      mountItem(item({ title: undefined }))
        .get('[data-testid="accordion-summary"]')
        .text(),
    ).toBe('')
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

  it('renders no blocks when the content field is not an array', () => {
    // A blok field edited from single to multiple in the component schema can
    // still deliver the old single-object shape on entries saved before.
    const wrapper = mountItem(item({ content: textBlock('text-1', 'Alone') }))

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('keys the accordion on the blok uid', () => {
    expect(mountItem().get('details').attributes('id')).toBe('accordion-item-1')
  })
})
