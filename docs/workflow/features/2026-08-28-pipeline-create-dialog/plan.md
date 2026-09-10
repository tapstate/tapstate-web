# Pipeline creation dialog plan

**Status:** Complete  
**Date:** 2026-08-28

## Affected areas

- `apps/web/features/pipelines/pages/pipelines-page.tsx`
- `apps/web/features/pipelines/components/create/`
- `apps/web/styles/pipelines/pipeline-create.css`
- `apps/web/app/routes/_authenticated.pipelines.tsx`
- `apps/web/app/routes/_authenticated.tsx`
- generated `apps/web/app/routeTree.gen.ts`
- Pipeline list tests and all three locale bundles

## Steps

| # | Step | Status |
| --- | --- | --- |
| 1 | Add this feature's spec, prototype, plan, and acceptance documents | Complete |
| 2 | Replace the list Create link with local controlled dialog state | Complete |
| 3 | Convert the route page into a reusable full-screen creation component and keep Wizard inside it | Complete |
| 4 | Remove the creation route, Outlet-only pipeline layout, and auth pathname bypass | Complete |
| 5 | Align the shell and responsive styles with the Dify dialog composition | Complete |
| 6 | Update focused tests, regenerate route metadata, and verify the list-to-dialog flow | Complete |

## Validation

Verification completed:

```sh
pnpm vitest run apps/web/features/pipelines/pages/pipelines-page.test.tsx
pnpm --dir apps/web typecheck
node apps/web/scripts/check-i18n.mjs
```

The authenticated `/pipelines` screen was checked at desktop width and 390px. Opening and closing the dialog leaves the pathname at `/pipelines`; the list remains the backing page and the responsive surface has no horizontal overflow. The preview follows the reference's full-width rule, max-width inner panel, side rules, and stage separators. Input colors remain backed by Pipeline workspace tokens.

## Rollback

This is a client-only composition change. Reverting the affected Pipeline UI files restores the previous list and creation behavior without changing Pipeline data or server contracts.
