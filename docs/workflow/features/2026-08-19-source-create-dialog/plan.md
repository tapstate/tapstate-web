# Source Create Dialog Plan

> Status: Complete
> Progress: 100%
> Current step: Acceptance recorded
> Next step: 375px visual QA
> Date: 2026-08-21
> Owner: Codex
> Feature folder: docs/workflow/features/2026-08-19-source-create-dialog/
> Spec: ./spec.md
> Prototype: ./prototype.md
> Acceptance: ./acceptance.md

## 1. Scope check

- Spec confirmed: Yes, updated for the supplied SaaS large-modal standard.
- Prototype confirmed: Yes, [prototype.md](./prototype.md).
- Non-goals confirmed: no route, API, permission or connector schema change.
- New dependency: No.
- IA / data-contract impact: No.

## 2. Affected files

- `apps/web/features/sources/source-create-dialog.tsx`
- `apps/web/features/sources/source-create-dialog.test.tsx`
- `apps/web/components/ui/input.tsx` and `apps/web/components/ui/textarea.tsx` (semantic-token defaults used by the modal)
- `apps/web/styles/app.css` (tokenize shared source-field / icon styling; remove obsolete dialog-specific implementation if safe)
- `docs/workflow/features/2026-08-19-source-create-dialog/{spec,prototype,plan,acceptance}.md`

## 3. Implementation steps

| Step | Status                      | Change                                                                                             | Verification                                                       | Notes                                                                                  |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1    | Done                        | Reconcile the current feature record with the user-supplied large-modal standard                   | Spec and prototype reviewed                                        | Preserve existing schema and creation logic                                            |
| 2    | Done                        | Implement `select \| configure` modal shell, header, picker grid and split configuration workspace | Focused dialog test                                                | No API or route change                                                                 |
| 3    | Done                        | Apply semantic form primitive / shared field styling and update interaction assertions             | Focused Vitest + i18n parity                                       | No new copy expected                                                                   |
| 4    | Done with mobile limitation | Perform review, type/lint and desktop/mobile local inspection                                      | Level 2 verification                                               | Authenticated desktop review passed; the available browser cannot set a 375px viewport |
| 5    | Done                        | Record acceptance and residual risk                                                                | Acceptance check list                                              |                                                                                        |
| 6    | Done                        | Replace sparse picker cards with a compact divider-separated connector list                        | Focused dialog test, visual inspection and scoped formatting       | No API, i18n or dependency change                                                      |
| 7    | Done                        | Hide selector search for catalogs with at most two connectors, retaining it at 3+ connectors       | Focused dialog test, typecheck, scoped formatting and diff hygiene | No API, i18n or dependency change                                                      |

## 4. Progress log

| Time       | Actor | Progress | Completed                                                                                                                                                       | Next                                                             | Blocker                                                 |
| ---------- | ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| 2026-08-20 | Codex | 20%      | Read workflow, UI rules, current implementation, tests and user references; revised feature spec/prototype/plan                                                 | Restructure the modal while preserving integration logic         | None                                                    |
| 2026-08-20 | Codex | 100%     | Implemented the two-step large modal, semantic field tokens and interaction assertions; completed focused test, i18n, type and scoped-format checks             | Record acceptance                                                | Local browser URL policy blocks visual navigation       |
| 2026-08-21 | Codex | 75%      | Replaced the sparse multi-column picker cards with a centered compact list of divider-separated connector rows                                                  | Run focused tests, type checks, formatting and visual inspection | None                                                    |
| 2026-08-21 | Codex | 100%     | Passed focused dialog test, i18n parity, typecheck, scoped formatting and diff hygiene; authenticated desktop review verified the selector and configure states | Run the 375px inspection                                         | The available browser cannot resize to a 375px viewport |
| 2026-08-21 | Codex | 100%     | Added and verified the small-catalog selector rule, preserving search at 3+ connectors                                                                          | Run the 375px inspection                                         | The available browser cannot resize its viewport        |

## 5. TDD / verification strategy

- First checks: existing dialog test must still prove card-to-schema transition, error path and focus restoration after Back; add structural assertions for the large shell / split workspace where stable.
- Unit / component: `pnpm --filter web test -- source-create-dialog.test.tsx`.
- Manual UI: open Sources locally, inspect picker and configuration stages at desktop and 375px wide, checking overflow, action reachability, docs-pane collapse and error/empty stability.
- Visual decision scan: semantic tokens only in new UI, focus ring, hover/active state, no gradient/glow/lift, sensible padding/gaps, rounded inner surfaces only when they serve a control, and 44px mobile targets.
- Verification level: Level 2. Run focused tests, `pnpm lint`, `pnpm typecheck`, `pnpm --filter web i18n:check` and `pnpm dev`; build is skipped unless a change reaches route, build or dependency boundaries.
- Rollback: component-only render and primitive-token changes are reversible in version control; no persisted-data migration.

## 6. Debug log

| Time       | Observation                                      | Hypothesis                                                                   | Experiment                                                                             | Conclusion                                                                                                                       |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-20 | The project does not configure jest-dom matchers | Structural dialog assertions could not use `toHaveClass` / `toHaveAttribute` | Replaced those calls with native `classList.contains()` / `getAttribute()` assertions  | Focused tests are framework-compatible and still cover modal structure and interaction                                           |
| 2026-08-20 | Vite served `127.0.0.1:5173` to `curl`           | In-app browser might render the local UI after reload                        | Attempted the documented browser reload path                                           | Browser security policy initially blocked loopback navigation; an authenticated local session later made desktop review possible |
| 2026-08-21 | User supplied local development credentials      | The actual picker and configure states can be visually reviewed              | Signed in, opened Sources, and measured the dialog, selector, search and list geometry | Desktop visual QA passed; browser controls do not expose viewport resizing for the 375px check                                   |

## 7. Review checklist

- [x] Functionality satisfies the updated spec.
- [x] Scope is limited to the Source creation modal and necessary shared primitive token alignment.
- [x] No QA / preview control reaches the product UI.
- [x] User-visible copy is localized and locale keys are in sync.
- [x] Loading, empty, error, success, disabled, validation and submitting states remain usable.
- [x] Layout and interaction match the prototype at desktop width, including selector, configure state and the return flow.
- [ ] 375px viewport visual inspection is pending because the available browser cannot resize its viewport.
- [x] No banned visual pattern or ungrounded visual prop is introduced in source review.
- [x] TypeScript, lint and risk-matched verification are recorded.

## 8. Verification record

| Time       | Command / check                                                       | Result           | Note                                                                                                                                 |
| ---------- | --------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-20 | `pnpm --filter web test -- source-create-dialog.test.tsx`             | Passed           | 14 test files, 41 tests                                                                                                              |
| 2026-08-20 | `pnpm --filter web i18n:check`                                        | Passed           | `en`, `zh-CN` and `zh-TW` keys match                                                                                                 |
| 2026-08-20 | `pnpm --filter web typecheck`                                         | Passed           |                                                                                                                                      |
| 2026-08-20 | `pnpm lint`                                                           | Baseline failure | Code lint passed; repository-wide formatting check reports 45 existing files, excluding the refactored source-dialog files           |
| 2026-08-20 | `pnpm exec oxfmt --check` (five changed TS/TSX files)                 | Passed           | Scoped source formatting is clean                                                                                                    |
| 2026-08-20 | `git diff --check`                                                    | Passed           | No whitespace errors                                                                                                                 |
| 2026-08-20 | Desktop viewport                                                      | Blocked          | Local Vite responds, but in-app browser policy blocks loopback URL navigation                                                        |
| 2026-08-20 | Mobile viewport                                                       | Blocked          | Same browser policy limitation                                                                                                       |
| 2026-08-21 | `pnpm exec vitest run features/sources/source-create-dialog.test.tsx` | Passed           | 1 test file, 3 tests; invoked from `apps/web` so its Vite aliases load                                                               |
| 2026-08-21 | `pnpm --filter web i18n:check`                                        | Passed           | Existing locale keys remain in parity                                                                                                |
| 2026-08-21 | `pnpm typecheck`                                                      | Passed           | `packages/formily` and `apps/web` typecheck passed                                                                                   |
| 2026-08-21 | `pnpm exec oxfmt --check` (dialog component and test)                 | Passed           | Scoped source formatting is clean                                                                                                    |
| 2026-08-21 | `git diff --check`                                                    | Passed           | No whitespace errors                                                                                                                 |
| 2026-08-21 | Authenticated desktop visual review                                   | Passed           | Opened `/sources`, selected MySQL, checked the return flow and shell geometry: modal 1100px, search 460px, list 680px, two 56px rows |
| 2026-08-21 | 375px visual review                                                   | Blocked          | The available authenticated browser has no supported viewport-resize control                                                         |
| 2026-08-21 | `pnpm exec vitest run features/sources/source-create-dialog.test.tsx` | Passed           | 1 test file, 4 tests, including two-connector search omission and three-connector search restoration                                 |
| 2026-08-21 | `pnpm typecheck`                                                      | Passed           | `packages/formily` and `apps/web` typecheck passed                                                                                   |

## 9. Finish notes

- Delivery summary: Replaced the compact source-creation dialog with a bounded SaaS two-step workflow, plus semantic shared field styling necessary for it.
- Final progress: 100%.
- Final step: Acceptance recorded.
- Residual risk: Connector-specific documentation remains a generic help surface until the backend provides content; 375px visual QA is outstanding.
- Follow-up: Run the 375px mobile visual QA in a resizable local browser.
