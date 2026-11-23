import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/contentstack'
import { vLivePreview } from '../directives/livePreview'
import ButtonComponent from './ButtonComponent.vue'

const cmsDirectives = { 'live-preview': vLivePreview }

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    config: {
      value: { config: { countrySelector: 'path' }, country: { path: 'de' } },
    },
    country: { value: { path: 'de' } },
  }),
}))

const SFButtonStub = {
  template: '<button><slot /></button>',
  props: ['variant', 'to', 'target'],
}

const mountButton = (contentElement: Partial<ButtonComponentType>) =>
  mount(ButtonComponent, {
    props: {
      contentElement: {
        uid: 'btn-1',
        _content_type_uid: 'button-component',
        title: 'Button',
        ...contentElement,
      } as ButtonComponentType,
    },
    global: {
      directives: cmsDirectives,
      stubs: { SFButton: SFButtonStub },
    },
  })

const buttonProps = (contentElement: Partial<ButtonComponentType>) =>
  mountButton(contentElement).findComponent(SFButtonStub).props()

describe('ButtonComponent', () => {
  it('renders button text from block.text', () => {
    expect(mountButton({ text: 'Shop now' }).text()).toContain('Shop now')
  })

  it('strips an author-included country prefix to avoid double localization', () => {
    expect(buttonProps({ text: 'x', url: '/de/content/about' }).to).toBe(
      '/content/about',
    )
  })

  it('renders external links with target="_blank"', () => {
    const props = buttonProps({
      text: 'External',
      url: 'https://example.com',
      open_in_new_tab: true,
    })

    expect(props.to).toBe('https://example.com')
    expect(props.target).toBe('_blank')
  })

  it.for(['primary', 'secondary', 'accent', 'plain'] as const)(
    'maps the %s style to the matching variant',
    (style) => {
      expect(buttonProps({ text: 'x', style }).variant).toBe(style)
    },
  )

  it('falls back to primary when style is empty', () => {
    expect(buttonProps({ text: 'Default' }).variant).toBe('primary')
  })
})
