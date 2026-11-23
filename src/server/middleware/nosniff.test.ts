import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { nosniffMiddleware } from './nosniff'

describe('nosniffMiddleware', () => {
  it('sets X-Content-Type-Options to nosniff', async () => {
    const app = new Hono()
    app.use(nosniffMiddleware)
    app.get('/asset.js', (ctx) => ctx.text('ok'))

    const response = await app.request('/asset.js')

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})
