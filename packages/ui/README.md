# Tapstate Web UI

`@tapstate-web/ui` contains the shared source components and styles used by Web and Cloud. The `src/` directory keeps the component source layout directly; public subpaths map to those source files in `package.json`.

Import components through their public subpaths, for example `@tapstate-web/ui/button`, `@tapstate-web/ui/dialog`, and `@tapstate-web/ui/search-input`. Import `@tapstate-web/ui/styles.css` once after Tailwind in each app's stylesheet.

There is no package root barrel. App-specific behavior such as Formily bindings, localized providers, and route navigation belongs in the applications and should compose these source components.
