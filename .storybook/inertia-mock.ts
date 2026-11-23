import { shouldIntercept } from '@inertiajs/core'
import { fn } from 'storybook/test'
import { Fragment, defineComponent, h, isReactive, ref } from 'vue'
import type { PropType } from 'vue'

/** No-op for Storybook build; app entry is not run in Storybook. */
export const createInertiaApp = (_options: unknown) => {}

export const usePage = fn(() => ({
  url: '/',
  props: { storefront: {} },
  version: null,
  scrollRegions: [],
  rememberedState: {},
  resolvedErrors: {},
}))

export const Link = defineComponent({
  name: 'Link',
  props: {
    as: {
      type: String,
      default: 'a',
    },
    data: {
      type: Object,
      default: () => ({}),
    },
    href: {
      type: String,
      default: '#',
    },
    method: {
      type: String,
      default: 'get',
    },
    replace: {
      type: Boolean,
      default: false,
    },
    preserveScroll: {
      type: Boolean,
      default: false,
    },
    preserveState: {
      type: Boolean,
      default: false,
    },
    only: {
      type: Array,
      default: () => [],
    },
    headers: {
      type: Object,
      default: () => ({}),
    },
    queryStringArrayFormat: {
      type: String,
      default: 'brackets',
    },
  },
  setup(props, { slots }) {
    // Like the real `Link`, a plain click visits through the router. Following
    // the href would load the shop url into the canvas, which shows a blank page.
    const onClick = (event: MouseEvent) => {
      if (shouldIntercept(event)) {
        event.preventDefault()
        router.visit(props.href)
      }
    }
    return () => h(props.as, { href: props.href, onClick }, slots.default?.())
  },
})

export const Head = defineComponent({
  name: 'Head',
  setup(_props, { slots }) {
    return () => slots.default?.()
  },
})

/**
 * Renders `#fallback` until every key in `data` is defined on `usePage().props`,
 * like the real `<Deferred>`. A story shows the loading state by leaving the
 * prop `undefined` and the loaded state by setting it (`null` counts as
 * arrived, as in the real component). Only the fallback-to-default swap is
 * mocked: unlike the real component, a missing `#fallback` does not throw, and
 * there is no `#rescue` slot or `reloading` slot prop.
 */
export const Deferred = defineComponent({
  name: 'Deferred',
  props: {
    data: {
      type: [String, Array] as PropType<string | string[]>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const page = usePage() as { props: Record<string, unknown> }
    return () => {
      const keys = Array.isArray(props.data) ? props.data : [props.data]
      // Keyed like the real component, so the swap remounts instead of patching
      // the fallback's elements into the content's. Flat keys only: the real
      // component also resolves dot paths, which no client key uses.
      return keys.every((key) => page.props[key] !== undefined)
        ? h(Fragment, { key: 'default' }, slots.default?.())
        : h(Fragment, { key: 'fallback' }, slots.fallback?.())
    }
  },
})

/**
 * Storybook has no history state to restore from, so the initial value is always
 * used. Like the real `useRemember`, reactive input comes back as is and anything
 * else is wrapped in a `ref`.
 */
export const useRemember = <T>(data: T, _key?: string) =>
  isReactive(data) ? data : ref(data)

export const router = {
  visit: fn(),
  get: fn(),
  post: fn(),
  put: fn(),
  patch: fn(),
  delete: fn(),
  // Calls `onFinish` so `partialReload` resolves after a basket or wishlist
  // mutation instead of leaving the caller waiting forever.
  reload: fn((options?: { onFinish?: () => void }) => options?.onFinish?.()),
  replace: fn(),
  replaceProp: fn(),
  prefetch: fn(),
  on: fn(() => () => {}),
  off: fn(),
}

/**
 * Hands the URL a story's component passes to `router.visit`, or a `Link` it
 * renders points at, to `onVisit`, so the story can show the result of a
 * navigation in its own state, such as a sort option becoming selected.
 *
 * Every story on a docs page shares the one `router` mock, so only the story
 * that claimed it last receives visits. Bind the returned function to
 * `@pointerdown.capture` and `@keydown.capture` on an element that wraps the
 * component, and the story the user is interacting with claims the mock before
 * its component navigates.
 *
 * @param onVisit - Called with the visited URL, resolved against the Storybook origin
 * @returns A function that points `router.visit` at `onVisit`
 *
 * @example
 * ```ts
 * setup() {
 *   const sortKey = ref<string | null>(null)
 *   const claim = createVisitClaim((url) => {
 *     sortKey.value = url.searchParams.get('sort')
 *   })
 *   return { args, claim, sortKey }
 * }
 * ```
 */
export function createVisitClaim(onVisit: (url: URL) => void) {
  return () => {
    router.visit.mockImplementation((href: string) => {
      onVisit(new URL(href, location.origin))
    })
  }
}
