import { describe, expect, it } from 'vitest'
import type { AttributeGroup, Attributes } from '@scayle/storefront-api'
import { getAttributeGroupByTypes } from './product'

describe('getAttributeGroupByTypes', () => {
  it.for([
    { case: 'attributes is undefined', attributes: undefined },
    { case: 'attributes is empty', attributes: {} },
    {
      case: 'no attribute matches the type',
      attributes: {
        other: {
          id: 1,
          key: 'other',
          label: 'Other',
          type: 'other',
          multiSelect: false,
          values: { label: 'Something' },
        } as AttributeGroup,
      },
    },
  ])('returns empty array when $case', ({ attributes }) => {
    expect(getAttributeGroupByTypes(attributes, 'fit_size')).toEqual([])
  })

  it('prefixes the group label by default', () => {
    const attributes: Attributes = {
      fit_size: {
        id: 1,
        key: 'fit_size',
        label: 'Fit',
        type: 'fit_size',
        multiSelect: false,
        values: { label: 'Regular' },
      } as AttributeGroup,
    }
    expect(getAttributeGroupByTypes(attributes, 'fit_size')).toEqual([
      'Fit: Regular',
    ])
  })

  it('returns plain value labels when prefixLabel is false', () => {
    const attributes: Attributes = {
      extras: {
        id: 1,
        key: 'extras',
        label: 'Extras',
        type: 'extras',
        multiSelect: true,
        values: [{ label: 'Pockets' }, { label: 'Hood' }],
      } as AttributeGroup,
    }
    expect(
      getAttributeGroupByTypes(attributes, 'extras', { prefixLabel: false }),
    ).toEqual(['Pockets', 'Hood'])
  })

  it('merges multiple attributes with the same type by concatenating values', () => {
    const attributes: Attributes = {
      extras1: {
        id: 1,
        key: 'extras',
        label: 'Extras',
        type: 'extras',
        multiSelect: true,
        values: [{ label: 'Pockets' }],
      } as AttributeGroup,
      extras2: {
        id: 2,
        key: 'extras',
        label: 'Extras',
        type: 'extras',
        multiSelect: false,
        values: { label: 'Hood' },
      } as AttributeGroup,
    }
    expect(
      getAttributeGroupByTypes(attributes, 'extras', { prefixLabel: false }),
    ).toEqual(['Pockets', 'Hood'])
  })

  it('skips attributes without a matching type', () => {
    const attributes: Attributes = {
      noType: {
        id: 1,
        key: 'extras',
        label: 'Extras',
        type: null,
        multiSelect: true,
        values: [{ label: 'Pockets' }],
      } as AttributeGroup,
      withType: {
        id: 2,
        key: 'extras',
        label: 'Extras',
        type: 'extras',
        multiSelect: true,
        values: [{ label: 'Hood' }],
      } as AttributeGroup,
    }
    expect(
      getAttributeGroupByTypes(attributes, 'extras', { prefixLabel: false }),
    ).toEqual(['Hood'])
  })
})
