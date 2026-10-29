# Authoring and review procedure

This is the execution procedure for [DESIGN.md](../DESIGN.md). It applies to newly added UI and substantial page changes. A small correction still identifies its owning scene/component and source, while its rendered check can focus on the changed boundary.

## Before editing

1. Name the user's task and local behavior owner. Determine whether it is a collection, detail workspace, form, canvas, secondary surface, shared runtime, diagnostic/result view or another cataloged family.
2. Open the corresponding [page study](source-pages.md). Resolve thin wrappers, parallel route slots and fixed dispatcher props to the actual selected page. A dependency reachable through another branch is not evidence for the selected screen.
3. Inspect the matching local component public subpath, types and nearby usage. Use the [component study](component-patterns.md) to identify the semantic primitive and its latest reference composition, then check compatibility with the shipped package.
4. Inspect the exact surface, state, typography, spacing, icon and responsive rules in the chosen source files. Use the [token catalog](token-catalog.json) to distinguish package-available, app-local, reference-only and excluded-brand evidence.
5. Check [product contracts](product-contracts.md). Preserve business semantics, shell/brand boundaries and accepted local differences.
6. Record the source mapping below. If no direct source analogue exists, choose the nearest task recipe, explain the adaptation and define a reusable scene contract when it recurs. Do not invent a new skin or global component variant for one feature.

## Source mapping

| Local part / task                               | Reference revision and file                    | Source component, classes and state owner              | Local implementation                        | Product difference and reason                              | Rendered evidence                                                         |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Name the actual content or interaction boundary | Use the recorded SHA and a neutral source path | Include geometry, semantic role and the relevant state | Public UI subpath plus feature/adapter path | State the concrete product need; write none when identical | Viewport, theme, state and reproducible screenshot or browser observation |

Record component source and application-page source revisions separately. Reference source or a data-extraction result alone does not fill the rendered-evidence cell.

## Composition rules to enforce

- Give the page a clear title/resource identity, one primary decision action and a stable content region. Put filters/search before the results they control; item operations live with the item, usually in an operations menu.
- Select table versus grid by comparison versus resource-navigation work. A table stays semantic; resource-card navigation is a real link and item action buttons stay outside that link. Do not add cards around every text group.
- Set height/overflow ownership through the flex chain. Keep `min-w-0`/`min-h-0` where children shrink. Headers, toolbars, footers and pagination remain reachable while the intended body scrolls. Code/table overflow stays local; graph canvas overflow is deliberate.
- Reuse full component anatomy. A DialogContent is not an implicitly padded body; compose Header/Body/Footer. An InputGroup owns one visible field surface and focus treatment. Preserve distinct command-menu, value-select, tab-panel and segmented-mode semantics.
- Reuse primitive data attributes and exposed variables. Avoid React state maintained solely to style a primitive state, duplicate focus rings, independent popup layers, native selects in place of the shared picker, and generic palette aliases that discard semantic roles.
- Keep related controls aligned across pages. Use the source's named typography, optical icon size and control tier. A new feature is not a reason to change every gap, radius or row density.

## State model

| State                     | Required behavior / composition                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Initial loading           | Reserve the eventual content geometry with a matching skeleton or the source table loading composition.           |
| Refreshing or paging      | Keep already loaded content when the product contract permits it; show activity in the affected region.           |
| First use                 | Explain what this resource does and offer the permitted creation/connection action.                               |
| Filtered empty            | Keep query context, explain zero matches and provide reset/change-query recovery.                                 |
| Error/unavailable         | Preserve the failure, relevant diagnostic detail and retry/return path; do not call failed data an empty success. |
| Pending mutation          | Block duplicate activation, keep the owning operation/focus stable and expose the real outcome.                   |
| Disabled/read-only        | Preserve the distinction between unavailable and non-editable values, including focus and submission semantics.   |
| Invalid/unvalidated       | Keep errors associated with the field and distinguish untouched from valid. Disabled appearance has precedence.   |
| Selected/highlighted/open | Separate committed value, keyboard highlight, expanded state and temporary hover.                                 |
| Permission-limited        | Show only allowed operations and explain relevant unavailability; UI state never replaces backend authorization.  |

Use source state controllers where they fit. A static scan finding an `error` identifier is only a lead. Exercise the actual failure/empty/pending path before recording coverage.

## Interaction checks

For every changed path, record: trigger → open/focus → keyboard navigation → confirm/cancel or Escape/outside click → resulting product state → focus return. Include nested surfaces and repeated openings. Root lifetime, controlled open state and portal presence are separate; establish where the draft resets and where it survives.

Check real button versus link semantics, explicit form submit types, a visible/native label when available, unique IDs and message relationships, one name source for icon commands, decorative glyphs, tab order and visible focus. Test touch access to interactive explanations. Tooltip content is not the only accessible name or only location of essential content. Busy/live status belongs to the feature owner and must not repeat growing response text on every token.

Review long lists and keyboard scroll padding; filtered popup width follows the anchor but clamps to available viewport space. A hidden/clipped anchor must not leave its popup at the viewport origin. Check a nested picker in a dialog and the local component-owned layer adaptation, not just a standalone popup.

## Rendered matrix

| Check              | Evidence required before visual approval                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page continuity    | Closest reference page and comparable Tapstate page; same CSS viewport; reused hierarchy, density, alignment and justified differences.                                                                        |
| Component/API      | Actual public imports or documented app adapter; no unsupported latest-source prop assumed to exist locally.                                                                                                   |
| Token/material     | Role-appropriate surfaces, typography, borders, depth, icons and actual resolved styles; no undefined variables.                                                                                               |
| States             | Every applicable loading/empty/error/disabled/read-only/invalid/pending/selected state above.                                                                                                                  |
| Interaction        | Keyboard, naming/labels, dismissal/focus, nested surfaces, data result and safe repeated activation.                                                                                                           |
| Responsive/content | Desktop 1280×800 and narrow 375×812 as minimum product review examples; inspect actual supported range and both sides of a source breakpoint. Long names, counts, code, multiline input and three locales fit. |
| Theme              | Light/dark on the actual parent surfaces, including alpha/gradient/blur content, selection, focus and errors.                                                                                                  |
| Product boundary   | Shell, logo, accent, glass and local feature behavior preserved; any permitted change has explicit rationale.                                                                                                  |

The two example viewports are coverage points, not universal source breakpoints or a ban on other device sizes. Attach accessible repository/PR artifacts when possible. A personal absolute screenshot path is not shared evidence. If only a browser observation is available, name viewport, state, interaction, outcome and the unverified remainder without embedding the host's path.

## Checks and limits

Run `pnpm ui:docs:check` after rule, catalog, export or package-guide changes. It validates committed catalog consistency, local public subpaths, documentation links and required coverage. Supplying the reference checkout additionally verifies its recorded source hashes. It does not assess aesthetics, computed contrast, interaction behavior or whether a screenshot was actually seen.

Use the repository's focused lint, typecheck, i18n and build commands for the changed runtime surface. Automated test execution remains workstream-specific. A docs-only change does not need a runtime test suite; a runtime defect needs behavior evidence at the owning boundary. Record passed, failed and unrun checks accurately. CI and documentation validation do not close a page's visual audit.

## Reference upgrades and rule retirement

Rebuild the source atlas from a clean updated checkout and record its exact revision. Reconcile route inventory, component families, tokens, package API compatibility and local adaptations. Review changed source evidence before replacing a rule. Keep older product decisions only when still intentional; remove superseded generic style prescriptions from agent instructions, templates and secondary guides in the same change.

Normative rules live in DESIGN.md and this handbook; current page/interaction acceptance lives in the existing audit ledgers. Do not preserve a historical migration diary as a second design system. Never promote a fixture, unfinished route, incidental source bug, extracted class frequency or package upgrade assumption into a universal rule.
