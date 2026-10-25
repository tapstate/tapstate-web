# Verification and Development

## Available checks

Run the package typecheck from the repository root:

```sh
pnpm --filter @tapstate-web/ui typecheck
```

The package does not define its own lint, format, build, or runtime-test scripts. The workspace
commands cover the shared source and its consumers:

```sh
pnpm lint
pnpm typecheck
pnpm --filter web build
pnpm --filter cloud build
```

For a change used by only one app, run that app's typecheck and build. A successful typecheck or
build confirms compilation, not keyboard behavior, focus handling, accessibility, or visual fidelity.
For UI changes, follow the matching browser review in `docs/engineering/DESIGN.md`.

## Test infrastructure

There is currently no unit-test runner, Storybook project, browser-test setup, or test fixture under
`packages/ui`. Do not rely on `vp test`, Storybook commands, Vitest projects, or a package
`vitest.setup.ts`; those commands and files are not configured here.

If test infrastructure is added later, update this guide and the package scripts together. Until
then, protect public component changes with package typecheck, the affected app's checks, and the
rendered interaction review required by the page-design contract.
