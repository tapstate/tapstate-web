# Web UI Compatibility Exports

The visual component source is `packages/ui`, imported through
`@tapstate-web/ui/<component>`. This directory preserves old Web import
paths while features migrate.

## Rules

- Prefer a vendored public component subpath. Do not author a second visual
  implementation here or in `packages/ui`.
- Compatibility files only re-export the shared API. They must not add styles,
  alter component state, or wrap a primitive with a new behavior.
- Component styles and semantic tokens live in `packages/ui/src/vendor/styles`
  and `packages/ui/src/vendor/themes`.
- App and feature code may compose a shared component but must not override its
  size, color, state, focus ring, overlay layer, or motion.
- Base UI owns keyboard navigation and focus management for supported
  primitives. Do not reimplement those behaviors in a page.
- Icon-only actions require an accessible name.
- New copy uses existing i18next resources for `en`, `zh-CN`, and `zh-TW`.

Read `docs/engineering/design-system.md` before component changes and
`docs/engineering/overlay-conventions.md` before overlay changes.
