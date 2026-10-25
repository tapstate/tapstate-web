# Tapstate UI design contract

This is the authority for page composition and visual review in Web and Cloud. It is grounded in source study, not an aesthetic preset. [The handbook](ui/README.md) routes detailed page, component, token, typography and interaction evidence. [The component contract](design-system.md) records the APIs actually shipped here.

## Authority and evidence

The latest reference study is pinned to `21a2081267a217ead3ec847c2d3a2522f3c30c2d`, committed 2026-10-25. The shipped component origin remains `3552815c89415716dfd9cac80fd7c73aac3b051e` with explicit local adaptations. Research updates do not silently upgrade runtime APIs or CSS variables.

Use these owners: explicit product requirements and [intentional Tapstate differences](ui/product-contracts.md); shipped component contracts for primitive behavior; the closest studied application page for composition; rendered evidence for the actual local result. Record differences and reasons. An adaptation is not an exact copy.

All 114 route entries are analyzed with selected implementation/layout evidence in [the page catalog](ui/source-pages.md). The component study covers all 52 reference public subpaths and 76 application-base families. The [static atlas](ui/source-coverage.md) analyzes 2,620 runtime TSX files and 63 stylesheets, including every individual UI component file. [The token reference](ui/token-reference.md) covers 874 custom properties and all 45 typography utilities. Source extraction is not browser acceptance.

## Page design philosophy

1. **Orient, then work.** Resource identity and context come first, then actions/query controls, then content. Keep the task visible without a marketing hero or decorative summary competing with it.
2. **Choose geometry by task.** Collection, detail workspace, form, canvas and shared runtime are distinct compositions. Do not force them into one card grid, table, dialog size or scroll model.
3. **Continue an established pattern.** Start from the closest source page and comparable Tapstate screen. Reuse hierarchy, density, alignment, control groups, semantic surfaces, responsive behavior and state structure.
4. **Use quiet hierarchy.** Named text roles, compact actions, modest dividers and deliberate whitespace explain content. Give each decision area one clear primary action; keep metadata and infrequent item actions quieter.
5. **Make surfaces semantic.** Body, readable sheet, recessed section, resource card, input and popup carry different meanings. Select the role before the color. A result is not automatically an input, and a text group is not automatically a card.
6. **Design every state.** Initial load, refresh, first use, filtered empty, failure, permission limits, pending, disabled, read-only, invalid, selected and open states belong to the composition.
7. **Keep interaction with its owner.** Primitive state, focus, presence, positioning and dismissal stay with the primitive. Domain drafts, permissions and persistence stay with the feature. Visual reuse cannot change product execution authority.
8. **Resolve exceptions with evidence.** The reference contains multiple generations, specialized gradients/glass, unfinished routes and imperfect examples. Adopt a validated task pattern, not every incidental implementation.

These principles recur across collection headers, knowledge/document tools, workflow editors, plugins, auth/account flows and shared runtimes. Class frequency describes the source; it is not a universal default.

## Mandatory rules

| ID    | Requirement                                                                                                                                                                                            | Detailed owner                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| UI-01 | Identify the closest page and selected implementation before adding UI. Resolve route wrappers, fixed dispatcher props and parallel slots.                                                             | [Page catalog](ui/source-pages.md)                                               |
| UI-02 | Use public `@tapstate-web/ui/<component>` subpaths. App adapters bridge real app behavior without another appearance system. Preserve direct package source paths.                                     | [Component contract](design-system.md)                                           |
| UI-03 | Use available semantic tokens. Check theme pairs, app scope and reference-only/brand exclusions before using a variable.                                                                               | [Foundations](ui/foundations.md), [all tokens](ui/token-reference.md)            |
| UI-04 | Choose named typography and measured geometry from the matching recipe. No universal radius, row height, icon size or font-size rule.                                                                  | [Typography](ui/typography-reference.md), [components](ui/component-patterns.md) |
| UI-05 | Preserve semantic choice and full anatomy: Button versus link, IconButton, Toggle, Tabs, SegmentedControl, value picker, Dialog versus AlertDialog.                                                    | Package component guides                                                         |
| UI-06 | Establish one owner for each scroll region, shrinking flex chain, draft lifetime and overlay lifecycle. Keep query/actions reachable.                                                                  | [Authoring](ui/authoring-review.md)                                              |
| UI-07 | Preserve native forms, label activation, message associations, accessible names, keyboard focus and reduced motion.                                                                                    | Package form/accessibility/styling guides                                        |
| UI-08 | Exercise applicable states, long content, three locales, themes and responsive arrangements in the rendered local page.                                                                                | [Review matrix](ui/authoring-review.md)                                          |
| UI-09 | Preserve package-owned local overlay layers. Do not replace Tapstate's explicit integration with the reference no-z-index model or add caller layer escalation.                                        | [Overlay contract](overlay-conventions.md)                                       |
| UI-10 | Preserve Tapstate shell, navigation, logo, accent, approved glass and actual domain behavior. Record any requested difference.                                                                         | [Product contracts](ui/product-contracts.md)                                     |
| UI-11 | Record source revision/file, component/token roles, local implementation, adaptations and rendered evidence. Imports, extraction, typecheck and UI Kit alone cannot close business-page visual review. | [Authoring/review](ui/authoring-review.md)                                       |
| UI-12 | Maintain one rule owner. Update entrypoints/templates and retire superseded prescriptions together. Keep acceptance status in audit ledgers and run the documentation check.                           | `pnpm ui:docs:check`                                                             |

## Scene contracts

Select the scene before controls, then inspect its actual source. This table routes detailed evidence rather than replacing implementation.

| Scene                           | Composition / semantic choice                                                                                                                                       | Detailed owner                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Collection / resource list      | Compact identity, separate query/action toolbar, grid for resource navigation or table for comparison, contextual operations, distinct first-use/query-zero states. | Page catalog: application/agent/skill/knowledge collections            |
| Detail / settings workspace     | Stable resource/section context, compact heading/actions, bounded content and focused secondary editing.                                                            | Page catalog: account/access/knowledge settings/details                |
| Creation / connection / auth    | Group by decision, real form, visible labels/errors, one primary submit, stable secondary action and recovery.                                                      | Package forms; page catalog: auth/create/integration                   |
| Table / logs / monitoring       | Semantic comparison rows, task-specific density/filters, bounded results and selected-record detail; charts use real available metrics.                             | Page catalog: logs, monitoring and document tools                      |
| Dialog / confirmation           | Focused work uses Dialog Header/Body/Footer; consequential answer uses AlertDialog. Separate outer gutters and inner result wells.                                  | Package overlays; product contracts                                    |
| Drawer / secondary detail       | Contextual side work with owned scroll, measured placement/clamp and focus/presence; responsive backdrop is recipe-specific.                                        | Component study: Drawer; page catalog: logs/integrations               |
| Menu / picker / help            | Commands use Menu; values use Select/Combobox/Autocomplete; rich reachable help uses Popover/Infotip; Tooltip supplements an already named action.                  | Package selection/overlays                                             |
| Mode / panels / navigation      | SegmentedControl chooses exclusive mode, Tabs selects associated panels, links navigate. Preserve URL/back semantics.                                               | Component/page catalogs                                                |
| Diagnostic / result / trace     | Separate overall outcome, check title/detail/status and recovery. Keep diagnostics reachable and long-content row alignment stable.                                 | Product contracts: Source diagnostics; page catalog: retrieval/quality |
| Canvas / editor                 | Main task owns deliberate overflow; controls/selected-item panel stay reachable; graph semantics remain product-owned.                                              | Product contracts: Pipeline; component study: workflow/editors         |
| Chat / assistant                | One composer, document output, real streaming/cancel/review state, accepted icon-control adaptation and stable scroll.                                              | Product contracts; component study: chat/markdown                      |
| Upload / media / code           | Native input/validation, explicit progress/retry/removal and preview/commit ownership; local code overflow and labeled tools.                                       | Component study: uploader/media/markdown/editor                        |
| Feedback / progress             | Persistent failures stay inline with recovery; transient Toast follows mutations; Progress, Meter and Spinner express different information.                        | Component study; interaction ledger                                    |
| Empty / loading / unavailable   | Predict final geometry during initial load, preserve populated refresh content, distinguish onboarding, query-zero and failure.                                     | Authoring state model; page catalog                                    |
| Shared / embedded / public task | Own viewport/safe area, access/error boundary and task form; do not blindly inherit console geometry/permissions.                                                   | Page catalog: shared runtime, human-input, device/OAuth                |

If no direct analogue exists, choose the nearest task geometry and record the smallest necessary adaptation. Add a recurring scene here with source evidence before presenting it as a new standard. Do not adopt an unfinished source route as a recipe.

## New-page review gate

Every new page and substantial visual change supplies the [source mapping and rendered matrix](ui/authoring-review.md): continuity, API compatibility, token/material roles, states, interaction, responsive/content fit, themes and product boundaries. Reject missing or unsupported evidence; record unavailable states honestly.

Desktop 1280×800 and narrow 375×812 are minimum review examples. Inspect the actual supported range and both sides of the recipe breakpoint. Compare reference/local composition at the same CSS viewport. Source breakpoints and review viewport sizes are different concepts.

Update [page acceptance](ui-page-audit.md) and [interaction acceptance](ui-interaction-audit.md) only for what was actually inspected. Pending means pending even when imports, lint and builds pass. A matching primitive or palette alone cannot certify the surrounding page.

## Implementation entrypoints

- [Foundations](ui/foundations.md): token architecture, surfaces, typography, geometry, material, icons, motion, responsive and localization.
- [Every page/route family](ui/source-pages.md), [every primitive/base family](ui/component-patterns.md), [every runtime UI file](ui/source-coverage.md).
- [Local exports and CSS setup](design-system.md), [overlay integration](overlay-conventions.md), [intentional product differences](ui/product-contracts.md).
- [Authoring/review procedure](ui/authoring-review.md), including baseline upgrades and retirement of conflicting rules.
