import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { routes } from '@shared/routes'
import { t } from '@test/mocks/vue-i18n'
import { SFLinkStub } from '@test/stubs/common'
import SFPromotionConfirmation from './SFPromotionConfirmation.vue'

vi.mock('vue-i18n', () => import('@test/mocks/vue-i18n'))

describe('SFPromotionConfirmation.vue', () => {
  it('links the confirmation headline and subline to the basket', () => {
    const wrapper = mount(SFPromotionConfirmation, {
      global: { mocks: { $t: t }, stubs: { SFLink: SFLinkStub } },
    })

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe(routes.basket)
    expect(link.text()).toContain('promotion.confirmation.headline')
    expect(link.text()).toContain('promotion.confirmation.subline')
  })
})
