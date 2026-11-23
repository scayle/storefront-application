import { sha256 } from '@scayle/storefront'
import { CustomerMapper } from '@scayle/storefront/mappers'
import type { Customer, ShopCustomer } from '@scayle/storefront/types'

/**
 * Maps SCAYLE Customer Account API customers to the application `Customer` type.
 *
 * Extends the tenant-invariant base {@link CustomerMapper} and layers the
 * analytics hash (`idHash`), reusing the base mapping via
 * `super.mapCustomer()`. Order summaries are mapped by the registry `order`
 * mapper instead, which `OrderService` resolves directly.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class CustomerMapperService extends CustomerMapper {
  public override mapCustomer(customer: ShopCustomer): Customer {
    return {
      ...super.mapCustomer(customer),
      idHash: sha256(customer.id.toString()),
    }
  }
}
