import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ButtonComponent as ButtonComponentType } from '@shared/types/cms/amplience'
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
        _meta: { schema: 'x', deliveryId: 'btn-1' },
        ...contentElement,
      } as ButtonComponentType,
    },
    global: { stubs: { SFButton: SFButtonStub } },
  })

const buttonProps = (contentElement: Partial<ButtonComponentType>) =>
  mountButton(contentElement).findComponent(SFButtonStub).props()

describe('Amplience ButtonComponent', () => {
  it('renders the label field as the button text', () => {
    expect(mountButton({ label: 'Shop now', link: '/x' }).text()).toContain(
      'Shop now',
    )
  })

  it.each([
    { variant: 'primary', expected: 'primary' },
    { variant: 'secondary', expected: 'secondary' },
    { variant: 'accent', expected: 'accent' },
    { variant: 'raw', expected: 'raw' },
    // Amplience offers `outline`, which the storefront expresses as `plain`.
    { variant: 'outline', expected: 'plain' },
  ])(
    'maps the $variant Amplience variant to $expected',
    ({ variant, expected }) => {
      expect(
        buttonProps({ label: 'x', link: '/x', variant } as never).variant,
      ).toBe(expected)
    },
  )

  it('falls back to primary for an unset variant', () => {
    expect(buttonProps({ label: 'x', link: '/x' }).variant).toBe('primary')
  })

  it('strips a country prefix the author included so the link is not double-localized', () => {
    expect(buttonProps({ label: 'x', link: '/de/content/about' }).to).toBe(
      '/content/about',
    )
  })

  it('passes an absolute link through and opens it in a new tab', () => {
    const props = buttonProps({ label: 'x', link: 'https://scayle.com' })

    expect(props.to).toBe('https://scayle.com')
    expect(props.target).toBe('_blank')
  })

  it('keeps an internal link in the same tab', () => {
    expect(buttonProps({ label: 'x', link: '/content/about' }).target).toBe(
      '_self',
    )
  })

  it('renders no destination when the author left the link empty', () => {
    expect(buttonProps({ label: 'x' }).to).toBeUndefined()
  })
})
