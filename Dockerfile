# SCAYLE Storefront Application V3 Dockerfile for Node runtime
#
# Build from this directory, which has its own lockfile and pnpm workspace:
#
#   docker build -t storefront-v3 .
#
# The build context is filtered by `.dockerignore` in this directory.

# Build
FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS build

WORKDIR /app

# Copy only what dependency resolution needs, so the downloaded package
# store survives source-only edits as a cached layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install pnpm pinned to `packageManager` in package.json (single source of
# truth, bump pnpm there, not here). npm installs it because Node
# no longer ships corepack since Node 25.
RUN PNPM_VERSION="$(node -p "require('./package.json').packageManager.replace(/^pnpm@/, '')")" \
    && test -n "${PNPM_VERSION}" \
    && echo "Installing pnpm@${PNPM_VERSION}" \
    && npm install -g "pnpm@${PNPM_VERSION}"

# Download all packages into the pnpm store from the lockfile alone.
RUN pnpm fetch

COPY . .

# Install the dependencies offline from the fetched store.
RUN pnpm install --offline --frozen-lockfile

# Selects the CMS integration compiled into the build. Exactly one provider
# ships per image: scayle (default), storyblok, contentful, contentstack,
# or amplience.
ARG CMS_PROVIDER=scayle
ENV CMS_PROVIDER=${CMS_PROVIDER}

# Values compiled into the build (a runtime `docker run -e` has no effect on
# them). `SCAYLE_BUILD_ID` namespaces client assets (`assets/<id>/`) and the
# server-side cache keys, so a new deployment never reads a previous build's
# cache entries; unset, both fall back to un-namespaced variants.
ARG SCAYLE_BUILD_ID=
ENV SCAYLE_BUILD_ID=${SCAYLE_BUILD_ID}
ARG DISABLE_POWERED_BY_HEADER=
ENV DISABLE_POWERED_BY_HEADER=${DISABLE_POWERED_BY_HEADER}

# Build the application (SSR + client into `.output/`).
RUN pnpm build

# Produce the production node_modules for the runtime stage. The SSR bundle
# resolves a few packages from disk at boot (the OpenTelemetry loader hooks
# and `ssr.external` packages), so `.output/` alone is not enough.
# `hoisted` avoids symlinks that would not survive the COPY into the
# runtime stage.
RUN pnpm --filter "./" deploy --prod \
    --config.node-linker=hoisted /runtime

# Run
FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797

WORKDIR /app

ENV NODE_ENV=production

# The compiled-in CMS provider is otherwise invisible from outside the image.
ARG CMS_PROVIDER=scayle
LABEL com.scayle.core.storefront.cms-provider=${CMS_PROVIDER}

# The server reads this from `process.env` at startup, so it is set in this
# stage rather than the build stage. The build argument only sets the image's
# default; `docker run -e STOREFRONT_CACHE_COMPRESSION=...` overrides it.
ARG STOREFRONT_CACHE_COMPRESSION=
ENV STOREFRONT_CACHE_COMPRESSION=${STOREFRONT_CACHE_COMPRESSION}

# The runtime needs only the build output and production node_modules.
# Copied without --chown: the files stay root-owned (world-readable), so the
# non-root runtime user cannot modify the application code.
COPY --from=build /runtime/node_modules /app/node_modules
COPY --from=build /app/.output /app/.output

# Run as non-root user to prevent container escape vulnerabilities (DS-0002).
# The 'node' user is provided by the base node:*-alpine image.
USER node

EXPOSE 3000

CMD ["node", "./.output/server/index.mjs"]
