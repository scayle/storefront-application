import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockCategory } from '@test/mock-data/categories'
import SFCategoryBreadcrumbs from './SFCategoryBreadcrumbs.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const category = createMockCategory({
  name: 'Pants',
  link: '/c/pants-42',
  breadcrumbs: [
    { id: 1, value: 'Women', to: '/c/women-1' },
    { id: 2, value: 'Clothing', to: '/c/clothing-2' },
  ],
})

describe('SFCategoryBreadcrumbs', () => {
  const globalConfig = {
    stubs: {
      SFBreadcrumb: {
        props: ['items'],
        template:
          '<div data-testid="breadcrumb-stub" :data-items="JSON.stringify(items)" />',
      },
    },
  }

  it('passes the full category path with all items linkable', () => {
    const wrapper = mount(SFCategoryBreadcrumbs, {
      props: { category },
      global: globalConfig,
    })

    const stub = wrapper.get('[data-testid="breadcrumb-stub"]')
    expect(JSON.parse(stub.attributes('data-items') ?? '[]')).toEqual([
      { id: 1, value: 'Women', to: '/c/women-1' },
      { id: 2, value: 'Clothing', to: '/c/clothing-2' },
      { value: 'Pants', to: '/c/pants-42' },
    ])
  })
})
