<template>
  <!--
    We need to use a `key` to force the web component to re-render when the breakpoint changes.
    Otherwise, the component will not be rendered when it gets teleported to a different
    DOM node.
  -->
  <SFExpressCheckoutBase
    :access-token="accessToken"
    :jwt="checkoutJwt"
    :basket-total="basket?.cost.finalPriceInCents"
    :visible="!!basket"
    :component-key="`express-checkout-desktop-${isDesktop}`"
  />
</template>
<script setup lang="ts">
import { useBasket } from '@client/composables/useBasket'
import { useDefaultBreakpoints } from '@client/composables/useDefaultBreakpoints'
import { computed } from 'vue'
import SFExpressCheckoutBase from '@client/components/checkout/SFExpressCheckoutBase.vue'

interface Props {
  accessToken?: string
  checkoutJwt: string
}
defineProps<Props>()

const { basket } = useBasket()
const isDesktop = computed(
  () => useDefaultBreakpoints().greaterOrEqual('lg').value,
)
</script>
