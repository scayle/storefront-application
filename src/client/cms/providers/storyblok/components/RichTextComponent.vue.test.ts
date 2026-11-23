import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RichTextComponent as RichTextComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import RichTextComponent from './RichTextComponent.vue'

const cmsDirectives = { editable: vEditable }

const storefrontState = vi.hoisted(() => ({
  countrySelector: 'path' as 'path' | 'path_except_default',
  country: { path: 'de', isDefault: false } as Record<string, unknown>,
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: {
        config: { countrySelector: storefrontState.countrySelector },
        country: storefrontState.country,
      },
    },
    country: { value: storefrontState.country },
  }),
}))

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

/**
 * Mounts the component with a fully-formed Storyblok rich text `doc` node.
 * Uses the real `@storyblok/js` renderer so the custom `renderFn` (class
 * injection, empty-paragraph → `<br>`) is exercised end-to-end.
 */
const mountDoc = (
  doc: { type: string; content?: unknown[] } & Record<string, unknown>,
) =>
  mount(RichTextComponent, {
    props: {
      contentElement: {
        _uid: 'rt-test',
        component: 'RichTextComponent',
        content: doc,
      } as RichTextComponentType,
    },
    global: { directives: cmsDirectives },
  })

/** Returns the rendered rich text HTML, including the wrapper element. */
const mountWithDoc = (
  doc: { type: string; content?: unknown[] } & Record<string, unknown>,
): string => mountDoc(doc).find('div').html()

const textNode = (text: string) => ({ type: 'text', text })
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]) => ({ type: 'doc', content })

const linkParagraph = (attrs: Record<string, unknown>, text = 'Link') =>
  paragraph({ type: 'text', text, marks: [{ type: 'link', attrs }] })

/** Renders a single link mark and returns its anchor. */
const renderLink = (attrs: Record<string, unknown>) =>
  mountDoc(doc(linkParagraph(attrs))).find('a')

const bulletList = (attrs?: Record<string, unknown>) => ({
  type: 'bullet_list',
  ...(attrs ? { attrs } : {}),
  content: [{ type: 'list_item', content: [paragraph(textNode('Bullet'))] }],
})

const orderedList = () => ({
  type: 'ordered_list',
  content: [{ type: 'list_item', content: [paragraph(textNode('Ordered'))] }],
})

const heading = (level: number) => ({
  type: 'heading',
  attrs: { level },
  content: [textNode(`H${level}`)],
})

describe('RichTextComponent', () => {
  beforeEach(() => {
    storefrontState.countrySelector = 'path'
    storefrontState.country = { path: 'de', isDefault: false }
  })

  it('returns empty string when content is missing', () => {
    const wrapper = mount(RichTextComponent, {
      props: {
        contentElement: {
          _uid: 'rt-empty',
          component: 'RichTextComponent',
        } as RichTextComponentType,
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.find('div').html()).toBe('<div class="body-default"></div>')
  })

  it('localizes internal links and leaves external ones untouched', () => {
    const html = mountWithDoc(
      doc(
        linkParagraph({ href: '/content/about', linktype: 'story' }),
        linkParagraph({ href: 'https://example.com', linktype: 'url' }),
      ),
    )

    expect(html).toContain('href="/de/content/about"')
    expect(html).toContain('href="https://example.com"')
  })

  it('applies the shared link normalizer to a repeated country prefix on the default country under path_except_default', () => {
    storefrontState.countrySelector = 'path_except_default'
    storefrontState.country = { path: 'de', isDefault: true }

    const html = mountWithDoc(
      doc(linkParagraph({ href: '/de/de/content/about', linktype: 'story' })),
    )

    expect(html).toContain('href="/content/about"')
  })

  it('injects the link typography class on anchors', () => {
    expect(
      renderLink({ href: '/content/about', linktype: 'story' }).classes(),
    ).toContain('font-semibold')
  })

  it('gives each of the first three heading levels its own typography class', () => {
    const wrapper = mountDoc(doc(heading(1), heading(2), heading(3)))
    const headingClasses = ['h1', 'h2', 'h3'].map((tag) =>
      wrapper.get(tag).attributes('class'),
    )

    expect(headingClasses.every(Boolean)).toBe(true)
    expect(new Set(headingClasses).size).toBe(3)
  })

  it('styles bullet and ordered lists differently', () => {
    const wrapper = mountDoc(doc(bulletList(), orderedList()))
    const bulletClasses = wrapper.get('ul').attributes('class')
    const orderedClasses = wrapper.get('ol').attributes('class')

    expect(bulletClasses).toBeTruthy()
    expect(orderedClasses).toBeTruthy()
    expect(bulletClasses).not.toBe(orderedClasses)
  })

  it('merges the injected class with classes already present on the node', () => {
    const injected = mountDoc(doc(bulletList())).get('ul').classes()

    const merged = mountDoc(doc(bulletList({ class: 'existing-class' })))
      .get('ul')
      .classes()

    expect(merged).toEqual(['existing-class', ...injected])
  })

  it('renders an empty paragraph as a line break', () => {
    const html = mountWithDoc(doc({ type: 'paragraph', content: [] }))

    expect(html).toContain('<br>')
    expect(html).not.toContain('<p></p>')
  })

  it('gives the wrapper the paragraph typography so list items match paragraph size', () => {
    // `li` and every tag without its own render option inherit the wrapper's
    // font size. Without the paragraph class there, they fall back to the
    // browser default, which is larger.
    const wrapper = mountDoc(
      doc(paragraph(textNode('Paragraph')), bulletList()),
    )
    const paragraphClasses = wrapper.get('p').classes()

    expect(paragraphClasses).not.toEqual([])
    expect(wrapper.get('div').classes()).toEqual(paragraphClasses)
  })

  it.for([
    {
      case: 'adds noopener noreferrer to a link that opens in a new tab',
      attrs: { href: 'https://example.com', linktype: 'url', target: '_blank' },
      href: 'https://example.com',
      rel: 'noopener noreferrer',
    },
    {
      case: 'adds no rel to a link that stays in the same tab',
      attrs: { href: '/content/about', linktype: 'story' },
      href: '/de/content/about',
      rel: undefined,
    },
    {
      case: 'keeps the rel the author set',
      attrs: {
        href: 'https://example.com',
        linktype: 'url',
        target: '_blank',
        rel: 'nofollow',
      },
      href: 'https://example.com',
      rel: 'nofollow',
    },
    {
      case: 'replaces an unsafe href with a safe fallback',
      attrs: { href: 'javascript:alert(1)', linktype: 'url' },
      href: '#',
      rel: undefined,
    },
    {
      // Unescaped, the quote would end the attribute and add an onmouseover
      // handler, leaving rel empty.
      case: 'keeps a rel that tries to break out of the attribute inside it',
      attrs: {
        href: 'https://example.com',
        linktype: 'url',
        target: '_blank',
        rel: '" onmouseover="alert(1)',
      },
      href: 'https://example.com',
      rel: '" onmouseover="alert(1)',
    },
  ])('$case', ({ attrs, href, rel }) => {
    const anchor = renderLink(attrs)

    expect({
      href: anchor.attributes('href'),
      rel: anchor.attributes('rel'),
    }).toEqual({ href, rel })
  })
})
