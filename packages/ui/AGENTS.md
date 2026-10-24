# Shared UI Package Rules

Read `../../docs/engineering/DESIGN.md` and
`../../docs/engineering/design-system.md` before changing components or tokens.

- This package is the shared visual component source for Web and Cloud. Keep
  public subpaths stable and preserve the root compatibility exports.
- Prefer existing semantic tokens, variants, component contracts, and overlay
  behavior. Do not add a second visual system or copy business-page markup here.
- Keep Tapstate brand values in Tapstate-owned tokens. App shells and navigation
  remain app-owned.
- Use CSS variables and data attributes for component appearance and state.
  Avoid raw palette values, arbitrary geometry, and call-site stacking layers.
- Keep public component props typed and small. Keep Base UI types internal
  unless the public API intentionally exposes a composition primitive.
- Components must define focus-visible and disabled states and support reduced
  motion where they animate.
- User-visible copy is passed from the app's i18n resources.
