# Observability

The SCAYLE Resource Center covers [Errors and Logging](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/errors-and-logging) and [OpenTelemetry](https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/open-telemetry).

The Storefront Application V3 reports what a request did in two ways: structured logs and OpenTelemetry traces. The first section holds the rules for writing log lines. The second covers the local Jaeger setup, how to read a trace, and how to query traces from the terminal. Production export is configured through the standard OTel environment variables.

## Logging

Use `createLogger(namespace)` from `@scayle/storefront/shared` for all log calls. Pass a single object with a `message` field and any structured context fields. Never use `console.*` in runtime code. Keep messages static and put dynamic values in fields. Use `error` only when the user was affected; use `warn` for degraded paths that still completed; use `debug` for internal flow decisions.

### Getting started

Import `createLogger` and declare a module-level logger:

```ts
import { createLogger } from '@scayle/storefront/shared'

const log = createLogger('my-feature')
```

Use a **kebab-case** namespace that matches the feature or module name. Declare `log` at module level, not inside functions. All log output from this logger is prefixed `storefront:my-feature` in the structured output.

Every log call uses the **single-object form**:

```ts
log.warn({ message: 'Redirect cache write failed', key, err })
log.error({ message: 'Failed to fetch basket', err, phase: 'fetchBasket' })
```

Passing multiple arguments (e.g. `log.error('Failed', error)`) causes tslog to emit them under numeric keys `"0"`, `"1"`, etc., which breaks filtering in log aggregators.

### Log levels

Use the level that accurately reflects the operational impact. On-call alerting keys on `error`. If `error` is noisy, alerts become meaningless.

#### `debug`

Internal flow decisions: cache bypasses, conditional branches, state transitions. Filtered out when the minimum level is `info` (the default when `STOREFRONT_LOG_LEVEL` is unset) or higher.

```ts
log.debug({ message: 'Bypassing CMS cache in preview mode', slug, locale })
```

#### `info`

Notable **lifecycle** events only, not per-request and not per-operation. A server started. A module initialized.

```ts
log.info({ message: 'Server started', port })
```

#### `warn`

A request completed via a degraded or unexpected path. No immediate action required.

```ts
log.warn({ message: 'CMS content not found', slug, locale, url })
log.warn({ message: 'Redirect cache write failed', key })
```

#### `error`

An operation failed in a way that affected the user or indicates a broken system component. Always includes an `err: Error` field.

```ts
log.error({
  message: 'Failed to fetch basket',
  err: error instanceof Error ? error : new Error(String(error)),
  phase: 'fetchBasket',
})
```

**Warn vs error boundary:**

| Situation                                      | Level   |
| ---------------------------------------------- | ------- |
| User got a 404 because content was missing     | `warn`  |
| User got a 500 because an API call threw       | `error` |
| Cache write failed but request succeeded       | `warn`  |
| Token refresh failed and session was destroyed | `error` |
| Unauthorized access attempt                    | `warn`  |

### Message wording

- Sentence case, no trailing period, no colon inside the message
- Static string: dynamic data belongs in fields, not interpolated into the message
- Proper nouns keep their canonical casing: `Inertia`, `Contentful`, `Storyblok`, `oRPC`

| Level   | Pattern                                                         | Example                                                    |
| ------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `error` | `"Failed to <verb phrase>"`                                     | `"Failed to fetch basket"`                                 |
| `warn`  | `"<Noun> not found"` or `"<Noun> failed"` or `"<Noun> skipped"` | `"CMS content not found"`, `"Redirect cache write failed"` |
| `info`  | `"<Noun> <past participle>"`                                    | `"Server started"`                                         |
| `debug` | Present continuous describing the decision                      | `"Bypassing CMS cache in preview mode"`                    |

`Failed to <verb phrase>` also fits a `warn` when the operation failed but the request carried on, as in `Failed to log out`.

**Do not interpolate dynamic data into the message:**

```ts
// Wrong: prevents log aggregator grouping
log.warn({ message: `Locale '${locale}' is not configured in Contentful` })

// Correct
log.warn({ message: 'Contentful locale not configured', locale })
```

### Field conventions

#### Required on `error`

| Field | Notes                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| `err` | Always an `Error` object. Wrap non-Error catches: `error instanceof Error ? error : new Error(String(error))` |

The `err` field name is canonical. Never use `error`, `detail`, `reason`, or `cause` for the thrown Error object.

#### Standard optional fields

Use these names consistently. Do not invent alternatives.

| Field    | When to include                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `phase`  | camelCase operation name when one logger namespace covers multiple operations                                                                 |
| `reason` | Short human-readable explanation when the message alone is insufficient. For non-Error supplementary detail only, not a replacement for `err` |
| `url`    | Request URL when the failure is request-scoped                                                                                                |
| `locale` | Active locale, e.g. `'en-DE'`                                                                                                                 |
| `slug`   | CMS or routing slug                                                                                                                           |

Domain-specific fields (`categoryId`, `referenceKey`, `productId`, etc.) are welcome, so be consistent about their names within a domain.

#### What not to put in fields

- **Sensitive values**: handled automatically by the redact list. Never manually omit them. A field name that contains `token`, `secret`, `password`, `jwt`, `cookie`, `authorization` or `apikey` is masked whatever its value, so give a harmless field a name without those words. The list also masks the exact names `email`, `phone`, `firstName`, `lastName` and `street`. Log a derived fact such as `hasEmail` instead, and add names like `customerEmail` through `STOREFRONT_LOG_REDACT_KEYS`.
- **Redundant namespace data**: if `createLogger('basket')` is used, do not add `service: 'basket'`.
- **Stack traces**: tslog serializes `err` including the stack automatically.
- **Request or trace IDs**: `createLogger` adds `trace_id` and `span_id` to every JSON log line written during an active OpenTelemetry span. Do not propagate a `requestId` field manually.

### Console policy

Do not use `console.error`, `console.warn`, or `console.log` in runtime source files. Console output bypasses the structured JSON format expected by OTel collectors, automatic redaction, and log level filtering via `STOREFRONT_LOG_LEVEL`.

Build-time tooling (`storefront-build`) is exempt, because the runtime logger is not available at build time.

### Additional rules

**Do not log and rethrow at the same level.** If a caller will also log the error, log once at the boundary closest to the user. Duplicate entries obscure real error counts in dashboards.

**Do not log in hot paths.** Per-item loops, per-request middleware, and render functions should not emit `warn` or `error` unconditionally. Use `debug` at most.

**Log failures a service turns into a result value.** A service that maps an upstream failure to `{ success: false }`, `null` or an empty value logs the failure itself. The caller sees only the result value, so the upstream status code or kind is lost. Log them where the service maps the failure, and check first that no caller already logs the same event. Use `warn` for degraded outcomes and `debug` for expected ones such as a full wishlist. When a loop calls the service per item, log one summary line for the loop instead of one line per item.

**Rethrow without logging, unless the catch site knows more than the boundary.** In the codebase a `catch` block mostly either logs and handles the error or rethrows it. Log before rethrowing only when the catch site holds context the boundary does not have, such as the operation (`phase`) or an identifier, and put that context in the fields. Otherwise let the boundary log once.

```ts
} catch (error) {
  // The boundary sees only the thrown error, not which basket call failed.
  log.error({
    message: 'Failed to fetch basket',
    err: error instanceof Error ? error : new Error(String(error)),
    phase: 'fetchBasket',
  })
  throw error
}
```

## Tracing

Running a trace backend locally turns "this page feels slow" into a ranked list of spans, so you can see which Storefront API call, which Inertia prop, or which part of the Vue render actually costs the time.

### Local setup with Jaeger

[Jaeger](https://www.jaegertracing.io/) receives the traces and serves a UI for browsing them. It ships in
`docker-compose.yml` behind a `tracing` profile, so it starts only when you ask for it.

#### 1. Start Jaeger

```sh
docker compose --profile tracing up -d
```

This starts Redis and Jaeger together. Without the flag, `docker compose up -d` still starts Redis alone.

Jaeger stores traces in memory, so everything collected is discarded when the container stops. That is the
right trade for local work: no volume to manage, no stale traces from last week.

#### 2. Point the application at it

Set these values in your `.env`:

```sh
OTEL_SERVICE_NAME='storefront'
OTEL_EXPORTER_OTLP_ENDPOINT='http://localhost:4318'
OTEL_METRICS_EXPORTER=none
```

`OTEL_SERVICE_NAME` is the name you search for in the Jaeger UI, and `.env.example` already ships it.

`OTEL_METRICS_EXPORTER=none` is the one that matters. Jaeger receives traces only and answers `404` on
`/v1/metrics`, so the default setting ships a metric batch every interval that Jaeger rejects. The rejection
is silent at the SDK's default diagnostic level, so nothing in the dev server output tells you it happens.

`OTEL_EXPORTER_OTLP_ENDPOINT` is optional for this setup. The SDK's own OTLP default is already
`http://localhost:4318`, which is exactly where Jaeger listens, so traces arrive whether or not you set it.
Set it anyway: it states the intent, and it is what you change when the collector moves to another host.

The dev server reads `.env` into the process environment before the OpenTelemetry SDK starts, so `pnpm dev`
picks these up with no extra flags.

#### 3. Render a page

Start the dev server and request a page that does real work, such as a category or product detail page:

```sh
pnpm dev
```

Open <http://localhost:16686>, select `storefront` in the service dropdown, and click **Find
Traces**.

The first request for any route in dev also compiles that route's modules, which lands inside the render
spans and overstates them. Request the page a second time and read that trace instead.

### Reading a trace

A full SSR render produces this span tree:

```
GET /<route> [ssr]                     (entry span, from @opentelemetry/instrumentation-http)
└─ GET /<route> [ssr]                  (Hono request span, route-named)
   ├─ session_load                     (session cookie check and store read, before the page runs)
   │  └─ valkey-GET                    (only with a valid session cookie)
   │
   ├─ inertia_resolve_prop × N         (one per Inertia prop callback)
   │  ├─ GET                           (outbound Storefront API fetch)
   │  ├─ valkey-GET / valkey-SET       (cache reads and writes)
   │  └─ dns.lookup                    (hostname resolution)
   │
   ├─ inertia_render                   (Inertia render orchestration)
   │  └─ vue_ssr_render                (Vue renderToString)
   │
   ├─ inertia_compose_html             (template, head, and body splice)
   │
   └─ session_persist                  (session store write, after the page rendered)
      └─ valkey-SET / valkey-EXPIRE
```

The two request spans share a name because the Hono middleware copies the matched route onto the entry span,
which backends such as Datadog use to group requests by route. The Hono span ends when the handler chain
returns. The entry span ends once the response body is written to the socket, and on the way there the body
passes through response compression (`compress()` in `src/server/index.ts`). Time in the entry span after its
Hono child ends is that compression and the socket write. On a local production build it is about 1 to 2 ms
for a gzip-compressed page and under 0.5 ms for an uncompressed one, and it grows with the size of the
response.

Everything a prop callback touches is parented under that prop's span, so a slow cache read or a slow DNS
lookup is attributed to the prop that triggered it rather than floating at the top of the trace.

`session_load` appears on every page request, including routes with response caching and requests without a
valid session cookie. Its `valkey-GET` child needs a valid cookie on a route without response caching.
`session_persist` only appears when the session is written or already has stored data, and routes with response
caching skip it.

Every full page load and Inertia visit adds a `redirect_lookup` span before the render, where the redirect
middleware checks for a SCAYLE Panel redirect. Partial reloads skip the lookup. When a redirect is found, the
render spans are missing, because the page never renders.

```
GET /<route> [ssr]                  (Hono request span)
├─ session_load                     (as above)
├─ redirect_lookup                  (SCAYLE Panel redirect lookup)
│  ├─ valkey-GET                    (cached redirect, or cached "no redirect")
│  ├─ POST                          (Storefront API /v1/redirects, on a cache miss only)
│  └─ valkey-SET                    (caches the result, on a cache miss only)
├─ …                                (render spans as above, when there is no redirect)
│
└─ session_persist                  (as above, when the session is written)
```

On a warm cache only the `valkey-GET` runs. The Storefront API answers 404 when a path has no redirect, so the `POST`
shows error status in the common case. `scayle.storefront.redirect.found=false` on `redirect_lookup`, which carries
no error status, marks that as the normal "no redirect" answer. A failed lookup sets `redirect_lookup` to error
status with the error message as its description and the stack in `error.stack`, while the page still renders. A
Storefront API call that takes longer than one second is aborted and fails the lookup the same way, so the span lasts
about a second at most on a slow endpoint.

#### Which span answers which question

| The span                    | What a long duration here means                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `inertia_resolve_prop`      | One page prop is slow. The `inertia.prop.name` attribute names which one.                |
| `GET` (client kind)         | A Storefront API call is slow. The `url.full` attribute carries the full request.        |
| `vue_ssr_render`            | Rendering the component tree is slow, independent of data fetching.                      |
| `inertia_compose_html`      | Assembling the final HTML is slow, usually because the payload is large.                 |
| `session_load`              | Reading the session is slow. Every other span of the request waits for it.               |
| `session_persist`           | Writing the session back is slow, which delays the end of the response.                  |
| `valkey-GET` / `valkey-SET` | The cache or session round trip is slow.                                                 |
| `dns.lookup`                | Hostname resolution is slow, and every outbound host pays it on a cold cache.            |
| `redirect_lookup`           | The redirect check is slow. `scayle.storefront.redirect.cache` records if it was cached. |
| Entry span past Hono span   | Compressing or sending the response is slow. Gzip alone adds about 1 to 2 ms.            |

Prop spans run concurrently, so their durations overlap. A page with six props that each take 300ms has not
spent 1.8 seconds fetching: read the parent span's duration for elapsed time, and the child durations for
which prop to attack.

#### Notable attributes

- `inertia.prop.name` and `inertia.prop.kind` on `inertia_resolve_prop`: which prop resolved, and whether it
  was `eager`, `deferred`, `once`, or `server-only`.
- `inertia.component` on `inertia_render`: the page component that rendered.
- `vue.html_bytes` on `vue_ssr_render`: the size of the rendered HTML.
- `inertia.html_bytes` on `inertia_compose_html`: the size of the final response body.
- `scayle.storefront.session.store_hit` on `session_load`: whether the store had data for the session. A user with
  only a session id (an anonymous basket or wishlist) reads `false` on every request. Not set when the store was not
  read.
- `scayle.storefront.session.action` on `session_persist`: `save` when the request changed the session, `touch` when
  it only extended the expiry of a stored one.
- `url.full` on outbound `GET` spans: the Storefront API request behind a slow fetch, with credential
  query values shown as `REDACTED`.
- `http.route` on the request span: the matched route pattern, such as `/:country`.
- `http.request.body.size` and `http.response.body.size` on outbound spans: set when the request or response
  carries a `content-length` header, which surfaces unexpectedly large Storefront API payloads.
- `db.system.name` on `valkey-GET`, `valkey-SET`, and the other SCAYLE KV spans: `valkey`. They carry no
  `db.query.text`, because keys can hold identifiers such as session IDs.
- `scayle.storefront.redirect.cache`, `scayle.storefront.redirect.found`, and `scayle.storefront.redirect.status_code`
  on `redirect_lookup`: whether the cache answered (`hit` or `miss`, where a cached "no redirect" is a `hit`), whether
  a redirect was found, and the status code of that redirect as set in the SCAYLE Panel.

### Querying Jaeger from the terminal

Jaeger's query API answers on the same port as the UI, which makes traces greppable without leaving the
shell. Both time bounds are required on a search.

List the services that have reported traces:

```sh
curl -s http://localhost:16686/api/v3/services
```

List the span names recorded for the application:

```sh
curl -s 'http://localhost:16686/api/v3/operations?service=storefront'
```

Find recent traces and their ids:

```sh
SVC=storefront
MIN=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)   # GNU date: date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ
MAX=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s "http://localhost:16686/api/v3/trace-summaries?query.serviceName=$SVC&query.startTimeMin=$MIN&query.startTimeMax=$MAX" \
  | jq -r '.summaries[] | "\(.traceId)  \(.rootOperationName)  \(.spanCount) spans"'
```

Then rank the spans of one trace by duration, which is the single most useful view when hunting latency:

```sh
TRACE_ID=<a traceId from the previous command>

curl -s "http://localhost:16686/api/v3/traces/$TRACE_ID" | jq -r '
  [ .result.resourceSpans[].scopeSpans[].spans[]
    | { name: .name,
        ms: (((.endTimeUnixNano | tonumber) - (.startTimeUnixNano | tonumber)) / 1000000),
        detail: ((.attributes // [])
          | map(select(.key == "inertia.prop.name" or .key == "url.full" or .key == "db.query.text"))
          | map(.value.stringValue // "") | join(" ")) } ]
  | sort_by(-.ms) | .[:15][]
  | "\(.ms * 100 | round / 100)ms\t\(.name)\t\(.detail)"
'
```

The output names the slow work directly:

```
2032.31ms  GET /:country [ssr]
2031.48ms  GET /:country [ssr]
1685.3ms   inertia_render
339.2ms    inertia_resolve_prop   navigation
319.87ms   GET                    https://<your-shop>.storefront.api.scayle.cloud/v2/navigations/header?...
307.24ms   inertia_resolve_prop   campaign
```

The first two lines are the entry span and its Hono child. The difference between them is response
compression and the socket write.

### Tracing without Docker

Set the trace exporter to `console` to print spans straight to the dev server output. No collector runs, and
no UI is involved:

```sh
OTEL_TRACES_EXPORTER=console
```

This is enough to confirm that a span exists, fires at all, or carries the attributes you expect. It is a
poor fit for latency work: a single page render prints around 1,700 lines of span objects in no particular
order, and comparing durations across them by eye is exactly what a trace UI exists to avoid.

### Adding instrumentations for your own dependencies

Five instrumentations are registered: HTTP, undici, DNS, Node runtime metrics, and oRPC. The SCAYLE KV spans
come from `@scayle/unstorage-scayle-kv-driver` itself, not from an instrumentation. The set is an
explicit list rather than the `@opentelemetry/auto-instrumentations-node` metapackage, most of whose patchers
are irrelevant here and whose boot and per-module-load cost bought no signal in return. An explicit list also
fails loudly when a new patcher appears upstream instead of silently enabling it.

`initSDK` accepts additional instrumentations for dependencies of your own:

```ts
import { initSDK } from '@scayle/storefront-opentelemetry/sdk-init'
import { defaultPathFilter } from '@scayle/storefront-opentelemetry'
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk'

initSDK(defaultPathFilter, {
  additionalInstrumentations: [new AwsInstrumentation()],
})
```

The default instrumentations are always registered, and your additions are appended to them. An added instrumentation must
target the OpenTelemetry JS 3.x generation: `@opentelemetry/instrumentation` 0.300.x and `@opentelemetry/api`
1.10.x.

Adding this is a change to how the server starts, not a snippet you drop into an existing file.
`opentelemetryPlugin()` in `vite.config.ts` is what calls `initSDK` today, in both dev and the generated
production entry, and it forwards only `filterPath` and `additionalRedactedQueryParams`. `initSDK` is
guarded so the first call wins, so taking over the call means making yours run before the plugin's.

### Why `ssr.ts` wraps `renderToString` twice

`src/client/ssr.ts` never hands bare `renderToString` to `createInertiaApp`. Two wrappers sit around it, and
each one costs something different if it is removed:

```ts
// File: src/client/ssr.ts
const ssr = withModulePreloads(renderToString)

const { head, body } = await createInertiaApp({
  render: (app) => traceSsrRender(() => ssr.render(app)),
  // …
})

return {
  head,
  body,
  modules: [...ssr.renderedModules(), getLocaleModuleId(locale)],
}
```

`traceSsrRender`, from `@scayle/storefront-opentelemetry`, produces the `vue_ssr_render` span shown above and
records `vue.html_bytes`. Removing it drops the span, so Vue render time stops appearing as a discrete row in
your traces.

`withModulePreloads`, from `@scayle/storefront/shared`, collects the components the render drew and hands
them back as `modules`. The Storefront Application V3 turns those into `<link rel="modulepreload">` hints for
the page's own chunks. Removing it, or dropping `modules` from the returned object, silently costs the
browser a second round trip to discover the page component after the entry bundle evaluates. Nothing fails
and no test breaks. Pages just get slower.

The render records components only, so `ssr.ts` appends the active locale file to `modules` itself. The
browser entry cannot mount before that file's chunk has loaded, and `preloadModules` in `vite.config.ts`
keeps the file in the SSR manifest so it gets a hint as well. Dropping it from `modules` delays every mount
by the same round trip.

Keep both unless you intentionally want to give up what each provides.

### Troubleshooting

#### Issue: the service never appears in the Jaeger UI

**Possible causes**

- Jaeger is not running, because `docker compose up -d` was run without `--profile tracing`.
- The dev server started before the values were added to `.env`.
- `OTEL_EXPORTER_OTLP_ENDPOINT` points somewhere other than the local Jaeger.
- No page has been requested yet, or the batch has not flushed.

**Solution**

1. Confirm the container is up with `docker compose ps`, and that <http://localhost:16686> loads.
2. Restart the dev server. The SDK reads its configuration once at startup, so a `.env` edit does not reach
   an already-running process.
3. Request a page, wait a few seconds for the batch to flush, then reload the Jaeger UI.
4. Check `/api/v3/services` from the terminal before blaming the UI. An empty list means nothing arrived, and
   a list holding only `jaeger` means Jaeger is reporting its own traces and yours are not reaching it.

**Prevention**

Start Jaeger before the dev server, and keep the values in `.env` rather than passing them per command.

#### Issue: Jaeger fails to start with a port binding error

**Possible causes**

- Another collector, or an earlier Jaeger container, already holds port 4318 or 16686.

**Solution**

1. Read the error. Compose names the port it could not bind.
2. Find the holder with `lsof -i :4318` (or `:16686`) and stop it, or stop a stale container with
   `docker compose stop jaeger`.
3. Start the profile again.

**Prevention**

Stop Jaeger with `docker compose stop jaeger` when you finish tracing, rather than leaving it running between
sessions. Use that rather than `docker compose --profile tracing down`, which takes the Redis container down
with it and leaves your next dev session without sessions or caching.

#### Issue: traces are gone after restarting Jaeger

**Possible causes**

- Jaeger stores traces in memory by design, so a container restart discards them.

**Solution**

1. Reproduce the request against the running Jaeger instance and read the fresh trace.

**Prevention**

Capture what you need while the container is up. To keep a trace beyond the container's life, save the
`/api/v3/traces/<id>` response to a file.

#### Issue: the render spans look far slower than production

**Possible causes**

- The trace covers the first request to a route, which includes compiling that route's modules in dev.
- The dev server serves unbundled modules, so `vue_ssr_render` carries overhead a production build does not.

**Solution**

1. Request the same route a second time and read that trace instead.
2. For numbers that reflect production, run `pnpm build && pnpm preview` with the same environment variables
   set, and trace that process.

**Prevention**

Treat dev traces as a guide to relative cost, which span dominates and which prop is slow, rather than as
absolute latency measurements.
