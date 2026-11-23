import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { Head } from '@inertiajs/vue3'
import ErrorPage from './Error.vue'

const tMock = (key: string) => key

vi.mock('@inertiajs/vue3', () => ({
  Head: {
    name: 'Head',
    props: ['title'],
    template: '<div data-testid="inertia-head"><slot /></div>',
  },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const stubs = {
  CloseIcon: true,
  IconLogoSingt: true,
}

describe('Error page', () => {
  it('renders the code, generic title and message', () => {
    const wrapper = mount(ErrorPage, {
      props: { code: 500, basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(wrapper.get('[data-testid="error-code"]').text()).toContain('500')
    expect(wrapper.get('[data-testid="error-title"]').text()).toBe(
      'error.unknown_error_title',
    )
    expect(wrapper.get('[data-testid="error-message"]').text()).toBe(
      'error.unknown_error_message',
    )
  })

  it('wraps the page content in the main landmark', () => {
    const wrapper = mount(ErrorPage, {
      props: { basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    const main = wrapper.get('main')
    expect(main.find('[data-testid="error-title"]').exists()).toBe(true)
    expect(main.find('[data-testid="error-home-link"]').exists()).toBe(true)
  })

  it('sets the document title to the generic error title', () => {
    const wrapper = mount(ErrorPage, {
      props: { basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(wrapper.findComponent(Head).props('title')).toBe(
      'error.unknown_error_title',
    )
  })

  it('defaults the code to 500 when not provided', () => {
    const wrapper = mount(ErrorPage, {
      props: { basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(wrapper.get('[data-testid="error-code"]').text()).toContain('500')
  })

  it('links home to the basePath prop with a plain anchor (no shared data, no layout)', () => {
    const wrapper = mount(ErrorPage, {
      props: { basePath: '/shop' },
      global: { stubs, mocks: { $t: tMock } },
    })

    const link = wrapper.get('[data-testid="error-home-link"]')
    expect(link.attributes('href')).toBe('/shop')
    expect(link.text()).toBe('common.continue_shopping')
  })

  it('does not render technical details when no errorHtml is provided', () => {
    vi.stubEnv('DEV', true)

    const wrapper = mount(ErrorPage, {
      props: { code: 500, basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(
      wrapper.find('[data-testid="error-open-technical-details"]').exists(),
    ).toBe(false)
  })

  it('renders the dev-only Youch technical-details iframe when errorHtml is set', () => {
    vi.stubEnv('DEV', true)

    const wrapper = mount(ErrorPage, {
      props: { code: 500, errorHtml: '<p>boom</p>', basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(
      wrapper.find('[data-testid="error-open-technical-details"]').exists(),
    ).toBe(true)

    const iframe = wrapper.get('iframe')
    expect(iframe.attributes('srcdoc')).toBe('<p>boom</p>')
    // Isolate the dev-only report from the parent origin (no cookie/storage access).
    expect(iframe.attributes('sandbox')).toBe('allow-scripts')
  })

  it('does not render technical-details button or iframe when DEV is false', () => {
    vi.stubEnv('DEV', false)

    const wrapper = mount(ErrorPage, {
      props: { code: 500, errorHtml: '<p>boom</p>', basePath: '/' },
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(
      wrapper.find('[data-testid="error-open-technical-details"]').exists(),
    ).toBe(false)
    expect(wrapper.find('iframe').exists()).toBe(false)
  })
})
