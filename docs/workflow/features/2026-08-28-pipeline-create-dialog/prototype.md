# Pipeline creation dialog prototype

**Status:** Approved for implementation  
**Date:** 2026-08-28

## Visual direction

Use the existing Pipeline tokens and Tailwind utilities with the same composition as the local Dify `CreateAppDialogShell`:

- viewport-level overlay with a solid restrained gray backdrop and no backdrop blur;
- 16px viewport inset on desktop;
- near-full-screen white or white-subtle card with a 16px radius, subtle border, and no extra app navigation;
- close control at the card's top-right, 36px square with a compact tertiary surface;
- two-column content on wide screens, stacked content below the compact breakpoint;
- preview side uses the same outer rule, max-width inner panel, side borders, and section separators as the reference DOM;
- no route-specific header or sidebar.

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│                                         [close]              │
│  Create a Pipeline                    │  visual preview      │
│  Choose a build method                 │  of selected mode    │
│  [Wizard] [DuckDB SQL]                 │                     │
│  [DAG Designer] [AI]                   │                     │
│  Pipeline ID                           │                     │
│  Description                           │                     │
│                              [Cancel] [Continue →]           │
└──────────────────────────────────────────────────────────────┘
```

The card is rendered by a component mounted as a sibling of the list content. The list remains at `/pipelines`; opening the dialog must not mutate the URL.

## Interaction

- The list Create button opens the dialog and focuses the first meaningful control.
- The selected mode uses the existing option-card treatment and selection state.
- Close, Cancel, outside dismissal, and Escape all call the same `onClose` callback.
- The Wizard builder is a child state of the dialog. Its Back action returns to the mode entry without navigating.
- SQL, DAG, and AI cards remain discoverable while their builders are unavailable.

## Responsive behavior

- Desktop uses the inset card and split form/preview layout.
- Narrow screens use the full viewport, remove the radius and outer inset, and allow the content to scroll inside the card.
- No page-level horizontal overflow is introduced.
