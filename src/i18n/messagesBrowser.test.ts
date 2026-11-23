import { describe, expect, it } from 'vitest'
import { loadLocaleMessages } from './messagesBrowser'
import { getLocaleMessages } from './messagesServer'

describe('loadLocaleMessages', () => {
  it('loads the messages the server renders with for the same locale', async () => {
    // A mismatch here would make every hydration in that shop render other text.
    expect(await loadLocaleMessages('de-AT')).toEqual(
      getLocaleMessages('de-AT'),
    )
  })
})
