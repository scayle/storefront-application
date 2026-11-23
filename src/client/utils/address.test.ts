import { describe, expect, it } from 'vitest'
import { addressLinesMatch } from './address'

const LINES = ['Jane Doe', '10 High Street', 'London SW1A 1AA']

describe('addressLinesMatch', () => {
  it.for<{
    name: string
    first: string[]
    second: string[]
    expected: boolean
  }>([
    {
      name: 'two addresses rendering the same lines',
      first: LINES,
      second: [...LINES],
      expected: true,
    },
    {
      name: 'addresses differing in a single line',
      first: LINES,
      second: ['Jane Doe', '5 Baker Street', 'London SW1A 1AA'],
      expected: false,
    },
    {
      name: 'addresses of differing line counts',
      first: LINES,
      second: [...LINES, 'Floor 3'],
      expected: false,
    },
    {
      name: 'two addresses with no lines at all',
      first: [],
      second: [],
      expected: true,
    },
  ])('returns $expected for $name', ({ first, second, expected }) => {
    expect(addressLinesMatch({ lines: first }, { lines: second })).toBe(
      expected,
    )
  })
})
