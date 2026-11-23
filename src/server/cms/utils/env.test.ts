import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { parseEnv, requiredEnv } from './env'

const schema = z.object({
  CMS_TEST_TOKEN: requiredEnv,
  CMS_TEST_SPACE: requiredEnv,
  CMS_TEST_BRANCH: z.string().optional(),
})

const parse = () => parseEnv('Test', schema)

describe('parseEnv', () => {
  it('returns the parsed values when every required variable is set', () => {
    vi.stubEnv('CMS_TEST_TOKEN', 'token')
    vi.stubEnv('CMS_TEST_SPACE', 'space')
    vi.stubEnv('CMS_TEST_BRANCH', undefined)

    expect(parseEnv('Test', schema)).toEqual({
      CMS_TEST_TOKEN: 'token',
      CMS_TEST_SPACE: 'space',
    })
  })

  it('lists every invalid variable in one error that names the provider', () => {
    vi.stubEnv('CMS_TEST_TOKEN', undefined)
    vi.stubEnv('CMS_TEST_SPACE', undefined)

    expect(parse).toThrow(/Invalid Test CMS environment/)
    expect(parse).toThrow(/CMS_TEST_TOKEN/)
    expect(parse).toThrow(/CMS_TEST_SPACE/)
  })

  it('reports an unset variable as not set', () => {
    vi.stubEnv('CMS_TEST_TOKEN', undefined)
    vi.stubEnv('CMS_TEST_SPACE', 'space')

    expect(parse).toThrow(/is not set/)
  })

  it('reports a blank variable as empty', () => {
    vi.stubEnv('CMS_TEST_TOKEN', '')
    vi.stubEnv('CMS_TEST_SPACE', 'space')

    expect(parse).toThrow(/is empty/)
  })

  it('keeps the value of a variable that fails validation out of the error message', () => {
    vi.stubEnv('CMS_TEST_MODE', 'secret-mode-value')

    const parseMode = () =>
      parseEnv('Test', z.object({ CMS_TEST_MODE: z.enum(['draft']) }))

    expect(parseMode).toThrow(/CMS_TEST_MODE/)
    expect(parseMode).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('secret-mode-value'),
      }),
    )
  })
})
