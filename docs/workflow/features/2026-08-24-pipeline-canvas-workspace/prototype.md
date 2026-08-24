# Pipeline canvas workspace prototype

> Status: Approved for implementation
> Date: 2026-08-24
> Owner: Codex
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Spec: [./spec.md](./spec.md)
> Plan: [./plan.md](./plan.md)

## 1. Visual thesis

This is a precision operator workspace: a quiet cool-white dot field, graphite controls, and compact white graph cards. The graph is the primary object. All controls float over it, so the user keeps spatial context while inspecting configuration or runtime data.

The radius scale is `6px`, `10px`, `14px`, and pill. Compact controls use 10px; floating panels use 14px; status chips use pill geometry. Depth is limited to floating panels and graph nodes, using one restrained layered shadow rather than nested card borders.

## 2. Layout

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [← Pipelines] [pipeline id · layout saved]       [Runtime][Metrics][Logs] │
│                                                                           │
│ [Node library]                                      [Inspector / runtime] │
│  Sources                                           type, config, status   │
│  Transforms                                        metrics, logs, API      │
│                                                                           │
│              ┌ source ┐   ┌ transform ┐   ┌ serve ┐   ┌ target ┐           │
│              │ icon name│ │ icon name  │ │ icon name│ │ icon name│         │
│              │ detail   │ │ detail     │ │ detail   │ │ detail   │         │
│              └──────────┘ └────────────┘ └──────────┘ └──────────┘        │
│                                                                           │
│ [fit / zoom]                                              [minimap]       │
└───────────────────────────────────────────────────────────────────────────┘
```

## 3. Fidelity boundary

- Source reference: the supplied screenshot and inspected public workflow-source patterns.
- Preserve: full-bleed graph interaction, light dot field, compact semantic node cards, horizontal handle placement, Bezier routing, floating context surfaces.
- Adapt: Tapstate semantic tokens, Lucide icons, 10px compact control radius, read-only DAG semantics, and existing layout persistence.
- Exclude: brand assets, external product copy, fake test runs, fake API publication, collaboration, comments, edge insertion, and node mutation actions.

## 4. Interaction model

| Trigger | Feedback | Result |
| --- | --- | --- |
| Click a node | Blue selection outline and context panel update | User reads node identity and semantic detail |
| Hover a node | Node rises subtly and handles gain contrast | Connection points are discoverable without visual noise |
| Move a node | Graph position changes and debounced layout save begins | Only geometry changes |
| Choose Runtime, Metrics, or Logs | Panel switches and fetch begins | Real, separate observation read is shown |
| Choose API access | Panel lists serve-node availability | No endpoint or publication control is invented |
| Use fit or minimap | Viewport updates | User regains full DAG context |

## 5. Responsive behavior

- Desktop: node library at top left, editor context at bottom right, runtime panel at right, minimap bottom right.
- Tablet: node library collapses to its trigger, runtime panel remains 288px wide.
- Narrow: top controls wrap into a compact grouped surface, node library becomes a 44px trigger, and inspector uses the viewport width without covering the back action.

## 6. Visual decisions

| Area | Choice | Rationale |
| --- | --- | --- |
| Canvas | `#f8faff` with low-contrast 20px dots | Maintains orientation while leaving graph edges legible |
| Node | 248px maximum width, icon plus name plus description | Supports scanning without hiding semantic detail |
| Edge | 2px muted blue-gray custom Bezier path | Makes direction and branching visible without decorative effects |
| Handles | 4px connector bar inside a 16px invisible hit target | Keeps the card outline clean while retaining a usable connection target |
| Floating surfaces | White semantic surface, 14px radius, one layered shadow | Separates controls from canvas without a fixed sidebar |
| Motion | opacity, transform, and border-color only | Keeps canvas interaction responsive and respects reduced motion |

## 7. States

| State | Presentation | Action |
| --- | --- | --- |
| Loading | Stable full-canvas loading message | Wait |
| Error | Centered retry state | Retry editor reads |
| Empty runtime | Clear unavailable copy, not zero-valued metrics | Retry later |
| Success | Contextual inspector shows real response data | Switch panels |

## 8. Review record

| Date | Reviewer | Decision | Notes |
| --- | --- | --- | --- |
| 2026-08-24 | User direction | Approved | Full-bleed editor, floating panels, and source-led node visuals are required. |
