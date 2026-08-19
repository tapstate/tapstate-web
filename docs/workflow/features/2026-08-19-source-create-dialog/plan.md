# Source Create Dialog Plan

> Status: In Progress
> Progress: 85%
> Current step: Focused verification complete
> Next step: Browser-check a connector whose API response includes `spec.text`
> Date: 2026-08-19
> Owner: Codex
> Feature folder: docs/workflow/features/2026-08-19-source-create-dialog/
> Spec: ./spec.md
> Prototype: ./prototype.md
> Acceptance: ./acceptance.md

## Scope

- No new dependency, route, or Source detail changes.
- The connector detail wire type gains its existing `spec` payload so creation can consume the real source schema.

## Steps

| Step | Status | Change | Verification |
| --- | --- | --- | --- |
| 1 | Done | Add failing client and schema parser tests | Vitest failure recorded |
| 2 | Done | Parse `spec.text` and adapt its Formily component aliases | Focused Vitest |
| 3 | Done | Implement picker cards and two-column authoring dialog | Typecheck pending browser inspection |
| 4 | Done | Add locale copy and run targeted checks | i18n check |

## Verification

- Level 2: focused Vitest, typecheck, i18n check, and desktop plus 375px local inspection.
- Rollback: retain the prior dialog component implementation in version control; no API mutation or data migration is involved.

## Progress log

| Date | Progress | Completed | Next | Blocker |
| --- | --- | --- | --- | --- |
| 2026-08-19 | 85% | Raw spec parser, Formily schema override, two-step dialog, locales, focused tests, typecheck | Inspect a server response that contains `spec.text` at desktop and 375px | Bundled connector rows currently state `spec.unavailable: not-stored` |
