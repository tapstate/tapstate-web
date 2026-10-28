# Design foundations

These rules are derived from the pinned source study in the [handbook](README.md). Actual component props and defaults come from the shipped package. Exact values and line references for every extracted custom property and typography utility are available in the [token catalog](token-catalog.json) and [typography reference](typography-reference.md).

## The recurring visual model

The reference organizes working software by task and ownership: a stable shell locates the resource, a compact heading orients the user, query controls define the current view, one bounded content region carries the work, and contextual surfaces handle secondary tasks. Collections, canvases, authentication and shared runtimes have different geometries. A new page should select that task geometry before selecting colors or containers.

The repeated pattern is restrained hierarchy: 12–14px working text, named semibold roles for important labels, small secondary metadata, one primary action in each decision area, quiet separators and interaction fills. This is supported across resource collections, knowledge/document tools, workflow editors, plugin management and account forms. It does not imply every heading is the same size or every row is 32px.

Source generations coexist. The newer knowledge and agent workspaces make state controllers, bounded scrolling and toolbar ownership more explicit than several older dataset pages. Prefer the stronger complete example for the same task. A legacy catch that only logs an error, an unfinished route or an unlabeled icon is an observed gap, never a design rule to copy.

## Token architecture

| Layer                               | Source owner                                                                         | Rule                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic utility registration       | `component-package/src/themes/theme.css`                                             | `@theme inline` registers semantic utility names without freezing their runtime theme values at `:root`.                                                      |
| Light/dark values                   | `component-package/src/themes/light.css`, `dark.css`                                 | `html[data-theme]` selects values. Keep the same role/class across themes.                                                                                    |
| Palette, shadows and text utilities | `component-package/src/styles/styles.css`, `utilities.css`                           | These are package-owned foundations. Standard utility names may be overridden by the preset.                                                                  |
| App-only gradients and masks        | `web/themes/manual-light.css`, `manual-dark.css`, `web/app/styles/tailwind-core.css` | These are application recipes. Their presence in the reference does not make them available in the shipped package.                                           |
| Tapstate theme and shell            | Each application's styles                                                            | Preserve app-owned accent, navigation, logo, shell and approved glass surfaces. Avoid importing a source product mark or changing the shell as a side effect. |

The catalog contains 874 distinct custom properties across these layers. The reference has 715 paired semantic theme declarations, while the shipped package has 710. Of these, 705 names have matching paired values; remaining reference/local branding properties are excluded from automatic adoption. Palette, app-only variables and theme registration aliases are separately identified. Check the catalog's `adoption`, `localOverrides` and per-definition references instead of treating every extracted name as a usable local token.

### Semantic surface choice

| Purpose                                             | Component/token role                                   | Composition rule                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Page canvas behind content                          | `background-body`                                      | Holds the workspace; do not use it as an input state.                                              |
| Main readable sheet                                 | `background-default`                                   | Primary data/content surface.                                                                      |
| Quiet section                                       | `background-section`                                   | Modest separation within a page.                                                                   |
| Recessed result, trace, metadata or grouped content | `background-section-burn`                              | Use for content grouping, including the approved Source check well.                                |
| Resource item                                       | `components-card-*` or the chosen source recipe        | Cards require item identity, metadata, navigation or a real interaction boundary.                  |
| Input/search/select/number field                    | `components-input-*`                                   | The input family owns normal/hover/active/disabled/invalid appearance and its focus ring.          |
| Modal, popup, menu or tooltip                       | `components-panel-*`, tooltip/menu roles               | Keep border, shadow, blur, geometry and interaction lifecycle together.                            |
| Hover, press and selection                          | `state-base-*`, `state-accent-*`                       | Interaction fills communicate an actual state; do not use selected fill as a static section color. |
| Divider                                             | `divider-subtle`, `divider-regular`, component borders | Choose by boundary strength; row separators and popup outlines have different roles.               |

Examples from the paired theme: `background-default` is `#ffffff` / `#222225`; `background-section-burn` is `#f2f4f7` / `rgb(24 24 27 / 0.6)`; normal input fill is `rgb(200 206 218 / 0.25)` / `rgb(255 255 255 / 0.08)`. These values explain role differences. Use semantic classes instead of copying the literals into app CSS.

Some source API-output pages deliberately use an input-family surface for textual output. That is a named page exception, not permission to turn every result region into a disabled input. Alpha surfaces need inspection on their actual parent in both themes.

### Text and state roles

- Primary text identifies the resource, heading or key value. Secondary text carries normal body content and labels. Tertiary text carries supporting metadata and descriptions. Quaternary, placeholder and disabled roles have separate meanings.
- Text on a filled accent/destructive surface uses its on-surface role. Inverted text is not a substitute for checking the underlying surface.
- Success, warning, failure and operational status combine text or a meaningful icon with their semantic color. Product accent does not mean successful execution.
- Utility-color families identify domain objects such as node kinds and connector categories. Use the established mapping across selector, canvas and detail views; do not invent a second palette.
- Field disabled/read-only/invalid states retain their semantic relationships. Disabled appearance takes precedence over invalid color; the error association remains present.

### Component families

`components-*` has the largest vocabulary because controls, cards, panels, badges, menus and navigation need distinct states. Preserve those relationships instead of collapsing them into generic `neutral`, `success` and `danger` aliases. `workflow-*` describes graph/canvas internals and must stay scoped to that specialized surface. `util-colors-*` is a palette, not a page layout API. `effects-*` and shadow roles express depth. App-only gradients and masks are conditional composition tools, not new global defaults.

## Typography

The source has 45 explicit typography utilities. [Every definition](typography-reference.md) records size, weight, line-height, capitalization and source line. The working core is `system-xs-*` at 12/16px, `system-sm-*` at 13/16px and `system-md-*` at 14/20px; `system-xl-*` is 16/24px. Title utilities range from 12px to 30px and body utilities include 15px and 18px reading roles. The matching page decides which one to use.

Use typography as a role. A table label, toolbar item, page title, explanatory paragraph and code output have different contracts. Do not globally force all text to 14px, all headings to 18px or all SVGs to one size. Do not reduce font size to hide wrapping, grow control height to accommodate accidental orphan words, or uppercase ordinary prose because workflow node titles use uppercase.

The latest reference's app sans stack is system-owned: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica Neue`, `Noto Sans`, `Arial`, `sans-serif`. The source deliberately omits explicit emoji font families to avoid digit fallback issues. This is source evidence, not authorization to replace Tapstate's app font globally. Preserve the established pipeline-specific stack and inspect any broader font change separately. Code content uses the mono role and its own wrapping/scroll rules.

Evidence: `web/app/styles/tailwind-core.css`, `preflight.css`; `component-package/src/styles/utilities.css`; source collection headers, knowledge detail panes and workflow node headers indexed in the catalogs.

## Spacing, size and density

| Role                        | Shipped component measurement                                             | Boundary                                                          |
| --------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Button small/medium/large   | 24/32/36px height, 6/8/10px radius                                        | Sizes belong to Button, not every UI object.                      |
| IconButton xs/sm/md/lg/xl   | 16/20/24/32/36px hit area                                                 | Glyph size is chosen separately by the matching source call site. |
| Input family                | Component-owned padding, text role and state ring                         | Avoid fixed-height inner fields plus duplicate vertical padding.  |
| Standard centered Dialog    | 480px width, viewport clearance, 24px horizontal body/header/footer inset | A wider source recipe needs its own measured width and clamp.     |
| Resource card               | Source recipe often uses 12px radius and 0.5px outline                    | Card geometry is not a universal container rule.                  |
| Canvas node and right panel | Specialized measurements in product contracts                             | Never extrapolate them to ordinary forms or lists.                |

The source uses deliberate fractional measurements such as 0.5px borders, 9px input-shell insets and 10px radii. It does not support a universal 8px or 10px radius rule. Prefer the exact canonical Tailwind v4 utility when available, then a documented arbitrary value when it is genuinely the source measurement. Repeated local corrections signal an owning component/recipe problem.

Space explains grouping. Put related filters in a toolbar, keep metadata closer to its value than to another section, and use a divider or surface step for a genuine boundary. Do not wrap every heading/text group in another card, repeat the same collection in a rail and table, or add a filter with one effective value.

## Depth and material

The source uses borders, subtle shadows, transparent surfaces, gradients, blur and specialized glass treatments selectively. Modal/menu/tooltip depth and resource-card hover have named source roles. Preserve a purposeful source gradient, alert treatment or approved product glass surface; a generic ban on all gradients or glass would contradict the studied system. Conversely, the presence of one premium badge or glass navigation action does not authorize decorative gradients on normal data tables.

Keep source-specific material inside the owning component or recipe. Text readability, hover/selected distinction, focus visibility and dark-theme contrast must survive the actual background. Do not add call-site z-index escalation to simulate depth.

## Icons

The shared source uses Remix glyph utilities generated by the package icon plugin, alongside source SVG assets and specialized icons. Both current apps register `packages/ui/src/plugins/icons.ts`; importing the theme and scanning classes alone does not generate those glyphs. Keep the plugin in any new consumer's setup.

Use the real connector mark when identity is meaningful. Match optical size, stroke/fill and alignment from the chosen source component. An icon's 16px glyph and a 32px button are different measurements. Icon-only commands need one accessible name and decorative glyph content; a tooltip is supplemental. Preserve existing custom source SVG paths when available, and document a glyph substitution instead of presenting it as exact fidelity.

## Motion

Motion reveals a surface, a state transition or continuity. Source popups commonly transition opacity/scale, modal close waits for presence completion, Drawer has swipe progress and side-dependent movement, and loading uses source spinner/dot roles. Keep the owning primitive's actual timing and selectors. Do not add arbitrary motion to make ordinary repeated work feel more elaborate.

Use reduced-motion alternatives where the source animates. Do not animate `height`, `width`, `top` or `left` merely to imitate a transform-based transition, use `transition: all`, or replay already-arrived server text with a timer. A root's mount lifetime, open state and portal presence are separate; preserve the closing lifecycle before discarding session state.

## Responsive and localization behavior

The reference app declares additional breakpoints (`tablet` 640px, `pc` 769px and `2k` 2560px), but the chosen page also uses standard Tailwind breakpoints. These observations do not authorize global replacement of Tapstate breakpoints. Inspect the actual recipe on both sides of its breakpoint.

Responsive design changes arrangement and disclosure: toolbars wrap, dual-pane tools stack, contextual navigation becomes a drawer, roster help becomes an accessible icon, and pagination simplifies. Primary actions stay reachable. Use `min-w-0`/`min-h-0` through the shrinking flex chain, keep code/table scrolling inside the correct content region, and avoid page-wide horizontal overflow unless the surface is a deliberate canvas.

Check English, Simplified Chinese and Traditional Chinese, long resource names, empty values, populated metadata, large counts, one-line and multiline input, and loading/error copy. Truncation may apply to secondary metadata with a reachable full value; it must not hide the only operation label or diagnostic needed for recovery. Layout and type remain stable under content stress.
