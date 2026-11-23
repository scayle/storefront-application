import { describe, expect, it } from 'vitest'
import { localeMessages } from './messagesServer'

// SFShopSwitcher starts the trigger's accessible name with its visible text
// (axe `label-content-name-mismatch`) and appends this translation. A
// translation that brought back `{shopName}` would repeat that text.
describe('shop_selector.aria_label', () => {
  it.for(Object.entries(localeMessages))(
    '%s keeps the country and language and leaves out the shop name',
    ([, messages]) => {
      const label = messages.shop_selector.aria_label

      expect(label).toContain('{selectedCountry}')
      expect(label).toContain('{selectedLanguage}')
      expect(label).not.toContain('{shopName}')
    },
  )
})
