import { describe, expect, it } from 'vitest'
import {
  parseColumnCount,
  resolveDesktopColumnsClass,
  resolveFlexAlignmentClass,
  resolveGapClass,
  resolveGridAlignmentClass,
  resolveMobileColumnsClass,
  resolvePaddingClass,
  resolveVerticalAlignmentClass,
  shouldAddBottomMargin,
  shouldAddTopMargin,
} from './alignment'

describe('parseColumnCount', () => {
  it.for([
    { value: 4, expected: 4 },
    { value: '3', expected: 3 },
    { value: 3.7, expected: 3 },
    { value: 12, expected: 12 },
    { value: 0, expected: 2 },
    { value: -1, expected: 2 },
    { value: 'abc', expected: 2 },
    { value: '', expected: 2 },
    { value: null, expected: 2 },
    { value: undefined, expected: 2 },
  ])('parses $value to $expected with fallback 2', ({ value, expected }) => {
    expect(parseColumnCount(value, 2)).toBe(expected)
  })
})

describe('resolveDesktopColumnsClass', () => {
  it.for([
    { columns: 1, expected: 'lg:grid-cols-1' },
    { columns: 2, expected: 'lg:grid-cols-2' },
    { columns: 3, expected: 'lg:grid-cols-3' },
    { columns: 4, expected: 'lg:grid-cols-4' },
    { columns: 5, expected: 'lg:grid-cols-5' },
    { columns: 6, expected: 'lg:grid-cols-6' },
    { columns: 7, expected: 'lg:grid-cols-2' },
  ])('maps $columns columns to $expected', ({ columns, expected }) => {
    expect(resolveDesktopColumnsClass(columns)).toBe(expected)
  })
})

describe('resolveMobileColumnsClass', () => {
  it.for([
    { columns: 1, expected: 'grid-cols-1' },
    { columns: 3, expected: 'grid-cols-3' },
    { columns: 4, expected: 'grid-cols-1' },
  ])('maps $columns columns to $expected', ({ columns, expected }) => {
    expect(resolveMobileColumnsClass(columns)).toBe(expected)
  })
})

describe('resolvePaddingClass', () => {
  it.for([
    { size: 'small', expected: 'p-3 lg:p-5' },
    { size: 'medium', expected: 'p-5 lg:p-9' },
    { size: 'large', expected: 'p-9 lg:p-12' },
    { size: 'none', expected: 'p-0' },
    { size: undefined, expected: 'p-0' },
  ])('maps size $size to $expected', ({ size, expected }) => {
    expect(resolvePaddingClass(size)).toBe(expected)
  })
})

describe('resolveGapClass', () => {
  it.for([
    {
      size: 'small',
      axis: 'column',
      breakpoint: 'desktop',
      expected: 'lg:gap-x-7',
    },
    { size: 'medium', axis: 'row', breakpoint: 'mobile', expected: 'gap-y-5' },
    {
      size: 'large',
      axis: 'row',
      breakpoint: 'desktop',
      expected: 'lg:gap-y-12',
    },
    {
      size: undefined,
      axis: 'column',
      breakpoint: 'mobile',
      expected: 'gap-x-0',
    },
    {
      size: 'none',
      axis: 'row',
      breakpoint: 'desktop',
      expected: 'lg:gap-y-0',
    },
    // An emptied option field arrives as '', which renders no gap class at all.
    { size: '', axis: 'row', breakpoint: 'mobile', expected: '' },
  ] as const)(
    'maps $size $axis gap on $breakpoint to $expected',
    ({ size, axis, breakpoint, expected }) => {
      expect(resolveGapClass(size, axis, breakpoint)).toBe(expected)
    },
  )
})

describe('alignment classes', () => {
  it.for([
    {
      resolve: resolveVerticalAlignmentClass,
      value: 'Top',
      expected: 'items-start',
    },
    {
      resolve: resolveVerticalAlignmentClass,
      value: 'Bottom',
      expected: 'items-end',
    },
    {
      resolve: resolveVerticalAlignmentClass,
      value: undefined,
      expected: 'items-center',
    },
    {
      resolve: resolveFlexAlignmentClass,
      value: 'Left',
      expected: 'items-start',
    },
    {
      resolve: resolveFlexAlignmentClass,
      value: 'Right',
      expected: 'items-end',
    },
    {
      resolve: resolveFlexAlignmentClass,
      value: undefined,
      expected: 'items-center',
    },
    {
      resolve: resolveGridAlignmentClass,
      value: 'Left',
      expected: 'justify-items-start',
    },
    {
      resolve: resolveGridAlignmentClass,
      value: 'Right',
      expected: 'justify-items-end',
    },
    {
      resolve: resolveGridAlignmentClass,
      value: undefined,
      expected: 'justify-items-center',
    },
  ])(
    '$resolve.name maps $value to $expected',
    ({ resolve, value, expected }) => {
      expect(resolve(value)).toBe(expected)
    },
  )
})

describe('section margins', () => {
  it.each([
    { alignment: 'Top', top: false, bottom: true },
    { alignment: 'Middle', top: true, bottom: true },
    { alignment: 'Bottom', top: true, bottom: false },
    { alignment: undefined, top: true, bottom: true },
  ])(
    'adds margins to the first and last block for $alignment',
    ({ alignment, top, bottom }) => {
      expect(shouldAddTopMargin(0, alignment)).toBe(top)
      expect(shouldAddBottomMargin(2, 3, alignment)).toBe(bottom)
    },
  )

  it('adds no margin to blocks between the first and last', () => {
    expect(shouldAddTopMargin(1, 'Middle')).toBe(false)
    expect(shouldAddBottomMargin(1, 3, 'Middle')).toBe(false)
  })
})
