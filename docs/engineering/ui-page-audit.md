# Existing page UI audit

Inventory captured from the current worktree on 2026-10-18. “Direct” means a source import exists in that file; it does **not** prove the whole page follows the design. Every row remains pending visual/state review until the evidence matrix in [DESIGN.md](DESIGN.md) is completed. Child components and dialogs must be included during each page review.

| Page                                                                  | Current component source in page file                     | Upstream page recipe   | Review  |
| --------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------- | ------- |
| `apps/cloud/app/features/access/access-denied-page.tsx`               | inspect child components                                  | inspect by task        | Pending |
| `apps/cloud/app/features/auth/auth-page.tsx`                          | old shared                                                | form / creation flow   | Pending |
| `apps/cloud/app/features/billing/billing-page.tsx`                    | inspect child components                                  | detail / monitoring    | Pending |
| `apps/cloud/app/features/clusters/clusters-page.tsx`                  | old shared                                                | resource list / detail | Pending |
| `apps/cloud/app/features/onboarding/onboarding-page.tsx`              | old shared                                                | form / creation flow   | Pending |
| `apps/cloud/app/features/onboarding/provisioning-view.tsx`            | old shared                                                | form / creation flow   | Pending |
| `apps/cloud/app/features/organizations/organizations-page.tsx`        | old shared                                                | resource list / detail | Pending |
| `apps/cloud/app/features/overview/cloud-overview-view.tsx`            | vendored direct, old shared                               | detail / monitoring    | Pending |
| `apps/cloud/app/features/overview/overview-page.tsx`                  | inspect child components                                  | detail / monitoring    | Pending |
| `apps/cloud/app/features/settings/settings-page.tsx`                  | old shared                                                | form / creation flow   | Pending |
| `apps/web/features/ask-tapstate/ask-tapstate.tsx`                     | old Web UI                                                | inspect by task        | Pending |
| `apps/web/features/explorations/explorations-page.tsx`                | old Web UI                                                | inspect by task        | Pending |
| `apps/web/features/overview/overview-page.tsx`                        | old shared                                                | detail / monitoring    | Pending |
| `apps/web/features/pipelines/logs/pipeline-logs-page.tsx`             | old Web UI                                                | inspect by task        | Pending |
| `apps/web/features/pipelines/monitoring/pipeline-monitoring-page.tsx` | inspect child components                                  | detail / monitoring    | Pending |
| `apps/web/features/pipelines/pages/pipeline-editor-page.tsx`          | old Web UI                                                | inspect by task        | Pending |
| `apps/web/features/pipelines/pages/pipelines-page.tsx`                | old Web UI                                                | resource list / detail | Pending |
| `apps/web/features/settings/state-store-page.tsx`                     | old Web UI                                                | form / creation flow   | Pending |
| `apps/web/features/sources/pages/source-detail-page.tsx`              | inspect child components                                  | resource list / detail | Pending |
| `apps/web/features/sources/pages/source-table-detail-page.tsx`        | inspect child components                                  | resource list / detail | Pending |
| `apps/web/features/sources/pages/sources-catalog-page.tsx`            | inspect child components                                  | resource list / detail | Pending |
| `apps/web/features/sources/sources-page.tsx`                          | vendored direct, old shared                               | resource list / detail | Pending |
| `apps/web/features/views/view-collection-browser-page.tsx`            | old Web UI                                                | resource list / detail | Pending |
| `apps/web/features/views/view-detail-page.tsx`                        | old Web UI                                                | resource list / detail | Pending |
| `apps/web/features/views/views-page.tsx`                              | source table pattern, vendored Badge/StatusDot, old shell | resource list / detail | Pending |

## Review record required for each page

- Route and state fixture; Dify source path for the analogous page composition.
- Desktop 1280×800 and mobile 375×812 screenshots; light/dark if supported.
- Component import inventory including child controls, table rows, cards, forms, menus, and dialogs.
- Loading/empty/error/disabled/selected states, focus and keyboard, overlay focus return.
- English, Simplified Chinese, and Traditional Chinese text fit; shell before/after comparison.
- Deviations, owner, and resolution. A build result alone does not close a row.

## Current conclusions

- The vendored package is available and Cloud Overview has one direct Button use, but almost every page still imports the old shared/Web controls or delegates to child components. They are not source-aligned yet.
- Earlier mechanical palette replacement touched many feature files without proving component provenance or page composition. Review those diffs against the pinned source before retaining them.

## Sources catalog: first source-to-page review

Source inspected at the pinned revision: upstream `web/app/components/datasets/list/{header,datasets,dataset-card-skeleton}.tsx`, `first-empty-state/index.tsx`, `web/app/components/datasets/documents/components/{documents-header,list}.tsx`, `document-list/components/document-table-row.tsx`, and `web/app/components/base/search-input/{index,use-search-input}.tsx`. Tapstate screen inspected: `apps/web/features/sources/sources-page.tsx` and its referenced dialogs. This is a **code review only**; `/sources` redirected the local browser to `/login`, so authenticated viewport, state, focus and language evidence is still missing.

| Review item           | Source-backed finding                                                                                                                                                    | Tapstate state / next action                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page hierarchy        | Dify list uses compact title/actions followed by a separate filter/search/action row, then resource content.                                                             | Removed the duplicate Source navigation rail. The page now has a compact title/sample-action row, search or back action, then one creation action. Source and table detail navigation remains routed through the existing selection handlers. Authenticated desktop/mobile rendering is still unverified.        |
| Search                | Dify's SearchInput composes InputGroup, InputGroupInput, search addon and clear action; it handles IME composition and Escape.                                           | Replaced the standalone source search `<input>` with the source-derived `search-input` subpath. Tapstate passes translated search/clear labels. Manual browser interaction and narrow-width fit are still pending.                                                                                               |
| Actions               | Dify uses vendored Button and DropdownMenu variants; one creation action carries primary weight.                                                                         | Creation is the primary toolbar action. Source detail keeps Edit visible and moves test, schema refresh and destructive delete into the source DropdownMenu; the destructive item uses its variant. Other row/detail actions and pending-menu behavior still require authenticated interaction review.           |
| Feedback              | Dify transient feedback uses its Toast/Toaster and source semantic tokens.                                                                                               | The custom fixed success notice now emits a source Toast after the existing mutation state changes. Inline error/alert styling and the authenticated mutation path still need review.                                                                                                                            |
| Data and empty states | Dify's card grid uses shape-matched skeletons; its document table uses source LoadingPlaceholder for initial load. Its first-use and filtered-empty compositions differ. | Sources table initial loading now uses the source LoadingPlaceholder. First-use now follows the source placeholder-card grid and uses the source-derived action card; filtered-empty remains a table cell. Authenticated desktop/mobile composition and actions are still unverified.                            |
| Surface tokens        | Dify list/card and document-table code use semantic body, text, divider, panel and state tokens.                                                                         | The list table now follows the source document table's bare divider/header structure and uses source `StatusDot`. Detail/table-detail areas still contain raw `gray-*`, `bg-white`, hex and independent shadows. Continue their source-backed review; changing hues alone is not acceptance.                     |
| Overlays              | Dify package owns dialog portals, surface geometry and focus.                                                                                                            | The shared Dialog adapter delegates to source anatomy. Source deletion and bulk sample removal use source AlertDialog; the latter stays open on a refused/failed operation. Create/edit/test/sample dialogs still contain independent geometry and style overrides. Review real focus, pending and error states. |

Source metadata text entry now uses the vendored Textarea through the shared adapter. Its controlled value and Formily adapter use `onValueChange`; the authenticated edit dialog still needs draft, validation and submit inspection.

## Views list source alignment (code review only)

`apps/web/features/views/views-page.tsx` now follows upstream `web/app/components/datasets/documents/components/list.tsx`, `document-list/components/document-table-row.tsx` and `style.module.css` for semantic table structure, 32 px header/rows, semantic divider/text/hover tokens, and source cell spacing. `ViewStatus` now maps fresh/stale/loading/not-loaded to source `StatusDot` with translated text. The old table wrapper and its local CSS have been removed. The Views shell, loading/empty/error states, other detail pages, authenticated viewport and keyboard/mobile review are still pending; this is not a completed page audit.

`apps/web/features/views/view-collection-browser-page.tsx` used a bespoke search input inside its collection rail. It now uses the same source-derived `SearchInput` as the Sources catalog, including translated clear action, IME handling, and Escape behavior from upstream `web/app/components/base/search-input/`. Its hand-built tablist and tab panels have also been replaced by the source `Tabs`/`TabsList`/`TabsTab`/`TabsPanel` anatomy, matching the application use in upstream `web/app/components/datasets/create-from-pipeline/create-options/create-from-dsl-modal/index.tsx`. The rail selection, detail content and states still use independent visual composition; authenticated viewport, keyboard and mobile evidence is missing. This row remains Pending.
