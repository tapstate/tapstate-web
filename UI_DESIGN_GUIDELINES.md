# UI design entrypoint

Tapstate's authoritative page composition and review contract is [docs/engineering/DESIGN.md](docs/engineering/DESIGN.md). The component/token source and migration status are in [docs/engineering/design-system.md](docs/engineering/design-system.md).

For every new or substantially changed Web/Cloud page, start from the closest matching page pattern in the pinned source and preserve its hierarchy, information density, alignment, and responsive behavior. Import components from the direct `@tapstate-web/ui/<component>` public subpaths, use their semantic CSS tokens, and follow the page review matrix in `DESIGN.md`; record why any composition differs. The package `src/` tree keeps the source component layout; app-owned adapters bridge only Formily, localization, or router behavior. Keep Tapstate's app shell, main surface, navigation, and branding.

Do not approve a page solely because its colors resemble the theme or its build passes. Review its hierarchy, component origin, loading/empty/error states, keyboard and overlay behavior, desktop/mobile layout, translations, and shell boundary against the pinned source examples.

Every UI edit first selects the matching DESIGN.md scene contract and records its source-mapping table. Copy component anatomy and semantic roles from the actual source; do not choose spacing, background, icon size or responsive overrides by intuition. Use the surface decision table to distinguish recessed content (`background-section-burn`) from actual input-family surfaces (`components-input-*`). A missing scene requires a source-backed contract addition, not an undocumented visual invention. Record application pattern revisions independently from the component source revision.
