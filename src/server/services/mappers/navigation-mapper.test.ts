import { describe, it, expect } from 'vitest'
import type { NavigationV2Items } from '@scayle/storefront-api'
import { NavigationMapper } from '@scayle/storefront/mappers'
import {
  createMockMapperRegistry,
  createMockStorefrontContext,
} from '../../../test/utils/context'
import { NavigationMapperService } from './navigation-mapper'

function externalItem(
  overrides: Partial<NavigationV2Items[number]> = {},
): NavigationV2Items[number] {
  return {
    id: 1,
    name: 'Item',
    assets: {},
    visibleFrom: null,
    visibleTo: null,
    children: [],
    target: 'individual-link',
    linkTarget: { url: '/', openInNewWindow: false },
    ...overrides,
  } as NavigationV2Items[number]
}

describe('NavigationMapperService', () => {
  const context = createMockStorefrontContext()
  const mappers = createMockMapperRegistry(context)
  const mapper = new NavigationMapperService(context, mappers)

  it('requests the category behind category targets', () => {
    expect(mapper.Includes).toEqual({ category: true })
  })

  it('keeps the base mapping of a navigation item', () => {
    const item = externalItem({ customData: { linkColor: '#ff0000' } })

    expect(mapper.mapNavigationItem(item)).toMatchObject(
      new NavigationMapper(context, mappers).mapNavigationItem(item),
    )
  })

  it.for<{
    case: string
    customData: NavigationV2Items[number]['customData']
    expected: { linkColor: string | undefined; disabled: boolean }
  }>([
    {
      case: 'the link color from customData',
      customData: { linkColor: '#ff0000' },
      expected: { linkColor: '#ff0000', disabled: false },
    },
    {
      case: 'disabled from customData.disabledLink',
      customData: { disabledLink: true },
      expected: { linkColor: undefined, disabled: true },
    },
    {
      case: 'no link color and enabled without customData',
      customData: undefined,
      expected: { linkColor: undefined, disabled: false },
    },
  ])('maps $case', ({ customData, expected }) => {
    const [result] = mapper.mapNavigationToHeader([
      externalItem({ customData }),
    ])

    expect(result).toMatchObject(expected)
  })

  it('applies the custom-data override recursively to children', () => {
    const [result] = mapper.mapNavigationToHeader([
      externalItem({
        id: 10,
        children: [
          externalItem({ id: 11, customData: { disabledLink: true } }),
        ],
      }),
    ])

    expect(result?.children).toHaveLength(1)
    expect(result?.children[0]?.disabled).toBe(true)
  })
})
