import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RichtextComponent } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import RichTextComponent from './RichTextComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

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
 * Mounts the component with a Contentstack JSON RTE document and returns the
 * rendered wrapper element. Uses the real `@contentstack/utils` renderer so the
 * custom `renderOption` map is exercised end-to-end.
 */
const mountWithDoc = (children: unknown[]) =>
  mount(RichTextComponent, {
    props: {
      contentElement: {
        uid: 'rt-test',
        content: { type: 'doc', uid: 'doc-1', children },
      } as unknown as RichtextComponent,
    },
    global: { directives: cmsDirectives },
  }).get('div')

const textNode = (text: string) => ({ text })
const paragraph = (text: string) => ({
  type: 'p',
  uid: `p-${text}`,
  attrs: {},
  children: [textNode(text)],
})

describe('RichTextComponent', () => {
  beforeEach(() => {
    // Reset here rather than at the end of the test that sets it, so a failure
    // there cannot leave the country selector changed for the rest of the file.
    storefrontState.countrySelector = 'path'
    storefrontState.country = { path: 'de', isDefault: false }
  })

  it('gives the wrapper the paragraph text style so list items match paragraph size', () => {
    const root = mountWithDoc([
      paragraph('Paragraph'),
      {
        type: 'ul',
        uid: 'ul-1',
        attrs: {},
        children: [
          {
            type: 'li',
            uid: 'li-1',
            attrs: {},
            children: [textNode('Bullet')],
          },
        ],
      },
    ])

    // `li` and every tag without its own render option inherit the wrapper's
    // font size. Without the paragraph style on the wrapper they fall back to
    // the browser default, which is larger.
    expect(root.classes()).toEqual(root.get('p').classes())
    expect(root.get('li').text()).toBe('Bullet')
  })

  it('renders an empty wrapper when content is missing', () => {
    const wrapper = mount(RichTextComponent, {
      props: {
        contentElement: { uid: 'rt-empty' } as unknown as RichtextComponent,
      },
      global: { directives: cmsDirectives },
    })

    expect(wrapper.get('div').element.innerHTML).toBe('')
  })

  const anchor = (attrs: Record<string, unknown>) => ({
    type: 'a',
    uid: 'a-1',
    attrs,
    children: [textNode('link')],
  })

  it.for([
    {
      case: 'escapes an anchor href that tries to break out of the attribute',
      node: anchor({ url: 'https://example.com/x" onclick="alert(1)' }),
      expected: 'href="https://example.com/x&quot; onclick=&quot;alert(1)"',
      forbidden: '" onclick="alert(1)"',
    },
    {
      case: 'escapes an anchor target that tries to break out of the attribute',
      node: anchor({
        url: 'https://example.com',
        target: '_self" onmouseover="x',
      }),
      expected: 'target="_self&quot; onmouseover=&quot;x"',
      forbidden: '" onmouseover="x"',
    },
    {
      case: 'replaces an unsafe reference href with a safe fallback',
      node: {
        type: 'reference',
        uid: 'ref-1',
        attrs: { href: 'javascript:alert(1)' },
        children: [textNode('link')],
      },
      expected: 'href="#"',
      forbidden: 'javascript:',
    },
    {
      case: 'strips a repeated country prefix from an internal anchor',
      node: anchor({ url: '/de/de/content/about' }),
      expected: 'href="/de/content/about"',
      forbidden: '/de/de/content/about',
    },
    {
      case: 'leaves a mailto anchor untouched instead of localizing it as an internal path',
      node: anchor({ url: 'mailto:a@b.com' }),
      expected: 'href="mailto:a@b.com"',
      forbidden: '/de/mailto:a@b.com',
    },
    {
      case: 'leaves a tel anchor untouched instead of localizing it as an internal path',
      node: anchor({ url: 'tel:+4912345' }),
      expected: 'href="tel:+4912345"',
      forbidden: '/de/tel:+4912345',
    },
  ])('$case', ({ node, expected, forbidden }) => {
    const html = mountWithDoc([node]).html()

    expect(html).toContain(expected)
    expect(html).not.toContain(forbidden)
  })

  it('strips a single country prefix on the default country under path_except_default', () => {
    storefrontState.countrySelector = 'path_except_default'
    storefrontState.country = { path: 'de', isDefault: true }

    const html = mountWithDoc([anchor({ url: '/de/content/about' })]).html()

    expect(html).toContain('href="/content/about"')
  })
})
