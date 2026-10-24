# Overlay conventions

The source of truth is the source [`packages/ui/docs/overlays.md`](../../packages/ui/docs/overlays.md) and each public overlay entrypoint. This document adds the Tapstate integration boundary.

- Use `@tapstate-web/ui/dialog`, `/alert-dialog`, `/drawer`, `/popover`, `/dropdown-menu`, `/tooltip`, `/infotip`, `/select`, and `/toast` according to their intended semantics. Do not retain an independently styled overlay when migrating a page.
- Let the component own portal, focus, Escape, outside dismissal, placement, motion and layer behavior. Do not add call-site `z-*`, a second portal, or manual document event handlers for the same job.
- Isolate each app root so body portals stack correctly. Confirm nested Select/Popover inside Dialog with keyboard and pointer during review.
- Tapstate owns labels, translations, state and actions. The component owns the visible surface and interaction behavior.
- For each changed overlay, inspect opening, closing, focus return, scroll, narrow viewport and an accessible name. The page review matrix is in [DESIGN.md](DESIGN.md).

Current app overlay migration is in progress; old `@tapstate-web/ui` wrappers are not evidence that this contract is met.
