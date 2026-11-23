import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { CMSPageData } from '@shared/types/cms/storyblok'
import { useStoryblokEditor } from './useStoryblokEditor'

const bridge = vi.hoisted(() => ({
  loadStoryblokBridge: vi.fn(),
  useStoryblokBridge: vi.fn(),
}))

vi.mock('@storyblok/js', () => ({
  loadStoryblokBridge: bridge.loadStoryblokBridge,
  useStoryblokBridge: bridge.useStoryblokBridge,
}))

// The composable reads the editor session off the Inertia shared page props.
// Mutable so a test can drop it and assert the non-editor branch.
const sharedProps = vi.hoisted(() => ({
  cmsEditorData: undefined as Record<string, unknown> | undefined,
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: sharedProps }),
}))

const errorMock = vi.hoisted(() => vi.fn())

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ error: errorMock, warn: vi.fn(), info: vi.fn() }),
}))

const mountWithEditor = (pageData: CMSPageData | undefined) =>
  mount({
    setup() {
      useStoryblokEditor(ref(pageData))
      return () => null
    },
  })

beforeEach(() => {
  sharedProps.cmsEditorData = { isPreviewEnabled: true }
})

describe('useStoryblokEditor', () => {
  it('registers the bridge only after the bridge script has loaded', async () => {
    // useStoryblokBridge needs the window.storyblokRegisterEvent global that
    // loadStoryblokBridge installs, so registering early throws in the editor.
    const { promise: scriptLoaded, resolve: finishLoading } =
      Promise.withResolvers<void>()
    bridge.loadStoryblokBridge.mockReturnValueOnce(scriptLoaded)

    mountWithEditor({ story: { id: 42 } } as CMSPageData)
    await flushPromises()
    expect(bridge.useStoryblokBridge).not.toHaveBeenCalled()

    finishLoading()
    await flushPromises()

    expect(bridge.useStoryblokBridge).toHaveBeenCalledWith(
      42,
      expect.any(Function),
      { resolveLinks: 'url', preventClicks: true },
    )
  })

  it('does nothing when the shared props carry no editor data', async () => {
    sharedProps.cmsEditorData = undefined

    mountWithEditor({ story: { id: 42 } } as CMSPageData)
    await flushPromises()

    expect(bridge.loadStoryblokBridge).not.toHaveBeenCalled()
    expect(bridge.useStoryblokBridge).not.toHaveBeenCalled()
  })

  it('does nothing when the story id is missing', async () => {
    mountWithEditor({ story: {} } as CMSPageData)
    await flushPromises()

    expect(bridge.useStoryblokBridge).not.toHaveBeenCalled()
  })

  it('logs and keeps rendering when the bridge fails to load', async () => {
    // Stands in for anything the try block can reject on: a chunk that fails to
    // load, or the injected bridge script never resolving. The page must still
    // render the server payload rather than the whole component tearing down.
    bridge.loadStoryblokBridge.mockRejectedValueOnce(
      new Error('bridge script blocked'),
    )

    mountWithEditor({ story: { id: 42 } } as CMSPageData)
    await flushPromises()

    expect(errorMock).toHaveBeenCalledOnce()
    expect(errorMock.mock.calls[0]![0]).toMatchObject({
      message: 'Failed to initialize Storyblok Visual Editor bridge',
      err: expect.any(Error),
    })
    expect(bridge.useStoryblokBridge).not.toHaveBeenCalled()
  })

  it('wraps a non-Error rejection so the log always carries an Error', async () => {
    // A rejected dynamic import can surface as a plain string.
    bridge.loadStoryblokBridge.mockRejectedValueOnce('chunk load failed')

    mountWithEditor({ story: { id: 42 } } as CMSPageData)
    await flushPromises()

    const { err } = errorMock.mock.calls[0]![0] as { err: Error }
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('chunk load failed')
  })
})
