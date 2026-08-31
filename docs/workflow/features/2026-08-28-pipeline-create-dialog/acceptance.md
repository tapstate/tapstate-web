# Pipeline creation dialog acceptance

**Status:** Implemented, pending manual acceptance  
**Date:** 2026-08-28

## Acceptance checklist

- [x] `/pipelines` remains the only route used to open Pipeline creation.
- [x] Clicking Create opens an in-page full-screen component without URL navigation.
- [x] The backdrop, 16px desktop inset, near-full-screen card, radius, border, and close control match the approved prototype.
- [x] The four creation modes are visible before the Pipeline ID form.
- [x] Invalid IDs keep Continue disabled and expose the validation hint.
- [ ] Wizard opens inside the same dialog shell and its Back action returns to the mode entry.
- [x] Planned modes remain selectable and show a localized unavailable notice.
- [ ] Close, Cancel, outside dismissal, and Escape all close the component.
- [x] Existing list loading, error, empty, selection, and lifecycle actions remain intact.
- [x] New and changed strings exist in `en`, `zh-CN`, and `zh-TW`.
- [x] Focused tests and typecheck pass, followed by authenticated desktop and narrow browser checks.

## Evidence

Evidence:

- `pipelines-page.test.tsx`: 9 focused tests pass, including in-page dialog opening without pathname changes.
- TypeScript, locale parity, focused lint, and `git diff --check` pass.
- Authenticated browser verification at desktop and 390px confirms the 16px inset surface, close control, four modes, disabled invalid-ID Continue state, and no horizontal overflow.
- Wizard mode was opened in the same dialog and rendered its builder content while the URL remained `/pipelines`.
- The preview panel now follows the reference split structure: full-width top rule, fixed-width inner panel with side rules, and separators above and below the preview stage.
- Creation inputs continue to use the Pipeline workspace tokens (`--pipeline-control-surface`, `--pipeline-border-strong`) rather than introducing a separate color system.
