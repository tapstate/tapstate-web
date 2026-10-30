# Tapstate Web Engineering Guide

> Scope: runtime, dependencies, internationalization, build, and engineering gates.
> UI appearance and component behavior are defined in `DESIGN.md` and `design-system.md`.

## Selected stack

| Area                 | Choice                       | Contract                                                                      |
| -------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Runtime              | React 19                     | Shared application runtime                                                    |
| Routing              | TanStack Router File Routes  | Route source lives in each app's `app/routes/`; Vite generates the route tree |
| Build                | Vite 8                       | Development, production build, and preview                                    |
| Workspace            | pnpm                         | `apps/*` and `packages/*` are workspace members                               |
| Shared UI            | `@tapstate-web/ui` + Base UI | Public subpaths map directly to `packages/ui/src` source files                |
| Styling              | Tailwind CSS v4              | CSS-first theme tokens; app shell styles stay app-owned                       |
| Motion               | Motion                       | Use for product-level motion when CSS state transitions are not sufficient    |
| Icons                | lucide-react                 | Avoid one-off complex SVGs                                                    |
| Server state         | TanStack Query               | API list/detail/create state                                                  |
| Client state         | Zustand                      | Session and cross-route UI state                                              |
| Internationalization | i18next + react-i18next      | `en`, `zh-CN`, and `zh-TW`                                                    |
| Lint / format        | Oxlint / OXC formatter       | Root scripts cover the repository and workspace apps                          |

## Internationalization

1. User-visible copy comes from i18next resources, not JSX literals.
2. Keep locale key sets aligned. `pnpm --filter web i18n:check` and
   `pnpm --filter cloud i18n:check` are the application gates.
3. Use scoped key names such as `feature.scope.key`.
4. Use i18next or `Intl` for pluralization, dates, and numbers.
5. Prefer the backend error catalog for user-visible server errors.

## Styling and package boundaries

- `apps/*/app/styles/main.css` imports the app's Tailwind and application styles.
- Each app imports `@tapstate-web/ui/styles.css` once and scans
  `packages/ui/src` for Tailwind utilities.
- `packages/ui` owns reusable control geometry, visual states, content
  tokens and overlays. App-specific behavior adapters stay in the applications.
  App shells, navigation, branding and feature-specific canvas visuals remain
  Tapstate-owned.
- Web shell selectors are `.app-shell` and `.app-shell__main`.
- Cloud shell selectors are `.app-shell` and `.main-surface`.
- Preserve the Web and Cloud shell styles and their existing theme selection.
- New visual roles start from the source semantic token hierarchy and require
  a documented theme or source change, not a parallel palette.
- Feature code composes shared components. Do not recreate buttons, fields,
  menus, notifications, or modal primitives in feature CSS.
- Keep new production dependencies justified in the change description.

## Vite and routing

- Vite is the development, preview, and build entry point.
- TanStack Router owns SPA routes. Keep route source in each app's
  `app/routes/` and do not hand-author generated route trees.
- `app/router.tsx` creates the router instance and registers its type.
- Keep the app client-first. Do not add Server Actions, API routes, Edge
  Runtime, SSR, or a BFF without an architecture decision.
- Route or Vite configuration changes require typecheck and build verification.

## Verification commands

```sh
pnpm ui:docs:check
pnpm format:check
pnpm lint:code
pnpm typecheck
pnpm --filter web i18n:check
pnpm --filter cloud i18n:check
pnpm --filter web build
pnpm --filter cloud build
```

Automated test execution is chosen per workstream. The UI design-system
workstream uses lint, typecheck, build, i18n, and manual browser checks; it does
not add or run automated tests.

## Engineering radar

- Component test coverage and browser automation policy.
- Visual regression screenshot gate.
- Bundle budget tooling.
- Frontend error monitoring and RUM.
- Generated API clients and canonical model types.
- CSP and security-header policy.
- Browser and device support matrix.
- Tailwind output inspection for invalid utility references.
