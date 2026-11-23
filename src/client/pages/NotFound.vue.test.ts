import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PageMetaHead from '@client/components/meta/PageMetaHead.vue'
import NotFoundPage from './NotFound.vue'

const tMock = (key: string) => key

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const stubs = {
  SFButton: {
    template: '<a><slot /></a>',
  },
  PageMetaHead: true,
  IconLogoSingt: true,
}

describe('NotFound page', () => {
  it('builds a noindex head titled with the not-found title', () => {
    const wrapper = mount(NotFoundPage, {
      global: { stubs, mocks: { $t: tMock } },
    })

    expect(wrapper.getComponent(PageMetaHead).props('meta')).toEqual({
      title: 'error.page_not_found_title',
      robots: 'noindex, nofollow',
    })
  })
})
