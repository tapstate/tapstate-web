# Component and token source

This file identifies the implementation that Tapstate page authors and reviewers must use. [DESIGN.md](DESIGN.md) owns page composition and review. The pinned source revision is stated in [DESIGN.md](DESIGN.md); the package preserves its `LICENSE`.

## Ownership

- `packages/ui/src` preserves the component source directory layout from revision `3552815c89415716dfd9cac80fd7c73aac3b051e`. `package.json` maps public subpaths directly to those files; the private workspace package has no root barrel.
- `@base-ui/react` owns headless keyboard, selection, focus and popup behavior underneath many components. Importing Base UI directly and restyling it does **not** reproduce the source component contract.
- `apps/web` and `apps/cloud` own product text, data, branded shells and app-specific behavior. When Formily, providers, or route behavior differs from a source component API, compose an app-owned adapter that delegates to the source primitive.
- The upstream application's `web/app/components/base` holds application-level patterns such as Badge, Alert, SearchInput and skeletons that are not exported by upstream `packages/ui`. Review their dependency and CSS footprint before porting a pattern; do not invent a substitute and call it an upstream component.
- `search-input` is now an example of that port: its behavior and structure come from upstream `web/app/components/base/search-input`, with labels supplied by Tapstate i18n. The local adaptation is implemented in the `packages/ui` component source.

## Import and style contract

Use named subpaths such as `@tapstate-web/ui/button`, `/field`, `/input`, `/select`, `/dialog`, `/toast`. Each app imports `@tapstate-web/ui/styles.css` after Tailwind and scans `packages/ui/src` with `@source`. Theme values are selected by `html[data-theme='light'|'dark']`. The Cloud theme switch synchronizes this attribute with its existing `.dark` class; Web currently initializes light. Product branding and shell CSS stay app-owned. The component theme is not the shell theme.

The CSS entry is `packages/ui/src/styles/styles.css`; it imports the component styles and theme files under `packages/ui/src/themes`. Source families include `--color-text-*`, `--color-background-*`, `--color-components-*`, `--color-state-*`, `--color-divider-*` and package shadow/text utilities. Copy the token _relationships_ and state selectors; a brand override changes the accent values at the theme boundary. Do not map everything into generic neutral/success/danger aliases and lose component-specific roles.

## Public component catalog

| Need               | Source subpath                                                                                                             | Compose / review                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions            | `button`, `icon-button`, `toggle`                                                                                          | `Button` variant `primary`, `secondary`, `secondary-accent`, `tertiary`, `ghost`, `text`; tone `default`/`destructive`; size `small`/`medium`/`large`; loading keeps label and geometry |
| Fields             | `field`, `fieldset`, `form`, `input`, `input-group`, `textarea`, `number-field`                                            | Native labels, descriptions, errors, required/invalid/disabled state; control owns focus ring                                                                                           |
| Choices            | `checkbox`, `checkbox-group`, `radio-group`, `switch`, `select`, `combobox`, `autocomplete`, `slider`, `segmented-control` | Use typed value primitives; list popups own keyboard navigation and positioning                                                                                                         |
| Date/time          | `date-picker`, `time-picker`, `date-time-picker`                                                                           | Use package value/localization contract before adding app parsing                                                                                                                       |
| Feedback           | `toast`, `progress`, `meter`, `spinner`, `status-dot`                                                                      | Toast supports info/success/warning/error, update/dismiss/promise and a mounted `Toaster`                                                                                               |
| Floating           | `dialog`, `alert-dialog`, `drawer`, `popover`, `tooltip`, `infotip`, `preview-card`                                        | Match the semantic intent; preserve package portal/focus/dismiss behavior                                                                                                               |
| Navigation/actions | `dropdown-menu`, `context-menu`, `tabs`, `breadcrumb`, `pagination`, `file-tree`                                           | Menus are actions; selects/comboboxes are values                                                                                                                                        |
| Content/layout     | `avatar`, `collapsible`, `scroll-area`, `separator`, `kbd`                                                                 | Use semantic tokens and package geometry                                                                                                                                                |

The full public export list and exact prop types live in `packages/ui/package.json` and the corresponding `packages/ui/src/<component>/index.tsx` source file. Do not document guessed props in app code. `cn`, `merge-props`, `use-render` and ref helpers have public subpaths for package composition.

## Complete scene routing

Read DESIGN.md's **Source fidelity is a delivery requirement**, **Surface and token decision table**, and **Scene contracts** before composing a new surface. This catalog routes every current public export to its contract; it does not replace the actual implementation or component README. Review this table against `package.json` whenever exports change.

| Scene / responsibility                                              | Public subpaths                                                                                               | Contract owner                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Action and shortcut                                                 | `button`, `icon-button`, `toggle`, `kbd`                                                                      | DESIGN.md: Buttons, icon buttons and action groups; each component source                       |
| Form boundary and label/error association                           | `form`, `field`, `fieldset`                                                                                   | `docs/forms.md`, `docs/accessible-names-and-descriptions.md`                                    |
| Plain, grouped, multiline and numeric entry                         | `input`, `input-group`, `textarea`, `number-field`                                                            | `packages/ui/src/internal/form-control.ts`; DESIGN.md: Forms and schema-driven controls         |
| Boolean, exclusive and range choice                                 | `checkbox`, `checkbox-group`, `radio-group`, `radio-card`, `switch`, `slider`, `segmented-control`            | `docs/selection.md`; component and application RadioCard source                                 |
| Closed/searchable/free-form collection values                       | `select`, `combobox`, `autocomplete`                                                                          | `docs/selection.md`; typed collections, selected labels and popup lifecycle                     |
| Search and applied filter                                           | `search-input`, `chip`                                                                                        | Ported application source; DESIGN.md: Menus, filters and contextual help                        |
| Civil date, time and timestamp entry                                | `date-picker`, `time-picker`, `date-time-picker`                                                              | `packages/ui/src/date-time/README.md`; preserve commit/localization semantics                   |
| Focused and confirming modal work                                   | `dialog`, `alert-dialog`                                                                                      | `docs/overlays.md`; DESIGN.md: Dialogs, drawers and nested surfaces                             |
| Contextual side work                                                | `drawer`                                                                                                      | `docs/overlays.md`; matching application drawer composition                                     |
| Command surface                                                     | `dropdown-menu`, `context-menu`                                                                               | `packages/ui/src/internal/menu.ts`, component source and READMEs                                |
| Nearby interactive explanation / supplementary label / link preview | `popover`, `infotip`, `tooltip`, `preview-card`                                                               | `docs/overlays.md`; preserve distinct interaction intent                                        |
| Location, panel selection and paging                                | `breadcrumb`, `tabs`, `pagination`                                                                            | Component source; DESIGN.md: Lists, detail pages and navigation                                 |
| Hierarchy, expansion, scrolling and separation                      | `file-tree`, `collapsible`, `scroll-area`, `separator`                                                        | Component source; preserve keyboard, scroll and expanded state                                  |
| Identity, metadata and state                                        | `avatar`, `badge`, `status-dot`                                                                               | Source variants; Badge is neutral metadata, StatusDot carries operational status                |
| Transient/persistent feedback and measured work                     | `toast`, `alert`, `spinner`, `progress`, `meter`                                                              | Source component semantics; DESIGN.md: Empty, loading, error, notification and progress         |
| Initial load, first use and filtered empty                          | `skeleton`, `loading-placeholder`, `first-empty-action-card`, `filter-empty-state`                            | Matching application composition; retain source SVG/illustration and hierarchy                  |
| Theme, direction and composition infrastructure                     | `styles.css`, `direction-provider`, `cn`, `merge-props`, `use-render`, `use-merged-refs`, `use-ref-with-init` | Styling/overlay/accessibility guides and helper implementations; no independent visual defaults |

### Content surfaces versus control surfaces

Use `bg-background-section-burn` for Source connection-test results and recessed result/trace/grouped content. The source references and exact pinned light/dark values are in DESIGN.md's surface table. Keep `components-input-bg-normal` and its hover/active/disabled siblings on actual input-family controls. Some source pages deliberately use an input surface for text output; record that specific page mapping instead of treating it as the rule for every result panel.

Dialog header/body/footer side padding is 24px from `dialog/index.tsx`. A DialogContent alone does not pad arbitrary children: use DialogBody. Inner result-well padding is a separate measurement; Source check results use 12px from the text-result composition. Do not merge outer and inner spacing into a guessed 32px page default.

IconButton's `md` is 24px and `lg` is 32px; Button's `medium` is 32px. These are different size APIs. The glyph and the hit area are also different measurements. Copy the source call site's icon dimensions instead of applying a blanket SVG rule.

`StatusDot` source defaults are rounded squares. Product status markers retain the existing circular silhouette by passing `className="rounded-full"` at the call site; choose `small` or `medium` to preserve the existing surface's size, and keep the source status color.

## Verified dimensions and states

| Component      | Source-backed dimensions                                                                              | State owner                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Button         | 24/32/36 px heights; 6/8/10 px radius                                                                 | `button/index.tsx`: variant, tone, size, loading, disabled, focus-visible                                        |
| Select trigger | 24/32/36 px heights; 6/8/10 px radius                                                                 | `select/index.tsx`: placeholder, open, hover, disabled, selected; when values differ from labels, supply `items` |
| Input          | 8 px radius and component input background/text tokens                                                | `input/index.tsx`: hover, focus, invalid, disabled                                                               |
| Dialog         | 480 px default width; max viewport minus 32 px; 24 px side padding                                    | `dialog/index.tsx`: portal, focus containment, body scrolling, header/footer                                     |
| Resource card  | 0.5 px border, 12 px radius, tokenized hover and small shadow in the upstream knowledge-resource grid | Upstream `web/app/components/datasets/list/dataset-card/index.tsx`; page pattern, not package primitive          |

Use the source `docs/styling.md`, `forms.md`, `selection.md`, `overlays.md`, `accessible-names-and-descriptions.md`, and component README files as detailed behavior contracts. State styling should use Base UI data attributes and CSS variables. The call site must not mirror primitive state in React merely to style it.

## Migration and deviation review

For each app screen, record: current control/overlay imports, direct source replacement, state matrix, desktop/mobile screenshot, light/dark result, and shell comparison. A direct import is preferred. An adapter is allowed for Tapstate data, i18n, router or Formily binding; it cannot own independent geometry, color, shadows, focus or overlay layering. If the package lacks an upstream application-level pattern, cite the upstream `web/app/components/base` source and list every dependency before deciding whether to port it. Any necessary Tapstate-specific visual deviation goes into a named theme override or a documented local component contract, with source and reason.

Current status: **the package source tree matches the original component layout, and apps use direct subpaths or app-owned behavior adapters**. Page-level visual and interaction reviews remain in progress. Earlier `@tapstate-web/ui` token tables and UI Kit examples are legacy work and are not evidence of source fidelity.

## Provenance correction: shared content controls

The initial UI Kit displayed a locally styled flat Alert while the upstream app uses `web/app/components/base/alert.tsx` with a blue gradient. The flat implementation and its public export have been removed. The UI Kit now renders the source application Alert directly. `AlertDialog` is a separate confirmation primitive, and Toast is the transient notification primitive.

Tapstate-only page compositions such as panels, selectable cards, action rows, and empty states stay in application code. Shared package exports map directly to the component source tree. The UI Kit uses the application-level source `RadioCard` and `FilterEmptyState` from `@tapstate-web/ui`. Its surrounding sections are page composition, not component exports. For new pages, select the source empty-state pattern for the actual state: filtered results, first use, and loading have different source implementations. A UI Kit example alone is not acceptance evidence for a business page.

The application-level Badge now comes from upstream `web/app/components/base/badge.tsx` through `@tapstate-web/ui/badge`; its actual variants are `default` and `dimm`. Colored success/warning states in the UI Kit use `StatusDot` with text instead of fabricated Badge tones.

The upstream document list has no generic Table component: `web/app/components/datasets/documents/components/list.tsx` renders a semantic table, while `style.module.css` supplies cell spacing and `document-table-row.tsx` supplies row hover/navigation. Tapstate Views and the UI Kit now use this page pattern directly. Do not recreate a second table API merely to mimic the markup; review table composition in each resource page.
