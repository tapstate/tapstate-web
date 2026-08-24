# Pipeline canvas workspace acceptance

> Date: 2026-08-24
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Spec: [./spec.md](./spec.md)
> Prototype: [./prototype.md](./prototype.md)
> Plan: [./plan.md](./plan.md)
> Reviewer: Pending

## 1. Decision

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Needs changes

## 2. Acceptance record

| Criterion | Result | Evidence |
| --- | --- | --- |
| Full-bleed canvas and floating controls | Passed in source and component coverage | Editor has no application shell, preserves the back action, and uses floating node, context, and viewport surfaces. |
| Custom node cards, handles, and Bezier paths | Passed in graph coverage | Semantic edges map to the custom `pipeline` edge type, while cards render type icon, name, detail, and horizontal handles. |
| Honest status, metrics, logs, and API access panels | Passed in component coverage | Runtime reads begin only when their panel opens. Serve nodes are labelled as unpublished API access and no URL or publish action is emitted. |
| Locale, test, type, and build checks | Passed | 18 test files / 84 tests, typecheck, locale validation, scoped format check, build, and `git diff --check` passed. |
| Desktop and narrow viewport review | Pending | |

## 3. Verification

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm --filter web test` | Passed | 18 files, 84 tests |
| `pnpm --filter web typecheck` | Passed | |
| `pnpm --filter web i18n:check` | Passed | Locale keys match |
| `pnpm --filter web build` | Passed | Existing chunk-size warning remains |
| Scoped `oxfmt --check` | Passed | All modified TypeScript files are formatted |
| `pnpm --filter web lint` | Blocked | Oxlint passed, but 20 pre-existing unrelated files fail formatter verification. |
| Desktop viewport | Pending | |
| Narrow viewport | Pending | |

## 4. Remaining risks

- Semantic DAG mutation and API publication remain blocked on typed backend commands.
- Authenticated visual validation must use a real local session.
