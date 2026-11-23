import type { Directive } from 'vue'
import type { SbBlokData } from '@storyblok/js'
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('cms')

/**
 * `v-editable` directive for the Storyblok Visual Editor. Tags rendered
 * elements with the `data-blok-c` / `data-blok-uid` attributes the editor uses
 * to highlight blocks. Registered unconditionally but a no-op outside editor
 * sessions, where bloks carry no `_editable` field. `storyblokEditable` is
 * dynamically imported so `@storyblok/js` stays out of the eager bundle.
 *
 * `beforeMount` awaits that import, and Vue does not await directive hooks, so
 * the attributes land some time after mount. The import resolves a macrotask
 * later, which `flushPromises` does not wait for, so component tests asserting
 * on the attributes should poll (`vi.waitUntil`) rather than flush a fixed
 * number of times.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/storyblok
 */
export const vEditable: Directive<HTMLElement, SbBlokData | undefined> = {
  // The `try` below handles every failure of the lazy import, so the promise the
  // hook returns never rejects.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async beforeMount(el, binding) {
    if (!binding.value?._editable) {
      return
    }

    try {
      const { storyblokEditable } = await import('@storyblok/js')
      const attrs = storyblokEditable(binding.value)
      if (attrs['data-blok-c']) {
        el.setAttribute('data-blok-c', attrs['data-blok-c'])
        el.setAttribute('data-blok-uid', attrs['data-blok-uid'])
        el.classList.add('storyblok__outline')
      }
    } catch (error) {
      log.error({
        message: 'Failed to apply Storyblok v-editable attributes',
        err: error instanceof Error ? error : new Error(String(error)),
      })
    }
  },
}
