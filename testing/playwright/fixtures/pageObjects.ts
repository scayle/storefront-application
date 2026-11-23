import type { Page } from '@playwright/test'
import { HomePage } from '../page-objects/homePage'
import { MainNavigation } from '../page-objects/components/mainNavigation'
import { ProductListingPage } from '../page-objects/productListingPage'
import { ProductDetailPage } from '../page-objects/productDetailPage'
import { Header } from '../page-objects/components/header'
import { SignInPage } from '../page-objects/signinPage'
import { AccountPage } from '../page-objects/accountPage'
import { ToastMessage } from '../page-objects/components/toastMessage'
import { AddToBasketSlideIn } from '../page-objects/components/addToBasketSlideIn'
import { Breadcrumb } from '../page-objects/components/breadcrumb'
import { Pagination } from '../page-objects/components/pagination'
import { Filters } from '../page-objects/components/filters'
import { Search } from '../page-objects/components/search'
import { MobileNavigation } from '../page-objects/components/mobileNavigation'
import { Footer } from '../page-objects/components/footer'
import { OrdersPage } from '../page-objects/ordersPage'
import { Promotions } from '../page-objects/components/promotions'
import { CheckoutPage } from '../page-objects/checkoutPage'
import { CountryDetector } from '../page-objects/components/countryDetector'
import { ShopSelector } from '../page-objects/components/shopSelector'
import { Sorting } from '../page-objects/components/sorting'
import { FreeProductList } from '../page-objects/components/freeProductList'
import { FreeProductModal } from '../page-objects/components/freeProductModal'
import { OrderSuccessPage } from '../page-objects/orderSuccessPage'
import { SkipLinks } from '../page-objects/components/skipLinks'
import { ErrorPage } from '../page-objects/errorPage'
import { ExpressCheckout } from '../page-objects/components/expressCheckout'

/**
 * Page objects whose only dependency is `page`. Registering one here makes it a fixture of the
 * same name, and `PageObjectFixtures` picks up its type. Page objects with other dependencies,
 * such as `basketPage`, are written as explicit fixtures in `fixtures.ts`.
 */
const pageObjectMap = {
  homePage: HomePage,
  mainNavigation: MainNavigation,
  productListingPage: ProductListingPage,
  productDetailPage: ProductDetailPage,
  header: Header,
  signinPage: SignInPage,
  accountPage: AccountPage,
  toastMessage: ToastMessage,
  addToBasketSlideIn: AddToBasketSlideIn,
  breadcrumb: Breadcrumb,
  pagination: Pagination,
  filters: Filters,
  search: Search,
  mobileNavigation: MobileNavigation,
  footer: Footer,
  ordersPage: OrdersPage,
  promotions: Promotions,
  checkoutPage: CheckoutPage,
  countryDetector: CountryDetector,
  shopSelector: ShopSelector,
  sorting: Sorting,
  freeProductList: FreeProductList,
  freeProductModal: FreeProductModal,
  orderSuccessPage: OrderSuccessPage,
  skipLinks: SkipLinks,
  errorPage: ErrorPage,
  expressCheckout: ExpressCheckout,
}

/** The fixture types generated from `pageObjectMap`: each name maps to its page object's instance type. */
export type PageObjectFixtures = {
  [K in keyof typeof pageObjectMap]: InstanceType<(typeof pageObjectMap)[K]>
}

// Per-key fixture type derived from `pageObjectMap`, so the generated object
// keeps its precise shape (which `Object.fromEntries` would otherwise widen to
// a string index signature) and `test.extend` still verifies it at compile time.
type GeneratedFixtures = {
  [K in keyof PageObjectFixtures]: (
    args: { page: Page },
    use: (value: PageObjectFixtures[K]) => Promise<void>,
  ) => Promise<void>
}

// The `as` cast is not checked against the entries. Keep building each fixture from the
// `PageObject` bound to `name`. Don't hardcode a class or reorder name and class, or a key
// could get the wrong instance type with no compile error.
export const generatedPageObjectFixtures = Object.fromEntries(
  Object.entries(pageObjectMap).map(([name, PageObject]) => [
    name,
    async (
      { page }: { page: Page },
      use: (value: InstanceType<typeof PageObject>) => Promise<void>,
    ) => {
      await use(new PageObject(page))
    },
  ]),
) as GeneratedFixtures
