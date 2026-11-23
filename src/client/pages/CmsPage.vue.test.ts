import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { SEOMeta } from '@shared/types/SEO'
import type { CMSPageData } from '@cms-shared'
import CmsPage from './CmsPage.vue'

const stubMeta: SEOMeta = {
  title: 'CMS Page',
  description: 'A content page.',
  robots: 'index, follow',
}

// Render-fn stubs expose the props the page forwards so tests can assert the
// wiring (data payload, meta presence) without mounting the real CMS renderer
// or meta head.
const PageComponentStub = defineComponent({
  name: 'PageComponent',
  props: {
    data: { type: Object, required: true },
  },
  setup() {
    return () => h('div', { 'data-testid': 'cms-page-component' })
  },
})

const PageMetaHeadStub = defineComponent({
  name: 'PageMetaHead',
  props: {
    meta: { type: Object, required: true },
    hreflangs: { type: Array, default: () => [] },
  },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'page-meta-head',
        'data-title': (props.meta as SEOMeta).title,
      })
  },
})

const globalConfig = {
  stubs: {
    PageComponent: PageComponentStub,
    PageMetaHead: PageMetaHeadStub,
  },
  mocks: {
    $t: (key: string) => key,
  },
}

// Cast, not a typed literal: this page test runs under every per-provider
// typecheck config, and `@cms-shared` resolves to a different payload shape
// in each. The stubbed PageComponent never reads the fields.
const pageData = { slug: 'about', components: [] } as unknown as CMSPageData

const slug = 'content/about'

describe('CmsPage page', () => {
  it('renders the CMS page component with page data and the meta head', () => {
    const wrapper = mount(CmsPage, {
      props: { pageData, slug, meta: stubMeta },
      global: globalConfig,
    })

    const cms = wrapper.getComponent(PageComponentStub)
    expect(cms.props('data')).toEqual(pageData)

    expect(
      wrapper.get('[data-testid="page-meta-head"]').attributes('data-title'),
    ).toBe('CMS Page')
  })

  it('omits the meta head when no meta prop is provided', () => {
    const wrapper = mount(CmsPage, {
      props: { pageData, slug },
      global: globalConfig,
    })

    expect(wrapper.find('[data-testid="page-meta-head"]').exists()).toBe(false)
    // The page body still renders without meta.
    expect(wrapper.find('[data-testid="cms-page-component"]').exists()).toBe(
      true,
    )
  })
})
