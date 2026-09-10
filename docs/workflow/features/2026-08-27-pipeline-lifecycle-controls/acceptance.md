# Pipeline list lifecycle controls acceptance

**Status:** Pending verification  
**Date:** 2026-08-27

## Acceptance checklist

- [ ] Start and stop endpoints encode Pipeline identifiers and use POST.
- [ ] The list has no Actions column or inline Edit action.
- [ ] Start is available for `NEW`, `STOPPED`, `COMPLETED`, and `FAILED`.
- [ ] Stop is available for `RUNNING` and `PAUSED`, and is confirmed before transport.
- [ ] Unavailable runtime state exposes no lifecycle command.
- [ ] Successful lifecycle changes invalidate list, detail, status, metrics, and logs projections.
- [ ] Request errors are visible and all new text exists in three locales.
- [ ] Focused tests, i18n check, typecheck, lint, and desktop plus mobile checks pass.

## Evidence

To be recorded after implementation and visual verification.
