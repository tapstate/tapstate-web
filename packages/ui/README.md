# Tapstate Web UI

`@tapstate-web/ui` is the shared component and token package for the Web and
Cloud applications. Import components from public subpaths such as
`@tapstate-web/ui/button` or from the root compatibility API. Import
`@tapstate-web/ui/styles.css` once after Tailwind in each application's style
entry point.

The `src/vendor` tree contains shared low-level primitives. `src/` root modules
adapt those primitives to existing Tapstate field, dialog, toast and navigation
contracts. Keep both surfaces covered when changing a shared primitive.
