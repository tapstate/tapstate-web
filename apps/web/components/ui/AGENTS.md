# Web UI Adapters

This directory contains Web-owned integrations around the shared component source in `packages/ui/src`. Import primitives from their direct public subpaths, such as `@tapstate-web/ui/button` or `@tapstate-web/ui/field`.

- Keep adapters for Web-only behavior such as Formily field context, localized close labels, and route state here.
- Adapters may compose source primitives and bridge app props; they must not create a second visual implementation.
- Prefer a direct source import when the app API already matches the source API.
- Keep translated text in i18next resources and keep application branding in app-owned code.
- Read `docs/engineering/design-system.md` and `docs/engineering/overlay-conventions.md` before changing a primitive or overlay adapter.
