<template>
  <!-- A minimum height reserves space for the express payment methods to avoid layout shift. 109px fits two express checkout buttons -->
  <div v-if="visible" class="min-h-27.5" data-testid="express-checkout">
    <scayle-express-checkout
      v-if="authApiInitialized"
      :key="componentKey"
      class="z-0"
      origin="web"
      :jwt="jwt"
      :access-token="accessToken"
      :consent="JSON.stringify(consent)"
      :basket-total="basketTotal"
      @consent-missing="openConsentManager"
      @express-error="onExpressError"
      @out-of-constraints="onOutOfConstraints"
      @express-checkout-finished="onExpressCheckoutFinished"
      @jwt-missing="$emit('jwtMissing', $event)"
    />
  </div>
</template>
<script setup lang="ts">
import { useCheckoutWebComponent } from '@client/composables/useCheckoutWebComponent'
import { useCheckoutWebComponentScript } from '@client/composables/useCheckoutWebComponentScript'
import { useConsent } from '@client/composables/useConsent'
import { useConsentManager } from '@client/composables/useConsentManager'
import { useToast } from '@client/composables/useToast'
import { EXPRESS_CHECKOUT_RESET_EVENT } from '@client/utils/expressCheckout'
import { routes } from '@shared/routes'
import { computed } from 'vue'
import { createLogger } from '@scayle/storefront/shared'
import { useI18n } from 'vue-i18n'
import { useRoute } from '@client/composables/useRoute'

interface Props {
  accessToken?: string
  jwt?: string
  basketTotal?: number
  visible?: boolean
  componentKey?: string
}
const { accessToken, visible = true } = defineProps<Props>()
const log = createLogger('checkout')

useCheckoutWebComponentScript()

defineEmits<{
  jwtMissing: [event: Event]
}>()

const { openConsentManager } = useConsentManager()
const paypalConsent = useConsent('paypal')
const klarnaConsent = useConsent('klarna')

const consent = computed(() => {
  return {
    paypal: paypalConsent.consent.value,
    klarna: klarnaConsent.consent.value,
  }
})

const { apiInitialized: authApiInitialized } =
  useCheckoutWebComponent(accessToken)
const { navigate } = useRoute()

type ExpressCheckoutFinishedEvent = Event & {
  detail: {
    isFinalized: boolean
    orderId: number
    id: string
  }
}
const onExpressCheckoutFinished = async (
  event: ExpressCheckoutFinishedEvent,
) => {
  if (event.detail.isFinalized) {
    log.debug({
      message: 'Express checkout in a single step is not supported.',
    })
    return
  }
  const checkoutUrl = `${routes.checkout}?transactionId=${event.detail.id}`
  navigate(checkoutUrl)
}

const toast = useToast()
const i18n = useI18n()

type ExpressCheckoutSDKError = {
  message: string
  paymentKey: string
  provider: string
}
type ExpressCheckoutApiError = {
  url: string
  statusCode: number
  errorKey:
    | 'device_not_supported'
    | 'payment_method_not_available'
    | 'psp_session_creation_failed'
    | 'failed_to_fetch_session'
    | 'basket_not_found'
    | 'basket_invalid'
    | 'error_shipping_address_validation_failed'
    | 'failed_dependency'
  message: string
}
type ExpressCheckoutErrorEvent = Event & {
  detail: ExpressCheckoutSDKError | ExpressCheckoutApiError
}

/** Returns the express button to its default state after a failed flow. */
const resetExpressCheckout = () => {
  document.dispatchEvent(new Event(EXPRESS_CHECKOUT_RESET_EVENT))
}

const onExpressError = (error: ExpressCheckoutErrorEvent) => {
  // The API error detail carries the request `url`, which can hold the basket
  // key, and browser logs are not masked. Log every other field of the detail.
  log.error({
    message: 'Express checkout error',
    detail:
      typeof error.detail === 'object'
        ? { ...error.detail, url: undefined }
        : error.detail,
  })
  if (typeof error?.detail === 'object' && 'errorKey' in error.detail) {
    const getErrorMessage = (errorKey: ExpressCheckoutApiError['errorKey']) => {
      switch (errorKey) {
        case 'device_not_supported':
          return i18n.t('expressCheckout.error.deviceNotSupported')
        case 'payment_method_not_available':
          return i18n.t('expressCheckout.error.paymentMethodNotAvailable')
        case 'psp_session_creation_failed':
          return i18n.t('expressCheckout.error.pspSessionCreationFailed')
        case 'failed_to_fetch_session':
          return i18n.t('expressCheckout.error.failedToFetchSession')
        case 'basket_not_found':
          return i18n.t('expressCheckout.error.basketNotFound')
        case 'basket_invalid':
          return i18n.t('expressCheckout.error.basketInvalid')
        case 'error_shipping_address_validation_failed':
          return i18n.t(
            'expressCheckout.error.errorShippingAddressValidationFailed',
          )
        case 'failed_dependency':
          return i18n.t('expressCheckout.error.failedDependency')
        default:
          return i18n.t('expressCheckout.error.unknownError')
      }
    }

    toast.show(getErrorMessage(error.detail.errorKey), {
      type: 'ERROR',
    })
    resetExpressCheckout()
    return
  }

  toast.show(i18n.t('expressCheckout.error.unknownError'), {
    type: 'ERROR',
  })
  resetExpressCheckout()
}

const onOutOfConstraints = () => {
  toast.show(i18n.t('expressCheckout.error.outOfConstraints'), {
    type: 'ERROR',
  })
  resetExpressCheckout()
}
</script>
