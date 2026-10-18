# Component and token source

This file identifies the implementation that Tapstate page authors and reviewers must use. [DESIGN.md](DESIGN.md) owns page composition and review. The pinned upstream source is recorded in [`packages/dify-ui/UPSTREAM.md`](../../packages/dify-ui/UPSTREAM.md); the vendored package preserves its `LICENSE`.

## Ownership

- `packages/dify-ui` contains the Dify-authored component source and semantic CSS theme from revision `3552815c89415716dfd9cac80fd7c73aac3b051e`. Its public `@langgenius/dify-ui/<component>` subpaths are the preferred import boundary. It is a private workspace package, not a published npm dependency.
- `@base-ui/react` owns headless keyboard, selection, focus and popup behavior underneath many components. Importing Base UI directly and restyling it does **not** reproduce the Dify component system.
- `apps/web` and `apps/cloud` own product text, data and branded shells. `packages/ui` currently contains independently styled Tapstate controls from an earlier attempt; migration away from those visual implementations remains open. Compatibility adapters may map old props to vendored components but may not redraw them.
- Dify's `web/app/components/base` holds some application-level patterns such as Badge, Alert, SearchInput and skeletons that are not exported by upstream `packages/dify-ui`. Review their dependency and CSS footprint before porting a pattern; do not invent a substitute and call it an upstream component.
- `search-input` is now an example of that port: its behavior and structure come from upstream `web/app/components/base/search-input`, with labels supplied by Tapstate i18n. The exact adaptation is recorded in `packages/dify-ui/UPSTREAM.md`.

## Import and style contract

Use named subpaths such as `@langgenius/dify-ui/button`, `/field`, `/input`, `/select`, `/dialog`, `/toast`. Each app imports `@langgenius/dify-ui/styles.css` after Tailwind and scans the vendored source with `@source`. Theme values are selected by `html[data-theme='light'|'dark']`. The Cloud theme switch synchronizes this attribute with its existing `.dark` class; Web currently initializes light. Product branding and shell CSS stay app-owned. The component theme is not the shell theme.

The CSS entry imports `src/themes/theme.css`, `light.css`, `dark.css`, `styles/utilities.css` and `styles/components.css`. Source families include `--color-text-*`, `--color-background-*`, `--color-components-*`, `--color-state-*`, `--color-divider-*` and package shadow/text utilities. Copy the token _relationships_ and state selectors; a brand override changes the accent values at the theme boundary. Do not map everything into generic neutral/success/danger aliases and lose component-specific roles.

## Public component catalog

| Need               | Vendored subpath                                                                                                           | Compose / review                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions            | `button`, `icon-button`, `toggle`                                                                                          | `Button` variant `primary`, `secondary`, `secondary-accent`, `tertiary`, `ghost`, `text`; tone `default`/`destructive`; size `small`/`medium`/`large`; loading keeps label and geometry |
| Fields             | `field`, `fieldset`, `form`, `input`, `input-group`, `textarea`, `number-field`                                            | Native labels, descriptions, errors, required/invalid/disabled state; control owns focus ring                                                                                           |
| Choices            | `checkbox`, `checkbox-group`, `radio-group`, `switch`, `select`, `combobox`, `autocomplete`, `slider`, `segmented-control` | Use typed value primitives; list popups own keyboard navigation and positioning                                                                                                         |
| Date/time          | `date-picker`, `time-picker`, `date-time-picker`                                                                           | Use package value/localization contract before adding app parsing                                                                                                                       |
| Feedback           | `toast`, `progress`, `meter`, `spinner`, `status-dot`                                                                      | Toast supports info/success/warning/error, update/dismiss/promise and a mounted `Toaster`                                                                                               |
| Floating           | `dialog`, `alert-dialog`, `drawer`, `popover`, `tooltip`, `infotip`, `preview-card`                                        | Match the semantic intent; preserve package portal/focus/dismiss behavior                                                                                                               |
| Navigation/actions | `dropdown-menu`, `context-menu`, `tabs`, `breadcrumb`, `pagination`, `file-tree`                                           | Menus are actions; selects/comboboxes are values                                                                                                                                        |
| Content/layout     | `avatar`, `collapsible`, `scroll-area`, `separator`, `kbd`                                                                 | Use semantic tokens and package geometry                                                                                                                                                |

The full public export list and exact prop types live in `packages/dify-ui/package.json` and each `src/<component>/index.tsx`. Do not document guessed props in app code. `cn`, `merge-props`, `use-render` and ref helpers have public subpaths for package composition.

## Verified dimensions and states

| Component      | Source-backed dimensions                                                             | State owner                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Button         | 24/32/36 px heights; 6/8/10 px radius                                                | `button/index.tsx`: variant, tone, size, loading, disabled, focus-visible                                        |
| Select trigger | 24/32/36 px heights; 6/8/10 px radius                                                | `select/index.tsx`: placeholder, open, hover, disabled, selected; when values differ from labels, supply `items` |
| Input          | 8 px radius and component input background/text tokens                               | `input/index.tsx`: hover, focus, invalid, disabled                                                               |
| Dialog         | 480 px default width; max viewport minus 32 px; 24 px side padding                   | `dialog/index.tsx`: portal, focus containment, body scrolling, header/footer                                     |
| Resource card  | 0.5 px border, 12 px radius, tokenized hover and small shadow in Dify knowledge grid | Upstream `web/app/components/datasets/list/dataset-card/index.tsx`; page pattern, not package primitive          |

Use the vendored `docs/styling.md`, `forms.md`, `selection.md`, `overlays.md`, `accessible-names-and-descriptions.md`, and component README files as detailed behavior contracts. State styling should use Base UI data attributes and CSS variables. The call site must not mirror primitive state in React merely to style it.

## Migration and deviation review

For each app screen, record: current control/overlay imports, direct vendored replacement, state matrix, desktop/mobile screenshot, light/dark result, and shell comparison. A direct import is preferred. An adapter is allowed for Tapstate data, i18n, router or Formily binding; it cannot own independent geometry, color, shadows, focus or overlay layering. If the package lacks a Dify application-level pattern, cite the upstream `web/app/components/base` source and list every dependency before deciding whether to port it. Any necessary Tapstate-specific visual deviation goes into a named theme override or a documented local component contract, with source and reason.

Current status: **source package vendored; app migration and visual audit pending**. Button, Input, Checkbox, Switch, Select and Toast have source-backed compatibility adapters; many other shared controls and all page reviews remain pending. Earlier `@tapstate-web/ui` token tables and UI Kit examples are legacy work and are not evidence of Dify fidelity.

## Provenance correction: shared content controls

The initial UI Kit displayed a locally styled flat Alert while the upstream app uses `web/app/components/base/alert.tsx` with a blue gradient. The flat implementation and its public export have been removed. The UI Kit now renders the vendored application Alert directly. `AlertDialog` is a separate confirmation primitive, and Toast is the transient notification primitive.

The following shared `packages/ui/src/content.tsx` exports are **local implementations, not verified direct upstream reuse**: `Panel`, `SelectableCard`, `RadioCard`, `ActionRow`, `EmptyState`, `TableContainer`, `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, and `TableCell`. `Skeleton` delegates to upstream `base/skeleton`. Treat every local export as pending source matching and page review, even when its colors use semantic tokens. The UI Kit currently displays several pending controls; their presence there is not acceptance evidence.

The application-level Badge now comes from upstream `web/app/components/base/badge.tsx` through `@langgenius/dify-ui/badge`; its actual variants are `default` and `dimm`. Colored success/warning states in the UI Kit use `StatusDot` with text instead of fabricated Badge tones.
