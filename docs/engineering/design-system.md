# Shipped component and token contract

[DESIGN.md](DESIGN.md) owns page composition and review. [The evidence handbook](ui/README.md) routes the complete latest reference study. This file describes the local runtime, not a promise that every newer reference API is available.

## Baselines and owners

- Latest application/component research: `21a2081267a217ead3ec847c2d3a2522f3c30c2d`.
- Shipped component origin: `3552815c89415716dfd9cac80fd7c73aac3b051e`, plus the explicit adaptations in [product contracts](ui/product-contracts.md).
- `packages/ui/src` preserves the direct component source layout. Public subpaths map directly to their files; there is no package root barrel or nested source wrapper.
- Base UI owns headless mechanics. The package owns styled primitive anatomy, public types, variants, focus, disabled states and local overlay integration.
- Applications own translated copy, branded shells, routes, domain data, permissions, Formily and provider/session behavior. App adapters compose package primitives without a separate visual implementation.

Local application-source ports add Alert, Badge, Chip, SearchInput, RadioCard, Skeleton, LoadingPlaceholder, first-use action cards and filtered-empty patterns. Their local public APIs, not a remembered source example, are authoritative. Card/table page composition stays feature-owned; there is no invented generic Table API.

## CSS and themes

Each application imports `@tapstate-web/ui/styles.css` after Tailwind, scans `packages/ui/src`, and registers the shared icon plugin. Resolve the relative paths from the consuming stylesheet:

```css
@import 'tailwindcss';
@import '@tapstate-web/ui/styles.css';
@source '../../../packages/ui/src';
@plugin '../../../packages/ui/src/plugins/icons.ts';
```

The package CSS entry imports semantic registration, paired light/dark values, typography utilities, palette/shadow roles and component CSS. Theme values are selected with `html[data-theme]`; synchronize any app-owned theme selector. The icon plugin generates `i-ri-*` glyph utilities used by default component parts. Theme import and source scanning alone do not generate those icons.

Keep `main.css` as the stylesheet import owner, Tailwind configuration in the app Tailwind entry and feature semantic CSS in its existing layer. Use the app's established `@layer theme, base, components, utilities` arrangement. The latest reference has its own preflight and manual app-gradient layer; do not copy them wholesale over Tapstate's shell or import preflight twice.

The [complete token catalog](ui/token-catalog.json) records definitions, paired values, references, usage files and local availability. The [foundations](ui/foundations.md) explain semantic choice. A reference-only variable, a neutral brand-evidence alias or a later package prop must not enter a local call site until explicitly ported.

## Local public subpaths

All 61 local exports are listed below. The latest reference has 52, all also named locally; API/version parity still requires reading the actual files. The matching package guide owns component behavior, while the [component pattern catalog](ui/component-patterns.md) supplies latest-source analysis and caveats.

| Public subpath                             | Local source                                                                                             | Contract                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `@tapstate-web/ui/alert`                   | [./src/alert/index.tsx](../../packages/ui/src/alert/index.tsx)                                           | Matching source component and page scene                  |
| `@tapstate-web/ui/badge`                   | [./src/badge/index.tsx](../../packages/ui/src/badge/index.tsx)                                           | Matching source component and page scene                  |
| `@tapstate-web/ui/radio-card`              | [./src/radio-card/index.tsx](../../packages/ui/src/radio-card/index.tsx)                                 | Matching source component and page scene                  |
| `@tapstate-web/ui/filter-empty-state`      | [./src/filter-empty-state/index.tsx](../../packages/ui/src/filter-empty-state/index.tsx)                 | Matching source component and page scene                  |
| `@tapstate-web/ui/search-input`            | [./src/search-input/index.tsx](../../packages/ui/src/search-input/index.tsx)                             | Matching source component and page scene                  |
| `@tapstate-web/ui/skeleton`                | [./src/skeleton/index.tsx](../../packages/ui/src/skeleton/index.tsx)                                     | Matching source component and page scene                  |
| `@tapstate-web/ui/loading-placeholder`     | [./src/loading-placeholder/index.tsx](../../packages/ui/src/loading-placeholder/index.tsx)               | Matching source component and page scene                  |
| `@tapstate-web/ui/first-empty-action-card` | [./src/first-empty-action-card/index.tsx](../../packages/ui/src/first-empty-action-card/index.tsx)       | Matching source component and page scene                  |
| `@tapstate-web/ui/styles.css`              | [./src/styles/styles.css](../../packages/ui/src/styles/styles.css)                                       | Theme/composition infrastructure                          |
| `@tapstate-web/ui/cn`                      | [./src/cn.ts](../../packages/ui/src/cn.ts)                                                               | Theme/composition infrastructure                          |
| `@tapstate-web/ui/use-merged-refs`         | [./src/use-merged-refs.ts](../../packages/ui/src/use-merged-refs.ts)                                     | Theme/composition infrastructure                          |
| `@tapstate-web/ui/use-ref-with-init`       | [./src/use-ref-with-init.ts](../../packages/ui/src/use-ref-with-init.ts)                                 | Theme/composition infrastructure                          |
| `@tapstate-web/ui/use-render`              | [./src/use-render.ts](../../packages/ui/src/use-render.ts)                                               | Theme/composition infrastructure                          |
| `@tapstate-web/ui/merge-props`             | [./src/merge-props.ts](../../packages/ui/src/merge-props.ts)                                             | Theme/composition infrastructure                          |
| `@tapstate-web/ui/alert-dialog`            | [./src/alert-dialog/index.tsx](../../packages/ui/src/alert-dialog/index.tsx)                             | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/autocomplete`            | [./src/autocomplete/index.tsx](../../packages/ui/src/autocomplete/index.tsx)                             | Selection, typed values and focus                         |
| `@tapstate-web/ui/avatar`                  | [./src/avatar/index.tsx](../../packages/ui/src/avatar/index.tsx)                                         | Matching source component and page scene                  |
| `@tapstate-web/ui/breadcrumb`              | [./src/breadcrumb/index.tsx](../../packages/ui/src/breadcrumb/index.tsx)                                 | Matching source component and page scene                  |
| `@tapstate-web/ui/button`                  | [./src/button/index.tsx](../../packages/ui/src/button/index.tsx)                                         | Command/link semantics, variants and naming               |
| `@tapstate-web/ui/icon-button`             | [./src/icon-button/index.tsx](../../packages/ui/src/icon-button/index.tsx)                               | Command/link semantics, variants and naming               |
| `@tapstate-web/ui/toggle`                  | [./src/toggle/index.tsx](../../packages/ui/src/toggle/index.tsx)                                         | Command/link semantics, variants and naming               |
| `@tapstate-web/ui/checkbox`                | [./src/checkbox/index.tsx](../../packages/ui/src/checkbox/index.tsx)                                     | Selection, typed values and focus                         |
| `@tapstate-web/ui/checkbox-group`          | [./src/checkbox-group/index.tsx](../../packages/ui/src/checkbox-group/index.tsx)                         | Selection, typed values and focus                         |
| `@tapstate-web/ui/chip`                    | [./src/chip/index.tsx](../../packages/ui/src/chip/index.tsx)                                             | Matching source component and page scene                  |
| `@tapstate-web/ui/combobox`                | [./src/combobox/index.tsx](../../packages/ui/src/combobox/index.tsx)                                     | Selection, typed values and focus                         |
| `@tapstate-web/ui/collapsible`             | [./src/collapsible/index.tsx](../../packages/ui/src/collapsible/index.tsx)                               | Matching source component and page scene                  |
| `@tapstate-web/ui/context-menu`            | [./src/context-menu/index.tsx](../../packages/ui/src/context-menu/index.tsx)                             | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/dialog`                  | [./src/dialog/index.tsx](../../packages/ui/src/dialog/index.tsx)                                         | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/date-picker`             | [./src/date-time/date-picker/index.tsx](../../packages/ui/src/date-time/date-picker/index.tsx)           | Civil/time/instant model and commit semantics             |
| `@tapstate-web/ui/date-time-picker`        | [./src/date-time/date-time-picker/index.tsx](../../packages/ui/src/date-time/date-time-picker/index.tsx) | Civil/time/instant model and commit semantics             |
| `@tapstate-web/ui/drawer`                  | [./src/drawer/index.tsx](../../packages/ui/src/drawer/index.tsx)                                         | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/dropdown-menu`           | [./src/dropdown-menu/index.tsx](../../packages/ui/src/dropdown-menu/index.tsx)                           | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/field`                   | [./src/field/index.tsx](../../packages/ui/src/field/index.tsx)                                           | Forms, labels, field values and state                     |
| `@tapstate-web/ui/fieldset`                | [./src/fieldset/index.tsx](../../packages/ui/src/fieldset/index.tsx)                                     | Forms, labels, field values and state                     |
| `@tapstate-web/ui/file-tree`               | [./src/file-tree/index.tsx](../../packages/ui/src/file-tree/index.tsx)                                   | Matching source component and page scene                  |
| `@tapstate-web/ui/form`                    | [./src/form/index.tsx](../../packages/ui/src/form/index.tsx)                                             | Forms, labels, field values and state                     |
| `@tapstate-web/ui/input`                   | [./src/input/index.tsx](../../packages/ui/src/input/index.tsx)                                           | Forms, labels, field values and state                     |
| `@tapstate-web/ui/input-group`             | [./src/input-group/index.tsx](../../packages/ui/src/input-group/index.tsx)                               | Forms, labels, field values and state                     |
| `@tapstate-web/ui/kbd`                     | [./src/kbd/index.tsx](../../packages/ui/src/kbd/index.tsx)                                               | Command/link semantics, variants and naming               |
| `@tapstate-web/ui/meter`                   | [./src/meter/index.tsx](../../packages/ui/src/meter/index.tsx)                                           | Matching source component and page scene                  |
| `@tapstate-web/ui/progress`                | [./src/progress/index.tsx](../../packages/ui/src/progress/index.tsx)                                     | Matching source component and page scene                  |
| `@tapstate-web/ui/number-field`            | [./src/number-field/index.tsx](../../packages/ui/src/number-field/index.tsx)                             | Forms, labels, field values and state                     |
| `@tapstate-web/ui/pagination`              | [./src/pagination/index.tsx](../../packages/ui/src/pagination/index.tsx)                                 | Matching source component and page scene                  |
| `@tapstate-web/ui/radio-group`             | [./src/radio-group/index.tsx](../../packages/ui/src/radio-group/index.tsx)                               | Selection, typed values and focus                         |
| `@tapstate-web/ui/popover`                 | [./src/popover/index.tsx](../../packages/ui/src/popover/index.tsx)                                       | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/preview-card`            | [./src/preview-card/index.tsx](../../packages/ui/src/preview-card/index.tsx)                             | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/scroll-area`             | [./src/scroll-area/index.tsx](../../packages/ui/src/scroll-area/index.tsx)                               | Matching source component and page scene                  |
| `@tapstate-web/ui/select`                  | [./src/select/index.tsx](../../packages/ui/src/select/index.tsx)                                         | Selection, typed values and focus                         |
| `@tapstate-web/ui/status-dot`              | [./src/status-dot/index.tsx](../../packages/ui/src/status-dot/index.tsx)                                 | Matching source component and page scene                  |
| `@tapstate-web/ui/slider`                  | [./src/slider/index.tsx](../../packages/ui/src/slider/index.tsx)                                         | Selection, typed values and focus                         |
| `@tapstate-web/ui/switch`                  | [./src/switch/index.tsx](../../packages/ui/src/switch/index.tsx)                                         | Selection, typed values and focus                         |
| `@tapstate-web/ui/segmented-control`       | [./src/segmented-control/index.tsx](../../packages/ui/src/segmented-control/index.tsx)                   | Selection, typed values and focus                         |
| `@tapstate-web/ui/tabs`                    | [./src/tabs/index.tsx](../../packages/ui/src/tabs/index.tsx)                                             | Matching source component and page scene                  |
| `@tapstate-web/ui/textarea`                | [./src/textarea/index.tsx](../../packages/ui/src/textarea/index.tsx)                                     | Forms, labels, field values and state                     |
| `@tapstate-web/ui/time-picker`             | [./src/date-time/time-picker/index.tsx](../../packages/ui/src/date-time/time-picker/index.tsx)           | Civil/time/instant model and commit semantics             |
| `@tapstate-web/ui/toast`                   | [./src/toast/index.tsx](../../packages/ui/src/toast/index.tsx)                                           | Matching source component and page scene                  |
| `@tapstate-web/ui/tooltip`                 | [./src/tooltip/index.tsx](../../packages/ui/src/tooltip/index.tsx)                                       | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/spinner`                 | [./src/spinner/index.tsx](../../packages/ui/src/spinner/index.tsx)                                       | Matching source component and page scene                  |
| `@tapstate-web/ui/separator`               | [./src/separator/index.tsx](../../packages/ui/src/separator/index.tsx)                                   | Matching source component and page scene                  |
| `@tapstate-web/ui/infotip`                 | [./src/infotip/index.tsx](../../packages/ui/src/infotip/index.tsx)                                       | Overlay semantic choice, presence, focus and local layers |
| `@tapstate-web/ui/direction-provider`      | [./src/direction-provider/index.tsx](../../packages/ui/src/direction-provider/index.tsx)                 | Theme/composition infrastructure                          |

## Change procedure

Read the local source, its matching package guide and the closest studied page before changing an API or appearance. Preserve generic value relationships, refs/events, state callbacks and full primitive anatomy. Data attributes and CSS variables own styling state; another React state machine solely for CSS is not a replacement.

Document any new component export in the scene routing and source mapping. Run `pnpm ui:docs:check`, focused typecheck/lint and the owning workstream's required behavior/render checks. [Page acceptance](ui-page-audit.md) and [interaction acceptance](ui-interaction-audit.md) remain separate from import coverage.
