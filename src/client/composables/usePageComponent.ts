import { usePage } from '@client/composables/usePage'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { PageComponentName } from '@scayle/storefront'

interface UseIsPageReturn {
  isActive: ComputedRef<boolean>
}

/**
 * Returns a reactive check for whether the current page matches the given component name.
 *
 * @param name - The component name to check against (e.g. 'Basket', 'Checkout').
 */
export function useIsPage(name: PageComponentName): UseIsPageReturn {
  const page = usePage()
  return {
    isActive: computed(() => page.component === name),
  }
}
