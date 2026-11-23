// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Page } from '@inertiajs/core'
import { createInertiaApp } from '@inertiajs/vue3'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, defineComponent, h } from 'vue'
import type { DefineComponent } from 'vue'
import type { HomepageJsonLd, PageJsonLd, SEOMeta } from '@shared/types/SEO'
import PageMetaHead from './PageMetaHead.vue'

// Inertia's `<Head>` only collects head elements on the server, and it only
// takes the server branch when `window` is undefined. This file therefore runs
// in the node environment, and renders through `createInertiaApp` the same way
// `src/client/ssr.ts` does, so the strings under test are what the server
// writes into the HTML `<head>`. A mocked `Head` would skip the renderer the
// escaping lives in.
const renderHead = async (
  meta: SEOMeta,
  jsonLd?: PageJsonLd,
): Promise<string> => {
  const page = defineComponent({
    render: () => h(PageMetaHead, { meta, jsonLd }),
  }) as DefineComponent
  // The stub page reads no shared props, so the page object carries none.
  const inertiaPage = { component: 'Page', props: {}, url: '/', version: null }
  const { head } = await createInertiaApp({
    page: inertiaPage as Page,
    render: renderToString,
    resolve: () => page,
    setup: ({ App, props, plugin }) =>
      createSSRApp({ render: () => h(App, props) }).use(plugin),
  })
  return head.join('')
}

// `<title>` content is text, not markup, so its end tag is the one sequence
// that closes it, and the HTML tokenizer accepts `</title ` with a space as
// that end tag. Inertia's head manager only cuts its title at an exact
// `</title>`, so this is the variant that reaches the browser whole when
// nothing escapes it.
const markupTitle = '</title ><script>alert(1)</script>'
const escapedMarkupTitle =
  '&lt;/title &gt;&lt;script&gt;alert(1)&lt;/script&gt;'

const JSON_LD_SCRIPT =
  /<script type="application\/ld\+json" data-inertia>(.*?)<\/script>/s

describe('PageMetaHead', () => {
  it('escapes markup in the title of the server-rendered head', async () => {
    const head = await renderHead({ title: markupTitle })

    expect(head).toContain(
      `<title data-inertia="">${escapedMarkupTitle}</title>`,
    )
  })

  it('escapes markup in the og:title attribute of the server-rendered head', async () => {
    const head = await renderHead({ title: markupTitle })

    expect(head).toContain(
      `property="og:title" content="${escapedMarkupTitle}"`,
    )
  })

  it('renders the JSON-LD body as JSON with no end tag or comment inside the script', async () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      name: 'Shop </script>',
    } as HomepageJsonLd
    const head = await renderHead({ title: 'Shop' }, jsonLd)

    const script = JSON_LD_SCRIPT.exec(head)
    expect(script).not.toBeNull()
    expect(JSON.parse(script![1]!)).toEqual(jsonLd)
    expect(script![1]).not.toContain('</script>')
    expect(script![1]).not.toContain('<!--')
  })

  it('leaves out the JSON-LD script when the page sends no JSON-LD', async () => {
    const head = await renderHead({ title: 'Basket' })

    expect(head).not.toContain('application/ld+json')
  })

  it('renders the description and Open Graph description meta tags when the page has a description', async () => {
    const head = await renderHead({
      title: 'About',
      description: 'About our shop',
    })

    expect(head).toContain('name="description" content="About our shop"')
    expect(head).toContain('property="og:description" content="About our shop"')
  })

  it('leaves out both description meta tags when the page has no description', async () => {
    const head = await renderHead({ title: 'Search' })

    expect(head).not.toContain('name="description"')
    expect(head).not.toContain('property="og:description"')
  })
})
