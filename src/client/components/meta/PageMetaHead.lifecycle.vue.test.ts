import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import type { HomepageJsonLd } from '@shared/types/SEO'
import { usePageMeta } from '@client/composables/usePageMeta'
import PageMetaHead from './PageMetaHead.vue'

const { inertiaPage } = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return { inertiaPage: reactive({ url: '/' }) }
})

// The server-rendered head is covered in `PageMetaHead.vue.test.ts`, which runs
// in the node environment. Here `Head` renders its children in place, so the
// tests can read what the page puts into the head.
vi.mock('@inertiajs/vue3', () => ({
  Head: defineComponent({
    setup:
      (_props, { slots }) =>
      () =>
        slots.default?.(),
  }),
  usePage: () => inertiaPage,
}))

interface PageStub {
  key: string
  title: string
}

// Renders `PageMetaHead` the way a page does: keyed by the page, so a
// navigation replaces it, and absent while `page` is `null`.
function mountPage(page: Ref<PageStub | null>) {
  return mount(
    defineComponent({
      render: () =>
        page.value &&
        h(PageMetaHead, {
          key: page.value.key,
          meta: { title: page.value.title },
        }),
    }),
  )
}

describe('PageMetaHead lifecycle', () => {
  const { currentTitle } = usePageMeta()

  it('clears the shared title when it unmounts', async () => {
    const page = ref<PageStub | null>({ key: 'home', title: 'Home' })
    mountPage(page)
    expect(currentTitle.value).toBe('Home')

    page.value = null
    await nextTick()

    expect(currentTitle.value).toBe('')
  })

  // A navigation unmounts the old page and mounts the new one in one render,
  // so the old page's clear must not land after the new page's write.
  it("keeps the next page's title when one page replaces another", async () => {
    const page = ref<PageStub | null>({ key: 'home', title: 'Home' })
    mountPage(page)

    page.value = { key: 'listing', title: 'Shoes' }
    await nextTick()

    expect(currentTitle.value).toBe('Shoes')
  })
})

describe('PageMetaHead JSON-LD', () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'Shop',
    url: 'https://shop.example.com',
  } as HomepageJsonLd

  function mountWithJsonLd() {
    return mount(
      defineComponent({
        render: () =>
          h('div', [h(PageMetaHead, { meta: { title: 'Shoes' }, jsonLd })]),
      }),
    )
  }

  it('renders the JSON-LD while the page stays on the URL it was rendered for', () => {
    inertiaPage.url = '/c/shoes-42'

    const wrapper = mountWithJsonLd()

    expect(wrapper.find('script[type="application/ld+json"]').exists()).toBe(
      true,
    )
  })

  // A partial reload, such as PLP pagination, keeps the server-only `jsonLd`
  // prop of the page it started on.
  it('drops the JSON-LD when a partial reload moves the page to another URL', async () => {
    inertiaPage.url = '/c/shoes-42'
    const wrapper = mountWithJsonLd()

    inertiaPage.url = '/c/shoes-42?page=2'
    await nextTick()

    expect(wrapper.find('script[type="application/ld+json"]').exists()).toBe(
      false,
    )
  })
})
