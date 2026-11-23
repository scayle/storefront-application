import type { ReloadError } from '@client/utils/router'
import { partialReload } from '@client/utils/router'
import { usePage } from '@client/composables/usePage'
import type { Customer, CustomerSegment } from '@scayle/storefront/types'
import type { ComputedRef } from 'vue'
import { computed } from 'vue'

interface UseCustomerReturn {
  /**
   * The current logged in customer data. `null` once signed out. `undefined` while the
   * `customer` prop resolves, which only happens on a cacheable page: every other page
   * sends the customer with the page.
   */
  customer: ComputedRef<Customer | null | undefined>
  /**
   * Reloads the customer data from the server.
   *
   * @returns A promise that resolves when the customer is reloaded.
   */
  reloadCustomer: () => Promise<{ error?: ReloadError }>
  /**
   * Customer segments the logged-in customer belongs to. Empty for a user who is not
   * logged in and for a customer in no segment. `undefined` while the `customer` prop
   * resolves, which only happens on a cacheable page.
   */
  segments: ComputedRef<CustomerSegment[] | undefined>
  /**
   * Checks whether the customer belongs to a customer segment.
   *
   * @param referenceKey Reference key of the customer segment
   * @returns `true` when the customer belongs to the segment, `false` when not or when
   *   the user is not logged in, and `undefined` while the `customer` prop resolves
   */
  isInSegment: (referenceKey: string) => boolean | undefined
}

/**
 * Provides access to the current customer data from the page props, including the
 * customer segments the logged-in customer belongs to, for components that vary what
 * they render by segment. To switch between whole blocks of markup, use
 * `SFCustomerSegment` instead.
 *
 * @returns An object with the customer computed property, the customer's `segments`,
 *   and an `isInSegment` check.
 *
 * @example
 * ```ts
 * const { isInSegment } = useCustomer()
 *
 * const showsExpressShipping = computed(() => isInSegment('vip') === true)
 * ```
 */
export function useCustomer(): UseCustomerReturn {
  const page = usePage()

  const reloadCustomer = () => partialReload(['customer'])

  const customer = computed(() => page.props.customer)

  const segments = computed(() => {
    if (customer.value === undefined) {
      return undefined
    }
    // Sessions written before `Customer` carried segments have no list.
    return customer.value?.segments ?? []
  })

  const isInSegment = (referenceKey: string) =>
    segments.value?.some((segment) => segment.referenceKey === referenceKey)

  return {
    customer,
    reloadCustomer,
    segments,
    isInSegment,
  }
}
