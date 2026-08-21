# Source Create Dialog Acceptance

> Date: 2026-08-21
> Status: Accepted, 375px visual QA pending
> Feature folder: docs/workflow/features/2026-08-19-source-create-dialog/
> Spec: ./spec.md
> Prototype: ./prototype.md
> Plan: ./plan.md

## Accepted outcome

- [x] Source creation now uses a bounded `1100px` / `90vh` large dialog shell with no default content padding, soft backdrop support from the dialog primitive, semantic colors and an independent-app-window layout.
- [x] The dialog maintains `select | configure` state: a two-connector catalog opens directly to the connector rows, while catalogs with 3+ entries expose search filtering; selection opens a real connector schema and Back returns to the prior row without closing the dialog.
- [x] Configuration has a fixed header, left `bg-muted/20` scrollable form area, fixed action footer, and a desktop-only `360px` / `420px` help pane.
- [x] The connector mode selector is an accessible, semantic-token segmented control rather than radio buttons.
- [x] Existing connector-schema parsing, source creation request contract, loading, empty, error, validation, disabled and submitting paths are preserved.
- [x] Input, textarea and secret-field styling used by this flow use semantic border/background/text/focus tokens.
- [x] No route, API, permission, connector-data or dependency change was introduced.
- [x] The connector selector is a centered single collection surface with one 56px row per connector, divider-separated rows, bare icons, a low-emphasis chevron and accent-semantic hover/focus states.
- [x] The compact current catalog does not render a redundant search field. Search returns automatically as the catalog grows beyond two connectors.

## Verification

| Check                        | Result           | Detail                                                                                                                                                      |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused dialog test          | Passed           | `pnpm --filter web test -- source-create-dialog.test.tsx`: 14 test files, 41 tests                                                                          |
| i18n parity                  | Passed           | `pnpm --filter web i18n:check`: `en`, `zh-CN` and `zh-TW` keys match                                                                                        |
| TypeScript                   | Passed           | `pnpm --filter web typecheck`                                                                                                                               |
| Code lint                    | Passed           | `pnpm lint:code` as part of `pnpm lint`                                                                                                                     |
| Repository formatting        | Baseline failure | `pnpm lint` reports formatting issues across 45 repository files; the refactored source-dialog files are not among them                                     |
| Scoped source formatting     | Passed           | `pnpm exec oxfmt --check` over the five changed TS/TSX source files                                                                                         |
| Diff hygiene                 | Passed           | `git diff --check`                                                                                                                                          |
| Local dev server             | Passed           | Vite served `127.0.0.1:5173`; loopback `curl` returned HTTP 200                                                                                             |
| Compact selector test        | Passed           | `pnpm exec vitest run features/sources/source-create-dialog.test.tsx`: 1 test file, 3 tests                                                                 |
| i18n parity                  | Passed           | `pnpm --filter web i18n:check`                                                                                                                              |
| TypeScript                   | Passed           | `pnpm typecheck`                                                                                                                                            |
| Scoped source formatting     | Passed           | `pnpm exec oxfmt --check` over the dialog component and test                                                                                                |
| Diff hygiene                 | Passed           | `git diff --check`                                                                                                                                          |
| Authenticated desktop review | Passed           | Opened `/sources`, verified picker and MySQL configure states, return flow, 1100px shell, 460px search and 680px list.                                      |
| 375px mobile visual review   | Pending          | The available authenticated browser has no supported viewport-resize control.                                                                               |
| Adaptive search test         | Passed           | `pnpm exec vitest run features/sources/source-create-dialog.test.tsx`: two-entry catalogs omit search, three-entry catalogs render the narrow search field. |
| TypeScript                   | Passed           | `pnpm typecheck`: `packages/formily` and `apps/web` passed.                                                                                                 |

## Residual risk and follow-up

- Run the prototype's 375px mobile visual inspection in a resizable local browser. Validate the compact connector list's width, dividers, hover treatment, scroll containment and 44px mobile targets.
- Connector-specific operational documentation is not yet available from the backend; the help pane intentionally retains the existing generic documentation placeholder.
