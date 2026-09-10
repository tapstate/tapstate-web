# Pipeline unified node selector

**Status:** In progress  
**Date:** 2026-08-27  
**Owner:** ws/beta-web-ui

## Original request

Provide one shared node-selector popover for Pipeline authoring. It must open from the workspace aside plus button, a blank-canvas context menu, and the output side of an unconnected node. The selector exposes expandable Sources and their tables, plus direct Transform, View, and Target choices.

## Goals

- Keep the three launch points as different contexts for one selection surface and one graph mutation path.
- Allow a Source to be expanded before choosing a concrete table.
- Add an edge only for an output-side insertion, using the triggering node as the explicit upstream source.
- Keep layout position, graph selection, dirty state, and persistence owned by the editor page.
- Use local semantic Pipeline CSS tokens for the selector surface and its states.

## Non-goals

- Reconstruct Pipeline DSL from invalid isolated processing nodes.
- Add unsupported transform kinds.
- Change Pipeline runtime lifecycle or observation behavior.
- Add another UI library or a fourth drag-and-drop insertion route.

## Data and behavior

The trigger supplies `PipelineNodeInsertionContext`:

```ts
{
  position: { x: number; y: number }
  connectFrom: string | null
}
```

The picker emits a typed node choice. A selected Source writes source id, connector id, and table. A selected Transform writes an actual supported transform type. View and Target use their typed defaults. A resulting edge is created only if `connectFrom` is non-null.

## User paths

1. Open from the aside plus button, choose a Transform, add an isolated node near the visible canvas origin.
2. Right-click empty canvas space, choose a Source table, add the configured Source at the converted flow coordinate.
3. Hover an unconnected output, click plus, choose a node, create it to the right and connect it from the triggering node.

## States

| State | Required behavior |
| --- | --- |
| Loading Sources | Keep selector available, show a compact loading state in the Source section |
| Empty Sources | Explain that no Sources are available, keep processing choices usable |
| Source error | Show a retry-safe error message, keep processing choices usable |
| Search empty | Show a query-specific empty state |
| Source expanded | Tables become selectable under that Source |
| Dismissed | Escape, outside press, and close action clear insertion context |

## i18n

All new visible strings are added to `en`, `zh-CN`, and `zh-TW`.

## Risks

- Stale connection context could accidentally create an edge. Dismissal and selection clear context immediately.
- Canvas and DOM coordinates differ. The React Flow coordinate conversion is mandatory for canvas context insertion.
- Invalid isolated processing nodes can exist in the editor draft. Save-time validation remains the final guard.
