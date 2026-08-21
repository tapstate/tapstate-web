# Source Create Dialog Prototype

> Status: Approved
> Date: 2026-08-20
> Owner: Codex
> Feature folder: docs/workflow/features/2026-08-19-source-create-dialog/
> Spec: ./spec.md
> Plan: ./plan.md

## 1. Prototype goal

Make Source creation feel like a contained SaaS work surface rather than a cramped confirm dialog: clear stage context, short action paths and independently scrollable working areas.

## 2. Scope

Covers the dialog shell, select/configure state transition, compact selector list, configuration split view, status messages, responsive rules and action affordances. It does not add new connector data, route-level pages or a bespoke documentation renderer.

## 3. Layout wireframes

```text
╭──────────────────────────── Create source ───────────────────────────── [×] ─╮
│ fixed h-14 header                                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ p-6 / lg:p-8, selector body scrolls                                           │
│          [ Search connectors, only when catalog has 3+ connectors ]         │
│                                                                              │
│                 ┌────────────────────────────────────────┐                   │
│                 │ icon  MySQL                         ›   │                   │
│                 ├────────────────────────────────────────┤                   │
│                 │ icon  PostgreSQL                    ›   │  compact list     │
│                 ├────────────────────────────────────────┤                   │
│                 │ icon  MongoDB                       ›   │                   │
│                 └────────────────────────────────────────┘                   │
╰──────────────────────────────────────────────────────────────────────────────╯

╭──────────────────────── ← Choose another connector · MySQL ──────────── [×] ─╮
│ fixed h-14 header                                                             │
├───────────────────────────────────────┬──────────────────────────────────────┤
│ muted/20 form pane (independent scroll)│ desktop-only docs pane (scroll)     │
│  centered p-8, max-w-3xl              │ Setup guidance                       │
│  Source ID                             │ origin / help                        │
│  [ mode A | mode B ]                   │                                      │
│  schema-driven fields                  │                                      │
│                                        │                                      │
│ ────────────────────────────────       │                                      │
│                   Cancel   Create      │                                      │
│ fixed action bar at the left pane base │                                      │
╰───────────────────────────────────────┴──────────────────────────────────────╯
```

## 4. Fidelity boundary

- Reference: user-supplied two screenshots and the explicit SaaS Large Modal UX & Layout Standard.
- Must match: large rounded modal, fixed 56px header, centered one-column connector list, a narrow selector search only when the catalog has 3+ entries, configuration divider, left form / right guide relationship, and visible return control.
- Engineering adjustments: current shadcn/Base UI Dialog keeps its focus trap and animation; actual connector names, modes and schema fields are runtime data.
- Explicitly prohibited: full-screen modal, default compact Dialog padding, gradient / glass decoration, card hover lift, floating ghost cards, ambient icon glow, numbered step chrome, artificial preview controls.

## 5. Key interaction

| Trigger        | Feedback                                                                    | Result                                              |
| -------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| Open dialog    | `step = 'select'`; catalog load starts if needed                            | Selector header and connector list shown            |
| Type in search | When the catalog has 3+ connectors, rows filter by name, ID, group and mode | No navigation or selection reset                    |
| Click row      | `step = 'configure'`; selected connector detail loads                       | Header exposes Back, body becomes split view        |
| Click Back     | Form state is cleared; focus returns to previous card                       | Selector restores without closing                   |
| Choose a mode  | Segmented control shows one selected item                                   | Create payload uses selected mode                   |
| Submit         | Fixed action bar disables and shows spinner                                 | Existing source creation callback closes on success |

## 6. State coverage

| State                 | Visual treatment                                      | Action                                |
| --------------------- | ----------------------------------------------------- | ------------------------------------- |
| Loading               | Compact spinner line within a fixed body region       | Close unless submitting               |
| Empty                 | Quiet muted copy with no decorative container         | Close or refine search when available |
| Error                 | `destructive`-semantic alert, no layout jump          | Back / close / retry by reopen        |
| Success               | Existing callback refreshes page and closes Dialog    | Continue on Sources page              |
| Disabled / submitting | Stable-height actions, pointer events disabled        | Wait                                  |
| Validation            | Field-level destructive text under respective control | Correct fields and resubmit           |

## 7. Responsive rules

- Desktop: 1100px maximum shell; the connector list remains centered and one-column to preserve scanning, then documentation pane appears at `lg`.
- Tablet: shell remains 90vh within viewport gutters; the form pane keeps its fixed footer while documentation is hidden.
- Mobile: width falls back to the Dialog viewport gutter, grid is one column and all interactive header / action controls are at least 44px; no page-level horizontal scrolling.

## 8. Visual decisions

| Area               | Default rule                     | Choice                                                                                                                                                                                          | Basis                                         | Exception |
| ------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------- |
| Modal              | shadcn Dialog surface            | `max-w-[1100px]`, `h-[90vh]`, `max-h-[800px]`, `p-0`, `rounded-2xl`, `shadow-2xl`                                                                                                               | User standard for complex configuration modal | No        |
| Backdrop           | Retain context, not opaque black | existing blur-capable neutral backdrop                                                                                                                                                          | User standard; Base UI backdrop               | No        |
| Connector selector | Compact collection surface       | One `max-w-[680px]` container, row dividers, bare 32px icons, chevron and `hover:bg-accent`; a narrow search control appears only at 3+ catalog entries; no shadow/lift or per-row card outline | User follow-up + Linear-style scanning        | No        |
| Form pane          | Subtle working surface           | `bg-muted/20`, centered `max-w-3xl` inner content                                                                                                                                               | User standard                                 | No        |
| Mode switching     | Dedicated state control          | semantic segmented buttons, `bg-muted` track and `bg-background shadow-sm` selected item                                                                                                        | User standard                                 | No        |
| Docs               | Secondary reference content      | 360/420px desktop-only pane, divider rather than inner card                                                                                                                                     | User standard + flatten-depth rule            | No        |

## 9. Assets

- User supplied selector and configuration reference screenshots.
- Markdown wireframe in this document.

## 10. Review record

| Date       | Reviewer | Decision | Note                                                                                                   |
| ---------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| 2026-08-20 | Codex    | Approved | Implement shell and interaction rules above.                                                           |
| 2026-08-21 | Codex    | Approved | Replace sparse card grid with a compact single-column selection list.                                  |
| 2026-08-21 | Codex    | Approved | Hide the search control for the current two-connector catalog; restore it automatically at 3+ entries. |
