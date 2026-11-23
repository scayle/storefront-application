import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { BLOCKS } from '@contentful/rich-text-types'
import type { Document } from '@contentful/rich-text-types'
import type { TypeRichTextComponentWithoutUnresolvableLinksResponse } from '@shared/types/cms/contentful'
import RichTextComponent from './RichTextComponent.vue'

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

vi.mock('@client/composables/useRoute', () => ({
  useRoute: () => ({ baseUrl: computed(() => 'https://example.com') }),
}))

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const text = (value: string) => ({
  nodeType: 'text',
  value,
  marks: [],
  data: {},
})

/**
 * Mounts the component with a Contentful rich text document. Uses the real
 * `documentToHtmlString` renderer so the custom `renderNode` options are
 * exercised end-to-end.
 */
const mountWithDoc = (content: unknown[]) =>
  mount(RichTextComponent, {
    props: {
      contentElement: {
        sys: { id: 'rt-test' },
        fields: {
          content: { nodeType: BLOCKS.DOCUMENT, data: {}, content } as Document,
        },
      } as unknown as TypeRichTextComponentWithoutUnresolvableLinksResponse,
    },
  })

describe('RichTextComponent', () => {
  beforeEach(() => {
    // Reset here rather than at the end of the test that sets it, so a failure
    // there cannot leave the country selector changed for the rest of the file.
    storefrontState.countrySelector = 'path'
    storefrontState.country = { path: 'de', isDefault: false }
  })

  it('gives the wrapper the paragraph typography so list items match paragraph size', () => {
    const wrapper = mountWithDoc([
      {
        nodeType: BLOCKS.PARAGRAPH,
        data: {},
        content: [text('Paragraph')],
      },
      {
        nodeType: BLOCKS.UL_LIST,
        data: {},
        content: [
          {
            nodeType: BLOCKS.LIST_ITEM,
            data: {},
            content: [text('Bullet')],
          },
        ],
      },
    ])

    // `li` and every tag without its own render option inherit the wrapper's
    // font size. Unless the wrapper carries the paragraph's typography, they
    // fall back to the browser default, which is larger.
    const root = wrapper.find('div')
    expect(root.classes()).toEqual(
      expect.arrayContaining(root.get('p').classes()),
    )
    expect(root.get('li').text()).toBe('Bullet')
  })

  it('returns empty string when content is missing', () => {
    const wrapper = mount(RichTextComponent, {
      props: {
        contentElement: {
          sys: { id: 'rt-empty' },
          fields: {},
        } as unknown as TypeRichTextComponentWithoutUnresolvableLinksResponse,
      },
    })

    expect(wrapper.find('div').text()).toBe('')
  })

  const paragraphWith = (nodeType: string, data: Record<string, unknown>) => ({
    nodeType: 'paragraph',
    data: {},
    content: [{ nodeType, data, content: [text('link')] }],
  })

  // Every authored value reaches the anchor as one attribute value: the
  // decoded attribute equals the authored string, and no event handler
  // attribute appears next to it.
  it.for([
    {
      case: 'escapes a rel value that attempts to break out of the attribute',
      node: paragraphWith('hyperlink', {
        uri: '/foo',
        rel: '" onload="alert(1)',
      }),
      attribute: 'rel',
      expected: '" onload="alert(1)',
    },
    {
      case: 'escapes an href value that attempts to break out of the attribute',
      node: paragraphWith('hyperlink', {
        uri: 'https://example.com/foo" onclick="alert(1)',
      }),
      attribute: 'href',
      expected: 'https://example.com/foo" onclick="alert(1)',
    },
    {
      case: 'replaces an unsafe URI scheme with a safe fallback href',
      node: paragraphWith('hyperlink', { uri: 'javascript:alert(1)' }),
      attribute: 'href',
      expected: '#',
    },
    {
      case: 'keeps an allowlisted absolute URI scheme intact',
      node: paragraphWith('hyperlink', { uri: 'mailto:test@example.com' }),
      attribute: 'href',
      expected: 'mailto:test@example.com',
    },
    {
      case: 'strips a repeated country prefix from an internal hyperlink',
      node: paragraphWith('hyperlink', { uri: '/de/de/content/about' }),
      attribute: 'href',
      expected: '/de/content/about',
    },
    {
      case: 'escapes an entry hyperlink slug that attempts to break out of the attribute',
      node: paragraphWith('entry-hyperlink', {
        target: { fields: { slug: 'about" onclick="alert(1)' } },
      }),
      attribute: 'href',
      expected: '/de/content/about" onclick="alert(1)',
    },
    {
      case: 'escapes an asset hyperlink file URL that attempts to break out of the attribute',
      node: paragraphWith('asset-hyperlink', {
        target: { fields: { file: { url: '//cdn/x" onclick="alert(1)' } } },
      }),
      attribute: 'href',
      expected: '//cdn/x" onclick="alert(1)',
    },
  ])('$case', ({ node, attribute, expected }) => {
    const anchor = mountWithDoc([node]).get('a')

    expect(anchor.attributes(attribute)).toBe(expected)
    expect(anchor.attributes()).not.toHaveProperty('onclick')
    expect(anchor.attributes()).not.toHaveProperty('onload')
  })

  it('strips a single country prefix on the default country under path_except_default', () => {
    storefrontState.countrySelector = 'path_except_default'
    storefrontState.country = { path: 'de', isDefault: true }

    const anchor = mountWithDoc([
      paragraphWith('hyperlink', { uri: '/de/content/about' }),
    ]).get('a')

    expect(anchor.attributes('href')).toBe('/content/about')
  })
})
