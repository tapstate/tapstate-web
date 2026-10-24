# Tapstate UI DESIGN

## Authority and scope

This is the review contract for all new and existing content inside Tapstate Web and Cloud. The outer `app-shell` and main surface, navigation, product marks, and product-specific graph canvas remain Tapstate-owned. Every ordinary control and overlay inside those boundaries follows the source component package and its semantic tokens. The exact component APIs and token source are indexed in [design-system.md](design-system.md).

The system-level interaction inventory and per-flow review protocol live in [ui-interaction-audit.md](ui-interaction-audit.md). Use it whenever a page opens an overlay, displays feedback, accepts a value, or changes data.

Component source baseline: revision `3552815c89415716dfd9cac80fd7c73aac3b051e`, 2026-10-17; the component LICENSE is preserved in `packages/ui/LICENSE`. Page rules below were read from the upstream knowledge list header, resource list/card, document header, and the package's styling/overlay/form guides. When a rule and a remembered screenshot disagree, inspect that pinned source and record the decision before inventing a new variant.

Application-scene research added on 2026-10-23 was read from the user's local upstream checkout at revision `65e1fbcc2b4fd43f0bb78b58922eb543983df78e`. This supplies the result/trace, datasource authorization, workflow-log, empty-state and API-test examples in the scene contracts below. It does not silently upgrade the source component revision. Use the source implementation for exact component anatomy; record any later application recipe separately with its actual revision. When prose or an upstream guide contradicts the copied runtime source, inspect and resolve the difference before implementation; do not present the prose as proof of the runtime behavior.

## Visual philosophy

1. **Work first.** The title, primary action, filters, content, and state form a visible hierarchy. Decoration does not compete with the user's task. The knowledge-resource list uses a compact sticky title row, a second toolbar row, then a content grid; the document view uses title/description, then filters/actions, then the list.
2. **Dense but legible.** Controls default to 32 px. Small actions use 24 px; prominent actions use 36 px. UI copy is generally 12–14 px; the knowledge list title is 18 px. Row spacing and one-pixel dividers carry hierarchy before extra containers.
3. **Semantic surfaces.** Body, panel, card, input, and overlay each have their own semantic background/border tokens. A resource card is justified when the whole item is selectable and carries multiple pieces of metadata and actions. Ordinary text groups do not become cards. The upstream knowledge-resource card uses a 0.5 px border, 12 px radius, restrained shadow, and a hover change; the list uses a 296 px minimum card width and 12 px gap. These are examples to follow for resource grids, not universal page measurements.
4. **One action weight.** Each view has one obvious primary action. Secondary and ghost actions are quieter. Destructive intent uses the component's `tone`; do not create a new red button style. Place low-frequency item actions in a menu.
5. **State is part of the composition.** Grid loading skeletons preserve final card geometry; the document table's initial load uses a centered source Spinner. Choose from the analogous source page instead of imposing one loading treatment everywhere. First-use empty states and filtered-empty states have different messages and actions. Errors show recovery. Disabled, invalid, selected, hover, active, and keyboard-focus states come from component APIs and Base UI data attributes; color alone never carries status.
6. **Content ownership.** App code owns labels, translated text, permissions, data and navigation. The source component owns geometry, focus, dismissal, layers, field behavior and variants. Keep styling changes in token/theme mapping or the source, with upstream provenance, rather than scattered `className` corrections.

## Source fidelity is a delivery requirement

For every new UI and every visual correction, read this document and the relevant source family before editing. A semantic-looking token or a successful build does not establish a source match. The pinned component source, the analogous application page, and explicit user decisions determine the result, in that order of responsibility: components own their parts; application references own composition; user decisions own intentional product differences.

Record a source mapping in the PR or page audit for each changed composition:

| Surface / part                        | Source revision and file                              | Source component / classes   | Tapstate component / classes           | Difference and reason                                                                                        | Rendered evidence                             |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Example: connection-test result group | Pinned theme; upstream `workflow/run/result-text.tsx` | `bg-background-section-burn` | `ConnectionTestResult` uses that token | Structured check rows are Tapstate data; this is an adaptation, not a copied upstream connection-test screen | Desktop / narrow, success / warning / failure |

Reject a change with an unaccounted-for background, padding, radius, shadow, icon size, typography role, focus treatment or overlay part. Do not add responsive overrides such as `sm:px-8` because they feel roomier. Inspect an analogous responsive source; otherwise keep the component default and identify the missing reference. Do not call a composition an exact copy when its layout or interaction was adapted. Never use a generic aesthetic skill to override the source system.

Before calling a correction complete, inspect the rendered result. Specifically check padding on the actual content element, computed display/alignment of rows, right-side status/actions, long text, scrolling, and generated utility styles. Typecheck and lint are necessary code checks, not visual evidence. Preserve a real screenshot or browser observation in the page audit; record unavailable states as unverified.

## Surface and token decision table

Choose a surface by its purpose, not by sampling a grey from a screenshot. Values below identify the pinned theme and must not become literal app colors. Use the same semantic token in dark mode; alpha surfaces must be inspected on their actual parent.

| Purpose                                             | Source token / composition                                                             | Required distinction                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Normal content sheet                                | `bg-background-default`                                                                | Primary reading surface, separate from the branded shell                                               |
| Quiet section                                       | `bg-background-section`                                                                | Subtle grouping; not a disabled input                                                                  |
| Recessed content, result, trace or grouped metadata | `bg-background-section-burn`                                                           | Light `#f2f4f7`; dark `rgb(24 24 27 / 0.6)`. Prefer for the Source connection-test check/error regions |
| Input / number / select / search                    | `components-input-*` and the selected primitive                                        | These are control-state surfaces, not a substitute for general content sections                        |
| Floating menu / popup                               | `components-panel-*`, `internal/menu.ts`, `internal/overlay.ts`                        | Keep source border, blur, shadow, placement and lifecycle together                                     |
| Hover / press / selection                           | `state-base-*`, `state-accent-*` or the owning component's selected token              | Do not turn a static section background into an interaction state                                      |
| Informational / success / warning / destructive     | Component variants and `text-*`, `state-*`, `StatusDot`                                | Status is also text or an icon. Success is not the product's primary accent                            |
| Dividers / outline                                  | `divider-subtle`, `divider-regular`, component border tokens                           | Controls, row rules and floating panels do not share one invented border color                         |
| Text                                                | `text-primary`, `text-secondary`, `text-tertiary`, placeholder/disabled/semantic roles | Keep labels, supporting content, placeholders and disabled values distinct                             |
| Code and graph                                      | Source syntax / `workflow-*` tokens                                                    | Their specialized palette does not become the ordinary page palette                                    |

Evidence: source `packages/ui/src/themes/{light,dark,theme}.css`, `packages/ui/src/internal/{form-control,menu,overlay}.ts`; upstream `web/app/components/workflow/run/{result-text,workflow-tool-tracing}.tsx`, `rag-pipeline/components/panel/test-run/result/index.tsx`, `header/account-setting/data-source-page-new/card.tsx`, `plugins/plugin-auth/plugin-auth.tsx`.

`background-section-burn` is a common content surface, not a blanket replacement for all backgrounds inside dialogs. For example, upstream `tools/edit-custom-collection-modal/test-api.tsx` deliberately uses `components-input-bg-normal` for its textual API output. The Source check list follows the result/trace grouping references above and the user's explicit section-burn direction. Retain this distinction when adding other result types.

## Scene contracts

These contracts cover the current public component catalog and the application compositions used by Web and Cloud. A new scene must map to one of them or add a source-backed contract here before delivery. Coverage here describes implementation rules; it does not declare every existing screen visually audited.

### Dialogs, drawers and nested surfaces

- Compose centered work as `DialogContent` → `DialogHeader` → `DialogBody` → optional `DialogFooter`. Content itself does not supply body padding. Put a form across these parts with `contents` when required; retain the flex/min-height chain. The default body owns scrolling between the fixed header/footer. Never place ordinary body content directly under the popup and assume header padding applies to it.
- The pinned header is `px-6 pt-6 pb-3`; body is `px-6 py-3`; footer is `px-6 pt-5 pb-6`. Horizontal inset is 24px. The default close control is 32px at `top-5 inset-e-5`. Source results retain the default 480px dialog width. A wider composition requires explicit source-backed width as well as a viewport clamp; changing only `max-width` does not change the source `w-120` width or justify different interior insets.
- Modal surface, backdrop, radius, shadow, transition and nested stack transform belong to `packages/ui/src/internal/overlay.ts` and `packages/ui/src/dialog/index.tsx`. A dialog is not a generic card with a backdrop. Avoid duplicate close affordances when one top close is sufficient; decision dialogs still need clear cancel/confirm actions.
- Use `AlertDialog` for explicit confirmation, with object name, consequence, pending and failure states. Preserve its outside-dismiss/Escape contract rather than guessing that all modal types dismiss identically.
- Drawers use the exported root, portal, backdrop, viewport, popup and content. Side placement, swipe direction, viewport clearance, width and scroll regions come from the analogous source page. The tool test drawer is 600px with 8px viewport insets; that is its recipe, not the width for every side panel.
- A nested picker/menu/dialog uses its primitive's portal and focus lifecycle. No local z-index escalation, manually portalled clone, full-screen click blocker or force-mounted invisible popup.

Sources: source `packages/ui/src/{dialog,alert-dialog,drawer}/index.tsx`, `docs/overlays.md`; upstream `tools/edit-custom-collection-modal/test-api.tsx` and `app/create-app-modal/index.tsx`.

### Results, diagnostics and operational state

- Separate the overall outcome from individual checks. Use a concise semantic success/failure icon and text; each check has a left title/detail region and a nonshrinking status at the right of its title row. Long messages wrap in the text region. Status must not be pushed below a detail simply because the name grows.
- Source test result/error content uses `bg-background-section-burn`. Its check well uses `px-3 py-2` (12px horizontal, 8px vertical), within the dialog body's 24px side inset. The 12px well inset follows the test-output composition; structured check rows and their right-side statuses are the documented Tapstate adaptation.
- Present the user-facing failure and recovery first. Keep diagnostic codes/details in a reachable disclosure; preserve all existing error information and do not reinterpret a failed request as an empty success.
- A result section can be inline in an editor or live in a contextual drawer; keep the source page's trigger/result relationship. List-triggered Tapstate connection results currently use a focused dialog. Do not silently change this behavior and describe it as source parity.
- Logs use the source workflow-log table/filter/empty-state recipes. Monitoring uses actual operational data; zero is zero and unavailable is unavailable. Do not start polling a screen with no backend condition that can produce updates; refresh behavior is a product contract, independent of visual styling.

Sources: upstream `workflow/run/{result-text,status-container,workflow-tool-tracing}.tsx`, `rag-pipeline/components/panel/test-run/result/index.tsx`, `tools/edit-custom-collection-modal/test-api.tsx`, `app/workflow-log/list.tsx`, `app/log/empty-element.tsx`; source `packages/ui/src/{status-dot,collapsible,spinner,progress,meter}`. The Source result-row alignment and polling constraints are explicit Tapstate requirements.

### Forms and schema-driven controls

- Text, password, numeric, multiline, prefixes/suffixes and embedded actions use `input`, `number-field`, `textarea` and `input-group`. The wrapper owns one surface/ring; the inner native input is transparent and flexible. Do not nest a styled input inside a second styled input shell.
- A normal Input uses `rounded-lg px-3 py-1.75 system-sm-regular`; its transparent normal border, hover border, active background and 2px accent focus ring come from `internal/form-control.ts`. Preserve the same focus appearance in Formily. Do not add an Ant focus halo, permanent outline, fixed-height inner input with duplicate vertical padding, or a second password border.
- Formily owns schema, draft, validation and submission. Adapters bind public control props, preserve native labels/descriptions/errors, and normalize only the domain values. Remaining Ant-backed components need a documented component-specific token/anatomy mapping, including their popup portals; a global `.ant-*` override is not a complete migration.
- Select closed choices with `select`, searchable persistent values with `combobox`, free text with suggestions with `autocomplete`. Pass the source value-to-label collection. A selected source shows one connector mark, one label and optional secondary metadata on one aligned row; no duplicated icon or raw serialized value.
- Read mode and similar mutually exclusive modes use `segmented-control`. Its track is `rounded-[10px] p-0.5 gap-px`; items are `h-7 rounded-lg px-2 py-1` with source active/hover/disabled states. Tabs choose panels instead. Do not substitute a handcrafted group of unrelated buttons.
- Checkbox/radio groups use fieldset/legend and real group semantics. A single Switch represents a boolean. Sliders keep labels, keyboard values and units. Date/time pickers use their source civil-date/time value model, localized label/format and commit/cancel behavior.
- Search uses `search-input` or the exact input-group pattern of the selected source page. Clear behavior, Escape, IME and accessible names are part of the control. Search alignment/width follows the enclosing composition; the connector chooser's centered 400px maximum is an explicit Tapstate requirement, not a global search width.

Sources: source `docs/{forms,selection,styling}.md`, `packages/ui/src/internal/form-control.ts`, `packages/ui/src/{field,fieldset,form,input,input-group,textarea,number-field,select,combobox,autocomplete,checkbox,checkbox-group,radio-group,switch,slider,segmented-control,date-time,search-input}`; upstream `base/search-input`.

### Buttons, icon buttons and action groups

- Use the public Button variant/tone/size. A `secondary` action is a normal independent Button unless the analogous source explicitly groups commands. Save is secondary and Save & start is primary in the Pipeline Builder; its footer is not the DAG editor's split/grouped toolbar.
- Button sizes are small/medium/large = 24/32/36px. IconButton sizes are a different API: xs/sm/md/lg/xl = 16/20/24/32/36px. Glyph size comes from the source call site; do not infer it from the hit area or globally force every SVG to 24px.
- Use one accessible IconButton for more actions. Keep its glyph size stable before/after hover and when its menu opens. The menu items use the source 32px item geometry; an icon must not inherit a page-level large SVG rule.
- Loading/disabled/pending preserve button geometry and block duplicate submission. Tooltip names and keyboard focus remain available; a tooltip does not replace `aria-label`.
- Keep one primary action for a decision area. Resource names can carry link emphasis; secondary source/pipeline navigation uses quiet text plus meaningful connector identity. Avoid making every table column a blue primary link.

Sources: source `packages/ui/src/{button,icon-button,toggle,kbd}/index.tsx`, `packages/ui/src/internal/{focus,menu}.ts`; upstream workflow operator/header components. Builder action priority, quiet secondary navigation and stable more-action icons are explicit Tapstate requirements.

### Menus, filters and contextual help

- Commands use DropdownMenu/ContextMenu; field values use Select/Combobox. Preserve menu labels, groups, separators, destructive item semantics, submenus and typeahead. Source menu rows are `mx-1 h-8 gap-1 rounded-lg px-2`; popup padding and scroll padding are both `py-1`/`scroll-py-1`.
- Filter chips use the source `chip` selected/empty/clear composition. A selected filter has the source secondary-button surface and clear glyph; it is not a plain select with an added x. Reset uses the real unfiltered value. Date filters retain their source picker, selected interval and clearing semantics.
- Popover is reachable interactive content. Tooltip is supplementary naming for an existing action. Infotip is a deliberate information trigger; PreviewCard enhances a real link without owning essential data. Preserve touch, keyboard, outside-dismiss and focus return.
- Popup width/height derive from anchor/available-space variables, with viewport collision handling. Do not hardcode an unclamped width or detach it from the trigger during scrolling.

Sources: source `packages/ui/src/{dropdown-menu,context-menu,chip,popover,tooltip,infotip,preview-card,select,combobox,autocomplete}`, `packages/ui/src/internal/{menu,placement,overlay}.ts`, `docs/{selection,overlays}.md`.

### Lists, detail pages and navigation

- Use the resource's real comparison task to choose table, card grid or list/detail panes. The upstream app has both bare document tables and section-burn workflow-log headers; do not flatten these different recipes into one universal table style.
- Match row/cell density to the source table, with normal comparison rows rather than forcing `h-8` onto every business row. Keep row hover, active selection and focus distinct. A connector mark is the actual registered image, with no invented border/frame; preserve source-specific frames only where the chosen recipe uses them.
- Identity, status, metadata and actions have different text weights. Long identity/secondary text truncates or wraps deliberately without displacing the action. Numeric columns use stable formatting; preserve real zero values. Paginate when the full-list task requires it, with range/loading/error behavior.
- Breadcrumbs identify location; Tabs choose detail panels and keep the source indicator/focus behavior; side navigation chooses routes. Never use SegmentedControl as a visual replacement for any of these without matching semantics.
- Collection/file hierarchies use `file-tree`; expanding is separate from selecting and opening. Avatar, Badge and Kbd carry identity, neutral metadata and shortcuts respectively. StatusDot is operational state, not a fabricated colored Badge variant.
- Detail pages lead with identity/status/actions, then the main operational question, then secondary metadata. Keep the existing shell and data model. Settings use field groups and source save/validation boundaries; authentication, provider configuration, permissions and billing use the corresponding source form/card/modal rather than a generic dashboard recipe.

Sources: upstream `datasets/list`, `datasets/documents/components`, `app/workflow-log/list.tsx`, `app/log/list.tsx`, `app-sidebar`, `header/account-setting/data-source-page-new/card.tsx`, `billing/plan/index.tsx`; source `packages/ui/src/{breadcrumb,tabs,pagination,file-tree,avatar,badge,kbd,separator}`.

### Empty, loading, error, notification and progress

- First-use empty, filtered empty, loading, unavailable and error are separate states. Port the relevant source composition, including its illustration/SVG, copy hierarchy and action; do not drop a source asset and retain only the words. Logs empty content uses section-burn; a FilterEmptyState keeps its own source fade/geometry.
- Spinner represents active work; Skeleton/LoadingPlaceholder preserve the analogous source page's layout. Progress and Meter preserve true values/ranges and accessible labels. Do not use a spinner forever for an unavailable backend.
- Toast uses one application owner and one notification per completed action. Keep mutation feedback out of replayed effects and do not emit the same success from both dialog and parent. Persistent errors stay next to the task with recovery; source Alert is its specific informational composition, not a universal result background.
- Toast completion does not replace cache invalidation/real data refresh. An optimistic state must have a defined failure path and may not show success before the action succeeds.

Sources: source `packages/ui/src/{toast,alert,filter-empty-state,first-empty-action-card,skeleton,loading-placeholder,spinner,progress,meter}`; upstream `app/log/empty-element.tsx`, `datasets/list/first-empty-state`, `datasets/documents/components/list.tsx`.

### Editors, previews, upload and visualization

- Canvas controls, selector and node panel follow the graph recipe below. Code/JSON/result previews preserve syntax semantics, wrap/scroll choices, copy feedback, source surface and font role. Copy requires a real successful clipboard result.
- File selection shows accepted types, progress, cancel/retry, validation and selected-file removal using the matching source uploader pattern. A file preview is not an ordinary text input; the native input remains accessible and server validation stays authoritative.
- A chart uses truthful data/ranges, source text and surrounding controls. The visual series or graph layout may be Tapstate-specific; surrounding menus, filters, empty/error states and overlays still follow this contract. Distinguish an unavailable metric from zero.
- ScrollArea owns its viewport/scrollbar geometry. Collapsible owns expanded state, disclosure semantics and transition. DirectionProvider handles source logical direction; layout additions must not hardcode physical placement where the source uses logical properties.

Sources: upstream `workflow/run/{result-panel,result-text,output-panel}.tsx`, `base/file-uploader`, `workflow/{operator,block-selector,nodes/_base}`; source `packages/ui/src/{scroll-area,collapsible,direction-provider}`, plus the relevant component source for every surrounding control.

### Responsive layout, theme, localization and accessibility

- Match source behavior at desktop and narrow viewports. Keep controls within viewport, constrain popups, give long content a real scroll owner, and preserve reachable primary/close actions. Do not shrink labels/icons independently to disguise overflow.
- Inspect light and dark on the actual parent surface. A token name can have alpha values in dark mode; copying its light hex loses the relationship. Keep the source gradient/blur/shadow where that source composition uses it; generic design-skill bans do not override source fidelity.
- Use `system-*` roles with their associated line-height/weight. Preserve registered connector marks and source SVGs. Check English, Simplified Chinese and Traditional Chinese, long names, numbers, empty values and CJK line wrapping. Never infer padding or glyph dimensions from a resized screenshot.
- All controls need real names and label relationships. Check keyboard entry, selection, Escape, focus return, form submit, invalid/disabled/read-only and reduced-motion behavior as applicable. `accessible-names-and-descriptions.md` and component READMEs own the detailed contract.

Sources: source `docs/{styling,forms,selection,overlays,accessible-names-and-descriptions}.md`, `packages/ui/src/styles`, `packages/ui/src/themes`, component READMEs and the analogous application page's responsive classes.

## Page recipes

### Resource list

Use title and a compact secondary-action row, then filters/search and the single creation action, then grid or table. Keep the header visible when the content scrolls if the task needs filters in view. Do not duplicate the same resources in a navigation rail and a table, and do not show a filter that has only one effective value. Use a resource card only when the resource itself is the navigation target and summary metadata/actions share that surface. The card's navigation entry is a real link, with its own focus ring; item actions sit outside that link in an operations menu. Use a table when users compare rows by columns. The document table is a bare semantic `<table>` with no generic component export. Use its source header/row classes and cell spacing: an uppercase 32 px header, subtle row dividers, semantic text colors and hover background; it does not wrap every row in a shadowed card. Status pairs the source `StatusDot` with text and keeps the marker circular via the app-level `rounded-full` override; preserve each surface's existing dot size and the source status colors. Keep filtered-empty and first-use empty states distinct. For filtered results, use the source `FilterEmptyState` composition: muted placeholder grid, gradient fade, icon and centered explanation. For first use, use the source action-card composition with a creation action. A card grid uses shape-matched skeletons; a table can use the source `LoadingPlaceholder` as in the source document-list pattern. Use an accessible status announcement when asynchronous filtering settles.

Evidence: upstream `web/app/components/datasets/list/header.tsx`, `datasets.tsx`, `dataset-card/index.tsx`, `dataset-card-skeleton.tsx`, `first-empty-state/index.tsx`, `list/index.tsx`, `web/app/components/datasets/documents/components/{documents-header,list}.tsx`, and `document-list/components/document-table-row.tsx`.

### Form and creation flow

Group fields by decision. Use `Field`, `FieldLabel`, `FieldDescription`, `FieldError` and the matching control. Label/description/error must be programmatically associated. Required and invalid states are semantic states; disabled takes visual precedence. Use stable footer actions, with cancel/secondary before the single primary submit. Keep validation and data ownership in Formily where a schema already exists; its visible parts must match the same component anatomy.

When choosing among a small number of rich options, use the source application `RadioCard` inside the source `RadioGroup`: the icon, title, description, selection indicator, and selected border/background are one interaction. Do not replace it with an independently styled pressed button or card.

Evidence: source `docs/forms.md`, `packages/ui/src/field`, `packages/ui/src/input`, `packages/ui/src/select`, `packages/ui/src/form`.

### Detail and monitoring

Put title/status/actions first, then the primary data region. Use compact headings, metadata, dividers and whitespace; panels only for a distinct interaction boundary. The document page title and supporting description sit above a separate toolbar. Operational status is text/icon plus semantic color. Charts/canvas keep product-owned visualization colors, while their filters, menus and dialogs use the shared components.

Evidence: upstream `web/app/components/datasets/documents/components/documents-header.tsx`.

### Pipeline graph editor

Keep the Tapstate pipeline identity and routing in the left rail. Its identity row follows the source `app-info-header`: icon at 32 px, name and action menu on the first line, compact status on the second line. The name operation uses a 24 px `IconButton` and `DropdownMenu`; editing belongs in the menu. Keep the graph canvas as the main region, with floating actions in the upper right, a vertical control bar on the left, viewport controls at the lower right, and a selected-node configuration panel on the right. These regions must be reviewed together at the same viewport size as the reference.

The left control bar uses the source 32 px `IconButton`, `Toggle`, and `Separator`. Match the source order and states for Add Node, Add Note, Pointer, Hand, Organize, and export when that operation is available. The selector should use the source `Popover` and `Tabs` anatomy: 400 px panel, 12 px radius, 0.5 px panel border, section-burn tab rail, active panel indicator, search, divider, and 32 px option rows. Tapstate's selector tabs are Source, Transform, and Destination; disabled options and keyboard focus follow the primitive states. The node card uses a 240 px body, 16 px outer radius, 15 px inner radius, 24 px icon, 13 px uppercase semibold title, `workflow-block-bg`, selected option-card border, and the package's small/large shadow states.

The export control follows the source `operator/export-image.tsx` menu: a 32 px icon button beneath Organize, then Current view and Whole pipeline groups with PNG, JPEG, and SVG choices. Capture the React Flow viewport using `html-to-image`; the whole-pipeline variant derives its bounds from the graph nodes and adds 50 px padding. Resolve the export background from the rendered canvas token, including dark mode.

The node selector search uses the source `InputGroup`, `InputGroupInput`, and `InputGroupAddon` composition from the upstream `SearchInput` pattern: a 32 px input, semantic input surface, trailing search glyph, and a clear action when populated. Preserve a separate search value for Source, Transform, and Destination while switching tabs; reset all three when opening a new selector session. The selector shell uses the source panel border, panel background, section-burn tab rail, and `shadow-lg` token.

Node choice icons follow the source workflow `BlockIcon` anatomy: a 20 px rounded-md container, `shadow-xs`, a 14 px white glyph, and a semantic solid background. Canvas node icons use its 24 px rounded-lg, `shadow-md`, and 16 px glyph variant. Map and JavaScript use blue, Filter/Join/Union/Nest use cyan, View uses violet, and Target uses warning orange. Connector-backed Source and Target nodes show their connector image in the same icon slot. Keep this mapping shared between the selector and canvas; use the source `util-colors-*` tokens rather than literal colors.

Canvas node headers follow the source `_base/node.tsx`: a 240 px body, `px-3 pt-3 pb-2`, a 24 px icon with 8 px space before the title, and `system-sm-semibold-uppercase` title text. Input and output handles follow the source `_base/components/node-handle.tsx`: 16 px hit area, a transparent 4 px extension, the `workflow-link-line-handle` marker, source accent for the add control, and the semantic tooltip panel and system text roles. The available icon plugin contains the Remix collection, so use its matching add glyph where the source custom icon is unavailable.

The right panel follows the source workflow panel shell: 509 px default width with a 400 px minimum, 16 px radius, 0.5 px panel border, large shadow, resize handle, icon and title row, description, tabs, divider, then a scrollable configuration body. Its controls use package input, field, text, divider, and focus tokens. Node-specific fields retain Tapstate's Source, Transform, and Destination semantics; they do not inherit the upstream workflow data model. The top action groups use source action-bar and secondary-button surfaces, with execution/history together and contextual actions together. The labels and effects of Save, Run, and lifecycle actions must describe Tapstate's actual backend behavior.

In the Source table picker, use the source `Checkbox` for multi-selection: its 16 px root, checked fill, 12 px glyph, border, shadow, hover, focus, and disabled states come from the source package. Pair it with 14 px `text-text-secondary` labels in 32 px rows and a subtle hover background. Avoid native browser checkboxes and placeholder glyphs that add a second gap before ordinary table names.

The NEXT STEP preview follows the source `next-step` component family: a 36 px origin tile, 24 px connector line using divider-solid tokens, 10 px section-burn container, 36 px downstream item rows, 20 px node icons, and a 36 px dashed dropzone action. The top contextual action group uses the source 32 px secondary-button shell with 32 px square actions and no inner group padding. Both areas inherit the same light and dark semantic tokens as the rest of the workflow editor.

The editor uses the upstream system sans stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Noto Sans`, `Arial`, `sans-serif`) across the rail, canvas controls, selector, and node panel. Scope this stack to the pipeline workspace so other Tapstate surfaces keep their own typography. The workflow's Run/history group uses the source secondary-button surface, 32 px group height, and 28 px inner controls. In the node panel, NEXT STEP lists existing downstream nodes and opens the 328 px selector. Selecting a step there appends a connection from the selected node; it must keep any existing downstream connection. Inserting on an edge is a separate operation and replaces that edge.

Evidence: upstream `web/app/components/app-sidebar/app-info/app-info-header.tsx`, `web/app/components/workflow/{operator/control.tsx,operator/add-block.tsx,block-selector/index.tsx,block-selector/tabs.tsx,nodes/_base/node.tsx,nodes/_base/components/workflow-panel/index.tsx,header/header-in-normal.tsx}`, source `packages/ui/src/{icon-button,toggle,tabs}` and `packages/ui/src/themes/{light,dark}.css`. A source match is only a starting point: verify the rendered rail, toolbar, selector in all three tabs, ordinary and selected nodes, each node configuration kind, and the action groups at equal desktop viewport sizes before claiming visual fidelity.

### Overlay and notification

Choose `Dialog` for focused modal work, `AlertDialog` for decisions requiring explicit confirmation, `Drawer` for contextual side work, `DropdownMenu` for actions, `Select`/`Combobox` for values, `Popover` for reachable interactive explanations, `Tooltip` only for supplementary labels, and `Toast` for transient feedback. Use the app-level `@tapstate-web/ui/badge` for neutral metadata labels; it has `default`/`dimm`, not success/warning/danger tones. Show operational state with source `StatusDot` plus text. Use the app-level `@tapstate-web/ui/alert` for the blue gradient informational Alert; it comes from `web/app/components/base/alert.tsx`, accepts message, close label and hide callback, and is distinct from `AlertDialog`. Do not use the older flat `.ui-alert` styling for new screens. Let the component own its portal and focus lifecycle. Do not add call-site z-index or a second portal. An isolated application root lets body portals layer by DOM order. Toast does not replace the authoritative data refresh after mutation.

Evidence: source `docs/overlays.md`, `packages/ui/src/toast`, `packages/ui/src/dialog`, `packages/ui/src/alert-dialog`.

## Tokens and geometry

The exact palette is the source `packages/ui/src/themes/light.css`, `dark.css`, and `theme.css`. Application content uses `text-*`, `background-*`, `components-*`, `state-*`, `divider-*`, and shadow utilities exported by the package. The Tapstate product accent may be changed through a documented theme override; leave component token relationships intact. Do not translate these tokens to a smaller invented `ui-*` palette. Use the upstream `system-*` text roles and component variants. In the graph, use `workflow-link-line-normal`, `workflow-link-line-active`, and `workflow-link-line-handle` for connections, and `workflow-minimap-block` and `workflow-minimap-bg` for the minimap. These tokens must resolve through the source theme in both light and dark modes; avoid raw color substitutes.

Verified source measurements: Button small/medium/large heights 24/32/36 px with radii 6/8/10 px; Select uses the same heights/radii. Standard centered Dialog surface is 480 px wide, bounded by 32 px viewport clearance, with 24 px horizontal interior padding. Use those source values as the canonical measurements for their components. For other components inspect their source rather than extrapolating a global radius or spacing rule.

## New-page review gate

Every new page and substantial visual change must attach a review matrix with the following evidence. A reviewer rejects a page when any row is missing or contradicts source behavior:

| Check       | Required evidence                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition | Screenshot or browser inspection at desktop and narrow viewport; title/action/filter/content hierarchy and justified grid/table/card choice        |
| Components  | Import inventory showing source component subpaths or a documented Tapstate adapter; no new homegrown form/control/overlay styling                 |
| Tokens      | Changed classes use source semantic tokens; no new raw palette, arbitrary shadow, radius or call-site overlay z-index without source-backed reason |
| States      | Loading, first-use empty, filtered empty, error, disabled, invalid and selected states exercised where applicable                                  |
| Interaction | Keyboard focus, Escape, dismiss/return focus, nested overlay, accessible names and form label/error association inspected                          |
| Content     | English, simplified and traditional Chinese fit the component; long names and mobile width do not clip critical actions                            |
| Shell       | Before/after comparison confirms branded shell, main surface and navigation remain owned by Tapstate                                               |
| Provenance  | Any component change names the source file/revision and records why a local deviation is required                                                  |

Review one representative screen from each changed feature, plus each novel composition; a component-only review cannot prove a page follows the visual system. The development UI Kit must render the **source** variants/states, not an independently styled lookalike.

## Existing-page audit order

The current page inventory and review status live in [ui-page-audit.md](ui-page-audit.md). Update that record as each page is inspected; do not silently treat a typecheck or token migration as a completed page review.

1. Inventory every `apps/web/features` and `apps/cloud/app/features` screen and mark the component source used by its controls/overlays.
2. Audit resource lists and forms first (highest reuse), then dialogs/notifications, then detail and specialist screens. Record screenshots and state coverage against the matrix above.
3. Replace independent `@tapstate-web/ui` styling with direct source imports or very thin Tapstate adapters. Keep Formily's schema/data behavior and adapt its visible controls to the source field anatomy.
4. Compare each migrated screen with the appropriate upstream page recipe and the existing Tapstate shell. Record deviations in the review, not as an undocumented one-off class.
5. Treat an unaudited screen as pending, even if it builds and its colors resemble the token palette.

The current migration is **in progress**. Vendoring and a green typecheck of the subpackage do not imply that existing pages or the old UI Kit have passed this review gate.

## Assistant chat and provider settings

Apply this scene contract to every assistant panel and provider credentials form.
The shared implementation is `apps/web/styles/pipelines/pipeline-ai.css`; consumers
must reuse its roles rather than inventing per-screen colors or control sizes.

- Keep a flexible, full-width transcript and one bottom composer. Every flex child
  must permit shrinking. Long text wraps; code blocks scroll within the message.
- Render assistant answers as readable document content. Use a quiet surface for
  user messages. Do not render a bubble before the first nonblank text arrives.
- Show suggested prompts only before the first message, in a wrapping group. They
  must not reserve a second scrolling panel throughout the conversation.
- Place send/stop inside the composer. Reuse the shared Button with an accessible
  name, a 32px icon control and a 16px glyph. Never substitute a wide text CTA.
- Enter submits, Shift+Enter inserts a newline, and IME composition never submits.
  Grow the textarea from one line up to 158px, then scroll its contents.
- Reuse provider input tokens for normal, hover and focus states. Inputs are 32px
  high with an 8px radius. Keep credentials masked and retain the server's secret
  handling. Put the primary save action at the right of secondary actions.
- Preserve streaming cancellation, error recovery, draft validation, proposal
  review and explicit apply. Visual changes cannot bypass these contracts.

Source mapping (application revision `65e1fbcc2b4fd43f0bb78b58922eb543983df78e`):

| Part             | Application source                                                                    | Source anatomy                                                                                | Local implementation                                                                | Product adaptation                                               |
| ---------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Composer         | `web/app/components/base/chat/chat/chat-input-area/index.tsx`                         | 12px shell radius, semantic chat border/panel background, 9px inset, 158px maximum input area | `PipelineAiCopilot.tsx`, `.pipeline-ai-composer`                                    | Existing stream transport and draft preparation                  |
| Send             | `web/app/components/base/chat/chat/chat-input-area/operation.tsx`                     | Shared primary Button, 32px width, 16px glyph, accessible label                               | Shared Button through existing compatibility export                                 | Stop occupies the same operation slot                            |
| Credential input | `web/app/components/header/account-setting/model-provider-page/model-modal/Input.tsx` | 32px height, 8px radius, semantic input states                                                | `AssistantProviderForm.tsx`, shared Input through the existing compatibility export | Existing endpoint/model/key API and encrypted credential storage |

Step-card AI actions follow `web/app/components/workflow/nodes/llm/components/prompt-generator-btn.tsx`
at the same application revision: a shared 24px icon action with a 16px glyph,
accessible name and semantic accent hover. Place it in the relevant card header
or beside the related-table action. Tapstate opens the existing assistant panel,
sets the step context, fills the prompt and focuses the composer; it does not
apply a generated edit automatically. The Input Table composer shares the chat
shell and operation geometry. Provider inputs and all submit/review actions reuse
the existing shared Input/Button implementations, including loading and disabled
states.

The application question bubble uses a background token introduced after the
source baseline; use the existing panel alternative token until that component
baseline is upgraded, rather than referencing an undefined CSS variable.

Component geometry and interaction states remain owned by the existing shared
component implementation. The application reference supplies composition; it does
not introduce a second chat transport or credentials store. Rendering evidence
must be recorded separately; this mapping alone is not visual acceptance.

### Streaming assistant messages

Use `AssistantMarkdown.tsx` for assistant output. It lazy-loads Streamdown 2.7.0,
matching the application reference at the revision above, with streaming mode,
incomplete Markdown parsing and the actual responding state. Keep the streaming
parser after cancellation so partially generated formatting remains readable.
The code plugin supplies Shiki highlighting and code-copy controls; translations
come from the application's locale resources. Do not add an artificial timer to
replay text that has already arrived from the server.

Source mapping: `web/app/components/base/markdown/streamdown-wrapper.tsx` owns the
parser recipe; `web/app/components/base/chat/chat/answer/basic-content.tsx` owns
answer content and UNC-path preservation; `web/app/components/base/chat/chat/answer/index.tsx`
and `loading-anim/` own first-text waiting feedback. Use the 24×20px waiting slot,
4px dots with 7px offsets, one-second alternating animation and staggered delays;
colors come from semantic text tokens, and reduced motion disables the animation.

The existing transport still owns server events, cancellation and completion.
Do not announce the entire growing response through an aria-live region on every
token. Announce status separately and mark the active response busy. Follow output
while the transcript is at the bottom; scrolling up to read must preserve that
position until the user returns to the bottom or submits a new request.

Browser acceptance used delayed SSE chunks through the real chat component:
waiting before the first text, incomplete emphasis, partial table/code output,
and cancellation with retained content. This is rendering evidence with a local
fixture, not evidence of availability of a deployed model provider.
