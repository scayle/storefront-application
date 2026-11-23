import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SFSkipLink from './SFSkipLink.vue'

function mountSkipLink(props: { search?: boolean; basket?: boolean } = {}) {
  return mount(SFSkipLink, {
    props,
    global: { mocks: { $t: (key: string) => key } },
  })
}

describe('SFSkipLink', () => {
  it.for([
    {
      props: {},
      testId: 'button-skip-to-main',
      href: '#main-content',
      label: 'common.skip_to_main_content',
    },
    {
      props: { search: true },
      testId: 'button-skip-to-search',
      href: '#header-search',
      label: 'common.skip_to_search',
    },
    {
      props: { basket: true },
      testId: 'button-skip-to-basket',
      href: '#header-basket',
      label: 'common.skip_to_basket',
    },
  ])(
    'renders a $label link targeting $href',
    ({ props, testId, href, label }) => {
      const link = mountSkipLink(props).get(`[data-testid="${testId}"]`)

      expect(link.attributes('href')).toBe(href)
      expect(link.text()).toBe(label)
    },
  )

  it('renders only the main link by default (SimpleLayout case)', () => {
    const wrapper = mountSkipLink()

    expect(wrapper.find('[data-testid="button-skip-to-search"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="button-skip-to-basket"]').exists()).toBe(
      false,
    )
  })
})
