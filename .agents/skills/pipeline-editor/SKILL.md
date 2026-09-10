---
name: pipeline-editor
description: Implement or refactor Tapstate Pipeline editor canvas, nodes, edges, selectors, configuration panels, and workspace controls with stable React Flow interactions and feature-local ownership.
---

# Pipeline Editor

Use this skill for changes under `apps/web/features/pipelines/` that affect the Pipeline workspace, React Flow canvas, graph editing, node insertion, or node configuration. Do not use it for the list page, unrelated Source CRUD, or a backend-only projection change.

## Ownership

- The workspace page owns route identity, Pipeline draft persistence, save and run actions, and cross-region diagnostics.
- The canvas owns viewport, selection, pointer and pan mode, context-menu insertion, and the lifecycle of its insertion selector.
- Nodes and edges own their local hover, selection, and trigger visibility. Do not move a node-handle or edge-trigger state into the workspace page.
- The block selector owns its overlay lifecycle, focus, Escape and outside-click handling. Callers provide insertion context and placement, not a second popup implementation.
- Keep graph mutation and DSL/DAG conversion in `model/`. UI components must not shape persistence payloads.

## Component boundaries

- Keep renderer-only code under `components/canvas/`: node, handle, edge, connection line, toolbar, graph adapter, and canvas container.
- Keep insertion content and its typed insertion context under `components/node-library/`. Promote a reusable overlay into a `block-selector/` owner only when more than one trigger needs its own local open state.
- Keep configuration rendering in `components/node-config/` and transform-specific editors in `components/transform/`.
- Split a component when a child owns independent state, an overlay lifecycle, a form, or a distinct interaction contract. Do not add wrappers that only rename props or forward children.

## Interaction contracts

- A source handle may open insertion only when it is unconnected, connectable, and the canvas is editable. The trigger stays hidden until node hover, node selection, or its selector is open.
- An edge insert trigger is positioned at the Bezier label point. It is visible only while the edge, trigger, or selector is active, and inserting a node replaces the original edge with two edges.
- Right-clicking the empty canvas and the toolbar add button use the same selector content and insertion command.
- Keep selectors keyboard-safe: focus search on open, close on Escape and outside click, preserve visible focus styles, and stop event propagation where the flow canvas would otherwise consume the interaction.

## Rendering and styles

- Derive React Flow nodes and edges from DAG plus layout through memoized adapters. Do not recreate the graph because an unrelated panel width or local UI state changed.
- Store visual layout separately from DAG semantics. A drag updates the layout draft; a graph mutation updates the DAG draft.
- Put Pipeline visual tokens in `apps/web/styles/pipelines/` and consume variables in component CSS. Do not scatter new literal canvas colors across JSX and CSS.
- Keep overlay geometry and canvas controls independent from the node panel so resizing a panel cannot overlap controls or remount flow nodes.

## Verification

Use the local editor in a browser for the smallest applicable check. Verify the affected entry point, the selector's focus and dimensions, and the resulting graph mutation. For insertion, confirm a node is added and an edge insertion produces two edges. Do not save a verification-only draft.
