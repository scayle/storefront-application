<template>
  <div class="flex flex-col overflow-hidden p-5 lg:w-96">
    <div v-if="availableLanguages.length > 1" ref="languageList" class="mb-5">
      <h3 class="mb-4 heading-section-3">
        {{ $t('shop_selector.choose_language') }}
      </h3>
      <div class="grid grid-cols-2 gap-5">
        <template v-for="item in availableLanguages" :key="item.locale">
          <span
            v-if="item.code === currentLocale.language"
            class="sf-button-md-resting-accent"
            aria-current="true"
            :lang="item.locale"
          >
            {{ item.name
            }}<span class="sr-only">
              {{ $t('shop_selector.current_shop_indicator') }}
            </span>
          </span>
          <SFButton
            v-else
            :to="item.url"
            :lang="item.locale"
            variant="secondary"
            @click="onShopLinkClick"
          >
            {{ item.name }}
          </SFButton>
        </template>
      </div>
    </div>
    <div
      v-if="availableCountries.length"
      ref="countryList"
      class="flex flex-col overflow-hidden"
    >
      <h3 class="mb-6 heading-section-2">
        {{ $t('shop_selector.choose_country') }}
      </h3>
      <div class="grid grid-cols-1 gap-2 overflow-auto p-1">
        <!-- `getAvailableCountries` builds every country from at least one shop, so `languages[0]` exists. -->
        <template v-for="country in availableCountries" :key="country.code">
          <span
            v-if="country.code === currentLocale.region"
            class="sf-button-md-resting-secondary justify-between!"
            aria-current="true"
            :lang="country.languages[0]!.locale"
            data-testid="shop-selector-current-country"
          >
            <span class="text-lg font-bold text-primary">
              {{ country.name
              }}<span class="sr-only">
                {{ $t('shop_selector.current_shop_indicator') }}
              </span>
            </span>
            <IconCheckmarkDefault class="size-3 shrink-0 fill-accent" />
          </span>
          <SFButton
            v-else
            :to="country.languages[0]!.url"
            :lang="country.languages[0]!.locale"
            variant="secondary"
            class="justify-between!"
            data-testid="shop-selector-country"
            @click="onShopLinkClick"
          >
            <span class="text-lg">{{ country.name }}</span>
          </SFButton>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import SFButton from '@client/components/ui/core/SFButton.vue'
import IconCheckmarkDefault from '@assets/icons/checkmark/default.svg'
import type {
  AvailableCountry,
  AvailableLanguage,
} from '@scayle/storefront/types'
import { useShopSwitcher } from '@client/composables/useShopSwitcher'

defineProps<{
  availableLanguages: AvailableLanguage[]
  availableCountries: AvailableCountry[]
  currentLocale: Intl.Locale
}>()

const { onShopLinkClick } = useShopSwitcher()
</script>
