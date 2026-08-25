# Pipeline canvas workspace prototype

> Status: Revised for implementation
> Date: 2026-08-25
> Owner: Codex
> Feature folder: `docs/workflow/features/2026-08-24-pipeline-canvas-workspace/`
> Spec: [./spec.md](./spec.md)
> Plan: [./plan.md](./plan.md)

## 1. Visual thesis

This is a precision operator workspace: a quiet neutral dot field, a docked left context aside with a white inner surface, and compact white graph cards. Build makes the graph the primary object. Only graph controls float over the canvas, while runtime material belongs to its own navigable pages.

The radius scale is `6px`, `10px`, `12px`, and pill. Navigation rows and compact controls use 10px. Canvas panels and graph cards use 12px or 15px where the node shell needs a selection inset. Depth is limited to panels and graph nodes, using a single restrained shadow rather than nested borders.

## 2. Layout

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [←] [pipeline id] [collapse]  [Node library]              [layout saved] │
│ ┌──────────────────────┐                                                    │
│ │ ▣ Build               │       ┌ source ┐  ┌ transform ┐                  │
│ │ ⟨⟩ API access         │       │ icon name│  │ icon name  │                │
│ │ ▤ Logs                │       │ detail   │  │ detail     │                │
│ │ ◌ Monitoring          │       └──────────┘  └────────────┘                │
│ └──────────────────────┘                                      [Inspector] │
│ [fit / zoom]                                                [minimap]       │
└───────────────────────────────────────────────────────────────────────────┘
```

## 3. Fidelity boundary

- Source reference: the supplied screenshot and inspected public workflow-source patterns.
- Preserve: full-bleed graph interaction inside Build, a light dot field, compact semantic node cards, horizontal handle placement, Bezier routing, and floating canvas-only context surfaces.
- Adapt: Tapstate semantic tokens, Lucide icons, read-only DAG semantics, and existing layout persistence.
- Exclude: brand assets, external product copy, fake test runs, fake API publication, collaboration, comments, edge insertion, and node mutation actions.

## 4. Interaction model

| Trigger                       | Feedback                                                        | Result                                                  |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Click a node                  | Blue selection shell and inspector update                       | User reads node identity and semantic detail            |
| Hover a node                  | Node shadow lifts slightly and short-line handles gain contrast | Connection points are discoverable without visual noise |
| Move a node                   | Graph position changes and debounced layout save begins         | Only geometry changes                                   |
| Choose a left navigation item | Route changes and its page-level query begins                   | Canvas state does not compete with observation content  |
| Choose API access             | API access page lists serve-node availability                   | No endpoint or publication control is invented          |
| Use fit or minimap            | Viewport updates                                                | User regains full DAG context                           |

## 5. Responsive behavior

- Desktop: the 240px navigation aside sits in normal layout flow with 4px padding and a white inner surface. Its header's rightmost icon collapses it to a 48px rail. Node library floats in the canvas left corner, inspector floats at canvas right, and minimap is at bottom right.
- Tablet: navigation aside is 208px when expanded, node library remains canvas-local, and inspector remains 288px wide.
- Narrow: the navigation can collapse to its 48px rail, node library becomes a 44px trigger, and inspector uses the remaining viewport width without covering navigation.

## 6. Visual decisions

| Area                     | Choice                                                                                                                                                                                                          | Rationale                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Canvas                   | Neutral `#f2f4f7` with restrained 18px dots                                                                                                                                                                     | Maintains orientation while leaving white graph cards and edges legible                             |
| Node                     | 240px inner block, icon plus name plus dedicated description space; connector images use a 24px translucent shell with a 10px surface blur, a 5px blurred image backdrop, and a sharp 4px-inset foreground mark | Supports scanning without hiding semantic detail while making real connector marks feel intentional |
| Edge                     | 2px muted blue-gray custom Bezier path                                                                                                                                                                          | Makes direction and branching visible without decorative effects                                    |
| Handles                  | 2px connector bar inside a 16px transparent hit target                                                                                                                                                          | Keeps the card outline clean while retaining a usable connection target                             |
| Workspace navigation     | Cool-white floating 240px panel, 10px active row, upper-right collapse icon                                                                                                                                     | Keeps operational pages discoverable without reducing the canvas                                    |
| Floating canvas surfaces | White semantic surface, 12px radius, one layered shadow                                                                                                                                                         | Separates controls from the graph without turning runtime pages into overlays                       |
| Motion                   | opacity, transform, and border-color only                                                                                                                                                                       | Keeps canvas interaction responsive and respects reduced motion                                     |

## 7. Theme architecture

- `tailwind.css` owns Pipeline semantic values for light and dark themes. The groups are canvas/grid, surface/border/text, node states, edges/handles, and React Flow utility surfaces.
- `pipeline-canvas.css`, imported by `app.css`, owns the Pipeline component recipes and React Flow selectors. React components retain layout and behavior, but never literal canvas colors.
- The light canvas is intentionally `#f2f4f7`; white surfaces are separated by a five-percent lightness step and restrained elevation. Dark values use surface steps and translucent borders rather than light-mode shadows.

## 7. States

| State                   | Presentation                                               | Action                                |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------- |
| Canvas loading          | Stable full-canvas loading message                         | Wait                                  |
| Canvas error            | Centered retry state                                       | Retry editor reads                    |
| Observation loading     | Page-level loading message                                 | Wait                                  |
| Observation unavailable | Clear unavailable copy, not zero-valued metrics            | Retry later                           |
| Success                 | Page shows real status, metrics, logs, or API availability | Navigate to another workspace section |

## 8. Review record

| Date       | Reviewer       | Decision | Notes                                                                                                                   |
| ---------- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-08-25 | User direction | Revised  | Build owns the canvas. API access, Logs, and Monitoring are left-navigation routes inside a collapsible floating panel. |
