import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import {
  createMockCategorySuggestion,
  createMockNavigationItemSuggestion,
  createMockProductSuggestion,
} from '../../test/mock-data/search'
import {
  SHOW_ALL_RESULTS_ID,
  useSearchSuggestionNavigation,
} from './useSearchSuggestionNavigation'

const setup = () =>
  useSearchSuggestionNavigation(
    computed(() => [createMockCategorySuggestion({ id: 5 })]),
    computed(() => [createMockProductSuggestion()]),
    computed(() => [createMockNavigationItemSuggestion({ id: 7 })]),
    computed(() => '/search?filters[term]=x'),
  )

describe('useSearchSuggestionNavigation', () => {
  it('walks the suggestions in dropdown order and wraps past "show all"', () => {
    const navigation = setup()

    expect(navigation.entries.value.map((e) => e.type)).toEqual([
      'category',
      'product',
      'navigationItem',
    ])

    navigation.next()
    navigation.next()
    navigation.next()
    navigation.next()
    expect(navigation.activeId.value).toBe(SHOW_ALL_RESULTS_ID)
    expect(navigation.activeSuggestion.value).toBeUndefined()

    navigation.next()
    expect(navigation.activeSuggestion.value).toBe(navigation.entries.value[0])
  })

  it('moves backwards from nothing active to "show all", then to the last suggestion', () => {
    const navigation = setup()

    navigation.prev()
    expect(navigation.activeId.value).toBe(SHOW_ALL_RESULTS_ID)
    expect(navigation.activeLink.value).toBe('/search?filters[term]=x')

    navigation.prev()
    // Same object reference as the entries list, so a select is resolved by
    // identity against it.
    expect(navigation.activeSuggestion.value).toBe(navigation.entries.value[2])
  })

  it('does nothing without suggestions', () => {
    const empty = useSearchSuggestionNavigation(
      computed(() => []),
      computed(() => []),
      computed(() => []),
      computed(() => '/search'),
    )

    empty.next()
    expect(empty.activeId.value).toBeUndefined()
  })

  it('clears the active row when the navigation is reset', () => {
    const navigation = setup()

    navigation.next()
    navigation.resetNavigation()

    expect(navigation.activeSuggestion.value).toBeUndefined()
    expect(navigation.activeId.value).toBeUndefined()
  })
})
