import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent as LinkComponentType } from '@shared/types/cms/amplience'
import LinkComponent from './LinkComponent.vue'

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: { config: { countrySelector: 'path' }, country: { path: 'de' } },
    },
    country: { value: { path: 'de' } },
  }),
}))

const SFLinkStub = {
  template: '<a><slot /></a>',
  props: ['to', 'target'],
}

const textChild = {
  componentType: 'text',
  text: { _meta: { schema: 'x' }, content: 'Read more' },
}

const mountLink = (contentElement: Partial<LinkComponentType>) =>
  mount(LinkComponent, {
    props: {
      contentElement: {
        _meta: { schema: 'x', deliveryId: 'link-1' },
        content: [textChild],
        ...contentElement,
      } as unknown as LinkComponentType,
    },
    global: { stubs: { SFLink: SFLinkStub } },
  })

const linkProps = (contentElement: Partial<LinkComponentType>) =>
  mountLink(contentElement).findComponent(SFLinkStub).props()

describe('Amplience LinkComponent', () => {
  it('renders its wrapped content through the dispatcher', () => {
    expect(
      mountLink({ link: '/x', url_type: 'internal' } as never).text(),
    ).toContain('Read more')
  })

  it('strips a country prefix the author included', () => {
    expect(
      linkProps({ link: '/de/content/about', url_type: 'internal' } as never)
        .to,
    ).toBe('/content/about')
  })

  it('falls back to the site root when no link is set, so the anchor stays valid', () => {
    expect(linkProps({ url_type: 'internal' } as never).to).toBe('/')
  })

  it('honors the open_in_new_tab flag rather than guessing from the URL', () => {
    expect(
      linkProps({
        link: '/content/about',
        url_type: 'internal',
        open_in_new_tab: true,
      } as never).target,
    ).toBe('_blank')
  })

  it('stays in the same tab when the flag is unset', () => {
    expect(
      linkProps({
        link: 'https://scayle.com',
        url_type: 'external',
      } as never).target,
    ).toBe('_self')
  })
})
