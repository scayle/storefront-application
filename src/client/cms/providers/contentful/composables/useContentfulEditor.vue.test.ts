import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { CMSPageData } from '@shared/types/cms/contentful'
import { useContentfulEditor } from './useContentfulEditor'

const initMock = vi.fn()
const unsubscribeMock = vi.fn()
const subscribeMock = vi.fn(
  (_config: { callback: (update: unknown) => void }) => unsubscribeMock,
)
const errorMock = vi.hoisted(() => vi.fn())

vi.mock('@contentful/live-preview', () => ({
  ContentfulLivePreview: {
    init: (...args: unknown[]) => initMock(...args),
    subscribe: (config: { callback: (update: unknown) => void }) =>
      subscribeMock(config),
  },
}))

// Resolve by tagging the merged update so the test can assert the rendered
// entry is the resolved (not raw) shape. A `vi.fn` so individual tests can
// override the return (e.g. an empty array for the unresolvable branch).
const resolveResponseMock = vi.hoisted(() =>
  vi.fn((response: { items: unknown[] }) =>
    response.items.map((item) => ({
      ...(item as Record<string, unknown>),
      __resolved: true,
    })),
  ),
)

vi.mock('contentful-resolve-response', () => ({
  default: resolveResponseMock,
}))

const warnMock = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ warn: warnMock, error: errorMock }),
}))

// The composable reads the editor session off the Inertia shared page props.
// Mutable so a test can drop it and assert the non-editor branch.
const sharedProps = vi.hoisted(() => ({
  cmsEditorData: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: sharedProps }),
}))

vi.mock('@client/composables/useStorefrontConfig', () => ({
  useStorefrontConfig: () => ({
    country: computed(() => ({ locale: 'de-DE' })),
  }),
}))

function mountEditor(initial: CMSPageData | undefined) {
  const pageData = ref(initial)
  const Comp = defineComponent({
    setup() {
      /* @ts-expect-error Not an issue in vitest runs */
      useContentfulEditor(pageData)
      return () => null
    },
  })
  const wrapper = mount(Comp)
  return { pageData, wrapper }
}

const RAW_ENTRY = {
  sys: { id: 'page-1' },
  fields: { content: [{ sys: { id: 'link-1', type: 'Link' } }] },
} as unknown as NonNullable<CMSPageData['previewSource']>['entry']

const INCLUDES = {
  Entry: [{ sys: { id: 'section-1' } }],
} as unknown as NonNullable<CMSPageData['previewSource']>['includes']

describe('useContentfulEditor', () => {
  beforeEach(() => {
    initMock.mockClear()
    subscribeMock.mockClear()
    unsubscribeMock.mockClear()
    resolveResponseMock.mockClear()
    warnMock.mockClear()
    errorMock.mockClear()
    initMock.mockImplementation(() => undefined)
    sharedProps.cmsEditorData = { isPreviewEnabled: true }
  })

  it('subscribes with the resolved entry', async () => {
    const entry = { sys: { id: 'page-1' } } as CMSPageData['entry']
    mountEditor({
      entry,
      previewSource: { entry: RAW_ENTRY, includes: INCLUDES },
    })
    await flushPromises()

    expect(initMock).toHaveBeenCalledWith({ locale: 'de-DE' })
    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: entry }),
    )
  })

  it('resolves each live update before assigning it for rendering', async () => {
    const { pageData } = mountEditor({
      entry: { sys: { id: 'page-1' } } as CMSPageData['entry'],
      previewSource: { entry: RAW_ENTRY, includes: INCLUDES },
    })
    await flushPromises()

    const { callback } = subscribeMock.mock.calls[0]![0]
    const merged = { sys: { id: 'page-1' }, fields: { content: [] } }
    callback(merged)

    expect(pageData.value?.entry).toMatchObject({ ...merged, __resolved: true })
  })

  it('leaves pageData unchanged and warns when an update cannot be resolved', async () => {
    // Simulates an update referencing an entry/asset absent from the frozen
    // `includes` snapshot, where resolveResponse yields an empty array.
    resolveResponseMock.mockReturnValueOnce([])

    const initial = {
      entry: { sys: { id: 'page-1' } } as CMSPageData['entry'],
      previewSource: { entry: RAW_ENTRY, includes: INCLUDES },
    }
    const { pageData } = mountEditor(initial)
    await flushPromises()

    const { callback } = subscribeMock.mock.calls[0]![0]
    callback({ sys: { id: 'page-1' }, fields: { content: [] } })

    // Entry is untouched: still the initial entry, never replaced with a
    // resolved (`__resolved`-tagged) one from the dropped update.
    expect(pageData.value?.entry).toEqual({ sys: { id: 'page-1' } })
    expect(pageData.value?.entry).not.toHaveProperty('__resolved')
    expect(warnMock).toHaveBeenCalledOnce()
  })

  it('does not subscribe when previewSource is absent', async () => {
    mountEditor({
      entry: { sys: { id: 'page-1' } } as CMSPageData['entry'],
    })
    await flushPromises()

    expect(subscribeMock).not.toHaveBeenCalled()
  })

  it('does not subscribe outside a CMS editor session', async () => {
    sharedProps.cmsEditorData = undefined

    mountEditor({
      entry: { sys: { id: 'page-1' } } as CMSPageData['entry'],
      previewSource: { entry: RAW_ENTRY, includes: INCLUDES },
    })
    await flushPromises()

    expect(subscribeMock).not.toHaveBeenCalled()
  })

  it('logs and keeps rendering when SDK setup fails', async () => {
    // Stands in for anything the try block can reject on: a chunk that fails to
    // load, or the SDK throwing during init. The page must still render the
    // server payload rather than the whole component tearing down.
    initMock.mockImplementationOnce(() => {
      throw new Error('live preview unavailable')
    })

    const { pageData, wrapper } = mountEditor({
      entry: { sys: { id: 'page-1' } } as CMSPageData['entry'],
      previewSource: { entry: RAW_ENTRY, includes: INCLUDES },
    })
    await flushPromises()

    expect(errorMock).toHaveBeenCalledOnce()
    expect(errorMock.mock.calls[0]![0]).toMatchObject({
      message: 'Failed to initialize Contentful Live Preview',
      err: expect.any(Error),
    })
    expect(subscribeMock).not.toHaveBeenCalled()
    expect(pageData.value?.entry).toEqual({ sys: { id: 'page-1' } })

    // The failed setup left no subscription, so unmounting must stay quiet
    // rather than calling an unassigned unsubscribe.
    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('wraps a non-Error rejection so the log always carries an Error', async () => {
    // A rejected dynamic import can surface as a plain string.
    const nonErrorRejection = 'chunk load failed'
    initMock.mockImplementationOnce(() => {
      throw nonErrorRejection
    })

    mountEditor({
      entry: { sys: { id: 'page-1' } } as CMSPageData['entry'],
      previewSource: { entry: RAW_ENTRY, includes: INCLUDES },
    })
    await flushPromises()

    expect(errorMock).toHaveBeenCalledOnce()
    const { err } = errorMock.mock.calls[0]![0] as { err: Error }
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('chunk load failed')
  })
})
