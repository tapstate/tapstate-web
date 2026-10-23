## What changed

## UI review (complete for a new page or substantial visual change)

- [ ] Page composition follows `docs/engineering/DESIGN.md`; name the source page pattern and explain card/table choice.
- [ ] Controls and overlays use the vendored component public subpaths or a documented thin adapter; list any deviations and their source files.
- [ ] Light/dark semantic tokens, loading/empty/error/disabled/selected states, keyboard focus, accessible names and overlay dismissal were inspected where applicable.
- [ ] Desktop 1280×800 and mobile 375×812 screenshots or recordings are attached; English, Simplified Chinese and Traditional Chinese fit.
- [ ] Tapstate branding, navigation, app shell and main surface were compared with the base branch.
- [ ] Existing-page audit row in `docs/engineering/ui-page-audit.md` is updated if a page was changed.
- [ ] System interactions follow `docs/engineering/ui-interaction-audit.md`; record trigger, keyboard path, dismissal, result and focus return for every changed overlay or notification.
- [ ] Each changed composition includes the source-mapping table required by DESIGN.md: source revision/file, original component/classes, local component/classes, every deviation and rendered evidence. No guessed spacing, surface, icon size or responsive override.
- [ ] Content backgrounds were distinguished from input/control backgrounds; dialog body padding and right-aligned row statuses/actions were checked in the rendered page. A build/typecheck is not recorded as visual acceptance.

### UI source mapping

For UI changes, fill this table; for non-UI changes, state not applicable.

| Surface / part | Source revision and file | Source component / classes | Local component / classes | Difference and reason | Rendered evidence |
| -------------- | ------------------------ | -------------------------- | ------------------------- | --------------------- | ----------------- |

## Verification

List the commands run and manual browser steps. Mark any unrun check explicitly.
