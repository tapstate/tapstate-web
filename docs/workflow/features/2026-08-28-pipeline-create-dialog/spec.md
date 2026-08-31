# Pipeline creation dialog

**Status:** Approved for implementation  
**Date:** 2026-08-28  
**Owner:** ws/beta-web-ui

## Original request

Start Pipeline creation from the existing `/pipelines` screen. The creation entry must be a full-screen component, not a new route. Its visual shell should follow the local Dify implementation: a solid muted backdrop, a near-full-screen white card, and a close button in the top-right corner.

## Goals

- Keep `/pipelines` as the only route involved in Pipeline creation.
- Open the creation entry from the list Create button without leaving the list page.
- Present the available creation modes before creating a Pipeline with an ID.
- Preserve the ID requirement because Pipeline identifiers are user-defined, not generated GUIDs.
- Keep the Wizard transition inside the same controlled full-screen surface.
- Keep all visible strings localized in `en`, `zh-CN`, and `zh-TW`.

## Non-goals

- Do not add `/pipelines/create` or another creation route.
- Do not bypass `AppShell` for a special creation pathname.
- Do not change Pipeline API contracts or create a new server endpoint in this UI task.
- Do not implement unavailable SQL, DAG, or AI builders as part of this refactor.

## User paths

1. From `/pipelines`, click Create.
2. Select Wizard, DuckDB SQL, DAG Designer, or AI.
3. Enter a valid Pipeline ID and optional description.
4. Continue into the available builder, or receive an in-surface unavailable notice for planned modes.
5. Close with the top-right close button, cancel action, or Escape and return to the unchanged list.

## States

| State | Required behavior |
| --- | --- |
| Closed | Only the Pipeline list is mounted and interactive. |
| Entry open | Full-screen dialog is mounted above the list with focusable close and form controls. |
| Invalid ID | Continue is disabled and the validation hint is visible. |
| Wizard active | Wizard builder replaces the entry content inside the same dialog shell. |
| Planned mode | Selection remains visible and Continue reports that the mode is not available yet. |
| Dismissed | Dialog closes without changing list state or URL. |

## Accessibility

- Use the existing Dialog primitive with a labelled title, focus management, Escape handling, and controlled open state.
- The close button has a localized accessible label.
- Mode cards are keyboard-reachable buttons with `aria-pressed`.
- ID validation is exposed through `aria-invalid` and an associated hint.
