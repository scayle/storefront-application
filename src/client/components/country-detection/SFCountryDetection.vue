<template>
  <!--
    The overlay mounts the modal already open on its first open, so `appear` keeps the fade-in on that mount.
    `size="sm"` caps the width only from `lg` up, so `max-w-modal-sm` is applied here to enforce 480px width
    at all sizes.
  -->
  <SFModal
    v-model:visible="open"
    :headline="headline"
    :description="description"
    size="sm"
    appear
    class="mx-auto max-w-modal-sm"
    data-testid="country-detection-dialog"
    @close="markUserAsPrompted"
  >
    <template #default="{ closeModal }">
      <ul class="flex flex-col gap-3">
        <li v-for="shop in suggestedShops" :key="shop.url">
          <SFButton
            :to="shop.url"
            variant="primary"
            size="xl"
            :lang="hasLanguageChoice ? shop.locale : undefined"
            class="w-full"
            :data-testid="
              hasLanguageChoice
                ? `country-detection-switch-${detectedRegion?.toLowerCase()}-${shop.code}`
                : `country-detection-switch-${detectedRegion?.toLowerCase()}`
            "
            @click="open = false"
          >
            {{
              hasLanguageChoice
                ? getLanguageName(shop)
                : t('country_detection.shop_in_country', { detectedCountry })
            }}
          </SFButton>
        </li>
        <li :class="{ 'mt-3': hasLanguageChoice }">
          <SFButton
            variant="secondary"
            size="xl"
            class="w-full"
            data-testid="country-detection-stay"
            @click="closeModal"
          >
            {{ t('country_detection.stay_in_country', { currentCountry }) }}
          </SFButton>
        </li>
      </ul>
    </template>
  </SFModal>
</template>

<script lang="ts" setup>
/**
 * Suggests the shop for the country the request came from. `Layout` opens it
 * through `useOverlay()` once a suggestion applies, so its code loads only for
 * users who see it.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AvailableLanguage } from '@scayle/storefront/types'
import SFButton from '@client/components/ui/core/SFButton.vue'
import SFModal from '@client/components/ui/core/SFModal.vue'
import { useCountryDetection } from '@client/composables/useCountryDetection'
import { useStorefrontConfig } from '@client/composables/useStorefrontConfig'

const { t, te } = useI18n()
const { country } = useStorefrontConfig()

/** Whether the modal is open. Bind with `v-model:open`. */
const open = defineModel<boolean>('open', { required: true })

// The country comes from the shop's `countryCode`, not its locale: a DE shop
// can serve `en-GB`. Naming it in the active locale avoids country adjectives
// ("German shop"), which need their own grammatical forms per language.
function getCountryName(region: string | undefined) {
  if (!region) {
    return ''
  }

  const regionKey = `country_detection.override_codes.${region.toUpperCase()}`
  return te(regionKey)
    ? t(regionKey)
    : (new Intl.DisplayNames([country.value.locale], { type: 'region' }).of(
        region,
      ) ?? region)
}

// `Intl.DisplayNames` writes some languages in lower case in their own locale
// (French, Italian), which reads wrong at the start of a button label.
function getLanguageName(shop: AvailableLanguage) {
  return shop.name.charAt(0).toLocaleUpperCase(shop.locale) + shop.name.slice(1)
}

const { suggestedShops, detectedRegion, markUserAsPrompted } =
  useCountryDetection()

const hasLanguageChoice = computed(() => suggestedShops.value.length > 1)

const currentCountry = computed(() => getCountryName(country.value.countryCode))

const detectedCountry = computed(() => getCountryName(detectedRegion.value))

const headline = computed(() =>
  t('country_detection.headline', { detectedCountry: detectedCountry.value }),
)

const description = computed(() =>
  hasLanguageChoice.value
    ? t('country_detection.subline_multi_language', {
        currentCountry: currentCountry.value,
        detectedCountry: detectedCountry.value,
      })
    : t('country_detection.subline_single_language', {
        currentCountry: currentCountry.value,
      }),
)
</script>
