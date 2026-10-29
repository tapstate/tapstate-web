# UI evidence handbook

This handbook supports [DESIGN.md](../DESIGN.md), the normative contract for Web and Cloud UI. Read the matching chapter for the task instead of loading the entire catalog into every change.

## Two explicit baselines

- Latest reference study: `21a2081267a217ead3ec847c2d3a2522f3c30c2d`, committed 2026-10-25. This is the source of page and component observations in this handbook.
- Shipped component origin: `3552815c89415716dfd9cac80fd7c73aac3b051e`, with the local adaptations documented in [product contracts](product-contracts.md). Current public APIs and token availability come from `packages/ui`, not from a newer reference example.

Updating research does not upgrade runtime components, dependencies, license terms, theme definitions, or product capabilities. A newer pattern can guide composition using the shipped API; a missing API or token requires an explicit port and its own verification.

## Reading routes

| Task                                                                            | Read                                                                       |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Understand the visual philosophy and mandatory workflow                         | [DESIGN.md](../DESIGN.md)                                                  |
| Choose surfaces, state colors, text, density, depth, icons or motion            | [Foundations](foundations.md)                                              |
| Find a matching page, route wrapper, layout or state model                      | [All page families and 114 route entries](source-pages.md)                 |
| Choose a primitive, application pattern or specialized domain composition       | [Component patterns](component-patterns.md)                                |
| Inspect every runtime UI file and its direct source evidence                    | [Source coverage](source-coverage.md), [machine atlas](source-atlas.json)  |
| Inspect every custom property, both themes, dependencies and local availability | [Token reference](token-reference.md), [token catalog](token-catalog.json) |
| Select a named typography role                                                  | [Typography reference](typography-reference.md)                            |
| Preserve an intentional Tapstate difference                                     | [Product contracts](product-contracts.md)                                  |
| Implement and review a page with reproducible evidence                          | [Authoring and review](authoring-review.md)                                |
| Review the current runtime component exports and CSS setup                      | [Component source contract](../design-system.md)                           |

## Coverage and evidence limits

The static atlas parses 2,620 runtime TSX files: 114 page entries, 33 layouts, 2,349 UI component files, 24 icon assets and 100 wrappers or contract files. It also analyzes 63 CSS files, 52 reference package public subpaths, 874 distinct CSS custom properties and 45 typography utilities. All TSX files parse without diagnostics. Test, story, mock, fixture, dependency and build directories are excluded from design evidence.

The route study resolves all 114 page entries into their primary implementations and layout chains, including redirects, parallel sidebar slots, unavailable states and an unfinished route. Fixed dispatcher props select the corresponding implementation; possible transitive dependencies are recorded separately. The component study covers all 52 public reference subpaths and 76 application-base families containing 324 runtime TSX files. Specialized domain families receive a synthesis, and their individual files remain in the full AST atlas.

Per-file AST data establishes authored structure, classes, event/ARIA attributes, explicit branches and imports. It does not establish computed CSS, contrast, actual focus behavior, network outcomes, permission enforcement or browser rendering. Counts and class frequency describe the source; they are not universal defaults. Every new UI still needs the rendered checks in DESIGN.md.

## Neutral source paths

`web/...` paths are repository-relative application paths in the pinned reference. `component-package/...` is an evidence alias for its shared UI workspace, discovered by the analyzer using `src/themes/theme.css`. It is not an import path. Reference product marks are excluded from adoption; neutralized brand-token labels in the catalog are evidence aliases, not executable token names. No personal checkout path is required in a durable rule.

Regenerate the static data with `node tools/ui-source-atlas.mjs <reference-source-root>`. Reconcile the page/component studies when that revision changes, then run `pnpm ui:docs:check`. Source-data checks and visual acceptance are independent.
