import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { describe, expect, it } from 'vitest'
import { CMSViewportProbe } from '@test/stubs/cms'
import {
  resolveDesktopColumnsClass,
  resolveGapClass,
  resolveGridAlignmentClass,
  resolveMobileColumnsClass,
  resolveVerticalAlignmentClass,
} from '@client/cms/shared/alignment'
import type { GridComponent as GridComponentType } from '@shared/types/cms/amplience'
import GridComponent from './GridComponent.vue'

const grid = (fields: Record<string, unknown> = {}) =>
  ({
    _meta: {
      schema: 'https://scayle.com/schemas/grid-component.json',
      deliveryId: 'grid-delivery-id',
    },
    ...fields,
  }) as unknown as GridComponentType

const cell = () => ({
  componentType: 'text',
  text: { _meta: { schema: 'x' }, content: 'Cell' },
})

const mountGrid = (
  contentElement: GridComponentType,
  stubs: Record<string, Component | boolean> = { AmplienceBlockDispatch: true },
) => mount(GridComponent, { props: { contentElement }, global: { stubs } })

describe('Amplience GridComponent', () => {
  // The class maps and the column-count parsing are tested in
  // shared/alignment.test.ts. Each row here only proves this grid hands the
  // authored field to its resolver, so a row would fail if a field were
  // dropped, swapped with its breakpoint twin, or sent to the wrong resolver.
  it.for([
    {
      field: 'columns_desktop',
      value: 4,
      expected: resolveDesktopColumnsClass(4),
    },
    {
      field: 'columns_mobile',
      value: 2,
      expected: resolveMobileColumnsClass(2),
    },
    {
      field: 'gap_column_desktop',
      value: 'small',
      expected: resolveGapClass('small', 'column', 'desktop'),
    },
    {
      field: 'gap_column_mobile',
      value: 'medium',
      expected: resolveGapClass('medium', 'column', 'mobile'),
    },
    {
      field: 'gap_row_desktop',
      value: 'large',
      expected: resolveGapClass('large', 'row', 'desktop'),
    },
    {
      field: 'gap_row_mobile',
      value: 'small',
      expected: resolveGapClass('small', 'row', 'mobile'),
    },
    {
      field: 'vertical_content_alignment',
      value: 'Top',
      expected: resolveVerticalAlignmentClass('Top'),
    },
    {
      // A grid aligns cells horizontally with `justify-items`, not the
      // `items-*` classes a flex section uses.
      field: 'horizontal_content_alignment',
      value: 'Right',
      expected: resolveGridAlignmentClass('Right'),
    },
  ])('applies the class resolved from $field', ({ field, value, expected }) => {
    expect(mountGrid(grid({ [field]: value })).classes()).toContain(expected)
  })

  it('divides the inherited viewport fraction by the column count for nested blocks', () => {
    const probe = mountGrid(
      grid({ columns_desktop: 4, columns_mobile: 2, content: [cell()] }),
      { AmplienceBlockDispatch: CMSViewportProbe },
    ).get('[data-testid="probe"]')

    // The grid is the outermost container here, so it inherits a full viewport.
    expect(probe.attributes('data-desktop')).toBe('0.25')
    expect(probe.attributes('data-mobile')).toBe('0.5')
  })

  it('propagates the default column counts when none are authored', () => {
    const probe = mountGrid(grid({ content: [cell()] }), {
      AmplienceBlockDispatch: CMSViewportProbe,
    }).get('[data-testid="probe"]')

    // Reading the raw, unset field here would divide by `undefined`, sending
    // `NaN` into every nested image's `sizes`.
    expect(probe.attributes('data-desktop')).toBe('0.5')
    expect(probe.attributes('data-mobile')).toBe('1')
  })

  it('renders one block per content entry', () => {
    const wrapper = mountGrid(grid({ content: [cell(), cell()] }), {
      AmplienceBlockDispatch: CMSViewportProbe,
    })

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(2)
  })

  it('renders an empty grid when no content is authored', () => {
    const wrapper = mountGrid(grid(), {
      AmplienceBlockDispatch: CMSViewportProbe,
    })

    expect(wrapper.findAll('[data-testid="probe"]')).toHaveLength(0)
  })

  it('annotates the entry so the Amplience editor can highlight the field', () => {
    const wrapper = mountGrid(grid())

    expect(wrapper.attributes('data-amplience-entry-id')).toBe(
      'grid-delivery-id',
    )
    expect(wrapper.attributes('data-amplience-field-id')).toBe('content')
  })
})
