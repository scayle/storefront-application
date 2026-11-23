import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import type { CMSPageData } from '@shared/types/cms/contentstack'

const initMock = vi.fn()
const onEntryChangeMock = vi.fn().mockReturnValue('callback-id')
const unsubscribeMock = vi.fn()
const reloadMock = vi.fn()

vi.mock('@contentstack/live-preview-utils', () => ({
  default: {
    init: initMock,
    onEntryChange: onEntryChangeMock,
    unsubscribeOnEntryChange: unsubscribeMock,
  },
}))

// The composable reads the editor session and its provider-specific fields off
// the Inertia shared page props. Mutable so a test can drop the editor data and
// assert the non-editor branch.
const sharedProps = vi.hoisted(() => ({
  cmsEditorData: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  router: { reload: reloadMock },
  usePage: () => ({ props: sharedProps }),
}))

const errorMock = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: vi.fn(() => ({
    error: errorMock,
    warn: vi.fn(),
    info: vi.fn(),
  })),
}))

const { useContentstackEditor } = await import('./useContentstackEditor')

const createPageData = (): CMSPageData => ({
  entry: {
    uid: 'entry-1',
    title: 'Test Page',
    url: '/test',
    _content_type_uid: 'page-component',
  } as CMSPageData['entry'],
})

/**
 * Mounts a wrapper component that calls the composable inside setup.
 * This triggers Vue lifecycle hooks (onMounted, onBeforeUnmount) naturally.
 */
function mountComposable(pageData: CMSPageData | undefined) {
  const Wrapper = defineComponent({
    setup() {
      const data = ref(pageData)
      useContentstackEditor(data)
      return () => null
    },
  })

  return mount(Wrapper)
}

describe('useContentstackEditor', () => {
  beforeEach(() => {
    initMock.mockReset()
    onEntryChangeMock.mockReset().mockReturnValue('callback-id')
    unsubscribeMock.mockReset()
    reloadMock.mockReset()
    errorMock.mockReset()
    sharedProps.cmsEditorData = {
      apiKey: 'test-api-key',
      environment: 'production',
      branch: 'main',
      appHost: 'azure-na-app.contentstack.com',
    }
  })

  it('does not initialize when the shared props carry no editor data', async () => {
    sharedProps.cmsEditorData = undefined

    mountComposable(createPageData())
    await flushPromises()

    expect(initMock).not.toHaveBeenCalled()
  })

  it('does not initialize when pageData has no entry', async () => {
    mountComposable(undefined)
    await flushPromises()

    expect(initMock).not.toHaveBeenCalled()
  })

  it('initializes Live Preview with correct config on mount', async () => {
    mountComposable(createPageData())
    await flushPromises()

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enable: true,
        ssr: false,
        mode: 'builder',
        stackDetails: {
          apiKey: 'test-api-key',
          environment: 'production',
          branch: 'main',
        },
      }),
    )
  })

  it('uses the app host the server resolved', async () => {
    // The deep-link host is region-specific. Passing the server value through
    // unchanged keeps region resolution out of the client bundle.
    mountComposable(createPageData())
    await flushPromises()

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clientUrlParams: expect.objectContaining({
          host: 'azure-na-app.contentstack.com',
        }),
      }),
    )
  })

  it('triggers Inertia partial reload when entry changes', async () => {
    mountComposable(createPageData())
    await flushPromises()

    const entryChangeCallback = onEntryChangeMock.mock.calls[0]![0]
    entryChangeCallback()

    expect(reloadMock).toHaveBeenCalledWith({ only: ['pageData'] })
  })

  it('logs and keeps rendering when SDK setup fails', async () => {
    // Stands in for anything the try block can reject on: a chunk that fails to
    // load, or the SDK rejecting during init. The page must still render the
    // server payload rather than the whole component tearing down.
    initMock.mockRejectedValueOnce(new Error('live preview unavailable'))

    const wrapper = mountComposable(createPageData())
    await flushPromises()

    expect(errorMock).toHaveBeenCalledOnce()
    expect(errorMock.mock.calls[0]![0]).toMatchObject({
      message: 'Failed to initialize Contentstack Live Preview',
      err: expect.any(Error),
    })
    expect(onEntryChangeMock).not.toHaveBeenCalled()

    // The failed init left no callback id, so unmounting must stay quiet rather
    // than unsubscribing an id that was never issued.
    wrapper.unmount()
    await flushPromises()
    expect(unsubscribeMock).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', async () => {
    const wrapper = mountComposable(createPageData())
    await flushPromises()

    wrapper.unmount()
    await flushPromises()

    expect(unsubscribeMock).toHaveBeenCalledWith('callback-id')
  })
})
