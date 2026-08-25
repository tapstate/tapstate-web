# Pipeline canvas workspace acceptance

> Date: 2026-08-25
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Spec: [./spec.md](./spec.md)
> Prototype: [./prototype.md](./prototype.md)
> Plan: [./plan.md](./plan.md)
> Reviewer: Pending

## 1. Decision

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Needs changes

## 2. Acceptance record

| Criterion | Result | Evidence |
| --- | --- | --- |
| Floating navigation and canvas ownership | Passed in focused component coverage | Build keeps the full canvas. API access, Logs, and Monitoring have dedicated routes in a left overlay panel. A header-right icon collapses and expands that panel without changing canvas width. |
| Custom node cards, handles, Bezier paths, and dot field | Passed in graph and source coverage | Semantic edges map to the custom `pipeline` edge type. Cards render type icon, name, description space, card-midline handles, muted Bezier paths without endpoint offsets, and a blue-gray 18px dot field. The automatic layout centers a fan-in node on its incoming source group. |
| Honest status, metrics, logs, and API access pages | Passed in component coverage | Monitoring reads status and metrics only after its route opens. Logs reads only its log endpoint. Serve nodes remain unpublished and no URL or publish action is emitted. |
| Locale, test, type, and build checks | Passed | 18 test files and 87 tests, typecheck, locale validation, and build pass. |
| Desktop and narrow viewport review | Pending | |

## 3. Verification

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm --filter web test -- pipeline-editor-page.test.tsx` | Passed | 18 files, 87 tests |
| `pnpm --filter web typecheck` | Passed | |
| `pnpm --filter web i18n:check` | Passed | Locale keys match |
| `pnpm --filter web build` | Passed | Existing chunk-size warning remains |
| `pnpm --filter web test -- pipeline-graph.test.ts pipeline-editor-page.test.tsx` | Passed | 18 files, 89 tests, including the fan-in and contextual-panel regressions |
| Scoped `oxfmt --check` | Passed | Modified Pipeline files and feature records |
| `pnpm lint` | Blocked by existing baseline | 30 pre-existing formatting mismatches outside this change; no unrelated formatter output was written |
| Desktop viewport | Pending | Requires authenticated local session |
| Narrow viewport | Pending | Requires authenticated local session |

## 4. Remaining risks

- Semantic DAG mutation and API publication remain blocked on typed backend commands.
- Authenticated visual validation must use a real local session.
