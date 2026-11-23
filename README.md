<div align="center">
  <img src="https://cdn-prod.scayle.com/public/media/general/SCAYLE-Commerce-Engine-header.png" alt="SCAYLE Commerce Engine" />
</div>

<div align="center">
  <br />
  <h1>SCAYLE Storefront Application V3</h1>
</div>

<div align="center">
  <h4><a href="https://scayle.dev/storefront">SCAYLE Storefront</a> | <a href="https://scayle.dev">SCAYLE Documentation</a> | <a href="https://www.scayle.com/">SCAYLE Website</a> | <a href="https://www.figma.com/community/file/1704456348909703435/scayle-storefront-design-system">Design System on Figma</a> | <a href="https://github.com/scayle/storefront-application">GitHub</a></h4>
</div>

<div align="center">
  A boilerplate to kick-start your storefront on the SCAYLE Commerce Engine with Hono, Inertia.js, and Vue 3.
  <br />
  <br />
  <a href="https://scayle.dev/documentation/storefront/storefront-application-v3/introduction/what-is-storefront-v3"><strong>Explore the Documentation »</strong></a>
  <br />
</div>

<hr />

<div align="center">
  <br />
  <a href="https://hono.dev"><img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono" /></a> <a href="https://inertiajs.com"><img src="https://img.shields.io/badge/Inertia.js-9553E9?style=for-the-badge&logo=inertia&logoColor=white" alt="Inertia.js" /></a> <a href="https://vuejs.org/guide/introduction.html"><img src="https://img.shields.io/badge/vuejs-%2335495e.svg?style=for-the-badge&logo=vuedotjs&logoColor=%234FC08D" alt="Vue" /></a> <a href="https://vite.dev"><img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a> <a href="https://tailwindcss.com/docs/installation"><img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <br />
  <br />
</div>

The Storefront Application V3 is a boilerplate for a storefront on the SCAYLE Commerce Engine. A Hono
server renders pages with Inertia.js and Vue 3, and oRPC answers the mutations. You fork it and own
the code from there. See [Tech Stack](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/tech-stack) for the
details.

> **Design:** The look of the Storefront Application follows the official
> [SCAYLE Storefront Design System on Figma](https://www.figma.com/community/file/1704456348909703435/scayle-storefront-design-system). Use it as the design reference
> for colors, spacing, and components.

## Architecture in short

One Node.js process renders pages and answers API mutations. A request passes through the Hono
middleware to a controller. The controller uses services and mappers to get data from the Storefront
API, hands the props to Inertia, and Vue renders the HTML on the server.

| Directory     | What it holds                                                             |
| ------------- | ------------------------------------------------------------------------- |
| `src/server/` | Controllers, services, mappers, and the oRPC API for mutations            |
| `src/client/` | Pages, components, composables, and the design system                     |
| `src/shared/` | The types that cross between server and client, and the route definitions |

The client does not import from `src/server/`, except the oRPC API module `src/server/api/index.ts`.
The server does not import from `src/client/`, and `src/shared/` imports from neither. ESLint
enforces these rules. See
[Project Structure](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/project-structure) for where new code goes.

## Prerequisites

- Node.js 26, as set in `engines` and `.nvmrc`.
- pnpm 12.23 or later. The `packageManager` field names the exact version.
- Docker, to run Redis for sessions and caching.
- [mkcert](https://github.com/FiloSottile/mkcert), to create a certificate for local HTTPS.
- Your tenant space and an Admin API token from the SCAYLE Panel, for the setup command.

## Quick start

1. Install the dependencies.

   ```bash
   pnpm install
   ```

2. Start Redis. `.env.example` already sets `STOREFRONT_KV_DISABLE_CLUSTER_MODE=true`, which a single
   Redis instance needs.

   ```bash
   docker compose up -d redis
   ```

3. Point the project at your shop. The Storefront CLI creates `.env` from `.env.example`, writes the
   countries of your shop to `storefront.config.ts`, adds a translation file for each country
   language, and asks for the values it cannot fetch: the Storefront API key, the OAuth client
   credentials, and a session secret it can generate for you. It writes placeholders for the checkout
   credentials of each country, which you replace with the values from your Account Manager. It asks for your tenant space and
   Admin API token if you do not pass them. See [Storefront CLI](https://scayle.dev/documentation/storefront/storefront-application-v3/development/storefront-cli)
   for the options.

   ```bash
   pnpx @scayle/storefront-cli setup
   ```

   `npx @scayle/storefront-cli setup` runs the same command. Without an Admin API token, copy
   `.env.example` to `.env` and fill in the values yourself. The
   [setup guide](https://scayle.dev/documentation/storefront/storefront-application-v3/getting-started/set-up-your-storefront) lists the minimum.

4. Create a certificate for local HTTPS, see the next section.

5. Start the development server and open <https://localhost:3000>.

   ```bash
   pnpm dev
   ```

### Local HTTPS

The development server runs over HTTPS only. Browser features the storefront uses, such as Web
Crypto, need a secure context, and the scheme of the dev server carries into the absolute URLs the
server emits. The server stops at startup when it finds no certificate, unless the `CI` environment
variable is set.

```bash
# macOS. For other systems see https://github.com/FiloSottile/mkcert#installation
brew install mkcert nss

# One time: registers the mkcert certificate authority with your system and browsers
mkcert -install

# From the project root
mkdir -p certs
mkcert -cert-file certs/localhost.crt -key-file certs/localhost.key localhost 127.0.0.1 ::1
```

The server reads `certs/localhost.crt` and `certs/localhost.key` from the project root. To use
other files, set `HTTPS_CERT` and `HTTPS_KEY` in `.env`. Both file types are in `.gitignore`.

- With the country selector `domain`, the certificate has to cover every country domain. Add the
  hosts to the `mkcert` command, for example `de.localhost`.
- Node.js ignores the system certificate store by default. If requests that the dev server sends
  itself fail with `unable to verify the first certificate`, start it with `NODE_USE_SYSTEM_CA=1 pnpm dev`.
  Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`, which turns off certificate checks for every
  outgoing request.

## Scripts

| Command                          | What it does                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`                       | Starts the development server with hot reload                                     |
| `pnpm build`                     | Builds the server and the client into `.output/`                                  |
| `ANALYZE_BUNDLE=true pnpm build` | Builds and writes bundle reports to `.output/`                                    |
| `pnpm start`                     | Runs the built server. It does not read `.env`, so set the variables in the shell |
| `pnpm preview`                   | Runs the built server with the variables of `.env`                                |
| `pnpm lint`, `pnpm lint:fix`     | Runs ESLint, with and without fixes                                               |
| `pnpm format`, `pnpm format:fix` | Checks or writes the Prettier formatting                                          |
| `pnpm typecheck`                 | Type-checks the application and each CMS provider                                 |
| `pnpm test`, `pnpm test:ci`      | Runs the unit tests, with and without coverage and a JUnit report                 |
| `pnpm storybook`                 | Starts Storybook on port 6006                                                     |
| `pnpm cms:sync`                  | Exports the content model of your CMS and generates its types, see below          |

`pnpm cms:sync` needs `CMS_PROVIDER` set to `storyblok`, `contentful`, `contentstack`, or
`amplience`, and the credentials of that provider. It only reads from your CMS. The Amplience hub has a `pnpm cms:import` counterpart that writes to the hub and replaces
content type settings, so read [Amplience](./docs/cms/AMPLIENCE.md) before you run it.

The end-to-end tests have their own setup, see [Set up the Playwright suite for your shop](./testing/playwright/SETUP.md).

## Docker and deployment

The `Dockerfile` builds a production image that contains the build output and the production
dependencies. The CMS provider, the build ID, and the `X-Powered-By` header setting are fixed at build time. The
rest of the configuration is read at runtime.
See [Deployment](https://scayle.dev/documentation/storefront/storefront-application-v3/deployment) for how to host
the Storefront Application.

## More documentation

In this repository:

- [Documentation index](./docs/README.md) for the developer guides next to the code.
- [Glossary](./docs/GLOSSARY.md) for the terms used in code, comments, and docs.
- [Observability](./docs/observability.md) for local tracing with Jaeger and reading a trace.
- [Testing Guidelines](./docs/testing-guidelines.md) for what to test and how.

For design:

- [SCAYLE Storefront Design System on Figma](https://www.figma.com/community/file/1704456348909703435/scayle-storefront-design-system) for the official colors, spacing, and
  components the design tokens and UI components are based on.

In the SCAYLE Resource Center:

- [Storefront DevTools](https://scayle.dev/documentation/storefront/storefront-application-v3/development/devtools) for the development-only dock
  with panels for Inertia visits, oRPC calls, and the storefront context.
- [Environment Variables](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/environment-variables) for every
  variable the application reads.
- [OpenTelemetry](https://scayle.dev/documentation/storefront/storefront-application-v3/features/platform/open-telemetry) for the trace export.
- [Pages and Controllers](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/page-rendering) for how a page gets its props.
- [Session and Authentication](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/session) for sign-in and the session lifecycle.
- [Caching](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/caching) for response and data caching.
- [Errors and Logging](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/errors-and-logging) for error pages and log output.
- [Theming](https://scayle.dev/documentation/storefront/storefront-application-v3/getting-started/theming) for changing colors, fonts, and spacing.
- [Testing](https://scayle.dev/documentation/storefront/storefront-application-v3/testing) for unit, end-to-end, and accessibility tests.

## Support and feedback

Use [GitHub Discussions](https://github.com/scayle/storefront-application/discussions) for questions, bug reports, ideas, and any other feedback. The SCAYLE Storefront Core team reads and answers them. This repository does not use Issues, and it does not accept pull requests for now.

Discussions are public. Do not post credentials, API tokens, or customer data.

Everyone taking part follows the [Code of Conduct](./CODE_OF_CONDUCT.md). To report a violation, use GitHub's "Report content" on the post, or open a Discussion and ask the team for help.

## License

The Storefront Application V3 is released under the [BSD 3-Clause License](./LICENSE.md). Copyright (c) 2026, SCAYLE GmbH.

The source lives at [github.com/scayle/storefront-application](https://github.com/scayle/storefront-application).

The license does not grant rights to the SCAYLE name, logo or other trademarks. If you fork the Storefront Application, replace `public/logo.svg` with your own logo. Also replace the Support and feedback section, `CODE_OF_CONDUCT.md`, and `.github/DISCUSSION_TEMPLATE/` with your own, because they point to SCAYLE's repository and team.
