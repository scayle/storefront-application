import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent as LinkComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import LinkComponent from './LinkComponent.vue'

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: { config: { countrySelector: 'path' }, country: { path: 'de' } },
    },
    country: { value: { path: 'de' } },
  }),
}))

// isomorphic-dompurify loads jsdom internally which conflicts with happy-dom.
// Component tests do not need real HTML sanitization.
vi.mock('@client/cms/shared/richtext', () => ({
  sanitizeCmsHtml: (html: string) => html,
}))

const SFLinkStub = { template: '<a><slot /></a>', props: ['to', 'target'] }

const mountLink = (contentElement: Partial<LinkComponentType>) =>
  mount(LinkComponent, {
    props: {
      contentElement: {
        _uid: 'link-1',
        component: 'LinkComponent',
        ...contentElement,
      } as LinkComponentType,
    },
    global: {
      directives: { editable: vEditable },
      stubs: { SFLink: SFLinkStub },
    },
  })

const linkTarget = (contentElement: Partial<LinkComponentType>) =>
  mountLink(contentElement).findComponent(SFLinkStub).props('to')

describe('LinkComponent', () => {
  it('renders child content blocks', () => {
    const wrapper = mountLink({
      url: { linktype: 'url', url: 'https://example.com' },
      content: [
        { _uid: 'text-1', component: 'TextComponent', content: 'Click here' },
      ],
    } as Partial<LinkComponentType>)

    expect(wrapper.text()).toContain('Click here')
  })

  it('links a story to its path without the country prefix, leaving localization to SFLink', () => {
    expect(
      linkTarget({
        url: { linktype: 'story', story: { full_slug: 'de/content/about' } },
      } as Partial<LinkComponentType>),
    ).toBe('/content/about')
  })

  it('falls back to "/" when URL is missing', () => {
    expect(linkTarget({})).toBe('/')
  })
})
