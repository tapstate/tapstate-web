# Pipeline canvas workspace plan

> Status: In Progress
> Progress: 94%
> Current step: Record authenticated desktop and narrow viewport review for the corrected overlay navigation and node treatment
> Next step: Run the workspace in an authenticated local browser session
> Date: 2026-08-25
> Owner: Codex
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Spec: [./spec.md](./spec.md)
> Prototype: [./prototype.md](./prototype.md)
> Acceptance: [./acceptance.md](./acceptance.md)

## 1. Scope check

- Spec confirmed: yes, with original user input retained in [./spec.md](./spec.md).
- Prototype confirmed: yes, a full-bleed Orchestrate canvas, floating navigation, and floating canvas-only surfaces.
- Non-goals confirmed: semantic DAG writes and API publication controls remain outside this implementation.
- New dependency: no. The existing `@xyflow/react` dependency provides the required primitives.
- Contract impact: read-only additions consume the existing status, metrics, and logs endpoints.

## 2. Affected files

- `apps/web/features/pipelines/pipeline-canvas.tsx`
- `apps/web/features/pipelines/pipeline-editor-page.tsx`
- `apps/web/features/pipelines/pipeline-editor-page.test.tsx`
- `apps/web/app/routes/_pipeline-editor.pipelines.$pipelineId.edit*.tsx`
- `apps/web/app/routeTree.gen.ts`
- all three locale files
- this feature folder

## 3. Implementation steps

| Step | Status | Change | Verification | Notes |
| --- | --- | --- | --- | --- |
| 1 | Done | Inspect the supplied reference, public workflow implementation, current editor, static DAG, and runtime contracts | Source review recorded in progress log | Visual techniques only, no copied product identity |
| 2 | Done | Add strict client cases for status, metrics, and logs | Focused Vitest | HTTP reads remain independent from `PipelineView` |
| 3 | Done | Implement compact node cards, selection shell, short-line handles, custom Bezier edges, and visible dot background | Focused Vitest, typecheck | No semantic graph mutation affordance |
| 4 | Done | Add route pages for API access, Logs, and Monitoring | Focused component test, generated route tree, typecheck | Queries begin only after their route opens |
| 5 | Done | Make workspace navigation a floating left canvas panel with upper-right collapse and expand affordances | Focused component test, typecheck | Canvas width never changes when the panel expands or collapses |
| 6 | Done | Add translated navigation and operation page states | i18n check | API access remains availability only |
| 7 | In Progress | Run test, type, i18n, build, and viewport checks | Recorded in acceptance | Authenticated visual review needs a local session |

## 4. TDD and verification strategy

- Red: focused component cases require route-specific reads, working route links, and the collapse or expand state.
- Green: place operator reads in dedicated route pages, keep canvas selection and layout saving local to Orchestrate, and keep panel geometry as local UI state.
- Level: 3 because this spans routes, visual structure, read contracts, and production build output.
- Visual scan: verify hierarchy through whitespace, typography, semantic tone, and visible dots. Do not use gradients, glass surfaces, nested cards, simulated metrics, or unsupported control affordances.

## 5. Progress log

| Time | Actor | Progress | Completed | Next | Blocker |
| --- | --- | --- | --- | --- | --- |
| 2026-08-24 | Codex | 15% | Inspected current editor, supplied visual reference, source patterns, and backend runtime JSON contracts | Add red client tests | Authenticated visual session still unavailable |
| 2026-08-24 | Codex | 85% | Added strict observation clients, custom canvas cards, handles, Bezier edges, floating runtime/API panels, translations, and component coverage. | Correct workspace information architecture | Browser access is not available in this session |
| 2026-08-25 | Codex | 94% | Replaced runtime tabs with dedicated routes. Added a floating left navigation panel with an upper-right collapse control, adjusted overlay geometry, increased dot-field contrast, tightened node cards, handles, and edges, and updated focused behavior cases. | Run authenticated desktop and narrow viewport review | Browser access is not available in this session |

## 6. Review checklist

- [x] Matches the revised feature spec and prototype.
- [x] Does not add semantic DAG writes, fake values, or fake API publication.
- [x] Uses translated user-visible text in all locales.
- [x] Covers loading, unavailable, error, and success states.
- [x] Keeps the navigation panel, node library, and inspector as canvas overlays.
- [x] Keeps clear focus states and 44px narrow-screen targets where a control collapses to an icon.
- [ ] Records automated and viewport verification results.

## 7. Verification record

| Time | Check | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-25 | `pnpm --filter web test -- pipeline-editor-page.test.tsx` | Passed | 18 files, 87 tests |
| 2026-08-25 | `pnpm --filter web typecheck` | Passed | |
| 2026-08-25 | `pnpm --filter web i18n:check` | Passed | Locale keys match across all three locales |
| 2026-08-25 | `pnpm --filter web build` | Passed | Existing chunk-size warning remains |
| 2026-08-25 | Scoped `oxfmt --check` | Pending | Run after documentation update |
| 2026-08-25 | Desktop and narrow viewport | Pending | Requires authenticated local browser access |

## 8. Risks and rollback

- Runtime observation may return 404 before a Pipeline has published data. Its page renders unavailable state and leaves the canvas usable.
- API access remains read-only until the backend publishes an endpoint contract.
- Reverting this feature restores the earlier editor presentation and removes only browser behavior. No Pipeline semantic data is written by this feature.
