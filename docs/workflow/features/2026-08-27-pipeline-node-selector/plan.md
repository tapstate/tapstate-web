# Pipeline unified node selector plan

**Status:** In progress  
**Date:** 2026-08-27  
**Progress:** 5/6 steps complete

## Affected areas

- `apps/web/features/pipelines/model/pipeline-graph-edit.ts`
- `apps/web/features/pipelines/components/canvas/`
- `apps/web/features/pipelines/components/node-library/`
- `apps/web/features/pipelines/pages/pipeline-editor-page.tsx`
- Pipeline locale and scoped style files

## Steps

| # | Step | Status |
| --- | --- | --- |
| 1 | Define failing graph-creation tests for configured Sources and concrete Transforms | Complete |
| 2 | Implement typed node choices and graph creation defaults | Complete |
| 3 | Build and test the reusable selector and source-table picker | Complete |
| 4 | Wire aside, canvas context, and output-plus triggers to one insertion context | Complete |
| 5 | Add translations and semantic scoped CSS tokens | Complete |
| 6 | Verify unit, i18n, type, lint, and authenticated desktop/mobile flows | In progress |

## Validation

```sh
pnpm vitest run apps/web/features/pipelines/model/pipeline-graph-edit.test.ts
pnpm vitest run apps/web/features/pipelines/pages/pipeline-editor-page.test.tsx
pnpm --filter web i18n:check
pnpm typecheck
pnpm lint
```

Then verify the authenticated editor at desktop width and 375px.

## Rollback

The change is client-only. Reverting the feature changes restores the prior editor behavior without changing Pipeline data or server contracts.
