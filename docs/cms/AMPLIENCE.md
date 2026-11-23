# Amplience

Setup, environment variables, draft preview, and the Content-Security-Policy are in the
[Amplience provider documentation](https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/amplience). This guide holds what the code and the scripts do not say:
how to extend the content model, what a hub import replaces, and how to bootstrap a hub.

## Add a content type

The content model lives in `.scayle/cms/contentModel/amplience/` and is the source of truth for both
the hub and the generated types. Adding a content type means three files: the schema body, the
pointer, and the content-type registration. A block also has to be listed in the `items.oneOf` union
and the `ui:component.params.icons` map of every parent that may contain it (`page-component`,
`section-component`, `grid-component`, `slider-component`, and `accordion-item-component`, plus
`product-listing-page-component` for the blocks it allows). A block missing from a parent is a block
the editor cannot place, and nothing checks for it.

The page, section, grid, and slider schemas reference the accordion and the leaf blocks directly.
Only the accordion references the accordion item, and none of the containers references another
container. A schema that references a container which references it back fails the hub import with a
cyclic reference error, so keep a new block on one side of that structure.

If the editor shows a block with no title, the content type's `settings.label` is missing, or the
union wrapper lost its `title`.

## Import into an existing hub

`pnpm cms:import` pushes the local content model to the hub and replaces what is there. The script
imports the schema bodies first and the content types second, because a content type references a
schema URI that has to exist. Import all schemas in one call, since `dc-cli` resolves references
between them within a single import.

- `dc-cli content-type import` replaces a content type's `settings` and `repositories` with the
  committed file. Visualization entries added in the Dynamic Content UI are deleted, and a type
  committed with `[]` as `repositories` is unassigned from every repository on the hub.
- `dc-cli content-type-schema import` writes each schema body, and Amplience inlines child schemas
  into the `items.oneOf` of every parent that can hold them. Adding one block therefore rewrites the
  parents as well, even though they were not the subject of the change.

Before importing, diff the committed `content-types/*.json` against the hub, either by running
`pnpm cms:sync` on a clean tree and reading `git diff`, or by reading the types in Settings > Content
Types. To add a single type without touching the rest, point `dc-cli content-type import` at a
directory holding only that one file.

## Bootstrap a hub

1. **Create the hub.** In Dynamic Content, create a hub with Content Delivery 2 enabled, and create
   the content repositories the content types expect. The shipped model lists `content` and
   `contentde`. Adjust the `repositories` array in each `content-types/*.json` when the hub uses
   different names.
2. **Provision a staging environment.** A Virtual Staging Environment is created in the Amplience
   Account app and requires organization admin rights. It belongs to exactly one hub and cannot be
   shared, so each hub needs its own. Requesting
   `https://{vse-domain}/content/key/{locale}/{slug}` is a quick check: `200` works, `403` means the
   requesting IP is not allowed, `404` means the delivery key is wrong.

   The staging domain of an existing hub is readable over the management API, so finding it does not
   need Account app admin rights:

   ```bash
   curl -H "Authorization: Bearer $AMPLIENCE_CMS_PERSONAL_ACCESS_TOKEN" \
     "https://api.amplience.net/v2/content/hubs/$AMPLIENCE_CMS_HUB_ID"
   ```

   The `hostname` field in the response holds the staging domain.

3. **Push the content model** as described above, and check in Dynamic Content that Settings >
   Content Types lists every type as `ACTIVE`. Open Sync with schema on a container type (Page,
   Section, Grid) to confirm the schema graph resolves.

No content items ship with the Storefront Application V3, for any CMS provider. After the import you
create your own, with the delivery keys, visualizations, and publishing described in the online
documentation.

## Troubleshooting

### Delivery requests fail with a DNS error

`AMPLIENCE_CMS_HUB_NAME` has to hold the hub name that Amplience uses as the delivery subdomain, not
the hub label shown in Dynamic Content. A label like `Scayle Boilerplate` resolves to no host, and
the error names DNS, not the hub.
