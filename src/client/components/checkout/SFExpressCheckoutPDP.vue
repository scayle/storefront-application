<template>
  <SFExpressCheckoutBase
    v-bind="$attrs"
    :access-token="accessToken"
    :jwt="oneTimeCheckoutData?.checkoutJwt"
    :basket-total="oneTimeCheckoutData?.finalPriceInCents"
    @jwt-missing="onJwtMissing"
  />
</template>
<script setup lang="ts">
import { useRpcClient } from '@client/composables/useRpcClient'
import { useToast } from '@client/composables/useToast'
import { onMounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import SFExpressCheckoutBase from '@client/components/checkout/SFExpressCheckoutBase.vue'
import { EXPRESS_CHECKOUT_RESET_EVENT } from '@client/utils/expressCheckout'

interface Props {
  accessToken?: string
  /**
   * Identifies the selected variant, or `undefined` until the customer/user
   * picks a size. The component renders on page load without it so the
   * express button is available immediately, and no basket or JWT exists
   * while it is unset. Once a variant is set, including preselected products
   * (single-variant products, `?variantId=` deep links), a checkout token is
   * prepared for it up front, because the web component reads its `jwt` when
   * the customer/user clicks and a token that arrives later would cost a
   * second click.
   */
  variantId?: number
  quantity: number
  customData?: Record<string, unknown>
}
const { accessToken, variantId, quantity, customData } = defineProps<Props>()

const emit = defineEmits<{
  /**
   * Fires when the customer/user clicks express checkout without a selected
   * size, so the parent can open the size dropdown. No basket or JWT is
   * created yet.
   */
  sizeMissing: []
}>()

const toast = useToast()
const i18n = useI18n()

const oneTimeCheckoutData = ref<
  { checkoutJwt: string; finalPriceInCents: number } | undefined
>()
const rpcClient = useRpcClient()

// Bumped on reset (and before each request) so a dismissed flow can drop an
// in-flight `createOneTimeCheckoutToken` before it writes `oneTimeCheckoutData`.
let tokenRequestId = 0

/**
 * Creates the throwaway checkout basket for the current selection and stores
 * the JWT the checkout web component needs.
 *
 * @param selectedVariantId Variant the throwaway basket is created for.
 * @param options Token request options.
 * @param options.notifyOnFailure Whether a failed request shows a toast and returns the
 * express button to its default state. `false` for tokens prepared before the
 * customer/user clicks: they have not asked for anything yet, so the failure
 * stays silent and the retry on click reports it instead.
 */
const createOneTimeCheckoutToken = async (
  selectedVariantId: number,
  { notifyOnFailure }: { notifyOnFailure: boolean },
) => {
  const requestId = ++tokenRequestId
  const { error, data } = await rpcClient.basket.createOneTimeCheckoutToken({
    variantId: selectedVariantId,
    quantity,
    customData,
  })
  if (requestId !== tokenRequestId) {
    return
  }
  if (error) {
    // Drop the previous token as well: it was created for an older selection,
    // and letting the click reuse it would check out the wrong quantity.
    oneTimeCheckoutData.value = undefined
    if (notifyOnFailure) {
      toast.show(i18n.t('expressCheckout.error.unknownError'), {
        type: 'ERROR',
      })
      document.dispatchEvent(new Event(EXPRESS_CHECKOUT_RESET_EVENT))
    }
    return
  }

  oneTimeCheckoutData.value = data
}

const onJwtMissing = () => {
  // Size gate: with no size chosen there is nothing to put in a basket, so ask
  // the parent to open the size dropdown instead. Picking a size prepares the
  // token through the watch below; dismissing the dropdown resets the button.
  if (!variantId) {
    emit('sizeMissing')
    return
  }

  createOneTimeCheckoutToken(variantId, { notifyOnFailure: true })
}

const prepareTokenForSelection = (selectedVariantId: number | undefined) => {
  if (!selectedVariantId) {
    return
  }

  createOneTimeCheckoutToken(selectedVariantId, { notifyOnFailure: false })
}

// The express flow must be a single click for any selection the customer/user
// has already made, so the token is prepared ahead of the click
// instead of on `jwt-missing`: the web component reads its `jwt` at click time
// and does not resume once a later token arrives. This watcher covers every
// selection made after mount, whether or not the customer/user touched the
// express button first. `quantity` is watched too, because the token pins the
// quantity its basket was created with.
watch(
  [() => variantId, () => quantity],
  // `quantity` is read from props inside `createOneTimeCheckoutToken`; the tuple
  // only retriggers the watcher when either value changes.
  ([id]) => prepareTokenForSelection(id),
)

onMounted(() => {
  // A variant already selected on page load gets its token here instead of
  // through an `immediate` watcher, because Vue runs immediate watchers during
  // the server render too. There the request would create a basket and a JWT
  // that never reach the browser.
  prepareTokenForSelection(variantId)

  // `EXPRESS_CHECKOUT_RESET_EVENT` returns the checkout web component button to
  // its default state (e.g. when the customer/user dismisses the size
  // dropdown). Invalidate any in-flight token request and drop the stored token
  // so a cancelled request cannot leave a JWT behind. A later selection change
  // prepares a fresh token, which is what keeps the next click a single click.
  useEventListener(document, EXPRESS_CHECKOUT_RESET_EVENT, () => {
    tokenRequestId++
    oneTimeCheckoutData.value = undefined
  })
})
</script>
