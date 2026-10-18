# Tapstate UI DESIGN

## Authority and scope

This is the review contract for all new and existing content inside Tapstate Web and Cloud. The outer `app-shell` and main surface, navigation, product marks, and product-specific graph canvas remain Tapstate-owned. Every ordinary control and overlay inside those boundaries follows the vendored Dify UI package and its semantic tokens. The exact component APIs and token source are indexed in [design-system.md](design-system.md).

The system-level interaction inventory and per-flow review protocol live in [ui-interaction-audit.md](ui-interaction-audit.md). Use it whenever a page opens an overlay, displays feedback, accepts a value, or changes data.

Source baseline: Dify `3552815c89415716dfd9cac80fd7c73aac3b051e`, 2026-10-17. The component implementation comes from `packages/dify-ui` in this repository. Page rules below were read from the upstream knowledge list header, dataset list/card, document header, and the package's styling/overlay/form guides. When a rule and a remembered screenshot disagree, inspect that pinned source and record the decision before inventing a new variant.

## Visual philosophy

1. **Work first.** The title, primary action, filters, content, and state form a visible hierarchy. Decoration does not compete with the user's task. Dify's knowledge list uses a compact sticky title row, a second toolbar row, then a content grid; its document view uses title/description, then filters/actions, then the list.
2. **Dense but legible.** Controls default to 32 px. Small actions use 24 px; prominent actions use 36 px. UI copy is generally 12–14 px; the knowledge list title is 18 px. Row spacing and one-pixel dividers carry hierarchy before extra containers.
3. **Semantic surfaces.** Body, panel, card, input, and overlay each have their own semantic background/border tokens. A resource card is justified when the whole item is selectable and carries multiple pieces of metadata and actions. Ordinary text groups do not become cards. Dify's knowledge card uses a 0.5 px border, 12 px radius, restrained shadow, and a hover change; the list uses a 296 px minimum card width and 12 px gap. These are examples to follow for resource grids, not universal page measurements.
4. **One action weight.** Each view has one obvious primary action. Secondary and ghost actions are quieter. Destructive intent uses the component's `tone`; do not create a new red button style. Place low-frequency item actions in a menu.
5. **State is part of the composition.** Grid loading skeletons preserve final card geometry; the document table's initial load uses a centered source Spinner. Choose from the analogous source page instead of imposing one loading treatment everywhere. First-use empty states and filtered-empty states have different messages and actions. Errors show recovery. Disabled, invalid, selected, hover, active, and keyboard-focus states come from component APIs and Base UI data attributes; color alone never carries status.
6. **Content ownership.** App code owns labels, translated text, permissions, data and navigation. The vendored component owns geometry, focus, dismissal, layers, field behavior and variants. Keep styling changes in token/theme mapping or the vendored source, with upstream provenance, rather than scattered `className` corrections.

## Page recipes

### Resource list

Use title and a compact secondary-action row, then filters/search and the single creation action, then grid or table. Keep the header visible when the content scrolls if the task needs filters in view. Do not duplicate the same resources in a navigation rail and a table, and do not show a filter that has only one effective value. Use a resource card only when the resource itself is the navigation target and summary metadata/actions share that surface. The card's navigation entry is a real link, with its own focus ring; item actions sit outside that link in an operations menu. Use a table when users compare rows by columns. Dify's document table is a bare semantic `<table>` with no generic component export. Use its header/row classes and cell spacing: an uppercase 32 px header, subtle row dividers, semantic text colors and hover background; it does not wrap every row in a shadowed card. Status pairs the source `StatusDot` with text. Keep filtered-empty and first-use empty states distinct. For filtered results, use the source `FilterEmptyState` composition: muted placeholder grid, gradient fade, icon and centered explanation. For first use, use the source action-card composition with a creation action. A card grid uses shape-matched skeletons; a table can use the source `LoadingPlaceholder` as Dify's document list does. Use an accessible status announcement when asynchronous filtering settles.

Evidence: upstream `web/app/components/datasets/list/header.tsx`, `datasets.tsx`, `dataset-card/index.tsx`, `dataset-card-skeleton.tsx`, `first-empty-state/index.tsx`, `list/index.tsx`, `web/app/components/datasets/documents/components/{documents-header,list}.tsx`, and `document-list/components/document-table-row.tsx`.

### Form and creation flow

Group fields by decision. Use `Field`, `FieldLabel`, `FieldDescription`, `FieldError` and the matching control. Label/description/error must be programmatically associated. Required and invalid states are semantic states; disabled takes visual precedence. Use stable footer actions, with cancel/secondary before the single primary submit. Keep validation and data ownership in Formily where a schema already exists; its visible parts must match the same component anatomy.

When choosing among a small number of rich options, use the source application `RadioCard` inside the source `RadioGroup`: the icon, title, description, selection indicator, and selected border/background are one interaction. Do not replace it with an independently styled pressed button or card.

Evidence: vendored `docs/forms.md`, `src/field`, `src/input`, `src/select`, `src/form`.

### Detail and monitoring

Put title/status/actions first, then the primary data region. Use compact headings, metadata, dividers and whitespace; panels only for a distinct interaction boundary. The document page title and supporting description sit above a separate toolbar. Operational status is text/icon plus semantic color. Charts/canvas keep product-owned visualization colors, while their filters, menus and dialogs use the shared components.

Evidence: upstream `web/app/components/datasets/documents/components/documents-header.tsx`.

### Overlay and notification

Choose `Dialog` for focused modal work, `AlertDialog` for decisions requiring explicit confirmation, `Drawer` for contextual side work, `DropdownMenu` for actions, `Select`/`Combobox` for values, `Popover` for reachable interactive explanations, `Tooltip` only for supplementary labels, and `Toast` for transient feedback. Use the app-level `@langgenius/dify-ui/badge` for neutral metadata labels; it has `default`/`dimm`, not success/warning/danger tones. Show operational state with source `StatusDot` plus text. Use the app-level `@langgenius/dify-ui/alert` for the blue gradient informational Alert; it comes from `web/app/components/base/alert.tsx`, accepts message, close label and hide callback, and is distinct from `AlertDialog`. Do not use the older flat `.ui-alert` styling for new screens. Let the component own its portal and focus lifecycle. Do not add call-site z-index or a second portal. An isolated application root lets body portals layer by DOM order. Toast does not replace the authoritative data refresh after mutation.

Evidence: vendored `docs/overlays.md`, `src/toast`, `src/dialog`, `src/alert-dialog`.

## Tokens and geometry

The exact palette is the vendored `src/themes/light.css`, `dark.css`, and `theme.css`. Application content uses `text-*`, `background-*`, `components-*`, `state-*`, `divider-*`, and shadow utilities exported by the package. The Tapstate product accent may be changed through a documented theme override; leave component token relationships intact. Do not translate these tokens to a smaller invented `ui-*` palette. Use the upstream `system-*` text roles and component variants.

Verified source measurements: Button small/medium/large heights 24/32/36 px with radii 6/8/10 px; Select uses the same heights/radii. Standard centered Dialog surface is 480 px wide, bounded by 32 px viewport clearance, with 24 px horizontal interior padding. Use those source values as the canonical measurements for their components. For other components inspect their source rather than extrapolating a global radius or spacing rule.

## New-page review gate

Every new page and substantial visual change must attach a review matrix with the following evidence. A reviewer rejects a page when any row is missing or contradicts source behavior:

| Check       | Required evidence                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition | Screenshot or browser inspection at desktop and narrow viewport; title/action/filter/content hierarchy and justified grid/table/card choice          |
| Components  | Import inventory showing vendored component subpaths or a documented Tapstate adapter; no new homegrown form/control/overlay styling                 |
| Tokens      | Changed classes use vendored semantic tokens; no new raw palette, arbitrary shadow, radius or call-site overlay z-index without source-backed reason |
| States      | Loading, first-use empty, filtered empty, error, disabled, invalid and selected states exercised where applicable                                    |
| Interaction | Keyboard focus, Escape, dismiss/return focus, nested overlay, accessible names and form label/error association inspected                            |
| Content     | English, simplified and traditional Chinese fit the component; long names and mobile width do not clip critical actions                              |
| Shell       | Before/after comparison confirms branded shell, main surface and navigation remain owned by Tapstate                                                 |
| Provenance  | Any component change names the vendored source file/revision and records why a local deviation is required                                           |

Review one representative screen from each changed feature, plus each novel composition; a component-only review cannot prove a page follows the visual system. The development UI Kit must render the **vendored** variants/states, not an independently styled lookalike.

## Existing-page audit order

The current page inventory and review status live in [ui-page-audit.md](ui-page-audit.md). Update that record as each page is inspected; do not silently treat a typecheck or token migration as a completed page review.

1. Inventory every `apps/web/features` and `apps/cloud/app/features` screen and mark the component source used by its controls/overlays.
2. Audit resource lists and forms first (highest reuse), then dialogs/notifications, then detail and specialist screens. Record screenshots and state coverage against the matrix above.
3. Replace independent `@tapstate-web/ui` styling with direct vendored imports or very thin Tapstate adapters. Keep Formily's schema/data behavior and adapt its visible controls to the vendored field anatomy.
4. Compare each migrated screen with the appropriate upstream page recipe and the existing Tapstate shell. Record deviations in the review, not as an undocumented one-off class.
5. Treat an unaudited screen as pending, even if it builds and its colors resemble the token palette.

The current migration is **in progress**. Vendoring and a green typecheck of the subpackage do not imply that existing pages or the old UI Kit have passed this review gate.
