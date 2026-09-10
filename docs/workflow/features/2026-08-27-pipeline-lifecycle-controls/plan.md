# Pipeline list lifecycle controls plan

**Status:** In progress  
**Date:** 2026-08-27  
**Progress:** 1/5 steps complete

## Affected areas

- `apps/web/service/pipelines/pipeline-client.ts`
- `apps/web/service/pipelines/pipeline-client.test.ts`
- `apps/web/features/pipelines/components/pipeline-lifecycle-menu.tsx`
- `apps/web/features/pipelines/pages/pipelines-page.tsx`
- `apps/web/features/pipelines/pages/pipelines-page.test.tsx`
- Pipeline list CSS and locale files

## Steps

| # | Step | Status |
| --- | --- | --- |
| 1 | Record scope, state matrix, interaction, and acceptance criteria | Complete |
| 2 | Define failing client and list interaction tests | In progress |
| 3 | Add the lifecycle API client and compact menu/dialog component | Not started |
| 4 | Wire status-cell actions and localized feedback | Not started |
| 5 | Run automated checks and inspect desktop plus 375px layouts | Not started |

## Validation

```sh
pnpm vitest run apps/web/service/pipelines/pipeline-client.test.ts apps/web/features/pipelines/pages/pipelines-page.test.tsx
pnpm --filter web i18n:check
pnpm typecheck
pnpm lint
git diff --check
```

Then inspect the local Pipeline list at desktop width and 375px.

## Rollback

This is client-only. Reverting the lifecycle component and API helper removes the entry point without changing Pipeline definitions or runtime behavior.
