# Pipeline list lifecycle controls prototype

**Status:** Approved for implementation  
**Date:** 2026-08-27

## Visual direction

Quiet, high-density operations workspace. A Pipeline's runtime badge remains the primary signal. Its one high-frequency lifecycle action sits directly beside it as a compact labeled control, so the operator can scan and act without opening a menu.

## Layout

```text
Status
● Running   [■ Stop]
```

The action has a fixed minimum width, a clear accessible name, and a visible label. Start uses the primary button variant. Stop uses the existing low-saturation destructive variant.

## Interaction

- Start begins the request immediately.
- Stop opens a focused confirmation dialog.
- While a request is pending, the action is disabled without changing row height.
- Success refreshes server projections. No local state claims a new runtime status before the server returns it.
- A mutation failure enters a single fixed feedback surface outside the table flow.

## Responsive behavior

At 375px the Status cell remains usable, the labeled action keeps a stable minimum width, and the confirmation dialog plus fixed feedback surface fit within the viewport. The table may retain its existing horizontal scrolling behavior.

## Accessibility

- The lifecycle action has an `aria-label` that includes the Pipeline id and visible text.
- The confirmation dialog receives focus and exposes an accessible title and description.
- Pending operations cannot be accidentally invoked twice.
- Mutation failures use `role="alert"`, `aria-live="assertive"`, and a labeled dismiss control.
