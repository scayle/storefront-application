import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/storyblok'
import { vEditable } from '../directives/editable'
import ButtonComponent from './ButtonComponent.vue'

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
        _uid: 'btn-1',
        component: 'ButtonComponent',
        ...contentElement,
      } as ButtonComponentType,
    },
    global: {
      directives: { editable: vEditable },
      stubs: { SFButton: SFButtonStub },
    },
  })

const buttonProps = (contentElement: Partial<ButtonComponentType>) =>
  mountButton(contentElement).findComponent(SFButtonStub).props()

describe('ButtonComponent', () => {
  it('renders button text from block.text', () => {
    expect(mountButton({ text: 'Shop now' }).text()).toContain('Shop now')
  })

  it('resolves an internal story link to a path without the country prefix', () => {
    expect(
      buttonProps({
        text: 'Go to page',
        url: { linktype: 'story', story: { full_slug: 'de/content/about' } },
      } as Partial<ButtonComponentType>).to,
    ).toBe('/content/about')
  })

  it('passes an external link through and opens it in a new tab', () => {
    const props = buttonProps({
      text: 'External',
      url: { linktype: 'url', url: 'https://example.com', target: '_blank' },
    } as Partial<ButtonComponentType>)

    expect(props.to).toBe('https://example.com')
    expect(props.target).toBe('_blank')
  })

  it.for(['primary', 'secondary', 'accent', 'plain'] as const)(
    'maps the %s style to the matching button variant',
    (style) => {
      expect(buttonProps({ text: 'Click', style }).variant).toBe(style)
    },
  )

  it('falls back to the primary variant when style is empty', () => {
    expect(buttonProps({ text: 'Default' }).variant).toBe('primary')
  })
})
