# Source Create Dialog Prototype

> Status: Approved
> Date: 2026-08-19
> Owner: Codex
> Feature folder: docs/workflow/features/2026-08-19-source-create-dialog/
> Spec: ./spec.md
> Plan: ./plan.md

## Direction

The existing Source workbench is the visual reference: Linear-style utility UI with quiet neutral surfaces, compact controls, and a single dark action. Linear keeps creation choices scan-first, while Notion uses clear step transitions and GitHub uses a stable footer for multi-step dialogs. The chosen signature is a restrained selected-card border and check indicator, not decorative card elevation.

## Layout

```text
Create source                                              [close]
Step 1 of 2, choose a connector
┌─────────────────────────┐ ┌─────────────────────────┐
│ icon  MySQL             │ │ icon  PostgreSQL        │
│ [Database] [CDC]        │ │ [Database] [CDC]        │
└─────────────────────────┘ └─────────────────────────┘
                                                    Cancel Continue

Create source                                              [close]
← Choose another connector                 MySQL [Database] [CDC]
┌──────────────────────────────────────┬─────────────────────────┐
│ Source id                             │ Documentation           │
│ Formily schema fields                 │ Reserved connector help │
│                                       │                         │
└──────────────────────────────────────┴─────────────────────────┘
                                                    Cancel Create
```

## Interaction and states

| State | Behaviour |
| --- | --- |
| Loading | Card list shows a compact progress row. |
| Empty | Explains that no connector is available and keeps Continue disabled. |
| Error | Shows the API or spec-source error in the dialog. |
| Selected | One card has a semantic selected state and Continue is enabled. |
| Schema unavailable | No synthetic form is shown; return to the picker is available. |

## Responsive rules

- Desktop uses a two-column card grid and a two-column authoring body.
- At narrow widths cards and authoring columns become one column; the footer remains available.
- The documentation placeholder follows the form so the core creation path stays first in reading order.

## Guardrails

- No Source detail page or edit dialog changes.
- All visible copy is localized.
- Existing shadcn-compatible dialog and button treatments remain the base controls.
