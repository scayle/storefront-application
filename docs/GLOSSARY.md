# Glossary

Terms from across the SCAYLE Commerce Engine, its APIs, and the surrounding platform, scoped to
what's relevant when building a storefront. Storefront Application V3 concepts (controllers,
mappers, Inertia props) live in their own docs, not here.

## Shops, products, and customers

**Assortment**: The subset of products from SCAYLE's central catalog that a shop or shop country
actually sells. A shop configures its assortment by including or excluding products through rules
based on product attributes.

**Attribute Group**: A named set of attribute values attached to a product, such as `brand` or
`color`. Attribute groups drive filtering, product data quality, and translated product
information.

**Basket**: The set of items a customer has selected to buy, held until they check out.

**Brand**: An attribute group created during data import that groups products by brand, often used
for brand landing pages or brand-specific merchandising.

**Category**: A node in a shop's category tree, with a name, slug, and parent-child position, used
to organize the storefront's browsing structure. The Storefront API exposes categories directly as
a resource.

**Configurable Product**: A product built from a main item plus one or more sub-items a customer
can swap, like eyeglasses sold with interchangeable frames and lenses.

**Composite Product**: A bundle of other products sold together as a single sellable item, such as
a bikini set. The bundle itself isn't a real product. Its variants are what customers actually buy.

**Custom Data**: Freeform JSON you attach to entities like a brand, shop, or price campaign, useful
for SEO fields or other content that doesn't fit SCAYLE's built-in schema.

**Customer**: An account holder with contact data, addresses, and order history. Distinct from a
user, an anonymous visitor who hasn't signed in or registered.

**Customer Segment**: A group of customers defined by rules SCAYLE evaluates in real time, for
example anyone who's placed more than five orders. Segments feed into promotion and checkout rule
conditions.

**Entities**: The top-level structures a shop's product data is organized into, set up once during
integration alongside the attribute groups that belong to each one.

**Filters**: The controls a shop exposes for narrowing a product list on Product Listing Pages and
Search Results Pages. SCAYLE supports attribute filters, such as size and color; range filters,
such as price and reduction; and boolean filters, such as sale and campaign.

**Guest Customer**: A customer account created for a single checkout without registration. SCAYLE
tracks this with an `isGuestCustomer` flag, separate from whether the account is active.

**Merchant**: The seller a customer buys from within a shop. A merchant's configuration
determines which products, prices, stock, and fulfillment options apply.

**Navigation**: A shop's menu structure, made up of nested items that link to categories, external
URLs, or pages.

**Pages**: Shop-level content entries with a slug, title, and SEO text, used for things like an
imprint or a privacy policy page.

**Personalized Products**: Products a customer can customize before buying, such as adding a
name or a short message to a gift.

**Product Without Stock**: A digital product or service, like a gift card or a warranty, that has
no physical inventory to track. It's never out of stock, unlike a physical product that can sell
out.

**Product Detail Page (PDP)**: The page showing a single product's information, variants, and
add-to-basket action.

**Product Listing Page (PLP)**: The page showing a filterable, sortable set of products, typically
for a category or search result.

**Recommendations**: Product suggestions surfaced to a customer, based on similarity or context,
meant to help with discovery and drive conversion.

**Redirect**: A URL redirect rule configured per shop or shop country, synced to the Storefront
API so a storefront can look it up at request time.

**Search**: A shop's product search, which first tries to resolve a query to a specific category
with its filters, then falls back to a general product search across the assortment.

**Shop**: A single storefront instance in SCAYLE, made up of one or more shop countries and
sharing a category tree across them.

**Shop Category**: The customer-facing category structure a shop presents for browsing and
filtering.

**Shop Configuration**: The country-specific settings the Storefront API exposes for a shop, such
as its identifier, name, locale, and any custom data attached to it.

**Shop Country**: One country-and-language combination within a shop, such as Switzerland in
French versus Switzerland in German. Each shop country can have its own assortment and its own
active subset of the shop's categories.

**Sorting**: Product ordering options, such as price or newest first, applied through the API's
sorting parameters.

**Variant**: A specific sellable version of a product, distinguished by attributes like size or
color, with its own price and stock level.

**Wishlist**: A customer's saved list of products for later, separate from their basket.

## Checkout

**Address Validation & Pre-filling**: Checkout logic that validates and can auto-complete a
customer's shipping or billing address, optionally through a third-party address provider.

**Checkout**: SCAYLE's payment and transaction infrastructure, covering the interface and backend
logic for taking a customer from basket to confirmed order.

**Dynamic Slot**: A placeholder inside the Checkout web component where a shop injects its own
markup, letting the surrounding page control how checkout looks without forking the component
itself.

**Express Checkout**: A shortened checkout flow that validates a shop's configuration up front and
takes a customer to payment faster than the standard multi-step flow.

**Gift Card**: A payment method that reduces a customer's order total by its remaining balance
once attached to the checkout.

**Headless Checkout**: A checkout integration where the shop's own frontend calls SCAYLE's
checkout APIs directly and builds its own UI, as opposed to embedding SCAYLE's hosted component.

**Loyalty Program**: A third-party integration that lets a customer earn or redeem loyalty points
during checkout, connected through SCAYLE's checkout APIs.

**Minimum Order Value (MOV)**: A spend threshold used as a condition in the rule engine, for
example hiding a payment method until the basket reaches a set amount.

**Newsletter Subscription**: A checkout step that lets a customer opt into marketing emails and
lets the storefront read or update that subscription status.

**One Page Checkout**: A checkout flow that puts delivery, payment, and order review on a single
page instead of separate steps.

**Order Confirmation**: The checkout step that starts the payment flow once all required checkout
data has been collected.

**Risk Assessment**: A checkout integration with an external fraud-check provider that scores an
order and can block confirmation or disable a payment method based on that score.

**Rule Engine**: A configuration layer that turns checkout elements on or off based on context,
like hiding a payment method below a minimum basket value or restricting delivery options for
oversized items.

**Standard Checkout**: SCAYLE's pre-built, hosted checkout experience, embedded as a web component
rather than assembled from individual APIs.

**State Management** (checkout): The shared response shape returned by checkout endpoints,
carrying the current order's addresses, payment and shipping choices, and other order data as it
changes.

**Zero-Value Checkout**: An order that reaches a total of zero once vouchers, promotions, or
loyalty points cover the full basket, service costs, and shipping.

## Payment

**Manual Capture**: A payment capture mode where a merchant triggers the capture themselves,
instead of it happening automatically or after a delay.

**Payment Configuration**: The set of payment methods a shop enables, including which ones are
available in which shop country.

## Pricing and promotions

**Campaign**: A time-limited, storefront-wide discount applied to all or selected products,
visible directly on listing and detail pages rather than requiring a code.

**Promotion**: The umbrella term for a shop-level discount mechanism, configured with its own
eligibility rules and applied automatically or through a code at checkout.

**Promotion Code**: A code a customer enters at checkout to apply a promotion.

**Promotion Effects**: The discount mechanisms a promotion can apply to a basket item, such as an
Automatic Discount, Buy X Get Y, or Combo Deal.

### Promotion types

**Audiences**: Narrow, targeted customer segments used to scope which customers a promotion
applies to.

**Automatic Discount**: A promotion type applied to basket items either automatically or through a
promotion code at checkout.

**Buy X Get Y**: A promotion that adds a discount automatically once a customer buys a qualifying
product or set of products.

**Combo Deal**: A promotion that sells a fixed set of items together at one bundled price.

**Item Set**: A predefined group of products a promotion targets as a unit, rather than each
product individually.

**Tiered Discount**: A promotion where the discount amount increases in steps as a customer's
order value crosses set thresholds.

**Voucher**: A discount a customer enters manually during checkout, valid for one voucher per
order and scoped to the shop country where it was issued.

## Orders

**Order**: A completed purchase, recorded with the customer's details, payment data, items, and
fulfillment instructions.

**Order Cancellation**: The process where a merchant is notified, via webhook, to cancel specific
order items, scoped to the warehouse handling that item.

**Order Delegation**: The handoff of a confirmed order from SCAYLE Checkout to the merchant
responsible for fulfilling it.

**Order Lifecycle & States**: The sequence of states an order moves through, driven by business
rules, customer actions, and fulfillment events.

**Transactional Mail**: An automated email tied to a specific checkout or order event, such as
order confirmation or cancellation, configurable per template and locale.

## Logistics and fulfillment

**Carrier**: A delivery service that ships a shop's orders, either across multiple countries or
scoped to a specific one.

**Collection Point**: A pickup location, such as a parcel shop, that a customer can choose instead
of home delivery.

**Delivery Estimation**: The expected delivery timeframe a storefront shows a customer during
checkout.

**Delivery Options**: The fulfillment methods a shop offers at checkout: home delivery, collection
point, or store pickup.

**Service Costs**: Custom logic a shop can apply to determine shipping or payment fees beyond
SCAYLE Panel's standard configuration.

**Track & Trace**: The feature that lets a customer follow their order's delivery status once
payment is confirmed.

**Warehouse**: A logical stock location in SCAYLE that holds inventory for specific product
variants. It can represent a real warehouse, a fulfillment partner, or a regional shipping hub.

## Internationalization

**Countries**: The list of countries a shop supports, configured in the SCAYLE Panel independently
of the languages those countries are offered in.

**Currencies**: The ISO 4217 currency code each shop country prices in. A storefront processes
payments only in that shop country's designated currency.

**Locale**: A language and territory pair, like `de_DE`, that determines which translations
SCAYLE serves and how it formats currency and dates.

## Architecture and integration

**Admin API**: The backend REST API for managing catalog, pricing, stock, and other operational
data. A customer-facing storefront should read product data through the Storefront API instead.

**Bulk Request**: An Admin API feature for submitting large or slow operations asynchronously,
composed incrementally instead of sent as one request.

**Checkout API**: The API behind SCAYLE's checkout system, documented as an OpenAPI specification
covering the request and response shapes for integrating checkout directly.

**Customer Account API**: Handles an authenticated customer's own account data: personal details,
addresses, and order history, for a self-service account area.

**Extension & Customization**: SCAYLE's general approach to letting a storefront extend or
override platform behavior, since it's a headless, API-driven system rather than a fixed frontend.

**SCAYLE Analytics**: SCAYLE's own behavioral event pipeline. The Storefront Application captures
events such as `view_page` and `add_to_basket` in the browser and forwards them through its own
route to the Storefront API, which ingests them at `POST /v1/analytics/events`. Separate from the
GA4 / Google Tag Manager tracking, which pushes its own event vocabulary to `window.dataLayer` and
knows nothing about this pipeline.

**SCAYLE Commerce Engine**: The core commerce platform behind a storefront: catalog, pricing, and
order management.

**SCAYLE Panel**: The administrative interface where a shop configures products, categories,
navigation, and promotions.

**Storefront API**: The REST API a customer-facing application uses to read product data and
manage a customer's basket, wishlist, and session against the SCAYLE Commerce Engine.

**Storefront Hosting**: SCAYLE's managed platform for running a storefront application, handling
provisioning, scaling, and deployment on AWS infrastructure through the SCAYLE Panel.

## Security

**Account Linking**: Letting a customer attach more than one login method, such as a password and
an SSO provider, to a single account.

**Anonymization**: Removing or masking a customer's personal data on request, triggered from the
SCAYLE Panel or the Admin API to meet GDPR requirements.

**Authentication API**: Manages customer identity for a storefront: registration, login, password
resets, email verification, and single sign-on with external identity providers.

**Bulk Access Revocation**: A shop-initiated process that force-logs-out and resets credentials
for many customers at once, used when a set of accounts may be compromised.

**DDoS & Bot Protection**: Traffic filtering at the network edge that detects and diverts
malicious or automated traffic before it reaches SCAYLE's services.

**Email Verification**: The step that confirms a customer's email address is valid before their
account is fully active.

**OnBehalf Token**: A token that lets a trusted application, like a point-of-sale system, act as a
specific customer without losing that customer's order history or loyalty status.

**Shared Responsibility Model**: The division of security and operational duties between SCAYLE
and the shop operating on it.

**Single Sign-On (SSO)**: An OAuth 2.0 flow that lets a customer sign in through an external
identity provider, such as Google or Microsoft, instead of a SCAYLE-specific login.

**Token Management**: The authentication API endpoints for validating, refreshing, and revoking a
customer's access and refresh tokens.
