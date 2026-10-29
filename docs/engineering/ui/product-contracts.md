# Tapstate integration and intentional differences

This file records current product decisions that constrain adoption of the [latest reference study](README.md). These decisions outrank a generic reference example. Runtime source remains the authority for implementation details; an intentional difference must be described as an adaptation.

## Ownership

| Owner                                         | Responsibility                                                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src`                             | Reusable primitive anatomy, variants, geometry, semantic component tokens, focus, disabled states and overlay behavior. Preserve the direct source directory layout and public subpaths. |
| `apps/web/components/ui` and Formily adapters | Web field context, translated close labels, legacy prop/value bridges and schema integration. Compose package primitives without a second appearance system.                             |
| Feature code                                  | Domain data, resource identity, drafts, authorization, routes, actions, persistence and feature-specific page composition.                                                               |
| Application styles                            | Brand accent, logo, navigation, `.app-shell`, `.app-shell__main`, Cloud `.main-surface`, approved liquid-glass surfaces and product visualization.                                       |

The shared package is not a home for routers, provider credentials, Formily state or business-page markup. A source page's data model, AI backend, billing, deployment, permissions or lifecycle behavior does not become a Tapstate feature through visual study.

## Baseline and package ports

The shipped package originated at `3552815c89415716dfd9cac80fd7c73aac3b051e`; source study now targets `21a2081267a217ead3ec847c2d3a2522f3c30c2d`. The local package has 61 public subpaths. The reference package has 52; all 52 names exist locally, but matching names do not prove matching new props or behavior. Local application-source ports add `alert`, `badge`, `chip`, `filter-empty-state`, `first-empty-action-card`, `loading-placeholder`, `radio-card`, `search-input` and `skeleton`.

These ports carry application-source patterns, with product text supplied by Tapstate. Keep their actual local APIs. There is no package root barrel, nested source wrapper or alternative legacy UI package. The original LICENSE stays unchanged.

## Shell, accent and material

Keep Tapstate's logo, navigation hierarchy, shell geometry, main surfaces and approved glass cards. Inner controls and page content follow the studied component and task patterns. A glass source action, premium badge or gradient informational Alert can justify that specific treatment; it cannot replace the product's whole surface system.

Product accent changes belong at an explicit theme boundary and must preserve semantic relationships in both themes. Do not copy reference product marks or use neutralized brand-token evidence aliases as CSS variables. Keep the app-owned font stack outside the pipeline workspace unless a separate font change is explicitly requested.

## Overlay integration

The latest reference's ordinary body portals rely on root isolation and DOM ordering without ordinary overlay z-index. **The shipped Tapstate package has an explicit adaptation:** floating positioners and modal surfaces use `z-50`, modal backdrops use `z-40`, and Drawer has its own `z-40` viewport/backdrop and `z-50` popup. See `packages/ui/src/internal/overlay.ts` and `drawer/index.tsx`.

Describe and preserve that actual local model. Equal-level paint order and nesting still require inspection; neither root isolation nor a numeric z-index alone proves nested overlays correct. Call sites must not add higher `z-*`, manual portals or duplicate click guards. Fix shared layer ownership in the package when a measured defect requires it. Review a Select/Popover inside Dialog, successive dialogs, Drawer plus popup, click guard, Escape, focus restoration and closing presence before changing this adaptation.

## Status and Source diagnostics

The source StatusDot default is a rounded square. Tapstate operational status markers retain the existing circular silhouette with a call-site `rounded-full`, preserving each surface's size and semantic color. A status also has readable text or a meaningful icon.

Source connection-test results keep the focused Dialog behavior. The default dialog provides 24px horizontal body/header/footer insets. The approved result well has its own 12px horizontal inset and `bg-background-section-burn`. The overall result, individual check title/detail and right-side check status remain distinct. Long text wraps inside its region; it must not displace the row status into the following detail block. Keep error codes and diagnostics reachable and recovery actionable. This visual rule does not certify connector execution or backend health.

## Pipeline workspace

Preserve the product identity rail, graph-as-main-region, left canvas tools, upper-right action groups, lower-right viewport controls and selected-node right panel. Source, Transform and Destination remain Tapstate's selector categories. Each node kind keeps its real domain inputs; source workflow business models are not copied.

The established editor recipe uses a 240px node body with a 24px icon, 16px outer radius, source node text roles and workflow tokens; the main selector uses a 400px panel with 12px radius; the node panel recipe is 509px with a 400px minimum. Canvas tool hit areas are 32px, while smaller contextual commands can be 24px. These measurements describe this editor recipe and require rendered confirmation; they are not global page/container defaults.

Keep node-kind color identity consistent between selector and canvas: Map/JavaScript blue, Filter/Join/Union/Nest cyan, View violet and Target warning orange. Connector-backed nodes use real registered connector marks in the same icon slot. Preserve source handle hit targets, state markers, tooltip roles and keyboard reachability.

NEXT STEP appends a downstream connection while retaining existing downstream links. Edge insertion is a separate operation replacing the selected edge. Canvas mutation, persistence and translator ownership stay in the existing model layer. No visual recipe changes graph semantics.

Builder Save is secondary and Save & start is primary; this stable footer is not the graph editor's split action toolbar. Apply/Reject and Applied/Undo stay reachable in the sticky Builder dock outside the collapsible assistant review. Applying a valid proposal returns to chat, reveals newly created transforms and follows normal revision/autosave behavior. It does not publish, preview or run implicitly.

## Assistant composer and streaming

All existing Builder AI entry points compose `AssistantComposer.tsx`; source mappings describe the reference chat input and prompt-generator pattern, while this product's accepted action geometry is a direct **IconButton** adaptation. Keep its primary variant, `size="lg"`, 32px circular hit area and bottom-right inset inside the input shell. The current ArrowUp glyph is 18px, Stop is 10px and waiting ring is 20px. Source action glyphs may differ; record that difference rather than reverting accepted product geometry to a generic 16px rule.

Send, waiting and Stop share one operation slot. Enter submits, Shift+Enter adds a line, IME composition does not submit. Empty and two-line textareas do not scroll; content grows to 158px before internal scrolling. A transient loading state must keep Stop reachable when cancellation is available. An AI step action opens a scoped prompt surface and sends through the existing review flow; it does not directly mutate the draft.

Provider fields retain masked secrets, server ownership and existing endpoint/model/key semantics. Visual reuse grants no new access or storage behavior. Use the application's real Input adapter when Field context or schema/i18n integration requires it.

Assistant output uses `AssistantMarkdown.tsx` and the installed streaming parser. Incomplete Markdown stays readable after cancellation. The server transport owns progress, cancellation and completion; the UI must not simulate streaming by replaying a completed response. Keep the first-text waiting slot separate from document content. Announce status instead of the entire growing transcript. Follow the bottom while the user is there; preserve a deliberate scroll-up position.

## Theme and runtime proof

Source research does not prove a local UI is correct. Keep existing incomplete business-page audits pending. Verify the changed local page at the actual supported desktop/narrow widths, both themes where supported, real long content and the applicable keyboard/state paths. Browser fixtures can establish visual composition; they cannot establish a deployed provider, connector, authorization or persistence outcome.
