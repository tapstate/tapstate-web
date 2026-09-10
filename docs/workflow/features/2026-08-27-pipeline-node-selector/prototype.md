# Pipeline unified node selector prototype

**Status:** Approved for implementation  
**Date:** 2026-08-27

## Visual direction

Utility-first workspace tooling: compact, quiet, and high-density. The selector is a single elevated surface with a search field, a collapsible Source section, and direct node choices. It uses the existing Pipeline canvas visual vocabulary and semantic tokens, not raw colors in JSX.

## Layout

```text
┌──────────────────────── Node selector ────────────────────────┐
│ Search nodes and Sources…                                     │
├ Sources ──────────────────────────────────────────────────────┤
│ ▸ source-a                                      connector badge │
│   ▾ source-b                                                    │
│      table_one                                                   │
│      table_two                                                   │
├ Processing ───────────────────────────────────────────────────┤
│ Filter  Map  Join  Union  Nest  JavaScript                     │
├ Output ───────────────────────────────────────────────────────┤
│ View                                                     Target │
└────────────────────────────────────────────────────────────────┘
```

The surface is positioned in the flow viewport when launched by a canvas action. The aside entry uses a stable visible-origin placement. It must remain within the screen bounds.

## Interaction

- Opening focuses search.
- A Source row expands in place. A table row is the creation action.
- Processing and output choices create directly.
- Selection closes the selector before graph state changes are visible.
- Escape and outside press close and reset the context.
- An output plus appears only on a node with an output handle and no outgoing edge. The plus is visually separate from the handle.

## Responsive behavior

At 375px, the selector has a bounded viewport width and vertical scroll. Search, close behavior, keyboard focus, and table selection remain available. The editor itself may remain a desktop-first canvas but must not create page-level horizontal overflow.

## Accessibility

- Trigger icon buttons have labels and visible focus rings.
- The selector has a labelled dialog-like surface.
- Search receives focus after open.
- Escape closes it.
- Choice rows are keyboard-reachable buttons.
