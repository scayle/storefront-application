import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CMSPageData } from '@shared/types/cms/amplience'

const unsubscribeMock = vi.fn()
const changedMock = vi.fn(
  (_callback: (model: { content: unknown }) => void) => unsubscribeMock,
)
const initMock = vi.fn(async () => ({ form: { changed: changedMock } }))

vi.mock('dc-visualization-sdk', () => ({
  init: () => initMock(),
}))

const errorMock = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ warn: vi.fn(), error: errorMock }),
}))

// The composable reads the editor session off the Inertia shared page props.
// Mutable so a test can drop it and assert the non-editor branch.
const sharedProps = vi.hoisted(() => ({
  cmsEditorData: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: sharedProps }),
}))

const PUBLISHED_PAGE = {
  _meta: { deliveryKey: 'de-DE/content/about' },
} as CMSPageData

// The composable caches its SDK connection at module scope, so each test needs a
// fresh module to start from no connection.
let useAmplienceEditor: typeof import('./useAmplienceEditor').useAmplienceEditor

function mountEditor(initial: CMSPageData) {
  const pageData = ref(initial)
  const Comp = defineComponent({
    setup() {
      useAmplienceEditor(pageData)
      return () => null
    },
  })

  return { pageData, wrapper: mount(Comp) }
}

describe('useAmplienceEditor', () => {
  beforeEach(async () => {
    vi.resetModules()
    ;({ useAmplienceEditor } = await import('./useAmplienceEditor'))
    initMock.mockClear()
    changedMock.mockClear()
    unsubscribeMock.mockClear()
    errorMock.mockClear()
    initMock.mockImplementation(async () => ({
      form: { changed: changedMock },
    }))
    sharedProps.cmsEditorData = { vse: 'abc.staging.bigcontent.io' }
  })

  it('replaces the page payload with each form model the editor emits', async () => {
    const { pageData } = mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    // The SDK wraps the form model as `{ content }`; the components render the body.
    const content = {
      _meta: { deliveryKey: 'de-DE/content/about' },
      title: 'Draft',
    }
    changedMock.mock.calls[0]![0]({ content })

    expect(pageData.value).toEqual(content)
  })

  it('does not connect outside a CMS editor session', async () => {
    sharedProps.cmsEditorData = undefined

    mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    expect(initMock).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', async () => {
    const { wrapper } = mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    wrapper.unmount()

    expect(unsubscribeMock).toHaveBeenCalledOnce()
  })

  it('logs and keeps the rendered payload when the SDK cannot connect', async () => {
    // `init()` rejects when the visualization is opened outside a content form.
    initMock.mockRejectedValueOnce(new Error('not embedded'))

    const { pageData } = mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    expect(errorMock).toHaveBeenCalledOnce()
    expect(pageData.value).toEqual(PUBLISHED_PAGE)
  })

  it('keeps the rendered payload when a form model arrives without content', async () => {
    const { pageData } = mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    changedMock.mock.calls[0]![0]({} as { content: unknown })

    expect(pageData.value).toEqual(PUBLISHED_PAGE)
  })

  it('leaves no subscription behind when unmounted before the SDK connects', async () => {
    const { wrapper } = mountEditor(PUBLISHED_PAGE)

    wrapper.unmount()
    await flushPromises()

    expect(changedMock).not.toHaveBeenCalled()
  })

  // A listing page mounts the page component twice, and two handshakes to the same
  // parent frame race each other.
  it('opens one SDK connection for all callers', async () => {
    mountEditor(PUBLISHED_PAGE)
    mountEditor(PUBLISHED_PAGE)

    // The second caller awaits the connection the first one created, so it
    // subscribes a few microtasks later than a single `flushPromises` covers.
    await vi.waitFor(() => expect(changedMock).toHaveBeenCalledTimes(2))

    expect(initMock).toHaveBeenCalledOnce()
  })

  it('retries the handshake after a failed one', async () => {
    initMock.mockRejectedValueOnce(new Error('not embedded'))

    mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    mountEditor(PUBLISHED_PAGE)
    await flushPromises()

    expect(initMock).toHaveBeenCalledTimes(2)
    expect(changedMock).toHaveBeenCalledOnce()
  })
})
