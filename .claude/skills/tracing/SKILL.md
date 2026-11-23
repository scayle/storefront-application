---
name: tracing
description: Measure server-side latency in the Storefront Application V3 with OpenTelemetry traces in a local Jaeger. Use when a page, route, SSR render, Inertia prop, or Storefront API call is slow, when asked why a request takes so long, or before proposing any server-side performance fix.
---

# Tracing a slow request

Measure first. A trace names the span that costs the time, which turns "the product detail page is slow"
into "the `giftPromotion` prop spends 400ms in one Storefront API call". Guessing at a fix without a trace
is how the wrong thing gets optimized.

Full reference: [docs/observability.md](../../../docs/observability.md).

## Procedure

### 1. Start Jaeger

```sh
docker compose --profile tracing up -d
```

Confirm it answers before going further:

```sh
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:16686/
```

### 2. Configure the exporter

Ensure `.env` contains:

```sh
OTEL_SERVICE_NAME='storefront'
OTEL_EXPORTER_OTLP_ENDPOINT='http://localhost:4318'
OTEL_METRICS_EXPORTER=none
```

`OTEL_METRICS_EXPORTER=none` is the load-bearing one: Jaeger takes traces only and rejects metric exports.
The endpoint matches the SDK's own OTLP default, so traces arrive even when it is unset.

The SDK reads these once at startup. If you add them to a running dev server, restart it.

### 3. Reproduce the request

Start `pnpm dev`, then request the route twice. Read the second trace: the first request to any route in dev
also compiles that route's modules, which inflates the render spans.

### 4. Find the trace

```sh
SVC=storefront
MIN=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)   # GNU date: date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ
MAX=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s "http://localhost:16686/api/v3/trace-summaries?query.serviceName=$SVC&query.startTimeMin=$MIN&query.startTimeMax=$MAX" \
  | jq -r '.summaries[] | "\(.traceId)  \(.rootOperationName)  \(.spanCount) spans"'
```

Both time bounds are required. `/api/v3/services` lists reporting services if the name is in doubt.

### 5. Rank the spans by duration

```sh
TRACE_ID=<a traceId from step 4>

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

### 6. Map the slow span back to code

| Slow span                   | Where to look                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `inertia_resolve_prop`      | The prop callback named by `inertia.prop.name`, in the route's controller under `src/server/controllers/`.            |
| `GET` (client kind)         | The service or mapper issuing the `url.full` request, under `src/server/services/` or `src/server/services/mappers/`. |
| `vue_ssr_render`            | The page component, named by `inertia.component` on the parent `inertia_render` span, and the components it draws.    |
| `inertia_compose_html`      | Payload size. Check `inertia.html_bytes` and what the controller puts on the page props.                              |
| `valkey-GET` / `valkey-SET` | The cache service, and whether the route should be cached at all.                                                     |
| `dns.lookup`                | Outbound host resolution, which every new host pays on a cold cache.                                                  |

## Reading the numbers honestly

- Prop spans run concurrently, so their durations overlap. Elapsed time is the parent span's duration, not
  the sum of its children. A prop that takes 300ms inside a 2s render is not 15% of the problem if five
  other props ran alongside it.
- Dev traces show relative cost reliably and absolute latency poorly. For production-representative numbers,
  trace `pnpm build && pnpm preview` instead.
- One trace is an anecdote. Before concluding a route is slow, capture several and compare, since a cold
  cache, a cold DNS entry, or a cold module graph each skew a single run.

## Report the finding before fixing

State which span dominates, what its attributes say, and what that implicates, then propose the change.
A performance claim without a span duration behind it does not belong in the report.
