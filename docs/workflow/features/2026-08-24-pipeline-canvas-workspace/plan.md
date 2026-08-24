# Pipeline canvas workspace plan

> Status: In Progress
> Progress: 85%
> Current step: Record authenticated desktop and narrow viewport review
> Next step: Run the editor in an authenticated local browser session
> Date: 2026-08-24
> Owner: Codex
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Spec: [./spec.md](./spec.md)
> Prototype: [./prototype.md](./prototype.md)
> Acceptance: [./acceptance.md](./acceptance.md)

## 1. Scope check

- Spec confirmed: yes, with original user request retained in [./spec.md](./spec.md).
- Prototype confirmed: yes, full-bleed workspace and floating surfaces.
- Non-goals confirmed: semantic DAG writes and API publication controls remain outside this implementation.
- New dependency: no. The existing `@xyflow/react` dependency provides the needed primitives.
- Contract impact: read-only additions consume existing status, metrics, and logs endpoints.

## 2. Affected files

- `apps/web/features/pipelines/pipeline-canvas.tsx`
- `apps/web/features/pipelines/pipeline-editor-page.tsx`
- `apps/web/features/pipelines/pipeline-graph.ts`
- `apps/web/service/pipeline-client.ts`
- focused Vitest files for graph conversion and Pipeline client behavior
- all three locale files
- this feature folder

## 3. Implementation steps

| Step | Status | Change | Verification | Notes |
| --- | --- | --- | --- | --- |
| 1 | Done | Inspect the supplied reference and current editor against the static DAG and runtime contracts | Source review recorded in progress log | Visual techniques only, no copied source or product identity |
| 2 | Done | Write failing typed client cases for status, metrics, and logs | Focused Vitest | HTTP reads remain independent from `PipelineView` |
| 3 | Done | Implement custom node card, handles, and custom Bezier edge | Focused Vitest, typecheck | No semantic graph mutation affordance |
| 4 | Done | Rebuild canvas chrome, node library, inspector, and runtime panel as floating surfaces | Component test, typecheck | Keeps the top-left back path clear |
| 5 | Done | Add translated runtime and API access states | i18n check | API access is availability only |
| 6 | In Progress | Run test, type, i18n, build, and viewport checks | Recorded in acceptance | Authenticated visual review needs a local session |

## 4. TDD and verification strategy

- Red: client fixtures prove strict parsing and correct `/status`, `/metrics`, and `/logs?limit=30` requests.
- Green: implement the narrow typed read clients before rendering their values.
- Component behavior: preserve selected node, layout saving, and panel switching without a second global cache.
- Level: 3 because this spans visual structure, read contracts, and production build output.
- Visual scan: verify hierarchy through whitespace, typography, and semantic tone; no gradients, glass surfaces, nested cards, simulated metrics, or unsupported control affordances.

## 5. Progress log

| Time | Actor | Progress | Completed | Next | Blocker |
| --- | --- | --- | --- | --- | --- |
| 2026-08-24 | Codex | 15% | Inspected current editor, supplied visual reference, source patterns, and backend runtime JSON contracts | Add red client tests | Authenticated visual session still unavailable |
| 2026-08-24 | Codex | 85% | Added strict observation clients, custom canvas cards, handles, Bezier edges, floating runtime/API panels, translations, and component coverage. `pnpm --filter web test` passed with 18 files and 84 tests; type, locale, and production build passed. | Run authenticated desktop and narrow viewport review | Browser access is not available in this session |

## 6. Review checklist

- [x] Matches the feature spec and prototype.
- [x] Does not add semantic DAG writes, fake values, or fake API publication.
- [x] Uses translated user-visible text in all locales.
- [x] Covers loading, unavailable, error, and success states.
- [x] Keeps all canvas panels floating and the back control reachable.
- [x] Uses clear focus states and 44px narrow-screen targets.
- [ ] Records automated and viewport verification results.

## 7. Verification record

| Time | Check | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-24 | `pnpm --filter web test` | Passed | 18 files, 84 tests |
| 2026-08-24 | `pnpm --filter web typecheck` | Passed | |
| 2026-08-24 | `pnpm --filter web i18n:check` | Passed | Locale keys match across all three locales |
| 2026-08-24 | `pnpm --filter web build` | Passed | Existing chunk-size warning remains |
| 2026-08-24 | Scoped `oxfmt --check` | Passed | All modified TypeScript files are formatted |
| 2026-08-24 | `pnpm --filter web lint` | Blocked | Oxlint passed; 20 unrelated pre-existing files fail format verification |
| 2026-08-24 | Desktop and narrow viewport | Pending | Requires authenticated local browser access |

## 8. Risks and rollback

- Runtime observation may return 404 before a Pipeline has published data. The panel renders it as unavailable and retains the graph.
- API access remains a read-only availability surface until the backend publishes an endpoint contract.
- Reverting this feature restores the earlier editor presentation and removes only read-only browser behavior. No Pipeline semantic data is written by this feature.
