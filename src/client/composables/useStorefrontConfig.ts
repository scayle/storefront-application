import { usePage } from '@client/composables/usePage'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { PageProps } from '@shared/types/PageProps'

type StorefrontProps = PageProps['storefront']

interface UseStorefrontConfigReturn {
  config: ComputedRef<StorefrontProps>
  country: ComputedRef<StorefrontProps['country']>
}

/**
 * Provides reactive access to the storefront configuration and country from shared page props.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/configuration
 */
export function useStorefrontConfig(): UseStorefrontConfigReturn {
  const page = usePage()
  return {
    config: computed(() => page.props.storefront),
    country: computed(() => page.props.storefront.country),
  }
}
