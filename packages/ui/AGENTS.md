# Shared UI Package Rules

Read `../../docs/engineering/DESIGN.md` and
`../../docs/engineering/design-system.md` before changing components or tokens.

- This package is a temporary compatibility layer. The visual component source
  is `packages/dify-ui`; migrate consumers to its public subpaths.
- Do not add new visual implementations here. A compatibility adapter may map
  app data and existing props to a vendored component without restyling it.
- Keep Tapstate brand values in Tapstate-owned tokens. App shell and navigation
  remain app-owned.
- Use CSS variables and data attributes for component appearance and state.
  Do not place raw palette values, arbitrary geometry, or call-site layers in a
  component implementation.
- Keep public component props typed and small. Keep Base UI types internal
  unless the public API intentionally exposes a composition primitive.
- Components must define focus-visible and disabled states and support reduced
  motion where they animate.
- New user-visible copy is passed from the app's i18n resources.
- Keep Web compatibility exports as re-exports only.
