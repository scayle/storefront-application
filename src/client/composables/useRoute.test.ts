import { describe, expect, it, vi } from 'vitest'
import type { ReactivePageMock } from '@test/utils/inertia'
import { useRoute } from './useRoute'

const mocks = vi.hoisted(() => ({
  reactivePage: null as ReactivePageMock | null,
  visit: vi.fn(),
}))

vi.mock('@inertiajs/vue3', async () => {
  const { createReactivePage } = await import('@test/utils/inertia')
  mocks.reactivePage = createReactivePage(
    { storefront: { config: {}, origin: 'https://www.example.com' } },
    { url: 'https://www.example.com/products?sort=asc' },
  )
  return {
    usePage: vi.fn(() => mocks.reactivePage),
    router: { visit: mocks.visit },
  }
})

describe('useRoute', () => {
  describe('baseUrl', () => {
    it('returns the full url without the query string', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products?sort=asc'
      const { baseUrl } = useRoute()

      expect(baseUrl.value).toBe('https://www.example.com')
    })

    it('returns the full url as-is when there is no query string', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products'
      const { baseUrl } = useRoute()

      expect(baseUrl.value).toBe('https://www.example.com')
    })
  })

  describe('query', () => {
    it('returns the parsed query params', () => {
      mocks.reactivePage!.url =
        'https://www.example.com/products?sort=asc&page=2'
      const { query } = useRoute()

      expect(query.value.get('sort')).toBe('asc')
      expect(query.value.get('page')).toBe('2')
    })

    it('returns no params when there is no query string', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products'
      const { query } = useRoute()

      expect([...query.value]).toEqual([])
    })

    it('shares one URLSearchParams across reads until the URL changes', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products?page=2'
      const { query } = useRoute()

      query.value.delete('page')

      expect(query.value.has('page')).toBe(false)
      expect(mocks.reactivePage!.url).toContain('page=2')
    })
  })

  describe('hash', () => {
    it('returns the hash for a url with a hash', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products?sort=asc#hash'
      const { hash } = useRoute()

      expect(hash.value).toBe('hash')
    })

    it('returns an empty string for a url with only a query string', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products?sort=asc'
      const { hash } = useRoute()

      expect(hash.value).toBe('')
    })
  })

  describe('fullPath', () => {
    it('returns the complete url including query string', () => {
      mocks.reactivePage!.url =
        'https://www.example.com/products?sort=asc&page=2'
      const { fullPath } = useRoute()

      expect(fullPath.value).toBe(
        'https://www.example.com/products?sort=asc&page=2',
      )
    })

    it('returns just the url when there is no query string', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products'
      const { fullPath } = useRoute()

      expect(fullPath.value).toBe('https://www.example.com/products')
    })
  })

  describe('relative URL normalization', () => {
    it('normalizes a relative URL using the resolved origin from page props', () => {
      mocks.reactivePage!.url = '/category/shoes?color=red'
      const { path, query, baseUrl, fullPath } = useRoute()

      expect(baseUrl.value).toBe('https://www.example.com')
      expect(path.value).toBe('/category/shoes')
      expect(query.value.get('color')).toBe('red')
      expect(fullPath.value).toBe(
        'https://www.example.com/category/shoes?color=red',
      )
    })

    it('uses the absolute URL as-is when page.url starts with https://', () => {
      mocks.reactivePage!.url = 'https://www.other.com/products?sort=asc'
      const { baseUrl, path, fullPath, query } = useRoute()

      expect(baseUrl.value).toBe('https://www.other.com')
      expect(path.value).toBe('/products')
      expect(query.value.get('sort')).toBe('asc')
      expect(fullPath.value).toBe('https://www.other.com/products?sort=asc')
    })
  })

  describe('reactivity', () => {
    it('updates all computed values when page.url changes', () => {
      mocks.reactivePage!.url = 'https://www.example.com/products?sort=asc'
      const { baseUrl, path, query } = useRoute()

      expect(baseUrl.value).toBe('https://www.example.com')
      expect(path.value).toBe('/products')
      expect(query.value.get('sort')).toBe('asc')

      mocks.reactivePage!.url =
        'https://www.example-2.com/category/shoes?color=red'

      expect(baseUrl.value).toBe('https://www.example-2.com')
      expect(path.value).toBe('/category/shoes')
      expect(query.value.get('color')).toBe('red')
    })
  })

  describe('navigate', () => {
    function stubWindowLocation() {
      const location = { assign: vi.fn(), replace: vi.fn() }
      vi.stubGlobal('window', { location })
      return location
    }

    function useRouteOnShopPage() {
      mocks.reactivePage!.url = 'https://www.example.com/de/products'
      mocks.reactivePage!.props.storefront = {
        config: { countrySelector: 'path' },
        country: { path: 'de' },
        origin: 'https://www.example.com',
      }
      return useRoute()
    }

    it('visits a site-relative path with Inertia, localized for the active country', () => {
      const { navigate } = useRouteOnShopPage()

      navigate('/basket', { replace: true })

      expect(mocks.visit).toHaveBeenCalledWith('/de/basket', { replace: true })
    })

    it.for([
      { name: 'an external URL', to: 'https://other.example/x' },
      { name: 'a protocol-relative URL', to: '//other.example/x' },
      { name: 'a same-origin absolute URL', to: 'https://www.example.com/at' },
    ])('loads $name as a full page', ({ to }) => {
      const location = stubWindowLocation()
      const { navigate } = useRouteOnShopPage()

      navigate(to)

      expect(location.assign).toHaveBeenCalledWith(to)
      expect(mocks.visit).not.toHaveBeenCalled()
    })

    it.for(['javascript:alert(1)', 'data:text/html,x'])(
      'throws for %s instead of loading it',
      (to) => {
        const location = stubWindowLocation()
        const { navigate } = useRouteOnShopPage()

        expect(() => navigate(to)).toThrow('Cannot navigate to a')
        expect(location.assign).not.toHaveBeenCalled()
        expect(mocks.visit).not.toHaveBeenCalled()
      },
    )

    it('replaces the history entry for a full page load with replace set', () => {
      const location = stubWindowLocation()
      const { navigate } = useRouteOnShopPage()

      navigate('https://other.example/x', { replace: true })

      expect(location.replace).toHaveBeenCalledWith('https://other.example/x')
      expect(location.assign).not.toHaveBeenCalled()
    })
  })
})
