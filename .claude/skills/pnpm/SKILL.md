# pnpm

pnpm is the package manager for Storefront Application V3. Always use `pnpm` and `pnpm exec` to run scripts and commands—never `npm`, `npx`, `yarn`, or `pnpx`.

## Day-to-day commands

```bash
pnpm install                    # Install dependencies
pnpm add <package>              # Add a new package
pnpm add -D <package>           # Add a dev dependency
pnpm add -W <package>           # Add to root (rarely needed)
pnpm remove <package>           # Remove a package
pnpm exec <command>             # Run a command from node_modules/.bin
pnpm run <script>               # Run a script from package.json
```

**Scripts defined in package.json** can also be run as `pnpm <script>` (shorthand for `pnpm run`).

## Key configuration

- **`packageManager` field in package.json**: Declares the required pnpm version. Node 26 is also required (`engines.node`). Running `pnpm` with an older version will error.

## Single package, no workspace links

The Storefront Application is a single standalone app. Its `pnpm-workspace.yaml` holds the pnpm settings and overrides, not a list of workspace packages, and there is no `workspace:*` protocol. SCAYLE SDK packages (`@scayle/storefront`, `@scayle/storefront-api`, `@scayle/storefront-build`, `@scayle/storefront-opentelemetry`) are pinned to published npm versions in `package.json`, the same as any other dependency:

```json
"@scayle/storefront": "1.0.0",
"@scayle/storefront-api": "19.9.2"
```

Only add entries to `packages` in `pnpm-workspace.yaml` if the fork genuinely becomes a multi-package project locally. Most forks stay single-app.

## See also

**Full documentation**: [pnpm.io](https://pnpm.io) (no `llms.txt` published as of this writing) — command reference, options, and troubleshooting.
