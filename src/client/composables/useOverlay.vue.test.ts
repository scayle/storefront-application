import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import type { Ref } from 'vue'
import { createOverlayPlugin } from '@client/plugins/overlay'
import SFOverlayHost from '@client/components/ui/core/SFOverlayHost.vue'
import { useOverlay } from './useOverlay'
import type { OverlayInstance, OverlayPreload } from './useOverlay'

const { errorMock } = vi.hoisted(() => ({ errorMock: vi.fn() }))

vi.mock('@scayle/storefront/shared', () => ({
  createLogger: () => ({ error: errorMock, warn: vi.fn() }),
}))

/** Overlay component with an `open` model that can close itself. */
const Panel = defineComponent({
  props: {
    id: { type: String, required: true },
    open: { type: Boolean, required: true },
    label: { type: String, default: '' },
  },
  emits: {
    'update:open': (_open: boolean) => true,
    close: () => true,
  },
  setup(props, { emit }) {
    const typed = ref('')
    return () =>
      h('div', { id: props.id, 'data-testid': 'panel', hidden: !props.open }, [
        h('span', { 'data-testid': 'label' }, props.label),
        h('input', {
          'data-testid': 'input',
          value: typed.value,
          onInput: (event: Event) => {
            typed.value = (event.target as HTMLInputElement).value
          },
        }),
        h('button', {
          'data-testid': 'close',
          onClick: () => emit('close'),
        }),
        h('button', {
          'data-testid': 'dismiss',
          onClick: () => emit('update:open', false),
        }),
      ])
  },
})

/** Loader whose chunk resolves only when the test says so. */
function createDeferredLoader() {
  let resolveChunk: () => void = () => {}
  const loader = vi.fn(
    () =>
      new Promise<{ default: typeof Panel }>((resolve) => {
        resolveChunk = () => resolve({ default: Panel })
      }),
  )
  return { loader, resolveChunk: () => resolveChunk() }
}

/** Loader whose chunk request fails once, as when offline, then succeeds. */
function createFailingOnceLoader() {
  return vi
    .fn<() => Promise<{ default: typeof Panel }>>()
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValue({ default: Panel })
}

/**
 * Mounts an app with the overlay plugin, the host, and a trigger component
 * that creates one overlay. `showTrigger` unmounts the trigger component.
 */
function mountOverlay(
  loader: () => Promise<{ default: typeof Panel }>,
  {
    label = ref('Filters'),
    preload,
  }: { label?: Ref<string>; preload?: OverlayPreload } = {},
) {
  const showTrigger = ref(true)
  let overlay!: OverlayInstance

  const Trigger = defineComponent({
    setup() {
      overlay = useOverlay().create(loader, {
        props: () => ({ label: label.value }),
        preload,
      })
      return () =>
        h('button', {
          'data-testid': 'trigger',
          ...overlay.triggerAttrs.value,
        })
    },
  })

  const wrapper = mount(
    defineComponent({
      setup: () => () => [
        showTrigger.value ? h(Trigger) : null,
        h(SFOverlayHost),
      ],
    }),
    { global: { plugins: [createOverlayPlugin()] } },
  )

  return { wrapper, showTrigger, overlay: () => overlay }
}

describe('useOverlay', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing and loads nothing before the first open', () => {
    const { loader } = createDeferredLoader()
    const { wrapper } = mountOverlay(loader)

    expect(wrapper.find('[data-testid="panel"]').exists()).toBe(false)
    expect(loader).not.toHaveBeenCalled()
  })

  it('leaves aria-controls off the trigger before the first open', () => {
    const { loader } = createDeferredLoader()
    const { wrapper } = mountOverlay(loader)

    const trigger = wrapper.get('[data-testid="trigger"]')
    expect(trigger.attributes('aria-controls')).toBeUndefined()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('marks the trigger busy and expanded while the first open loads', async () => {
    const { loader } = createDeferredLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    void overlay().open()
    await flushPromises()

    const trigger = wrapper.get('[data-testid="trigger"]')
    expect(trigger.attributes('aria-busy')).toBe('true')
    expect(trigger.attributes('aria-expanded')).toBe('true')
  })

  it('mounts the component open with its id once the chunk has loaded', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    void overlay().open()
    resolveChunk()
    await flushPromises()

    const panel = wrapper.get('[data-testid="panel"]')
    expect(panel.attributes('hidden')).toBeUndefined()
    expect(wrapper.get('[data-testid="trigger"]').attributes()).toMatchObject({
      'aria-controls': panel.attributes('id'),
    })
  })

  it('updates the open component when a getter prop changes', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const label = ref('Filters')
    const { wrapper, overlay } = mountOverlay(loader, { label })

    void overlay().open()
    resolveChunk()
    await flushPromises()
    label.value = 'Sorting'
    await flushPromises()

    expect(wrapper.get('[data-testid="label"]').text()).toBe('Sorting')
  })

  it('closes when the component emits close', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    void overlay().open()
    resolveChunk()
    await flushPromises()
    await wrapper.get('[data-testid="close"]').trigger('click')

    expect(overlay().isOpen.value).toBe(false)
  })

  it('closes when the component sets its open model to false', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    void overlay().open()
    resolveChunk()
    await flushPromises()
    await wrapper.get('[data-testid="dismiss"]').trigger('click')

    expect(wrapper.get('[data-testid="panel"]').attributes('hidden')).toBe('')
  })

  it('keeps the component and its state mounted after it closes', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    void overlay().open()
    resolveChunk()
    await flushPromises()
    await wrapper.get('[data-testid="input"]').setValue('red')
    overlay().close()
    void overlay().open()
    await flushPromises()

    expect(
      (wrapper.get('[data-testid="input"]').element as HTMLInputElement).value,
    ).toBe('red')
  })

  it('loads the component only once across opens', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { overlay } = mountOverlay(loader)

    void overlay().open()
    resolveChunk()
    await flushPromises()
    overlay().close()
    void overlay().open()
    await flushPromises()

    expect(loader).toHaveBeenCalledOnce()
  })

  it('mounts the component closed when it is closed while loading', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    void overlay().open()
    overlay().close()
    resolveChunk()
    await flushPromises()

    expect(wrapper.get('[data-testid="panel"]').attributes('hidden')).toBe('')
  })

  it('starts loading the component when a pointer enters the trigger', async () => {
    const { loader } = createDeferredLoader()
    const { wrapper } = mountOverlay(loader)

    await wrapper.get('[data-testid="trigger"]').trigger('pointerenter')

    expect(loader).toHaveBeenCalledOnce()
  })

  it('closes the overlay and logs the error when its component fails to load', async () => {
    const { wrapper, overlay } = mountOverlay(createFailingOnceLoader())

    await overlay().open()

    expect(overlay().isOpen.value).toBe(false)
    expect(
      wrapper.get('[data-testid="trigger"]').attributes('aria-busy'),
    ).toBeUndefined()
    expect(errorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load an overlay' }),
    )
  })

  it('loads the component again on the next open after a failed load', async () => {
    const loader = createFailingOnceLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    await overlay().open()
    await overlay().open()
    await flushPromises()

    expect(loader).toHaveBeenCalledTimes(2)
    expect(
      wrapper.get('[data-testid="panel"]').attributes('hidden'),
    ).toBeUndefined()
  })

  it('loads the component on open after a failed preload', async () => {
    const loader = createFailingOnceLoader()
    const { wrapper, overlay } = mountOverlay(loader)

    await wrapper.get('[data-testid="trigger"]').trigger('pointerenter')
    await flushPromises()
    await overlay().open()
    await flushPromises()

    expect(loader).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="panel"]').exists()).toBe(true)
  })

  it('starts loading the component once the browser is idle with the idle preload', () => {
    const idleCallbacks: (() => void)[] = []
    vi.stubGlobal('requestIdleCallback', (callback: () => void) =>
      idleCallbacks.push(callback),
    )
    const { loader } = createDeferredLoader()
    mountOverlay(loader, { preload: 'idle' })

    expect(loader).not.toHaveBeenCalled()
    idleCallbacks.forEach((callback) => callback())

    expect(loader).toHaveBeenCalledOnce()
  })

  it('unmounts the component when the component that created it unmounts', async () => {
    const { loader, resolveChunk } = createDeferredLoader()
    const { wrapper, overlay, showTrigger } = mountOverlay(loader)

    void overlay().open()
    resolveChunk()
    await flushPromises()
    showTrigger.value = false
    await flushPromises()

    expect(wrapper.find('[data-testid="panel"]').exists()).toBe(false)
  })

  it('throws when the overlay plugin is not installed', () => {
    const Trigger = defineComponent({
      setup() {
        useOverlay()
        return () => null
      },
    })

    expect(() => mount(Trigger)).toThrow('createOverlayPlugin')
  })
})
