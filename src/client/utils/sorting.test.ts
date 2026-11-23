import { describe, expect, it } from 'vitest'
import { getSortOptionLabel } from './sorting'

const t = (key: string) => `t:${key}`

describe('getSortOptionLabel', () => {
  it('translates built-in sort keys', () => {
    expect(getSortOptionLabel({ key: 'price_asc' }, t)).toBe(
      't:sorting_select.price_asc',
    )
  })

  it('prefers the provider label over the translation of a reused built-in key', () => {
    expect(getSortOptionLabel({ key: 'default', label: 'Relevance' }, t)).toBe(
      'Relevance',
    )
  })

  it('uses the provider label for a key without a translation', () => {
    expect(getSortOptionLabel({ key: 'popularity', label: 'Popular' }, t)).toBe(
      'Popular',
    )
  })

  it('falls back to the key when a provider option has no label', () => {
    expect(getSortOptionLabel({ key: 'popularity' }, t)).toBe('popularity')
  })
})
