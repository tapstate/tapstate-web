# Pipeline canvas workspace

> Status: In Progress
> Date: 2026-08-24
> Owner: Codex
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Prototype: [./prototype.md](./prototype.md)
> Plan: [./plan.md](./plan.md)
> Acceptance: [./acceptance.md](./acceptance.md)
> Related surface: `apps/web/features/pipelines/`

## 1. Intake

### User request

> Carefully analyze the supplied editor reference. Pipeline has logs and monitoring, and will publish APIs. Analyze the supplied public implementation source for layout and interaction ideas, including node UI. Use icon, name, description, custom edges, custom handles, and a React Flow background. List the work, order it, then start implementation. Do not use the reference product name in a landed plan.

### Context

The existing editor already reads the backend semantic DAG and persists independent canvas geometry. Its nodes and panels are functionally correct but do not yet form a coherent canvas workspace, and runtime observation has no entry from the editor.

### Assumptions

- `PipelineView.dag` remains the static graph source of truth.
- Node positions remain in the independent layout endpoint and never change the semantic DAG.
- The existing HTTP read faces are authoritative for status, metrics, and logs.
- An API publication command and endpoint projection are not available yet. The UI must show availability honestly rather than inventing a publish action or URL.

### Open questions

- The eventual typed DAG write command will decide node creation, deletion, reconnection, undo, and edge insertion behavior.
- The API surface contract will decide endpoint, authorization, and publication controls.

## 2. Decomposition

### Goals

- Make the editor a full-bleed, borderless canvas workspace with floating contextual controls and a back path.
- Render each semantic node as a compact card with type icon, name, and one-line description.
- Use custom horizontal handles and a custom Bezier edge suitable for a left-to-right DAG.
- Give operators honest in-editor access to status, metrics, and recent logs.
- Reserve an API access panel that reflects the graph's serve nodes without claiming an unpublished endpoint exists.

### Non-goals

- No YAML parsing or browser-local Pipeline persistence.
- No semantic DAG mutations, drag-to-connect, edge insertion, undo history, lifecycle commands, or collaboration controls.
- No fabricated runtime values, API URLs, publish controls, or test-run controls.

### User path

1. Open a Pipeline from the resource list and return with the top-left back control.
2. Pan, zoom, fit the graph, inspect a selected node, and move a node to improve persistent reading layout.
3. Open Runtime, Metrics, Logs, or API access from the floating controls.
4. See server errors and unavailable observations as explicit states with retry.

### Impact

- Layout and editor interaction: `pipeline-canvas.tsx` and `pipeline-editor-page.tsx`.
- Data: typed read-only clients for status, metrics, and logs.
- State: server data stays in TanStack Query; canvas selection and active panel remain local state.
- i18n: all shipped editor labels must exist in `en`, `zh-CN`, and `zh-TW`.

### Options

| Option | Benefit | Risk | Decision |
| --- | --- | --- | --- |
| Custom React Flow node and edge types | Precise node and connection hierarchy without changing the semantic graph | Requires focused canvas tests | Use |
| Default React Flow nodes and edges | Faster initial implementation | Does not meet the requested hierarchy or connection detail | Do not use |
| Toolbar-only runtime navigation | Small surface | Hides current data and makes operator context indirect | Do not use |

## 3. Prototype gate

- [x] Prototype required. See [./prototype.md](./prototype.md).

## 4. State matrix

| State | Presentation | Available action | i18n scope |
| --- | --- | --- | --- |
| Graph loading | Centered canvas loading state | Wait | `pipelines.workspace.loading` |
| Graph error | Focused error state with retry | Retry graph and layout reads | `pipelines.workspace.error` |
| Runtime loading | Stable inspector body | Wait | `pipelines.runtime.loading` |
| Runtime unavailable | Honest unavailable explanation and retry | Retry the selected read | `pipelines.runtime.unavailable` |
| Runtime success | State, metrics, or recent lines | Switch contextual panel | `pipelines.runtime.*` |
| API unavailable | No endpoint is claimed | Inspect serve nodes | `pipelines.apiAccess.unavailable` |

## 5. Data and API boundary

- Read only: `GET /api/pipelines/{id}/status`, `/metrics`, and `/logs?limit=30`.
- Existing layout save remains `PUT /api/pipelines/{id}/layout`.
- The API access panel derives only the number of `serve` nodes from `PipelineView.dag`; it does not infer a public URL.

## 6. Acceptance criteria

- [ ] The editor remains a full-viewport canvas without the application shell or a permanent sidebar.
- [ ] Every node shows an icon, a readable name, and a one-line description with source and target nodes using Source semantics.
- [ ] Edges use custom Bezier geometry and custom, accessible left/right handles.
- [ ] Runtime status, metrics, and logs use the real HTTP read faces and distinguish unavailable data from successful data.
- [ ] The API panel does not expose a fabricated endpoint or publish action.
- [ ] Tests, typecheck, locale validation, production build, and desktop plus narrow viewport checks are recorded.

## 7. Risks

- Observation data may be unavailable until a Pipeline has run. The UI must retain its graph and state the condition precisely.
- Visual runtime verification requires an authenticated local session. Automated type, build, and client checks can run without it.
