import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import type { TypeSectionComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import {
  resolveFlexAlignmentClass,
  resolvePaddingClass,
} from '@client/cms/shared/alignment'
import { provideLcpPriority } from '@client/cms/shared/useLcpPriority'
import SectionComponent from './SectionComponent.vue'

const section = (fields: Record<string, unknown> = {}) =>
  ({
    sys: { id: 'section-1' },
    fields: { content: [], ...fields },
  }) as unknown as TypeSectionComponentWithoutUnresolvableLinksResponse

const backgroundImageDesktop = {
  fields: { file: { url: '//images.ctfassets.net/bg.jpg' } },
}

const BlockStub = defineComponent({
  name: 'ContentfulBlockDispatch',
  props: ['contentElement'],
  template: '<div data-testid="block" />',
})

const mountSection = (
  contentElement: TypeSectionComponentWithoutUnresolvableLinksResponse,
) =>
  mount(SectionComponent, {
    props: { contentElement },
    global: { stubs: { ContentfulBlockDispatch: BlockStub } },
  })

/** Mounts sections the way a page does, so they share one LCP claim. */
const mountPage = (
  ...sections: TypeSectionComponentWithoutUnresolvableLinksResponse[]
) =>
  mount(
    defineComponent({
      setup() {
        provideLcpPriority()
        return () =>
          h(
            'div',
            sections.map((contentElement) =>
              h(SectionComponent, { contentElement }),
            ),
          )
      },
    }),
    { global: { stubs: { ContentfulBlockDispatch: BlockStub } } },
  )

describe('Contentful SectionComponent', () => {
  // The index-to-priority table is tested in shared/useLcpPriority.vue.test.ts;
  // this proves the section claims a position for its background image.
  it('marks the first background image high priority and eager', () => {
    const img = mountPage(section({ backgroundImageDesktop })).get('img')

    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('leaves the first position to the next image when it has no background', () => {
    const img = mountPage(section(), section({ backgroundImageDesktop })).get(
      'img',
    )

    expect(img.attributes('fetchpriority')).toBe('high')
  })

  it('applies the CMS isPriorityImage toggle to the background image', () => {
    // Mounted without a page, the section claims no position, so only the
    // editor toggle can raise the priority.
    const img = mountSection(
      section({ backgroundImageDesktop, isPriorityImage: true }),
    ).get('img')

    expect(img.attributes('fetchpriority')).toBe('high')
    expect(img.attributes('loading')).toBe('eager')
  })

  it('applies the authored background color', () => {
    const wrapper = mountSection(section({ backgroundColor: '#ff0000' }))

    expect(wrapper.element.style.backgroundColor).toBe('#ff0000')
  })

  it('applies the authored min heights per breakpoint', () => {
    const style = mountSection(
      section({ minHeightDesktop: 600, minHeightMobile: 400 }),
    ).element.style

    expect(style.getPropertyValue('--min-height-desktop')).toBe('600px')
    expect(style.getPropertyValue('--min-height-mobile')).toBe('400px')
  })

  it('falls back to the desktop min height on mobile when only that is set', () => {
    const style = mountSection(section({ minHeightDesktop: 600 })).element.style

    expect(style.getPropertyValue('--min-height-mobile')).toBe('600px')
  })

  it('passes the padding and horizontal alignment fields to their resolvers', () => {
    const blocks = mountSection(
      section({
        content: [{ sys: { id: 'text-1' } }],
        padding: 'medium',
        horizontalContentAlignment: 'Right',
      }),
    ).get('[data-testid="block"]').element.parentElement!

    expect([...blocks.classList]).toEqual(
      expect.arrayContaining([
        ...resolvePaddingClass('medium').split(' '),
        resolveFlexAlignmentClass('Right'),
      ]),
    )
  })

  it('renders one block per nested entry, in authored order', () => {
    const content = [{ sys: { id: 'text-1' } }, { sys: { id: 'text-2' } }]

    const blocks = mountSection(section({ content })).findAllComponents(
      BlockStub,
    )

    expect(blocks.map((block) => block.props('contentElement'))).toEqual(
      content,
    )
  })

  // Auto margins push the blocks to the bottom, the middle, or the top of a
  // section taller than its content.
  it.for([
    { alignment: 'Top', first: [], last: ['mb-auto'] },
    { alignment: 'Middle', first: ['mt-auto'], last: ['mb-auto'] },
    { alignment: 'Bottom', first: ['mt-auto'], last: [] },
    { alignment: undefined, first: ['mt-auto'], last: ['mb-auto'] },
  ])(
    'spaces the blocks for vertical alignment $alignment',
    ({ alignment, first, last }) => {
      const blocks = mountSection(
        section({
          content: [{ sys: { id: 'text-1' } }, { sys: { id: 'text-2' } }],
          verticalContentAlignment: alignment,
        }),
      ).findAll('[data-testid="block"]')

      expect(blocks[0]?.classes()).toEqual(first)
      expect(blocks[1]?.classes()).toEqual(last)
    },
  )
})
