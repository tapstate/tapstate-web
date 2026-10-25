# Shared UI Package Rules

Read `../../docs/engineering/DESIGN.md` and `../../docs/engineering/design-system.md` before changing components or tokens.

- Preserve the direct `src/` component layout and public subpaths declared in `package.json`. Do not add a nested source wrapper or a package root barrel.
- Keep source component behavior, props, styles, and CSS entry paths aligned with the component files under `src/`.
- Keep app-specific providers, Formily bindings, router state, and translated product behavior in `apps/web` or `apps/cloud`; compose source primitives there when needed.
- Keep Tapstate product text, app shells, and brand values in app-owned code. Do not copy business-page markup into this package.
- Use CSS variables and component state attributes for appearance. Avoid app-specific raw geometry, stacked overlays, or duplicated visual implementations.
- Keep public component props typed and small. Keep Base UI types internal unless the source API intentionally exposes a composition primitive.
- Components must define focus-visible and disabled states and support reduced motion where they animate.
- User-visible copy belongs to the application and its i18next resources.

Latest-reference study does not silently upgrade this package. Check the shipped public types and tokens before adopting a newer example. Keep the component-owned overlay integration and app-specific differences documented in the shared design contract.
