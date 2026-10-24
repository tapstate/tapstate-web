# UI design entrypoint

Tapstate's authoritative page composition and review contract is [docs/engineering/DESIGN.md](docs/engineering/DESIGN.md). The component/token source and migration status are in [docs/engineering/design-system.md](docs/engineering/design-system.md).

For every new or substantially changed Web/Cloud page, use the vendored `@tapstate-web/ui/<component>` public subpaths, its semantic CSS tokens, and the page review matrix in `DESIGN.md`. Existing `@tapstate-web/ui` components are migration compatibility code, not a second design direction. Keep Tapstate's app shell, main surface, navigation, and branding.

Do not approve a page solely because its colors resemble the theme or its build passes. Review its hierarchy, component origin, loading/empty/error states, keyboard and overlay behavior, desktop/mobile layout, translations, and shell boundary against the pinned source examples.

Every UI edit first selects the matching DESIGN.md scene contract and records its source-mapping table. Copy component anatomy and semantic roles from the actual source; do not choose spacing, background, icon size or responsive overrides by intuition. Use the surface decision table to distinguish recessed content (`background-section-burn`) from actual input-family surfaces (`components-input-*`). A missing scene requires a source-backed contract addition, not an undocumented visual invention. Record actual application-reference revisions independently from the vendored package revision.
