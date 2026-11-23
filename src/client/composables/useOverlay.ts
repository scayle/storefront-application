import {
  computed,
  inject,
  markRaw,
  shallowReactive,
  shallowRef,
  toValue,
} from 'vue'
import type {
  Component,
  ComponentInstance,
  ComputedRef,
  MaybeRefOrGetter,
} from 'vue'
import { tryOnMounted, tryOnScopeDispose } from '@vueuse/core'
import { createLogger } from '@scayle/storefront/shared'
import { OVERLAY_INJECTION_KEY } from '@client/plugins/overlay'
import type { OverlayEntry } from '@client/plugins/overlay'

const log = createLogger('overlay')

/** Props of a component, as a parent would pass them. */
type PropsOf<TComponent extends Component> =
  ComponentInstance<TComponent>['$props']

/**
 * Props an overlay component takes from its caller. The host binds `id`, the
 * `open` model and the `close` listener itself.
 */
export type OverlayProps<TComponent extends Component> = Partial<
  Omit<PropsOf<TComponent>, 'id' | 'open' | 'onUpdate:open' | 'onClose'>
>

/**
 * When an overlay starts loading its component before the first open.
 *
 * - `interaction`: when a pointer enters or focus lands on a trigger that binds
 *   `triggerAttrs`. A tap fires `pointerenter` too, just before the click.
 * - `idle`: when the browser is idle after the creating component has mounted,
 *   plus on interaction. For a panel most users open, such as the mobile
 *   navigation.
 */
export type OverlayPreload = 'interaction' | 'idle'

/** Options for `useOverlay().create()`. */
export interface OverlayOptions<TComponent extends Component> {
  /**
   * Returns props for the overlay component. A getter, so a partial reload or
   * a resolving deferred prop updates the open overlay.
   */
  props?: () => OverlayProps<TComponent>
  /**
   * When to start loading the component before the first open. Read once, when
   * the creating component mounts. Defaults to `interaction`.
   */
  preload?: MaybeRefOrGetter<OverlayPreload>
}

/** Attributes for an element that opens an overlay. Bind with `v-bind`. */
export interface OverlayTriggerAttrs {
  'aria-expanded': boolean
  /**
   * The overlay's `id` once its component is in the DOM, `undefined` before, so
   * the attribute never points at a missing element.
   */
  'aria-controls': string | undefined
  /** `true` while the first open waits for the component to load. */
  'aria-busy': true | undefined
  onPointerenter: () => void
  onFocus: () => void
}

/** Controls one overlay. Returned by `useOverlay().create()`. */
export interface OverlayInstance {
  /**
   * Whether the overlay is open. Turns `true` as soon as `open()` is called,
   * while the component may still be loading.
   */
  readonly isOpen: ComputedRef<boolean>
  /** ARIA state and preload listeners for the element that opens the overlay. */
  readonly triggerAttrs: ComputedRef<OverlayTriggerAttrs>
  /**
   * Opens the overlay, loading its component on the first call.
   *
   * @returns A promise that resolves once the component has loaded, or once
   * loading it has failed and closed the overlay again.
   */
  open: () => Promise<void>
  /**
   * Closes the overlay. Called while the component is still loading, it
   * cancels the open.
   */
  close: () => void
  /** Opens the overlay when it is closed and closes it when it is open. */
  toggle: () => void
}

/** Return value of {@link useOverlay}. */
export interface UseOverlayReturn {
  /**
   * Creates an overlay for `SFOverlayHost` to render once it is first opened.
   *
   * Call it during `setup()`. The overlay is removed, and its component
   * unmounted, when the calling component unmounts.
   *
   * @param loader - Dynamic import of the overlay component, such as
   * `() => import('./SFFilterSlideIn.vue')`. Called on the first open or
   * preload, so the component stays out of the server render and of the
   * JavaScript a page loads up front.
   * @param options - Default props and the preload strategy.
   * @returns The controls for the overlay.
   */
  create: <TComponent extends Component>(
    loader: () => Promise<{ default: TComponent }>,
    // `NoInfer`: the component type comes from the loader alone, and the props
    // getter is checked against it.
    options?: OverlayOptions<NoInfer<TComponent>>,
  ) => OverlayInstance
}

/**
 * Calls `callback` once the browser is idle. Safari has no
 * `requestIdleCallback`, so it falls back to the next macrotask there.
 */
function onIdle(callback: () => void) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback)
    return
  }
  setTimeout(callback, 1)
}

/**
 * Creates overlays (modals, slide-ins, popovers) that are rendered and loaded
 * only once a user opens them. Modeled on Nuxt UI's `useOverlay`.
 *
 * A closed panel costs nothing up front: the server renders no HTML for it,
 * the browser hydrates nothing, and its code is a separate chunk. On the
 * first open the chunk loads and `SFOverlayHost` mounts the component; it
 * stays mounted afterwards, so it keeps its state and plays its exit
 * transition on close.
 *
 * An overlay component has an `open` model (`defineModel('open')`) and can
 * emit `close` to close itself. The host passes `id` to it; put that on the root
 * element the trigger controls. `SFOverlayHost` renders outside the page and
 * layout, so the component cannot inject what they provide: pass it props, or
 * read `usePage()`.
 *
 * To share one overlay between components, such as two triggers in different
 * places, wrap the call in `createSharedComposable`.
 *
 * @returns `create`, which makes an overlay.
 *
 * @example
 * ```ts
 * const filterPanel = useOverlay().create(
 *   () => import('@client/components/filter/SFFilterSlideIn.vue'),
 *   { props: () => ({ filters, appliedFilter: appliedFilters }) },
 * )
 * const { triggerAttrs, toggle } = filterPanel
 * ```
 *
 * ```vue
 * <SFFilterToggleButton v-bind="triggerAttrs" @toggle="toggle" />
 * ```
 */
export function useOverlay(): UseOverlayReturn {
  const registry = inject(OVERLAY_INJECTION_KEY)
  if (!registry) {
    throw new Error(
      'useOverlay() needs createOverlayPlugin() installed on the app',
    )
  }

  const create = <TComponent extends Component>(
    loader: () => Promise<{ default: TComponent }>,
    {
      props,
      preload = 'interaction',
    }: OverlayOptions<NoInfer<TComponent>> = {},
  ): OverlayInstance => {
    const isLoading = shallowRef(false)
    let loading: Promise<TComponent> | undefined

    const entry: OverlayEntry = shallowReactive({
      id: registry.createId(),
      component: null,
      isOpen: false,
      props: () => ({ ...props?.() }),
      close: () => {
        entry.isOpen = false
      },
    })
    registry.add(entry)

    const load = () => {
      loading ??= loader().then(
        (module) => module.default,
        (error: unknown) => {
          // A failed chunk request (offline, or a deploy replaced the chunk)
          // is retried on the next open instead of failing for good.
          loading = undefined
          throw error
        },
      )
      return loading
    }

    const preloadComponent = async () => {
      if (import.meta.env.SSR) {
        return
      }
      try {
        await load()
      } catch (err) {
        log.warn({ message: 'Failed to preload an overlay', err })
      }
    }

    const open = async () => {
      // Overlays open from user input, which a server render never sees.
      if (import.meta.env.SSR) {
        return
      }

      entry.isOpen = true
      if (entry.component) {
        return
      }

      isLoading.value = true
      try {
        const component = await load()
        // Mounted even when `close()` ran while the chunk was loading, so the
        // next open is instant.
        entry.component = markRaw(component)
      } catch (err) {
        log.error({ message: 'Failed to load an overlay', err })
        entry.close()
      } finally {
        isLoading.value = false
      }
    }

    const toggle = () => {
      if (entry.isOpen) {
        entry.close()
        return
      }
      void open()
    }

    tryOnMounted(() => {
      if (toValue(preload) === 'idle') {
        onIdle(() => void preloadComponent())
      }
    })

    tryOnScopeDispose(() => {
      registry.remove(entry)
    })

    return {
      isOpen: computed(() => entry.isOpen),
      triggerAttrs: computed(() => ({
        'aria-expanded': entry.isOpen,
        'aria-controls': entry.component ? entry.id : undefined,
        'aria-busy': isLoading.value || undefined,
        onPointerenter: () => void preloadComponent(),
        onFocus: () => void preloadComponent(),
      })),
      open,
      close: entry.close,
      toggle,
    }
  }

  return { create }
}
