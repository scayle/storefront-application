import { describe, expect, it } from 'vitest'
import type {
  AnalyticsClientEvent,
  AnalyticsEventProduct,
  CentAmount,
} from '@scayle/storefront-api'
import {
  ANALYTICS_MAX_EVENT_BODY_BYTES,
  ANALYTICS_MAX_LIST_ITEMS,
} from '@scayle/storefront/shared'
import { serializeEvent } from './analytics'

const PROMOTION_ID = 'b6d5fb1b-7c1e-48e1-946b-d8e948983cfb'

/**
 * A promotion-heavy basket line: `promotion_ids` alone admits 200 entries per
 * product, so a few lines spend the body cap at a realistic rate.
 */
const basketLine = (
  index: number,
  lineCount: number,
): AnalyticsEventProduct => ({
  product_id: `${1000000 + index}`,
  price: 8995 as CentAmount,
  quantity: 2,
  promotion_ids: Array.from<string>({ length: 10 }).fill(PROMOTION_ID),
  position: index + 1,
  total: lineCount,
})

/** A `view_basket` event as `track()` captures it, before `flush()` stamps the context. */
const viewBasket = (
  products: AnalyticsEventProduct[],
): AnalyticsClientEvent => ({
  event_name: 'view_basket',
  page_type: 'basket',
  page_path: '/de/basket',
  session_id: 'session-1',
  device_type: 'desktop',
  total_price: 1234567 as CentAmount,
  total_sale_discount: 0 as CentAmount,
  total_campaign_discount: 0 as CentAmount,
  total_promotions_discount: 0 as CentAmount,
  products,
})

describe('serializeEvent', () => {
  it('returns the JSON body of an event that fits under both caps', () => {
    const event = viewBasket([basketLine(0, 1), basketLine(1, 2)])

    expect(serializeEvent(event)).toBe(JSON.stringify(event))
  })

  it('returns undefined when an event without products is over the body cap', () => {
    const event: AnalyticsClientEvent = {
      event_name: 'search',
      search_term: 'x'.repeat(ANALYTICS_MAX_EVENT_BODY_BYTES),
      page_type: 'search',
      page_path: '/de/search',
      session_id: 'session-1',
      device_type: 'desktop',
    }

    expect(serializeEvent(event)).toBeUndefined()
  })

  it('trims products to the body cap and keeps the full line count on total', () => {
    const lineCount = 400
    const event = viewBasket(
      Array.from({ length: lineCount }, (_, index) =>
        basketLine(index, lineCount),
      ),
    )

    const body = serializeEvent(event)
    const sent = JSON.parse(body!)

    expect(body!.length).toBeLessThanOrEqual(ANALYTICS_MAX_EVENT_BODY_BYTES)
    expect(sent.products.length).toBeGreaterThan(0)
    expect(sent.products.length).toBeLessThan(lineCount)
    expect(sent.products.at(-1)).toEqual({
      product_id: `${1000000 + sent.products.length - 1}`,
      price: 8995,
      quantity: 2,
      promotion_ids: Array.from<string>({ length: 10 }).fill(PROMOTION_ID),
      position: sent.products.length,
      total: lineCount,
    })
  })

  it('stops at the list cap when the entries are small enough to stay under the body cap', () => {
    const lineCount = ANALYTICS_MAX_LIST_ITEMS + 50
    const event = viewBasket(
      Array.from({ length: lineCount }, (_, index) => ({
        product_id: `${index}`,
        price: 1 as CentAmount,
      })),
    )

    const body = serializeEvent(event)

    expect(body!.length).toBeLessThan(ANALYTICS_MAX_EVENT_BODY_BYTES)
    expect(JSON.parse(body!).products).toHaveLength(ANALYTICS_MAX_LIST_ITEMS)
  })

  it('returns undefined when a field outside products keeps the body over the cap', () => {
    const event = {
      ...viewBasket([basketLine(0, 1)]),
      previous_page_path: 'x'.repeat(ANALYTICS_MAX_EVENT_BODY_BYTES),
    }

    expect(serializeEvent(event)).toBeUndefined()
  })
})
