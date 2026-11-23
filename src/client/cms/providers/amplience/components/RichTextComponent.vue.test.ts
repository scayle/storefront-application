import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { RichTextComponent as RichTextComponentType } from '@shared/types/cms/amplience'
import RichTextComponent from './RichTextComponent.vue'

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Sanitization is covered by the shared helper's own tests.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: { config: { countrySelector: 'path' }, country: { path: 'de' } },
    },
    country: { value: { path: 'de' } },
  }),
}))

const mountRichText = (content: string) =>
  mount(RichTextComponent, {
    props: {
      contentElement: {
        _meta: { schema: 'x', deliveryId: 'rt-1' },
        content,
      } as unknown as RichTextComponentType,
    },
  })

describe('Amplience RichTextComponent', () => {
  it('renders markdown paragraphs with the body type class', () => {
    const paragraph = mountRichText('Just some copy.').get('p')

    expect(paragraph.text()).toBe('Just some copy.')
    expect(paragraph.classes()).toContain('body-default')
  })

  it.each([
    { markdown: '# Title', tag: 'h1', className: 'heading-page' },
    { markdown: '## Title', tag: 'h2', className: 'heading-section-1' },
    { markdown: '### Title', tag: 'h3', className: 'heading-section-2' },
    { markdown: '#### Title', tag: 'h4', className: 'heading-section-3' },
  ])(
    'maps $markdown to a $tag carrying the $className type class',
    ({ markdown, tag, className }) => {
      const wrapper = mountRichText(markdown)
      const heading = wrapper.get(tag)

      expect(heading.classes()).toContain(className)
      expect(heading.text()).toBe('Title')
    },
  )

  it('renders inline emphasis', () => {
    const html = mountRichText('Some **bold** and *italic* copy.').html()

    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('keeps the raw underline tags the Amplience editor emits', () => {
    // Markdown has no underline syntax, so Amplience emits literal <u> tags.
    expect(mountRichText('An <u>underlined</u> word.').html()).toContain(
      '<u>underlined</u>',
    )
  })

  // Tailwind's preflight removes list markers, so the renderer has to add them
  // back. The indentation classes are a design choice, so no test pins them.
  it('renders unordered lists with bullet markers', () => {
    const list = mountRichText('- one\n- two').get('ul')

    expect(list.classes()).toContain('list-disc')
    expect(list.findAll('li').map((item) => item.text())).toEqual([
      'one',
      'two',
    ])
  })

  it('renders ordered lists with decimal markers', () => {
    expect(mountRichText('1. one\n2. two').get('ol').classes()).toContain(
      'list-decimal',
    )
  })

  it('localizes an internal link', () => {
    const href = mountRichText('[About](/content/about)')
      .get('a')
      .attributes().href

    expect(href).toBe('/de/content/about')
  })

  // A single prefix would pass with or without normalization, since localizing
  // an already-localized path is a no-op. Doubling it is what proves the
  // stripping actually runs.
  it('strips a country prefix the author included before localizing', () => {
    const href = mountRichText('[About](/de/de/content/about)')
      .get('a')
      .attributes().href

    expect(href).toBe('/de/content/about')
  })

  it('escapes a quote in a link title, which would otherwise close the attribute', () => {
    // `sanitizeCmsHtml` is stubbed to identity above, so this asserts on the
    // renderer's own escaping rather than on what DOMPurify would salvage.
    const html = mountRichText(
      '[About](/content/about "x\\" onmouseover=alert(1) y")',
    ).html()

    expect(html).not.toContain('onmouseover=alert(1)"')
    expect(html).toContain('&quot;')
  })

  it('escapes a quote in a link href, which markdown allows in the angle-bracket form', () => {
    const html = mountRichText(
      '[About](</content/a" onmouseover=alert(1)>)',
    ).html()

    // The quote is encoded, so the injected text stays inside the href value
    // instead of terminating it and becoming an attribute of its own.
    expect(html).toContain('&quot; onmouseover=alert(1)')
    expect(html).not.toContain('" onmouseover=alert(1)')
  })

  it('opens an external link in a new tab with noopener', () => {
    const anchor = mountRichText('[SCAYLE](https://scayle.com)').get('a')

    expect(anchor.attributes('href')).toBe('https://scayle.com')
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toContain('noopener')
  })

  it.for([
    {
      case: 'leaves a mailto link untouched instead of localizing it as an internal path',
      markdown: '[Mail](mailto:a@b.com)',
      expected: 'mailto:a@b.com',
    },
    {
      case: 'leaves a tel link untouched instead of localizing it as an internal path',
      markdown: '[Call](tel:+4912345)',
      expected: 'tel:+4912345',
    },
    {
      case: 'replaces a javascript link with the safe fallback href',
      markdown: '[Run](javascript:alert(1))',
      expected: '#',
    },
  ])('$case', ({ markdown, expected }) => {
    const href = mountRichText(markdown).get('a').attributes().href

    expect(href).toBe(expected)
  })

  it('renders nothing when the field is empty', () => {
    expect(mountRichText('').html()).not.toContain('<p')
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    // Queried directly: the template's eslint-disable comment sits alongside the
    // div, so the component has no single root for `wrapper.attributes()`.
    const root = mountRichText('copy').get('div')

    expect(root.attributes('data-amplience-entry-id')).toBe('rt-1')
    expect(root.attributes('data-amplience-field-id')).toBe('content')
  })
})
