# Reference UI components and composition study

Revision `21a2081267a217ead3ec847c2d3a2522f3c30c2d`. Pinned source study, not a live product-adoption or browser-acceptance ledger.

Coverage: 52 public subpaths; 52 package runtime TSX; 76 application base families / 324 runtime TSX; 30 immediate domain entries. Test/story filenames and **tests**/**mocks**/**fixtures**/tests/stories directories excluded. Filename-only TSX counts including test-directory helpers are 69 package and 329 base, separately recorded in JSON.

## Adoption boundary

Current source SHA 21a2081267a217ead3ec847c2d3a2522f3c30c2d. Tapstate ships an older pinned package: every API/default/helper here remains source-only until local version parity is checked.

Preserve Tapstate shell, navigation, logo, accent and liquid-glass exceptions; reference branding/theme/navigation are not adoption requirements.

Every entry describes latest reference source or derived composition guidance. It is not evidence the older shipped Tapstate package exposes the API. No source copied into product. Neutral component-package aliases identify reference evidence.

## Shared design philosophy

- Semantics before appearance: action Button, URL anchor, pressed Toggle, field Radio/Select/Combobox, mode SegmentedControl, associated panel Tabs.
- Layer vocabulary carries meaning: page background, section-burn grouping, panel, on-panel item, field normal/hover/active, state emphasis. Primary/secondary/tertiary/quaternary text expresses hierarchy.
- Compact geometry graduates: 24/32/36px actions and fields, 16px checks/radios, 6/8/10px control corners, 12px floating panels, 16px modal surfaces. Match radius numeric value, not token-name similarity.
- Typography distinguishes system controls, body reading and title styles; strong weight/size reserved for headings and selected labels.
- Style primitive data attributes/CSS variables, never mirror state solely for CSS. Disabled appearance precedes invalid/read-only; unvalidated is not valid.
- Controls own focus: command focus-visible 2px accent ring; checked control 2px outline + 2px offset; text surface actual :focus, including pointer; compound group follows input focus.
- Overlay root lifetime, open state and portal subtree presence differ. Keep root mounted through exit. State persists only when owned above unmount boundary; portal itself resets nothing.
- Isolated app root and body portal DOM order own ordinary overlay stacking, no arbitrary z-index in the reference. Tapstate component-owned z40/z50 integration remains a target adaptation; do not remove it based on this source-only study. Positioners hide/noninteract when anchor clipped/hidden. Toast intentional z-50 body-layer exception.
- Accessible names prefer visible/native label, then aria-labelledby, then icon-only aria-label. Placeholder/title/tooltip not names. Generic span/div cannot be named by arbitrary ARIA; do not invent role just to label.
- Pending/unavailable/invalid/read-only/empty/no-results differ. Feature owns async feedback, nested skeleton decorative, task status named once, draft reset explicit.
- Application base mixes legacy custom code and new primitives. Presence is usage evidence, not accessibility certification or public supported API. Extract only validated patterns.

## Component choice

| Intent                     | Choose                       | Contract                                  |
| -------------------------- | ---------------------------- | ----------------------------------------- |
| Labeled action             | Button                       | Submit explicit, loading retains focus    |
| URL navigation             | Native anchor/router link    | Reuse visual variants only                |
| Icon command               | IconButton                   | One name; decorative glyph                |
| Pressed command            | Toggle                       | Persistent pressed state                  |
| One field option           | RadioGroup                   | Each option named                         |
| Mode/filter/view           | SegmentedControl             | Radio semantics, cannot toggle off        |
| Related content panels     | Tabs                         | Panel relationships                       |
| Free text suggestions      | Autocomplete                 | Text itself is value                      |
| Searchable retained values | Combobox                     | Source records distinct from selected IDs |
| Closed scannable values    | Select                       | No text entry                             |
| Modal task/decision        | Dialog/AlertDialog           | Semantic focus/dismiss/presence owner     |
| Reachable rich help        | Popover/Infotip              | Touch and keyboard access                 |
| Extra hint/link preview    | Tooltip/PreviewCard          | Essential content elsewhere               |
| Capacity/task/unknown wait | Meter/ProgressCircle/Spinner | Distinct semantics                        |

## Geometry, focus, surfaces and drafts

Medium Button: 32px high, 13px/16px medium text, 14px horizontal inset, 8px corners, 4px gap. Small: 24px and 6px corners; large: 36px and 10px corners. Primary-small explicitly uses 3px gap/8px inset. IconButton: 16/20/24/32/36px. Never duplicate owned child gaps with icon margins.

Input: 8px corners, 12px horizontal/7px vertical inset, 13px system type. Select/Autocomplete/Combobox groups share 24/32/36px tiers but own padding differently. Invalid remains inside accent focus ring. Disabled overrides error/read-only appearance. Read-only remains focusable/submitted while blocking edits; disabled may leave both focus order and form submission.

Floating lists: generally 12px corners, 0.5px panel border, shadow-lg, 4px list padding with matching scroll padding. Menu rows 32px, corners 8px. Hints max 300px, 8px corners, 6px padding, 12px medium. Modal: 480px width, 16px corners, viewport minus 32px clamp, 24px gutters. These are source measurements, not mandates to override target accent/glass.

Source docs explicitly separate root lifetime, open state and content presence. A closing modal root remains mounted for primitive exit. Draft inside unmounted content resets; ancestor/store draft survives. keepMounted requires explicit persistence/reset ownership. Latest reference normal overlays have no z-index; this is not a removal recommendation for Tapstate component-owned z40/z50. Reference body portal DOM order and isolated application root govern layers. A call-site z-index can lift lower content above the modal interaction guard.

Text-field invalid state can be absent before validation; not-invalid is not valid. Group visible focus derives from actual native input. Selection highlight, committed check, readonly and pending remain distinct states. Button loading retains focus and omits aria-busy; Switch loading disables and does expose busy. These differences are intentional API contracts.

DatePicker commits civil date on day click. TimePicker stores wall time and DateTimePicker stores instant; their changes remain draft until OK, dismissed draft discarded, controlled value/timezone change starts fresh. Native form/reset/validation operate on committed domain values. DateTimePicker rejects nonexistent DST values and resolves edited ambiguity earlier. Do not flatten these into generic text inputs.

Sources: component-package/docs/styling.md; docs/overlays.md; docs/forms.md; docs/selection.md; src/internal/focus.ts; src/internal/form-control.ts; src/date-time/README.md.

## Public package catalog

### `./styles.css` — stylesheet

Theme/component/utility stylesheet entry. Consumer imports Tailwind and scans package source. Load at stylesheet boundary, never repeat token constants in callers.

Primary evidence `component-package/src/styles/styles.css:1` (101 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: `component-package/src/styles/styles.css:100` — `--text-2xs: 0.625rem;`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: `component-package/src/styles/styles.css:96` — `0px 1px 2px 0px var(--color-components-badge-status-light-disabled-halo),`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/styles/styles.css:7` — `* Consumers must also `@import 'tailwindcss';` (or selected layers) in their`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./cn` — behavior-helper

Defaults-first class merge; physical pl and logical ps families do not merge interchangeably. No state/visual UI.

Primary evidence `component-package/src/cn.ts:1` (1 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./use-merged-refs` — behavior-helper

Behavior helper combines DOM refs; preserve each participant, no visual component.

Primary evidence `component-package/src/use-merged-refs.ts:1` (3 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./use-ref-with-init` — behavior-helper

Initialized stable-owner ref helper; avoid accidental per-render instance recreation. No visual component.

Primary evidence `component-package/src/use-ref-with-init.ts:1` (3 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./use-render` — behavior-helper

Upstream element composition wrapper; preserve passed props/ref and native semantics. Callback sees owning primitive state.

Primary evidence `component-package/src/use-render.ts:1` (3 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./merge-props` — behavior-helper

Prop/handler/ref composition helper. Avoid ad-hoc spread replacing primitive behavior. No visual component.

Primary evidence `component-package/src/merge-props.ts:1` (1 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./alert-dialog` — visual-family

Destructive or must-confirm answer. Outside press does not dismiss; Escape still dismisses unless canceled in onOpenChange. Confirm is plain Button, deliberately not automatic Close: successful feature work closes root. Defaults primary/destructive, cancel min-width 80px.

Primary evidence `component-package/src/alert-dialog/index.tsx:1` (198 lines).

- Defaults/variants: `component-package/src/alert-dialog/index.tsx:154` — `variant = 'primary',`.
- Geometry: `component-package/src/alert-dialog/index.tsx:68` — `'fixed top-1/2 left-1/2 flex max-h-[calc(100dvh-2rem)] w-120 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto overscroll-none',`.
- Type: `component-package/src/alert-dialog/index.tsx:107` — `'system-md-regular wrap-break-word whitespace-pre-wrap text-text-secondary',`.
- Focus: `component-package/src/alert-dialog/index.tsx:35` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/alert-dialog/index.tsx:63` — `<BaseAlertDialog.Portal>`.
- Names: `component-package/src/alert-dialog/index.tsx:14` — `modalTitleClassName,`.

### `./autocomplete` — visual-family

Free-form text with optional suggestions, including command search. Root/filtered items are read-only views. Keep status and empty messages separate. Group owns visible input focus. Clear/trigger English fallback names require consumer localization.

Primary evidence `component-package/src/autocomplete/index.tsx:1` (468 lines).

- Defaults/variants: `component-package/src/autocomplete/index.tsx:97` — `variants: {`.
- Geometry: `component-package/src/autocomplete/index.tsx:77` — `'flex max-h-(--available-height) w-(--anchor-width) max-w-[min(28rem,var(--available-width))] flex-col overflow-x-hidden overflow-y-auto rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg sha`.
- Type: `component-package/src/autocomplete/index.tsx:139` — `small: 'py-0.75 system-xs-regular',`.
- Focus: `component-package/src/autocomplete/index.tsx:173` — `'hover:bg-components-input-bg-hover hover:text-text-secondary focus-visible:bg-components-input-bg-hover focus-visible:text-text-secondary',`.
- Disabled: `component-package/src/autocomplete/index.tsx:89` — `'data-disabled:cursor-not-allowed data-disabled:opacity-30',`.
- Read-only: `component-package/src/autocomplete/index.tsx:27` — `type AutocompleteGroupedProps<Items extends readonly { items: readonly unknown[] }[]> = Omit<`.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/autocomplete/index.tsx:239` — `'data-ending-style:opacity-0 data-starting-style:opacity-0',`.
- Names: `component-package/src/autocomplete/index.tsx:11` — `floatingGroupLabelClassName,`.

### `./avatar` — visual-family

Circular image plus fallback for identity; loading/error image is invisible. CSS variables inherit size through overlapping group, isolated with panel-colored ring. Supply informative alt or mark redundant identity decorative.

Primary evidence `component-package/src/avatar/index.tsx:1` (117 lines).

- Defaults/variants: `component-package/src/avatar/index.tsx:11` — `variants: {`.
- Geometry: `component-package/src/avatar/index.tsx:26` — `'relative inline-flex size-[var(--avatar-size,--spacing(8))] shrink-0 items-center justify-center overflow-hidden rounded-full align-middle text-[length:var(--avatar-font-size,var(--text-xs))] ring-components-panel-bg se`.
- Type: `component-package/src/avatar/index.tsx:16` — `md: '[--avatar-font-size:var(--text-xs)] [--avatar-size:--spacing(8)]',`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: `component-package/src/avatar/index.tsx:65` — `'absolute inset-0 size-full object-cover data-error:invisible data-loading:invisible',`.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./breadcrumb` — visual-family

Named nav + ordered list; real anchors for ancestors and aria-current page text for current location. Separator is decorative. Name required by prop union; navigation never becomes button activation.

Primary evidence `component-package/src/breadcrumb/index.tsx:1` (99 lines).

- Defaults/variants: `component-package/src/breadcrumb/index.tsx:43` — `defaultTagName: 'a',`.
- Geometry: `component-package/src/breadcrumb/index.tsx:22` — `return <nav className={cn('min-w-0', className)} {...props} />`.
- Type: `component-package/src/breadcrumb/index.tsx:29` — `'flex min-w-0 items-center gap-1.5 system-sm-regular text-text-secondary',`.
- Focus: `component-package/src/breadcrumb/index.tsx:48` — `focusRingClassName,`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/breadcrumb/index.tsx:61` — `aria-current="page"`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/breadcrumb/index.tsx:10` — `| { 'aria-label': string; 'aria-labelledby'?: never }`.

### `./button` — visual-family

Visible-label action. Native type=button, secondary/medium/default tone. Explicit submit type for forms; URL navigation stays anchor plus visual variants. Loading blocks activation, retains focus by default, preserves label, adds decorative spinner; deliberately no aria-busy. Changing pending label uses stable aria-labelledby.

Primary evidence `component-package/src/button/index.tsx:1` (161 lines).

- Defaults/variants: `component-package/src/button/index.tsx:16` — `variants: {`.
- Geometry: `component-package/src/button/index.tsx:53` — `small: 'h-6 gap-1 rounded-md px-2.25 text-xs font-medium',`.
- Type: `component-package/src/button/index.tsx:53` — `small: 'h-6 gap-1 rounded-md px-2.25 text-xs font-medium',`.
- Focus: `component-package/src/button/index.tsx:12` — `focusRingClassName,`.
- Disabled: `component-package/src/button/index.tsx:13` — `'inline-flex items-center justify-center overflow-hidden whitespace-nowrap data-disabled:cursor-not-allowed',`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: `component-package/src/button/index.tsx:119` — `* Marks an action as pending, blocks activation, and keeps the button focusable by default.`.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/button/index.tsx:121` — `* reference it with `aria-labelledby` so it remains the explicit accessible name.`.

### `./icon-button` — visual-family

Icon-only command: exactly one aria-label/aria-labelledby required, children one React element with decorative glyph. Defaults default/md=24px. Tooltip is not accessible name. Use visible-label Button when meaningful text is available.

Primary evidence `component-package/src/icon-button/index.tsx:1` (160 lines).

- Defaults/variants: `component-package/src/icon-button/index.tsx:14` — `variants: {`.
- Geometry: `component-package/src/icon-button/index.tsx:56` — `xs: 'size-4 rounded-sm p-0',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/icon-button/index.tsx:12` — `[focusRingClassName, 'inline-flex items-center justify-center data-disabled:cursor-not-allowed'],`.
- Disabled: `component-package/src/icon-button/index.tsx:12` — `[focusRingClassName, 'inline-flex items-center justify-center data-disabled:cursor-not-allowed'],`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/icon-button/index.tsx:122` — `'aria-label': string`.

### `./toggle` — visual-family

Persistent pressed command. Adds focus only; compose visual appearance through IconButton/Button render without nested interactive targets. Not mutually exclusive field/mode selection.

Primary evidence `component-package/src/toggle/index.tsx:1` (23 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/toggle/index.tsx:15` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./checkbox` — visual-family

Independent boolean or multiple membership. Fixed 16px visual, 12px check, 4px corners; checked/indeterminate share accent fill with different glyph. Disabled overrides hover. Associate FieldLabel; group models value array.

Primary evidence `component-package/src/checkbox/index.tsx:1` (68 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/checkbox/index.tsx:10` — `'inline-flex size-4 shrink-0 touch-manipulation items-center justify-center rounded-sm shadow-xs shadow-shadow-shadow-3',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/checkbox/index.tsx:13` — `checkedControlFocusClassName,`.
- Disabled: `component-package/src/checkbox/index.tsx:16` — `'data-disabled:cursor-not-allowed data-disabled:border-components-checkbox-border-disabled data-disabled:bg-components-checkbox-bg-disabled',`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/checkbox/index.tsx:11` — `'border border-components-checkbox-border bg-components-checkbox-bg-unchecked text-components-checkbox-icon',`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./checkbox-group` — visual-family

Upstream string[] value group with no visual wrapper opinion. Fieldset/legend owns group meaning; FieldItem/FieldLabel owns each option. Strong business ID types stay at domain boundary.

Primary evidence `component-package/src/checkbox-group/index.tsx:1` (12 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./combobox` — visual-family

Searchable committed one/many collection values. Value and source Item types separate; createComboboxItems maps stable ID/label. Multiple chips and input wrap in one group. Localize removal/keyboard hints. Popup query resets per-open; never add second clear-query control there.

Primary evidence `component-package/src/combobox/index.tsx:1` (565 lines).

- Defaults/variants: `component-package/src/combobox/index.tsx:128` — `variants: {`.
- Geometry: `component-package/src/combobox/index.tsx:85` — `'flex max-h-(--available-height) w-(--anchor-width) max-w-[min(28rem,var(--available-width))] flex-col overflow-x-hidden overflow-y-auto rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg sha`.
- Type: `component-package/src/combobox/index.tsx:166` — `small: 'py-0.75 system-xs-regular',`.
- Focus: `component-package/src/combobox/index.tsx:104` — `// Owns the focus indicator only. The caller owns the appearance, directly or through `render`.`.
- Disabled: `component-package/src/combobox/index.tsx:99` — `'data-disabled:cursor-not-allowed data-disabled:opacity-30 data-disabled:hover:bg-transparent data-disabled:hover:text-text-secondary',`.
- Read-only: `component-package/src/combobox/index.tsx:45` — `| (Multiple extends true ? readonly Value[] : Value)`.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/combobox/index.tsx:54` — `| ((selectedValue: ComboboxSelectedValue<Value, Multiple>) => React.ReactNode)`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/combobox/index.tsx:235` — `'data-ending-style:opacity-0 data-starting-style:opacity-0',`.
- Names: `component-package/src/combobox/index.tsx:11` — `floatingGroupLabelClassName,`.

### `./collapsible` — visual-family

Disclosure, not selection or modal. Trigger owns focus ring. Panel measured-height animation 150ms, hidden-until-found compatible and reduced-motion aware. State owner, not portal/disclosure alone, determines draft persistence.

Primary evidence `component-package/src/collapsible/index.tsx:1` (55 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/collapsible/index.tsx:14` — `className={(state) => cn('flex min-w-0 flex-col', resolveClassName(className, state))}`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/collapsible/index.tsx:24` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/collapsible/index.tsx:38` — `'data-ending-style:h-0 data-starting-style:h-0',`.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./context-menu` — visual-family

Context-triggered action list, not a field selector. Trigger attaches behavior without appearance. Item highlight and destructive variant with disabled opacity; closeOnClick=true. Root and submenu positioning differ.

Primary evidence `component-package/src/context-menu/index.tsx:1` (331 lines).

- Defaults/variants: `component-package/src/context-menu/index.tsx:63` — `sideOffset = 0,`.
- Geometry: `component-package/src/context-menu/index.tsx:171` — `<span aria-hidden className="i-ri-check-line h-4 w-4" />`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/context-menu/index.tsx:39` — `'defaultValue' | 'onValueChange' | 'value'`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/context-menu/index.tsx:55` — `Pick<BaseContextMenu.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset'> & {`.
- Names: `component-package/src/context-menu/index.tsx:14` — `floatingGroupLabelClassName,`.

### `./dialog` — visual-family

Modal task with focus containment/scroll lock. Content owns portal and centered 480px surface. Body scrolls between fixed header/footer; intermediate form retains flex chain via contents. Bare Popup for deliberate custom layouts. Optional header-close needs localized name. Keep root mounted for exit; drafts follow owner lifetime.

Primary evidence `component-package/src/dialog/index.tsx:1` (229 lines).

- Defaults/variants: `component-package/src/dialog/index.tsx:157` — `size="lg"`.
- Geometry: `component-package/src/dialog/index.tsx:114` — `'fixed top-1/2 left-1/2 flex max-h-[calc(100dvh-2rem)] w-120 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto overscroll-none',`.
- Type: `component-package/src/dialog/index.tsx:56` — `'system-xs-regular wrap-break-word text-text-tertiary',`.
- Focus: `component-package/src/dialog/index.tsx:33` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/dialog/index.tsx:18` — `const DialogPortal = BaseDialog.Portal`.
- Names: `component-package/src/dialog/index.tsx:13` — `modalTitleClassName,`.

### `./date-picker` — visual-family

Civil Gregorian YYYY-MM-DD or null, no timezone. Day click commits immediately. Label names trigger+popup; clear beside trigger, never inside its button. Month picker only changes displayed month. Native form serializes civil string.

Primary evidence `component-package/src/date-time/date-picker/index.tsx:1` (191 lines).

- Defaults/variants: `component-package/src/date-time/date-picker/index.tsx:58` — `previousMonth: 'Previous month',`.
- Geometry: `component-package/src/date-time/internal/calendar-grid.tsx:46` — `className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-components-button-primary-bg"`.
- Type: `component-package/src/date-time/internal/calendar-grid.tsx:75` — `className="i-ri-arrow-up-s-line size-4 forced-colors:text-[ButtonText] forced-colors:forced-color-adjust-none"`.
- Focus: `component-package/src/date-time/internal/calendar-grid.tsx:23` — `focusOnMount?: boolean`.
- Disabled: `component-package/src/date-time/date-picker/index.tsx:79` — `disabled: props.disabled,`.
- Read-only: `component-package/src/date-time/date-picker/index.tsx:80` — `readOnly: props.readOnly,`.
- Invalid: `component-package/src/date-time/date-picker/index.tsx:99` — `invalid={props.invalid || unavailable}`.
- Selection: `component-package/src/date-time/date-picker/index.tsx:39` — `defaultValue?: string | null`.
- Pending: `component-package/src/date-time/internal/calendar-panel.tsx:155` — `<p id={errorId} role="status" className="px-2 system-xs-regular text-text-destructive">`.
- Layer/lifetime: `component-package/src/date-time/date-picker/index.tsx:147` — `const [displayMonth, setDisplayMonth] = React.useState(() =>`.
- Names: `component-package/src/date-time/date-picker/index.tsx:8` — `PickerLabelProps,`.

### `./date-time-picker` — visual-family

Instant Date or null with required IANA timezone; UTC ISO serialization. Date/time remains draft until OK; dismissal discards, timezone/controlled value change resets. Reject nonexistent DST wall time; edited ambiguous time resolves earlier instant. Natural popup height is intentional.

Primary evidence `component-package/src/date-time/date-time-picker/index.tsx:1` (361 lines).

- Defaults/variants: `component-package/src/date-time/date-time-picker/index.tsx:69` — `previousMonth: 'Previous month',`.
- Geometry: `component-package/src/date-time/date-time-picker/index.tsx:235` — `className="min-w-16"`.
- Type: `component-package/src/date-time/date-time-picker/index.tsx:279` — `className="i-ri-time-line size-3 forced-colors:text-[ButtonText] forced-colors:forced-color-adjust-none"`.
- Focus: `component-package/src/date-time/date-time-picker/index.tsx:218` — `// PickerContent owns initial focus; this effect handles only internal view changes.`.
- Disabled: `component-package/src/date-time/date-time-picker/index.tsx:98` — `disabled: props.disabled,`.
- Read-only: `component-package/src/date-time/date-time-picker/index.tsx:99` — `readOnly: props.readOnly,`.
- Invalid: `component-package/src/date-time/date-time-picker/index.tsx:102` — `if (value && Number.isNaN(value.getTime())) throw new RangeError('Invalid DateTimePicker value')`.
- Selection: `component-package/src/date-time/date-time-picker/index.tsx:48` — `defaultValue?: Date | null`.
- Pending: `component-package/src/date-time/date-time-picker/index.tsx:334` — `role="status"`.
- Layer/lifetime: `component-package/src/date-time/date-time-picker/index.tsx:182` — `const [draft, setDraft] = React.useState(() => getZonedWallTime(value ?? new Date(), timeZone))`.
- Names: `component-package/src/date-time/date-time-picker/index.tsx:8` — `PickerLabelProps,`.

### `./drawer` — visual-family

Swipe-capable side/sheet task with explicit root/provider/portal/backdrop/viewport/popup/content. Physical directions own transforms. Horizontal 480px clamped viewport; content 24px plus safe-area bottom. Compose header/footer deliberately.

Primary evidence `component-package/src/drawer/index.tsx:1` (161 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/drawer/index.tsx:87` — `'fixed flex min-h-0 touch-none flex-col overflow-hidden border-[0.5px] border-components-panel-border bg-components-panel-bg text-text-primary shadow-xl outline-hidden',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/drawer/index.tsx:36` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/drawer/index.tsx:13` — `const DrawerPortal = BaseDrawer.Portal`.
- Names: `component-package/src/drawer/index.tsx:14` — `const DrawerTitle = BaseDrawer.Title`.

### `./dropdown-menu` — visual-family

Button-triggered action list. Long lists use FilterProvider, not Combobox-like value storage. 32px rows, group labels, menu checkbox/radio and submenus preserve keyboard highlight. Standard action closeOnClick=true.

Primary evidence `component-package/src/dropdown-menu/index.tsx:1` (494 lines).

- Defaults/variants: `component-package/src/dropdown-menu/index.tsx:253` — `sideOffset = 4,`.
- Geometry: `component-package/src/dropdown-menu/index.tsx:80` — `'mx-1 mb-1 w-auto min-w-48 gap-0.5 px-2 has-[>input:focus:not([data-highlighted])]:ring-0',`.
- Type: `component-package/src/dropdown-menu/index.tsx:129` — `cn('px-3 py-2 system-sm-regular text-text-tertiary', resolveClassName(className, state))`.
- Focus: `component-package/src/dropdown-menu/index.tsx:54` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/dropdown-menu/index.tsx:161` — `'defaultValue' | 'onValueChange' | 'value'`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/dropdown-menu/index.tsx:27` — `const DropdownMenuPortal = Menu.Portal`.
- Names: `component-package/src/dropdown-menu/index.tsx:18` — `floatingGroupLabelClassName,`.

### `./field` — visual-family

Own label, description, error and validity relationship. Grid gap 4px; label system-sm medium secondary, help/error body-xs tertiary/destructive. Neither valid nor invalid means unvalidated. Preserve generated relationship IDs.

Primary evidence `component-package/src/field/index.tsx:1` (85 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/field/index.tsx:16` — `cn('group/field grid min-w-0 gap-1', resolveClassName(className, state))`.
- Type: `component-package/src/field/index.tsx:51` — `cn('py-0.5 body-xs-regular text-text-tertiary', resolveClassName(className, state))`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: `component-package/src/field/index.tsx:58` — `type FieldErrorProps = BaseField.Error.Props`.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/field/index.tsx:34` — `type FieldLabelProps = BaseField.Label.Props`.

### `./fieldset` — visual-family

Related-control group semantics and legend; browser margins/border reset. Group primitive owns value/disabled, not fieldset. Each checkbox/radio still has option label.

Primary evidence `component-package/src/fieldset/index.tsx:1` (33 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/fieldset/index.tsx:12` — `className={(state) => cn('m-0 min-w-0 border-0 p-0', resolveClassName(className, state))}`.
- Type: `component-package/src/fieldset/index.tsx:24` — `cn('mb-1 py-1 system-sm-medium text-text-secondary', resolveClassName(className, state))`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./file-tree` — visual-family

Nested section/ul/li disclosure plus file buttons, not ARIA tree. Rows 24px; selected aria-current=true; guides 20px per level. Folder open and file selected independent. Do not promise tree keyboard interaction.

Primary evidence `component-package/src/file-tree/index.tsx:1` (328 lines).

- Defaults/variants: `component-package/src/file-tree/index.tsx:47` — `defaultTagName: 'section',`.
- Geometry: `component-package/src/file-tree/index.tsx:29` — `'group/file-tree-row relative flex h-6 w-full min-w-0 items-center rounded-md ps-2 pe-1.5 text-start select-none',`.
- Type: `component-package/src/file-tree/index.tsx:206` — `file: 'i-ri-file-3-fill text-[#A4AABF]',`.
- Focus: `component-package/src/file-tree/index.tsx:31` — `insetFocusRingClassName,`.
- Disabled: `component-package/src/file-tree/index.tsx:23` — `disabled: boolean`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/file-tree/index.tsx:22` — `selected: boolean`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/file-tree/index.tsx:178` — `'aria-hidden': true,`.

### `./form` — visual-family

Native form with structured onFormSubmit/errors/validationMode/actionsRef. Not schema or draft state framework. One submission owner, no nested forms/click-only save boundary. Draft belongs to narrow application owner.

Primary evidence `component-package/src/form/index.tsx:1` (14 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./input` — visual-family

Full-width text input, 8px corners, 12px horizontal and 7px vertical inset, 13px system type. Normal/hover/focus/invalid/read-only/disabled surface. Focus uses actual :focus, so works without surrounding Field.

Primary evidence `component-package/src/input/index.tsx:1` (28 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/input/index.tsx:18` — `'rounded-lg px-3 py-1.75 system-sm-regular',`.
- Type: `component-package/src/input/index.tsx:18` — `'rounded-lg px-3 py-1.75 system-sm-regular',`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./input-group` — visual-family

One field surface around input/prefix/suffix/actions. Blank-surface pointer targeting focuses input without stealing embedded interactive children. Group draws input focus; actions retain independent focus. Use public addon anatomy.

Primary evidence `component-package/src/input-group/index.tsx:1` (99 lines).

- Defaults/variants: `component-package/src/input-group/index.tsx:73` — `variants: {`.
- Geometry: `component-package/src/input-group/index.tsx:23` — `'flex min-h-8 w-full min-w-0 items-center rounded-lg border border-transparent bg-components-input-bg-normal',`.
- Type: `component-package/src/input-group/index.tsx:71` — `'flex shrink-0 cursor-text items-center self-stretch system-sm-regular text-text-secondary select-none',`.
- Focus: `component-package/src/input-group/index.tsx:24` — `'has-[>input:enabled:not(:focus)]:not-has-[>input:is([readonly],[data-invalid])]:hover:border-components-input-border-hover has-[>input:enabled:not(:focus)]:not-has-[>input:is([readonly],[data-invalid])]:hover:bg-compone`.
- Disabled: `component-package/src/input-group/index.tsx:12` — `'button,a[href],[role="button"],[role="link"],select,[tabindex]:not([tabindex="-1"]),input:not([type="hidden"]):not([disabled]),[contenteditable]:not([contenteditable="false"]),textarea:not([disabled])'`.
- Read-only: `component-package/src/input-group/index.tsx:24` — `'has-[>input:enabled:not(:focus)]:not-has-[>input:is([readonly],[data-invalid])]:hover:border-components-input-border-hover has-[>input:enabled:not(:focus)]:not-has-[>input:is([readonly],[data-invalid])]:hover:bg-compone`.
- Invalid: `component-package/src/input-group/index.tsx:24` — `'has-[>input:enabled:not(:focus)]:not-has-[>input:is([readonly],[data-invalid])]:hover:border-components-input-border-hover has-[>input:enabled:not(:focus)]:not-has-[>input:is([readonly],[data-invalid])]:hover:bg-compone`.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/input-group/index.tsx:12` — `'button,a[href],[role="button"],[role="link"],select,[tabindex]:not([tabindex="-1"]),input:not([type="hidden"]):not([disabled]),[contenteditable]:not([contenteditable="false"]),textarea:not([disabled])'`.

### `./kbd` — visual-family

Visual keyboard key/chord, not interactive control or shortcut registration. Feature owns activation, platform modifier formatting and accessible shortcut meaning.

Primary evidence `component-package/src/kbd/index.tsx:1` (54 lines).

- Defaults/variants: `component-package/src/kbd/index.tsx:11` — `variants: {`.
- Geometry: `component-package/src/kbd/index.tsx:9` — `'pointer-events-none inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-sm px-px font-sans system-kbd capitalize not-italic select-none',`.
- Type: `component-package/src/kbd/index.tsx:9` — `'pointer-events-none inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-sm px-px font-sans system-kbd capitalize not-italic select-none',`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: `component-package/src/kbd/index.tsx:16` — `disabled: {`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./meter` — visual-family

Scalar measurement (quota/capacity), not task completion. Name meter and meaningful range/value. Use Progress for ongoing task; Spinner for unquantified wait.

Primary evidence `component-package/src/meter/index.tsx:1` (101 lines).

- Defaults/variants: `component-package/src/meter/index.tsx:39` — `variants: {`.
- Geometry: `component-package/src/meter/index.tsx:23` — `'relative block h-1 w-full overflow-hidden rounded-md bg-components-progress-bar-bg'`.
- Type: `component-package/src/meter/index.tsx:69` — `const meterValueClassName = 'system-xs-regular text-text-tertiary tabular-nums'`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/meter/index.tsx:6` — `* Progress primitive instead; `role="meter"`and`role="progressbar"` are`.

### `./progress` — visual-family

Named ProgressCircle task completion; defaults blue/small=12px, 0..100, 1px outline. Null/nonfinite/invalid range has no determinate sector. Gray/white/blue/warning/error colors. Not capacity semantics.

Primary evidence `component-package/src/progress/index.tsx:1` (168 lines).

- Defaults/variants: `component-package/src/progress/index.tsx:10` — `variants: {`.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/progress/index.tsx:61` — `'aria-label': string`.

### `./number-field` — visual-family

Numeric editing with input/group and optional increment/decrement/scrub. Medium/large geometry; English Increment/Decrement fallback names localize at feature boundary. Unit/min/max/step belong to domain; visible group follows input focus.

Primary evidence `component-package/src/number-field/index.tsx:1` (245 lines).

- Defaults/variants: `component-package/src/number-field/index.tsx:22` — `variants: {`.
- Geometry: `component-package/src/number-field/index.tsx:24` — `medium: 'rounded-lg',`.
- Type: `component-package/src/number-field/index.tsx:59` — `medium: 'px-3 py-1.75 system-sm-regular',`.
- Focus: `component-package/src/number-field/index.tsx:118` — `'hover:bg-components-input-bg-hover focus-visible:bg-components-input-bg-hover',`.
- Disabled: `component-package/src/number-field/index.tsx:53` — `'disabled:cursor-not-allowed disabled:text-components-input-text-filled-disabled disabled:placeholder:text-components-input-text-disabled',`.
- Read-only: `component-package/src/number-field/index.tsx:54` — `'enabled:data-readonly:cursor-default',`.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/number-field/index.tsx:172` — `const incrementAriaLabel = 'Increment value'`.

### `./pagination` — visual-family

Page coordination with siblingCount=1/boundaryCount=1; previous/next, jump editor and page size. Compact jump 28px, page buttons 32px. Names identify target/current page. Filter-driven page reset stays with feature state.

Primary evidence `component-package/src/pagination/index.tsx:1` (663 lines).

- Defaults/variants: `component-package/src/pagination/index.tsx:127` — `siblingCount = 1,`.
- Geometry: `component-package/src/pagination/index.tsx:166` — `'flex w-full min-w-0 items-center justify-between px-6 py-3 select-none',`.
- Type: `component-package/src/pagination/index.tsx:335` — `className="inline-grid h-7 system-xs-medium tabular-nums after:invisible after:col-start-1 after:row-start-1 after:py-1.5 after:ps-2 after:pe-3 after:content-[attr(data-page-summary)]"`.
- Focus: `component-package/src/pagination/index.tsx:312` — `const restoreSummaryFocusRef = React.useRef(false)`.
- Disabled: `component-package/src/pagination/index.tsx:236` — `const disabled = props.disabled || pagination.page <= 1`.
- Read-only: `component-package/src/pagination/index.tsx:497` — `options: readonly Value[]`.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/pagination/index.tsx:340` — `defaultValue={pagination.page}`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/pagination/index.tsx:310` — `const [editing, setEditing] = React.useState(false)`.
- Names: `component-package/src/pagination/index.tsx:164` — `'aria-label': 'Pagination',`.

### `./radio-group` — visual-family

Exactly one persistent option; every Radio/RadioItem belongs to named group. Radio default 16px. RadioItem supports full custom option card with RadioControl visual; not standalone indicator. Use SegmentedControl for modes.

Primary evidence `component-package/src/radio-group/index.tsx:1` (98 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/radio-group/index.tsx:17` — `className={(state) => cn('flex items-center gap-2', resolveClassName(className, state))}`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/radio-group/index.tsx:63` — `checkedControlFocusClassName,`.
- Disabled: `component-package/src/radio-group/index.tsx:42` — `'data-disabled:cursor-not-allowed data-disabled:border-components-radio-border-disabled data-disabled:bg-components-radio-bg-disabled',`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/radio-group/index.tsx:41` — `'data-checked:border-[5px] data-checked:border-components-radio-border-checked data-checked:hover:border-components-radio-border-checked-hover',`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/radio-group/index.tsx:29` — `type RadioControlProps = Omit<BaseRadio.Indicator.Props, 'children' | 'keepMounted'>`.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./popover` — visual-family

Reachable structured explanation/interaction including touch. Trigger focus ring, Content owns portal/positioner/popup, 8px offset. Use title/description relationships; no manual portal or arbitrary z-index.

Primary evidence `component-package/src/popover/index.tsx:1` (153 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/popover/index.tsx:108` — `'rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-lg',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/popover/index.tsx:33` — `className={(state) => cn(focusRingClassName, resolveClassName(className, state))}`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/popover/index.tsx:12` — `const PopoverPortal = BasePopover.Portal`.
- Names: `component-package/src/popover/index.tsx:14` — `const PopoverTitle = BasePopover.Title`.

### `./preview-card` — visual-family

Non-interactive link preview enhancing destination. Essential information/actions also reachable at linked page. Touch/screen-reader users cannot rely on preview; use Popover when opening content is primary action. Offset 8px.

Primary evidence `component-package/src/preview-card/index.tsx:1` (124 lines).

- Defaults/variants: `component-package/src/preview-card/index.tsx:41` — `sideOffset = 8,`.
- Geometry: `component-package/src/preview-card/index.tsx:89` — `'rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-lg',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/preview-card/index.tsx:10` — `* PreviewCard follows Base UI's canonical semantics: a hover/focus-triggered`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/preview-card/index.tsx:22` — `const PreviewCardPortal = BasePreviewCard.Portal`.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./scroll-area` — visual-family

Explicit root/viewport/content/bar/thumb/corner. Isolated root+viewport, 12px bar track and 4px thumb. Pointer interaction while hovering/scrolling. Bound min-height flex chain; name viewport only if meaningful region.

Primary evidence `component-package/src/scroll-area/index.tsx:1` (103 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/scroll-area/index.tsx:23` — `'group/scrollbar flex touch-none overflow-clip p-1 opacity-100 transition-opacity select-none motion-reduce:transition-none',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./select` — visual-family

Closed scannable values without text entry. Preserve domain generic/literal multiple mode. SelectLabel labels field; GroupLabel labels options. Trigger 24/32/36px. Popup anchor/viewport clamped; list max 320px and 4px padding+scroll-padding. Check state separate from highlight.

Primary evidence `component-package/src/select/index.tsx:1` (315 lines).

- Defaults/variants: `component-package/src/select/index.tsx:81` — `variants: {`.
- Geometry: `component-package/src/select/index.tsx:71` — `'group/select-trigger flex w-full items-center border-0 bg-components-input-bg-normal text-start text-components-input-text-filled',`.
- Type: `component-package/src/select/index.tsx:84` — `small: 'h-6 gap-px rounded-md py-1 ps-2 pe-1 system-xs-regular',`.
- Focus: `component-package/src/select/index.tsx:72` — `'hover:bg-state-base-hover-alt focus-visible:bg-state-base-hover-alt data-popup-open:bg-state-base-hover-alt',`.
- Disabled: `component-package/src/select/index.tsx:74` — `'data-invalid:not-data-disabled:bg-components-input-bg-destructive data-invalid:not-data-disabled:inset-ring-1 data-invalid:not-data-disabled:inset-ring-components-input-border-destructive',`.
- Read-only: `component-package/src/select/index.tsx:40` — `| (Multiple extends true ? readonly Value[] : Value)`.
- Invalid: `component-package/src/select/index.tsx:74` — `'data-invalid:not-data-disabled:bg-components-input-bg-destructive data-invalid:not-data-disabled:inset-ring-1 data-invalid:not-data-disabled:inset-ring-components-input-border-destructive',`.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/select/index.tsx:153` — `const SelectPortal = BaseSelect.Portal`.
- Names: `component-package/src/select/index.tsx:12` — `floatingGroupLabelClassName,`.

### `./status-dot` — visual-family

Decorative squared status light 6/8px, default success/medium. Success/warning/error/normal/disabled semantic halo/border/fill. Adjacent readable text owns status; props prohibit role/name. Never color-only communication.

Primary evidence `component-package/src/status-dot/index.tsx:1` (94 lines).

- Defaults/variants: `component-package/src/status-dot/index.tsx:9` — `variants: {`.
- Geometry: `component-package/src/status-dot/index.tsx:23` — `small: 'size-1.5 rounded-xs',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/status-dot/index.tsx:55` — `'children' | 'role' | 'tabIndex' | keyof React.AriaAttributes`.
- Disabled: `component-package/src/status-dot/index.tsx:19` — `disabled:`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/status-dot/index.tsx:77` — `aria-hidden="true"`.

### `./slider` — visual-family

Continuous/stepped range. SliderLabel and value; distinguish multiple thumbs by name. Thumb ring follows descendant native input :focus-visible. Preserve upstream mechanics, not drag-only custom control.

Primary evidence `component-package/src/slider/index.tsx:1` (141 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/slider/index.tsx:23` — `'group/slider relative inline-flex w-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/slider/index.tsx:108` — `'has-focus-visible:ring-2 has-focus-visible:ring-state-accent-solid has-focus-visible:ring-offset-0',`.
- Disabled: `component-package/src/slider/index.tsx:24` — `'data-disabled:opacity-30',`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/slider/index.tsx:33` — `type SliderLabelProps = BaseSlider.Label.Props`.

### `./switch` — visual-family

Immediate binary setting, md=28x16px default; xs/sm/lg options. Loading disables and exposes aria-busy; spinner md/lg only. Checked transforms mirror RTL. Controlled/uncontrolled union rejects mixing ownership.

Primary evidence `component-package/src/switch/index.tsx:1` (132 lines).

- Defaults/variants: `component-package/src/switch/index.tsx:19` — `variants: {`.
- Geometry: `component-package/src/switch/index.tsx:21` — `xs: 'h-2.5 w-3.5 rounded-xs p-0.5',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: `component-package/src/switch/index.tsx:14` — `checkedControlFocusClassName,`.
- Disabled: `component-package/src/switch/index.tsx:16` — `'data-disabled:cursor-not-allowed data-disabled:bg-components-toggle-bg-unchecked-disabled data-disabled:hover:bg-components-toggle-bg-unchecked-disabled data-disabled:data-checked:bg-components-toggle-bg-disabled data-d`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/switch/index.tsx:14` — `checkedControlFocusClassName,`.
- Pending: `component-package/src/switch/index.tsx:79` — `loading?: boolean`.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/switch/index.tsx:102` — `<span className={switchSpinnerVariants({ size })} aria-hidden="true">`.

### `./segmented-control` — visual-family

One mode/filter/view using radio semantics; selected item cannot toggle off. Requires value or defaultValue. Group 32px, item 28px, 10/8px corners, 2px inset, 1px gap. Tabs for associated panel selection.

Primary evidence `component-package/src/segmented-control/index.tsx:1` (78 lines).

- Defaults/variants: `component-package/src/segmented-control/index.tsx:44` — `nativeButton = true,`.
- Geometry: `component-package/src/segmented-control/index.tsx:31` — `'inline-flex items-center gap-px rounded-[10px] bg-components-segmented-control-bg-normal p-0.5',`.
- Type: `component-package/src/segmented-control/index.tsx:55` — `'relative flex h-7 min-w-0 touch-manipulation items-center justify-center gap-0.5 overflow-hidden rounded-lg border-[0.5px] border-transparent px-2 py-1 system-sm-medium whitespace-nowrap text-text-secondary hover:bg-sta`.
- Focus: `component-package/src/segmented-control/index.tsx:54` — `focusRingClassName,`.
- Disabled: `component-package/src/segmented-control/index.tsx:55` — `'relative flex h-7 min-w-0 touch-manipulation items-center justify-center gap-0.5 overflow-hidden rounded-lg border-[0.5px] border-transparent px-2 py-1 system-sm-medium whitespace-nowrap text-text-secondary hover:bg-sta`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/segmented-control/index.tsx:13` — `defaultValue?: never`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/segmented-control/index.tsx:69` — `aria-hidden="true"`.

### `./tabs` — visual-family

Selects related panel with tablist/tabpanel. Root upstream state, list gap 16px, 2px active underline, 14px semibold tab. Panel inset ring. Do not replace panel semantics with mode radio.

Primary evidence `component-package/src/tabs/index.tsx:1` (65 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/tabs/index.tsx:18` — `className={(state) => cn('flex gap-4', resolveClassName(className, state))}`.
- Type: `component-package/src/tabs/index.tsx:32` — `'relative flex touch-manipulation items-center border-b-2 border-transparent pt-2.5 pb-2 system-md-semibold text-text-tertiary data-active:border-components-tab-active data-active:text-text-primary data-disabled:cursor-n`.
- Focus: `component-package/src/tabs/index.tsx:31` — `focusRingClassName,`.
- Disabled: `component-package/src/tabs/index.tsx:32` — `'relative flex touch-manipulation items-center border-b-2 border-transparent pt-2.5 pb-2 system-md-semibold text-text-tertiary data-active:border-components-tab-active data-active:text-text-primary data-disabled:cursor-n`.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/tabs/index.tsx:32` — `'relative flex touch-manipulation items-center border-b-2 border-transparent pt-2.5 pb-2 system-md-semibold text-text-tertiary data-active:border-components-tab-active data-active:text-text-primary data-disabled:cursor-n`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./textarea` — visual-family

Field.Control rendered textarea, min-height 80px, small/medium/large variants (medium default), native cols/rows/wrap. Same invalid/read-only/disabled precedence as text input.

Primary evidence `component-package/src/textarea/index.tsx:1` (101 lines).

- Defaults/variants: `component-package/src/textarea/index.tsx:12` — `variants: {`.
- Geometry: `component-package/src/textarea/index.tsx:11` — `const textareaVariants = cva([textControlClassName, 'min-h-20 overflow-auto'], {`.
- Type: `component-package/src/textarea/index.tsx:14` — `small: 'rounded-md px-2 py-1 system-xs-regular',`.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: `component-package/src/textarea/index.tsx:30` — `defaultValue?: never`.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./time-picker` — visual-family

HH:mm wall-time string or null; timezone affects Now/empty draft only, never stored conversion. Draft commits OK, minuteStep 1/5/10/15/20/30, default 12-hour display. Localize actions/field/clear names.

Primary evidence `component-package/src/date-time/time-picker/index.tsx:1` (264 lines).

- Defaults/variants: `component-package/src/date-time/time-picker/index.tsx:70` — `title: 'Pick Time',`.
- Geometry: `component-package/src/date-time/time-picker/index.tsx:195` — `<p id={errorId} role="status" className="px-2 system-xs-regular text-text-destructive">`.
- Type: `component-package/src/date-time/time-picker/index.tsx:146` — `className="i-ri-time-line size-4 shrink-0 text-text-tertiary forced-colors:text-[ButtonText] forced-colors:forced-color-adjust-none"`.
- Focus: `component-package/src/date-time/internal/calendar-grid.tsx:23` — `focusOnMount?: boolean`.
- Disabled: `component-package/src/date-time/time-picker/index.tsx:92` — `disabled: props.disabled,`.
- Read-only: `component-package/src/date-time/time-picker/index.tsx:93` — `readOnly: props.readOnly,`.
- Invalid: `component-package/src/date-time/time-picker/index.tsx:106` — `invalid={props.invalid || unavailable}`.
- Selection: `component-package/src/date-time/time-picker/index.tsx:47` — `defaultValue?: string | null`.
- Pending: `component-package/src/date-time/time-picker/index.tsx:195` — `<p id={errorId} role="status" className="px-2 system-xs-regular text-text-destructive">`.
- Layer/lifetime: `component-package/src/date-time/time-picker/index.tsx:183` — `const [draft, setDraft] = React.useState(() => value ?? currentTime(timeZone, minuteStep))`.
- Names: `component-package/src/date-time/time-picker/index.tsx:7` — `PickerLabelProps,`.

### `./toast` — visual-family

Transient notifications with explicit manager ownership. Stable manager outside transient renders, bound Toaster; ID update/upsert; promise loading transitions result. Cards stack/expand/swipe. z-50 is explicit body-level layering exception, not general overlay policy.

Primary evidence `component-package/src/toast/index.tsx:1` (259 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: `component-package/src/toast/index.tsx:160` — `'group/toast pointer-events-auto absolute inset-s-0 top-0 w-full origin-top cursor-default rounded-xl select-none',`.
- Type: `component-package/src/toast/index.tsx:201` — `<BaseToast.Title className="min-w-0 system-sm-semibold wrap-break-word text-text-primary" />`.
- Focus: `component-package/src/toast/index.tsx:159` — `focusRingClassName,`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: `component-package/src/toast/index.tsx:18` — `// `loading`is reserved for`promise`, which resolves it into `success`or`error`.`.
- Layer/lifetime: `component-package/src/toast/index.tsx:166` — `'data-ending-style:pointer-events-none data-ending-style:transform-[translateY(-150%)] data-ending-style:opacity-0 data-ending-style:after:pointer-events-none',`.
- Names: `component-package/src/toast/index.tsx:21` — `const toastCloseLabel = 'Close notification'`.

### `./tooltip` — visual-family

Supplementary hover/focus hint for already named action. Never only accessible name or essential interactive help. Content portal, offset 8px, max width 300px, 12px medium type, 6px inset.

Primary evidence `component-package/src/tooltip/index.tsx:1` (65 lines).

- Defaults/variants: `component-package/src/tooltip/index.tsx:30` — `sideOffset = 8,`.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/tooltip/index.tsx:22` — `Pick<BaseTooltip.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset'> & {`.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

### `./spinner` — visual-family

Indeterminate progressbar with required aria-label/labelledby; 12/16/20px. SpinnerIcon decorative when another feature owner announces pending. Avoid duplicate announcements.

Primary evidence `component-package/src/spinner/index.tsx:1` (65 lines).

- Defaults/variants: `component-package/src/spinner/index.tsx:9` — `variants: {`.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: `component-package/src/spinner/index.tsx:8` — `const spinnerVariants = cva('inline-flex shrink-0 text-[#1c64f2]', {`.
- Focus: `component-package/src/spinner/index.tsx:37` — `focusable="false"`.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/spinner/index.tsx:27` — `Pick<React.ComponentProps<'div'>, 'id' | 'aria-describedby'> &`.

### `./separator` — visual-family

Horizontal solid default, gradient optional; separator semantics unless decorative=true role none. Vertical orientation correctly exposed. Visual division independent of semantic landmark.

Primary evidence `component-package/src/separator/index.tsx:1` (48 lines).

- Defaults/variants: `component-package/src/separator/index.tsx:9` — `variants: {`.
- Geometry: `component-package/src/separator/index.tsx:11` — `horizontal: 'h-px w-full',`.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: `component-package/src/separator/index.tsx:37` — `role={decorative ? 'none' : 'separator'}`.

### `./infotip` — visual-family

Information icon primarily opens explanation, implemented Popover. Required name; question/info/warning glyphs 12/14/16px. Hover 300ms open/200ms close by default; click stops propagation. Reachable popover, not Tooltip.

Primary evidence `component-package/src/infotip/index.tsx:1` (118 lines).

- Defaults/variants: `component-package/src/infotip/index.tsx:11` — `question: 'i-ri-question-line',`.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: `component-package/src/infotip/index.tsx:77` — `Pick<BasePopover.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset'> & {`.
- Names: `component-package/src/infotip/index.tsx:23` — `const InfotipTitle = BasePopover.Title`.

### `./direction-provider` — visual-family

Upstream direction context reaches portals; also set surrounding HTML dir. Logical inline spacing except documented physical swipe/centering geometry.

Primary evidence `component-package/src/direction-provider/index.tsx:1` (4 lines).

- Defaults/variants: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Geometry: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Type: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Focus: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Disabled: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Read-only: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Invalid: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Selection: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Pending: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Layer/lifetime: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.
- Names: no family-specific override captured; upstream or feature ownership requires checking, not assumed support.

## Application base catalog

These are application source compositions, not public package APIs. Every family included, including zero-runtime directories and duplicate badge paths. JSON retains every runtime implementation and per-category source evidence for focus/disabled/read-only/invalid/selection/pending/portal/lifetime/naming. Empty category means no matching explicit line, not a behavior guarantee.

### `access-point` — 2 runtime TSX; application-family

Endpoint card: 4px frame, min-height 272px, heading/icon/status/switch and URL copy/open/QR/regenerate. Card named by heading, busy distinct from unavailable. Disabled-with-reason switch remains focusable/read-only with explanation; loading independent.

- `web/app/components/base/access-point/card.tsx:75` — `'flex min-h-68 min-w-0 flex-col gap-0.5 rounded-xl bg-background-section-burn p-1',`.
- `web/app/components/base/access-point/url.tsx:73` — `className="h-6 gap-1 px-1.5"`.
- Geometry: `gap-0.5`, `gap-1`, `gap-2`, `gap-2.5`, `h-2`, `h-6`, `h-full`, `min-h-0`, `min-h-14`, `min-h-36`, `min-h-68`, `min-h-9`, `min-w-0`, `min-w-20`, `min-w-28`, `p-1`.
- Type: `system-2xs-medium-uppercase`, `system-md-semibold`, `system-sm-regular`, `system-xs-medium`, `system-xs-regular`, `system-xs-semibold-uppercase`.
- Semantic tokens: `bg-background-section-burn`, `bg-components-input-bg-normal`, `bg-components-panel-on-panel-item-bg`, `bg-text-quaternary`, `border-divider-deep`, `border-divider-regular`, `border-divider-subtle`, `ring-state-accent-solid`, `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `bg-divider-regular`.

### `agent-log-modal` — 6 runtime TSX; application-family

Offset 480px log inspector, detail/tracing tabs and collapsible tool calls. Mounted/open distinction preserves close lifecycle. Fetch/pending are feature-owned; panel clamped viewport.

- `web/app/components/base/agent-log-modal/detail.tsx:35` — `<div className="flex shrink-0 items-center border-b-[0.5px] border-divider-regular px-4">`.
- `web/app/components/base/agent-log-modal/index.tsx:66` — `<DialogPopup className="fixed top-16 bottom-4 left-[max(8px,calc(100vw-1136px))] flex w-120 max-w-[calc(100vw-16px)] flex-col overflow-hidden overscroll-contain rounded-xl border-[0.5px] bor`.
- `web/app/components/base/agent-log-modal/iteration.tsx:19` — `<div className={cn('px-4 py-2')}>`.
- Geometry: `h-0`, `h-full`, `px-0`, `px-4`, `py-3`, `rounded-b-2xl`, `max-w-[calc(100vw-16px)]`, `p-1`, `py-1`, `rounded-xl`, `w-120`, `py-2`, `gap-2`, `h-6`, `h-[0.5px]`, `px-2`.
- Type: `font-semibold`, `leading-4.5`, `text-[13px]`, `text-xs`, `font-medium`, `leading-4`, `text-[#12B76A]`, `text-[#F04438]`, `text-[#d92d20]`.
- Semantic tokens: `bg-background-section`, `bg-components-panel-bg`, `border-divider-regular`, `ring-components-input-border-active`, `text-text-secondary`, `text-text-tertiary`, `border-components-panel-border`, `text-text-primary`, `bg-divider-regular`, `bg-background-default`, `text-text-quaternary`.

### `alert.tsx` — 1 runtime TSX; application-family

Info-default feedback card, 12px radius/padding, tone icon and localized close command. Feature owns announcement urgency; appearance alone is not live status.

- `web/app/components/base/alert.tsx:24` — `<div className={cn('pointer-events-none w-full', className)}>`.
- Geometry: `p-1`, `p-3`, `rounded-xl`, `w-full`.
- Type: `system-xs-regular`.
- Semantic tokens: `bg-components-panel-bg-blur`, `border-components-panel-border`, `text-text-accent`, `text-text-secondary`, `text-text-tertiary`.

### `amplitude` — 4 runtime TSX; behavior-integration-helper

Analytics lifecycle providers, no visual component. Consent/environment gating are behavior, not a design primitive.

- `web/app/components/base/amplitude/AmplitudeProvider.tsx:18` — `useEffect(() => {`.
- `web/app/components/base/amplitude/WebAppAmplitudeProvider.tsx:11` — `useEffect(() => {`.
- `web/app/components/base/amplitude/lazy-amplitude-provider.tsx:1`; no local surface class evidence.

### `analytics-consent` — 6 runtime TSX; behavior-integration-helper

Consent bridges/runtime/layout boundaries and cleanup, no reusable geometry. Separate infrastructure from UI catalog.

- `web/app/components/base/analytics-consent/analytics-disabled.tsx:8` — `useEffect(() => {`.
- `web/app/components/base/analytics-consent/cloud-analytics-layout-boundary.tsx:1`; no local surface class evidence.
- `web/app/components/base/analytics-consent/cloud-analytics.tsx:1`; no local surface class evidence.
- Type: `system-features`.

### `answer-icon` — 1 runtime TSX; asset-or-decorative-helper

Circular answer identity illustration; pair with readable author name, not command semantics.

- `web/app/components/base/answer-icon/index.tsx:20` — `'w-full',`.
- Geometry: `h-full`, `rounded-full`, `w-full`.
- Type: `text-xl`.

### `app-icon` — 1 runtime TSX; application-family

Emoji/image identity with size/shape variants. Decorative=true default; informative role img requires label. Preserve target logo/branding exceptions.

- `web/app/components/base/app-icon/index.tsx:22` — `'flex shrink-0 grow-0 border-[0.5px] border-divider-regular leading-none',`.
- Geometry: `rounded-2xl`, `rounded-[10px]`, `rounded-full`, `rounded-lg`, `rounded-md`, `rounded-sm`, `rounded-xl`.
- Type: `leading-none`, `text-2xl`, `text-[22px]`, `text-[28px]`, `text-[32px]`, `text-base`, `text-xl`, `text-xs`.
- Semantic tokens: `border-divider-regular`.

### `app-unavailable.tsx` — 1 runtime TSX; application-family

Page-level unavailable default 404, large code + explanatory text. Not an inline field error.

- `web/app/components/base/app-unavailable.tsx:23` — `<div className={cn('flex h-screen w-screen items-center justify-center', className)}>`.
- Geometry: `h-12.5`, `h-screen`, `pr-5`, `w-screen`.
- Type: `font-medium`, `leading-12.5`, `text-[24px]`, `text-sm`.

### `audio-btn` — 1 runtime TSX; application-family

Named speech/playback command with initial/loading/playing; generation wait distinct from playback. Clean resource lifecycle, no unnamed glyph-only action.

- `web/app/components/base/audio-btn/index.tsx:96` — `isAudition ? 'p-0.5' : 'rounded-md bg-white p-0',`.
- Geometry: `p-0`, `p-0.5`, `rounded-md`.

### `audio-gallery` — 2 runtime TSX; application-family

36px player, waveform/time/playback, semantic audio background and gallery spacing. Playback/listener cleanup stays with player.

- `web/app/components/base/audio-gallery/AudioPlayer.tsx:262` — `<div className="flex h-9 max-w-105 min-w-60 items-center gap-2 rounded-[10px] border border-components-panel-border-subtle bg-components-chat-input-audio-bg-alt p-2 shadow-xs backdrop-blur-x`.
- `web/app/components/base/audio-gallery/index.tsx:1`; no local surface class evidence.
- Geometry: `gap-2`, `h-6`, `h-8`, `h-9`, `max-w-105`, `min-w-12.5`, `min-w-60`, `p-2`, `px-0.5`, `py-1`, `rounded-[10px]`, `w-full`.
- Type: `system-xs-medium`.
- Semantic tokens: `bg-components-chat-input-audio-bg-alt`, `border-components-panel-border-subtle`, `text-components-button-primary-bg-disabled`, `text-text-accent`, `text-text-accent-secondary`, `text-text-quaternary`.

### `auto-height-textarea` — 1 runtime TSX; application-family

Measured textarea min 36px/max 96px. Forward name/description/keyboard props; cap growth and scroll rather than expanding whole conversation.

- `web/app/components/base/auto-height-textarea/index.tsx:6` — `'aria-label'?: string`.

### `badge` — 1 runtime TSX; application-family

Directory badge API variant/iconOnly/uppercase, uppercase=false. Do not conflate root badge.tsx contract.

- `web/app/components/base/badge/index.tsx:49` — `? 'p-0.75'`.
- Geometry: `p-0.75`, `p-1`, `p-1.5`, `px-1.25`, `px-2`, `py-0.5`, `py-0.75`, `py-1`.
- Type: `system-2xs-medium`, `system-2xs-medium-uppercase`.

### `badge.tsx` — 1 runtime TSX; application-family

Root badge API m/default, uppercase=true, 5px corners/fine border/optional error dot. Distinct import from directory badge.

- `web/app/components/base/badge.tsx:29` — `'relative inline-flex items-center rounded-[5px] border border-divider-deep leading-3 whitespace-nowrap text-text-tertiary',`.
- Geometry: `h-1.5`, `h-5`, `min-w-4`, `px-1`, `px-1.25`, `py-0.5`, `rounded-[5px]`, `rounded-xs`, `w-1.5`.
- Type: `leading-3`, `system-2xs-medium-uppercase`, `system-xs-medium`.
- Semantic tokens: `bg-components-badge-bg-dimm`, `bg-components-badge-status-light-error-bg`, `border-components-badge-status-light-error-border-inner`, `border-divider-deep`, `text-text-tertiary`.

### `block-input` — 1 runtime TSX; application-family

Input wrapper delegates props; verify actual delegated labels/errors rather than invent separate primitive.

- `web/app/components/base/block-input/index.tsx:1`; no local surface class evidence.

### `carousel` — 1 runtime TSX; application-family

Embla orientation/viewport and prev/next state; horizontal default. Commented keyboard capture is not active arrow-key behavior. Add reachable named controls at feature boundary.

- `web/app/components/base/carousel/index.tsx:146` — `className={cn('min-w-0 shrink-0 grow-0 basis-full', className)}`.
- Geometry: `min-w-0`.

### `chat` — 61 runtime TSX; application-family

61-runtime-TSX conversational system: messages/branches/edit/feedback/citations/tool-workflow details/history/embedded composer. role=status/aria-atomic response owner; draft/history outside transient chrome. Reuse anatomy, not backend contracts.

- `web/app/components/base/chat/chat/answer/agent-content.tsx:34` — `<div key={index} className="px-2 py-1" data-testid="agent-thought-item">`.
- `web/app/components/base/chat/chat/answer/agent-roster-response-content.tsx:174` — `className="max-w-full min-w-0 overflow-hidden px-1 body-md-regular text-text-primary"`.
- `web/app/components/base/chat/chat/answer/basic-content.tsx:1`; no local surface class evidence.
- Geometry: `px-2`, `py-1`, `gap-0`, `gap-1`, `h-6`, `max-w-full`, `min-h-0`, `min-w-0`, `p-1`, `pb-1`, `px-1`, `px-3`, `py-0.5`, `py-2`, `rounded-[10px]`, `rounded-md`.
- Type: `body-md-regular`, `system-xs-medium`, `system-xs-regular`, `system-xs-semibold-uppercase`, `text-[#F04438]`, `system-sm-semibold-uppercase`, `text-xs`, `system-xs-semibold`, `body-lg-regular`, `system-sm-regular`, `system-sm-semibold`, `system-sm-medium`.
- Semantic tokens: `bg-components-input-bg-normal`, `bg-state-base-hover`, `text-text-primary`, `text-text-quaternary`, `text-text-secondary`, `text-text-tertiary`, `bg-background-section`, `border-components-panel-border`, `ring-state-accent-solid`, `text-text-warning`, `bg-background-section-burn`, `border-divider-subtle`.

### `checkbox-list` — 1 runtime TSX; application-family

Labeled option list with optional panel/helper. Preserve Fieldset/legend and each option label; checkbox icon alone insufficient.

- `web/app/components/base/checkbox-list/index.tsx:78` — `<Field name={name} className={cn('flex w-full flex-col gap-1', containerClassName)}>`.
- Geometry: `gap-0`, `gap-1`, `gap-2`, `min-w-0`, `p-0`, `p-1`, `px-2`, `px-3`, `py-1.5`, `py-2`, `py-6`, `rounded-lg`, `rounded-md`, `w-40`, `w-full`.
- Type: `body-xs-regular`, `leading-5`, `leading-6`, `system-sm-medium`, `system-sm-medium-uppercase`, `system-sm-regular`, `system-xs-semibold-uppercase`, `text-sm`.
- Semantic tokens: `bg-components-panel-bg`, `bg-state-base-hover`, `border-components-panel-border`, `border-divider-subtle`, `text-text-secondary`, `text-text-tertiary`.

### `chip` — 1 runtime TSX; application-family

Filter/selection chip with wrapping text/open state/removal. Clear selection and open picker are separate commands; name removal and preserve focus.

- `web/app/components/base/chip/index.tsx:78` — `<div className="relative w-fit max-w-full">`.
- Geometry: `gap-0.5`, `gap-1`, `h-auto`, `max-h-72`, `max-w-full`, `min-h-8`, `min-w-0`, `p-0`, `p-0.5`, `p-1`, `pr-6`, `px-1`, `px-2`, `py-1`, `rounded-lg`, `rounded-md`.
- Type: `system-sm-medium`, `system-sm-regular`, `text-sm`.
- Semantic tokens: `bg-components-button-secondary-bg`, `bg-components-button-secondary-bg-hover`, `bg-components-input-bg-normal`, `bg-components-panel-bg-blur`, `bg-state-base-hover-alt`, `border-components-button-secondary-border`, `border-components-button-secondary-border-hover`, `inset-ring-state-accent-solid`, `text-text-quaternary`, `text-text-secondary`, `text-text-tertiary`.

### `copy-feedback` — 1 runtime TSX; behavior-integration-helper

Copy feedback coordination/hook; temporary copied state belongs to feedback owner and existing named command.

- `web/app/components/base/copy-feedback/index.tsx:14` — `copiedLabel?: string`.

### `copy-icon` — 1 runtime TSX; application-family

Copy command with copied glyph, compact 14px reference target. Not automatic touch-target approval. Keyboard focus and target-specific name required.

- `web/app/components/base/copy-icon/index.tsx:32` — `className="mx-1 inline-flex size-3.5 cursor-pointer border-0 bg-transparent p-0 text-text-tertiary"`.
- Geometry: `p-0`.
- Semantic tokens: `text-text-tertiary`.

### `corner-label` — 1 runtime TSX; application-family

Compact uppercase metadata. Does not replace field label or make a generic span nameable.

- `web/app/components/base/corner-label/index.tsx:23` — `'i-custom-vender-solid-shapes-corner h-5 w-3.25',`.
- Geometry: `gap-0.5`, `h-5`, `pr-2`, `py-1`, `w-3.25`.
- Type: `system-2xs-medium-uppercase`.
- Semantic tokens: `bg-background-section-burn`, `text-background-section-burn`, `text-text-tertiary`.

### `date-time-picker` — 3 runtime TSX; application-family

Application date/time adapters: localization/compatibility wrappers, not public primitive contract replacement. Verify target pinned API.

- `web/app/components/base/date-time-picker/date-picker.tsx:9` — `const defaults = usePickerLabels()`.
- `web/app/components/base/date-time-picker/date-time-picker.tsx:9` — `const defaults = usePickerLabels()`.
- `web/app/components/base/date-time-picker/time-picker.tsx:8` — `const defaults = usePickerLabels()`.

### `effect` — 1 runtime TSX; asset-or-decorative-helper

Decorative absolute 112px blue glow/80px blur; optional art only. Preserve target accent/liquid-glass exceptions.

- `web/app/components/base/effect/index.tsx:12` — `'absolute size-28 rounded-full bg-util-colors-blue-brand-blue-brand-500 blur-[80px]',`.
- Geometry: `rounded-full`.
- Semantic tokens: `bg-util-colors-blue-brand-blue-brand-500`.

### `encrypted-bottom` — 1 runtime TSX; application-family

Security-information footer: lock, text/link, 12px type/top divider. Assurance copy is product content, not security proof.

- `web/app/components/base/encrypted-bottom/index.tsx:13` — `<p className="flex items-center justify-center rounded-b-2xl border-t-[0.5px] border-divider-subtle bg-background-soft px-2 py-3 system-xs-regular text-text-tertiary">`.
- Geometry: `px-2`, `py-3`, `rounded-b-2xl`.
- Type: `system-xs-regular`.
- Semantic tokens: `bg-background-soft`, `border-divider-subtle`, `text-text-accent`, `text-text-quaternary`, `text-text-tertiary`.

### `error-boundary` — 1 runtime TSX; application-family

Crash fallback with heading/reset/development detail. Fault recovery, not field validation; keep retry reachable and debug data safe.

- `web/app/components/base/error-boundary/index.tsx:127` — `'flex flex-col items-center justify-center rounded-lg border p-8',`.
- Geometry: `gap-1`, `gap-2`, `gap-3`, `max-h-40`, `max-w-2xl`, `min-h-50`, `p-4`, `p-8`, `rounded-lg`, `w-full`.
- Type: `font-medium`, `font-semibold`, `text-sm`, `text-xl`, `text-xs`.
- Semantic tokens: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`.

### `features` — 29 runtime TSX; application-family

Feature config cards/drawer for citations/opener/moderation/speech/upload/annotations/follow-up. Icon-title-helper-switch/config anatomy; drafts/settings scoped in content/context. Entitlements source-only.

- `web/app/components/base/features/context.tsx:11` — `const [store] = useState(() => createFeaturesStore(props))`.
- `web/app/components/base/features/index.tsx:1`; no local surface class evidence.
- `web/app/components/base/features/new-feature-panel/annotation-reply/annotation-ctrl-button.tsx:71` — `aria-label={t(($) => $['feature.annotation.edit'], { ns: 'appDebug' })}`.
- Geometry: `pt-1`, `w-160`, `max-w-50`, `py-1`, `gap-4`, `h-6.75`, `min-h-8`, `p-1`, `pt-0.5`, `rounded-lg`, `w-44.5`, `w-px`, `w-full`, `gap-1`, `gap-2`, `h-9`.
- Type: `system-features`, `system-sm-semibold`, `system-2xs-medium-uppercase`, `system-xs-regular`, `system-xs-semibold-uppercase`, `font-medium`, `leading-4.5`, `system-sm-medium`, `text-[13px]`, `text-sm`, `text-xs`, `body-xs-medium`.
- Semantic tokens: `text-text-secondary`, `bg-divider-subtle`, `bg-util-colors-indigo-indigo-600`, `border-divider-subtle`, `text-text-primary-on-surface`, `text-text-tertiary`, `text-text-primary`, `text-util-colors-blue-blue-500`, `text-util-colors-cyan-cyan-500`, `bg-util-colors-warning-warning-500`, `bg-util-colors-blue-light-blue-light-500`, `bg-components-button-tertiary-bg`.

### `file-icon` — 1 runtime TSX; asset-or-decorative-helper

File-kind visual mapper; readable type/name accompanies icon. Never color-only kind/status.

- `web/app/components/base/file-icon/index.tsx:12` — `return <span aria-hidden className={cn('i-custom-public-files-csv h-8.5 w-8', className)} />`.
- Geometry: `h-5`, `h-6.5`, `h-8.5`, `w-5`, `w-6`, `w-8`.

### `file-thumb` — 2 runtime TSX; application-family

Thumbnail 0.5px border/6px radius/object-cover. Enclosing command owns preview name; renderer owns loading/error.

- `web/app/components/base/file-thumb/image-render.tsx:13` — `alt={name}`.
- `web/app/components/base/file-thumb/index.tsx:64` — `'border-0 bg-transparent p-0',`.
- Geometry: `p-0`, `p-px`, `rounded-md`.
- Semantic tokens: `border-effects-image-frame`, `bg-components-panel-on-panel-item-bg`, `bg-components-panel-on-panel-item-bg-alt`, `border-components-panel-border`.

### `file-uploader` — 15 runtime TSX; application-family

Attachment/chat/log upload, preview, validation/store. Source choice/upload wait/failure/ready/preview independent states. Legacy hover-only remove remains in some paths: audit focus/touch parity before reuse.

- `web/app/components/base/file-uploader/file-from-link-or-local/index.tsx:54` — `<div className="w-70 rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg-blur p-3 shadow-lg">`.
- `web/app/components/base/file-uploader/file-image-render.tsx:23` — `alt={alt || 'Preview'}`.
- `web/app/components/base/file-uploader/file-input.tsx:37` — `className="absolute inset-0 block w-full cursor-pointer text-[0] opacity-0 disabled:cursor-not-allowed"`.
- Geometry: `h-7`, `h-8`, `h-px`, `p-1`, `p-2`, `p-3`, `px-1`, `rounded-lg`, `rounded-xl`, `w-23.25`, `w-70`, `w-full`, `gap-1`, `gap-3`, `p-0`, `p-1.5`.
- Type: `body-xs-regular`, `system-2xs-medium-uppercase`, `system-sm-regular`, `text-[0]`, `system-xs-medium-uppercase`, `system-xs-regular`, `system-xs-semibold-uppercase`, `text-[#00B2EA]`, `text-[#01AC49]`, `text-[#2684FF]`, `text-[#309BEC]`, `text-[#6F8BB5]`.
- Semantic tokens: `bg-components-input-bg-active`, `bg-components-panel-bg-blur`, `border-components-input-border-active`, `border-components-input-border-destructive`, `border-components-panel-border`, `text-text-destructive`, `text-text-quaternary`, `border-effects-image-frame`, `bg-components-panel-on-panel-item-bg`, `border-divider-subtle`, `ring-components-input-border-active`, `text-text-secondary`.

### `filter-empty-state` — 1 runtime TSX; application-family

No-results subdued illustration/gradient with clear explanation/action. Distinguish no total data from filters matching none.

- `web/app/components/base/filter-empty-state/index.tsx:20` — `'pointer-events-none absolute inset-0 z-20 grid grid-cols-4 grid-rows-4 gap-3 px-8 pt-2',`.
- Geometry: `gap-3`, `min-w-px`, `p-1`, `p-2`, `pt-2`, `px-8`, `rounded-lg`, `rounded-xl`.
- Type: `system-sm-regular`.
- Semantic tokens: `bg-background-default-lighter`, `bg-components-card-bg`, `border-divider-regular`, `text-text-tertiary`.

### `float-right-container` — 1 runtime TSX; application-family

Inspector title/close/min-h-0 flex chain. Local scroll and close name; feature owns spatial placement.

- `web/app/components/base/float-right-container/index.tsx:58` — `'data-[swipe-direction=right]:w-full data-[swipe-direction=right]:max-w-sm',`.
- Geometry: `max-w-sm`, `min-h-0`, `w-full`.
- Type: `font-medium`, `text-lg`.
- Semantic tokens: `text-text-primary`.

### `form` — 25 runtime TSX; application-family

Application schema/scenario field infrastructure: labels/errors/warnings/text/number/select/upload/variables. Distinct from package native Form; one validation/submission/draft owner.

- `web/app/components/base/form/components/base/base-field.tsx:299` — `className={cn('inline p-0 text-inherit [font:inherit]', hasCustomLabel && 'w-full')}`.
- `web/app/components/base/form/components/base/base-form.tsx:73` — `'input:not([type="hidden"]):not(:disabled), button:not(:disabled), textarea:not(:disabled), [role="checkbox"]:not([aria-disabled="true"]), [role="radio"]:not([aria-disabled="true"])',`.
- `web/app/components/base/form/components/base/index.tsx:1`; no local surface class evidence.
- Geometry: `gap-1.5`, `gap-2`, `gap-3`, `h-5.5`, `h-8`, `max-h-80`, `min-w-0`, `p-0`, `p-2`, `pe-0.5`, `px-0`, `px-3`, `py-0.5`, `rounded-lg`, `w-50`, `w-fit`.
- Type: `system-sm-regular`, `system-xs-medium-uppercase`, `system-xs-regular`, `system-sm-medium`, `leading-3`, `system-xs-medium`, `body-xs-regular`.
- Semantic tokens: `bg-components-option-card-option-bg`, `bg-components-option-card-option-selected-bg`, `bg-components-panel-bg-blur`, `border-components-input-border-destructive`, `border-components-input-border-warning`, `border-components-option-card-option-border`, `border-components-option-card-option-selected-border`, `text-text-accent`, `text-text-destructive`, `text-text-destructive-secondary`, `text-text-primary`, `text-text-secondary`.

### `ga` — 1 runtime TSX; behavior-integration-helper

Analytics script integration, no visual component.

- `web/app/components/base/ga/index.tsx:1`; no local surface class evidence.

### `grid-mask` — 1 runtime TSX; asset-or-decorative-helper

Decorative grid mask with local z-1/z-2. Does not justify overlay z-index overrides.

- `web/app/components/base/grid-mask/index.tsx:24` — `'absolute z-1 size-full rounded-lg bg-grid-mask-background',`.
- Geometry: `rounded-lg`.

### `icon-picker` — 5 runtime TSX; application-family

Emoji search/grid, color radios and upload Tabs in 320px-class editor. Actual panel Tabs, one color RadioGroup, named emoji Autocomplete. Draft upload lifetime follows content session.

- `web/app/components/base/icon-picker/emoji-icon-editor.tsx:27` — `<section className="shrink-0 border-t border-divider-subtle bg-components-panel-bg-blur px-3 pt-2 pb-3 backdrop-blur-sm">`.
- `web/app/components/base/icon-picker/emoji-picker.tsx:52` — `<AutocompleteRow className="grid grid-cols-9 gap-px px-3 pb-px">`.
- `web/app/components/base/icon-picker/image-input-drag.tsx:5` — `const [isDragActive, setIsDragActive] = useState(false)`.
- Geometry: `gap-0.75`, `max-w-11.5`, `p-0.75`, `pb-3`, `pt-0.5`, `pt-2`, `px-0.5`, `px-3`, `py-1`, `rounded-[10px]`, `rounded-xl`, `w-full`, `gap-px`, `max-h-none`, `min-h-0`, `p-0`.
- Type: `leading-none`, `system-xs-semibold-uppercase`, `text-2xl`, `system-xs-medium-uppercase`, `system-sm-medium`, `system-xs-regular`, `text-base`.
- Semantic tokens: `bg-components-panel-bg-blur`, `bg-state-base-hover`, `border-divider-regular`, `border-divider-subtle`, `text-text-primary`, `bg-components-panel-bg`, `bg-state-base-hover-alt`, `ring-components-option-card-option-selected-border`, `text-components-input-text-placeholder`, `text-text-tertiary`, `bg-components-dropzone-bg`, `bg-components-dropzone-bg-accent`.

### `image-gallery` — 1 runtime TSX; application-family

Message image gallery delegates previews. Alt text and keyboard-open action separate from decorative thumbnail.

- `web/app/components/base/image-gallery/index.tsx:66` — `aria-label={t(($) => $['imageGallery.previewImage'], {`.

### `image-uploader` — 5 runtime TSX; application-family

Local/link image upload/fullscreen preview; visible progress/error, named hidden file input trigger, Dialog preview. Audit legacy hover-only removal before reuse.

- `web/app/components/base/image-uploader/image-link-input.tsx:37` — `<div className="flex h-8 items-center rounded-lg border border-components-panel-border bg-components-panel-bg pr-1 pl-1.5 shadow-xs">`.
- `web/app/components/base/image-uploader/image-list.tsx:41` — `className="block h-16 w-16 rounded-lg border-[0.5px] border-black/5 object-cover"`.
- `web/app/components/base/image-uploader/image-preview.tsx:219` — `className="image-preview-container fixed inset-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-black/80 p-8"`.
- Geometry: `h-4.5`, `h-8`, `pl-1.5`, `pr-1`, `px-1`, `rounded-lg`, `h-16`, `h-4`, `p-0`, `rounded-2xl`, `w-16`, `w-4`, `w-4.5`, `h-dvh`, `max-h-full`, `max-w-full`.
- Type: `text-[13px]`, `leading-none`, `text-[#DC6803]`, `text-sm`, `text-xs`, `text-[0]`.
- Semantic tokens: `bg-components-panel-bg`, `border-components-panel-border`, `text-text-primary`, `bg-state-base-hover`, `text-text-tertiary`, `bg-components-button-tertiary-bg`, `bg-components-button-tertiary-bg-hover`.

### `infinite-scroll-sentinel` — 1 runtime TSX; behavior-integration-helper

Intersection pagination behavior only. Owner guards duplicate fetch, announces loading/end/error and provides retry.

- `web/app/components/base/infinite-scroll-sentinel/index.tsx:55` — `return <div ref={sentinelRef} aria-hidden className={cn('h-px', className)} />`.
- Geometry: `h-px`.

### `keyboard-sortable` — 1 runtime TSX; behavior-integration-helper

Keyboard reorder hook with instructions/live feedback. Stable identity and focus restore accompany pointer drag.

- `web/app/components/base/keyboard-sortable/use-keyboard-sortable.tsx:12` — `getItemLabel?: (item: T, index: number) => string`.

### `line-chart` — 0 runtime TSX; support-only-no-runtime-tsx

Zero runtime TSX; style/support only. Directory name does not establish public chart API.

- No runtime TSX; support inventory in JSON. No rendered API inferred.

### `linked-apps-panel` — 1 runtime TSX; application-family

32px linked-resource rows, icon/truncation/hover. Use real target link/command; feature owns empty/linked states.

- `web/app/components/base/linked-apps-panel/index.tsx:29` — `'group/link-item flex h-8 w-full cursor-pointer items-center justify-between rounded-lg px-2 hover:bg-state-base-hover',`.
- Geometry: `h-8`, `p-1`, `px-2`, `rounded-lg`, `rounded-md`, `rounded-xl`, `w-[320px]`, `w-full`.
- Type: `system-2xs-medium-uppercase`, `system-sm-medium`.
- Semantic tokens: `bg-components-panel-bg-blur`, `bg-state-base-hover`, `border-components-panel-border`, `text-text-primary`, `text-text-tertiary`.

### `list-empty` — 3 runtime TSX; application-family

320px illustrated empty card with connectors, explanation and action. Illustration not accessible region name.

- `web/app/components/base/list-empty/horizontal-line.tsx:1`; no local surface class evidence.
- `web/app/components/base/list-empty/index.tsx:14` — `<div className="flex w-[320px] flex-col items-start gap-2 rounded-[10px] bg-workflow-process-bg p-4">`.
- `web/app/components/base/list-empty/vertical-line.tsx:1`; no local surface class evidence.
- Geometry: `gap-1`, `gap-2`, `h-10`, `p-1`, `p-4`, `rounded-[10px]`, `w-10`, `w-[320px]`.
- Type: `system-sm-medium`.
- Semantic tokens: `bg-components-card-bg`, `bg-workflow-process-bg`, `border-components-card-border`, `text-text-accent`, `text-text-secondary`.

### `loading-placeholder` — 1 runtime TSX; application-family

Waiting wrapper; one owner announces pending, nested skeleton decorative. Empty/error distinct from loading.

- `web/app/components/base/loading-placeholder/index.tsx:16` — `<div className={cn('flex w-full items-center justify-center', className)}>`.
- Geometry: `w-full`.

### `logo` — 3 runtime TSX; asset-or-decorative-helper

Brand asset/embedded header-avatar wrappers. Inventory only, explicitly excluded from target transplant.

- `web/app/components/base/logo/reference-logo.tsx:12` — `small: 'h-4 w-9',`.
- `web/app/components/base/logo/logo-embedded-chat-avatar.tsx:12` — `alt="logo"`.
- `web/app/components/base/logo/logo-embedded-chat-header.tsx:18` — `className={cn('block h-6 w-auto', className)}`.
- Geometry: `h-4`, `h-5.5`, `h-7`, `w-12`, `w-16`, `w-9`, `h-6`, `w-auto`.

### `markdown` — 3 runtime TSX; application-family

Streaming Markdown wrapper/error boundary. Preserve reading flow/code/link semantics and error containment. Content trust separate from visual matching.

- `web/app/components/base/markdown/error-boundary.tsx:1`; no local surface class evidence.
- `web/app/components/base/markdown/index.tsx:1`; no local surface class evidence.
- `web/app/components/base/markdown/streamdown-wrapper.tsx:1`; no local surface class evidence.
- Semantic tokens: `text-text-primary`.

### `markdown-blocks` — 16 runtime TSX; application-family

Code/media/diagrams/forms/thinking renderer adapters. Code header 32px, 10px bottom corners; diagrams preview/zoom. Generated interactive actions need real semantic form/command and safety boundary.

- `web/app/components/base/markdown-blocks/audio-block.tsx:1`; no local surface class evidence.
- `web/app/components/base/markdown-blocks/button.tsx:27` — `const className = 'h-auto! min-h-8 px-3! whitespace-normal select-none'`.
- `web/app/components/base/markdown-blocks/code-block.tsx:138` — `className="code-line-numbers [&_pre]:m-0! [&_pre]:rounded-t-none! [&_pre]:rounded-b-[10px]! [&_pre]:bg-components-input-bg-normal! [&_pre]:py-2!"`.
- Geometry: `h-auto`, `min-h-8`, `px-3`, `gap-1`, `h-8`, `p-1`, `pl-3`, `py-2`, `rounded-b-[10px]`, `rounded-t-[10px]`, `rounded-t-none`, `h-6`, `p-0`, `min-h-0`, `min-w-0`, `px-2`.
- Type: `text-[13px]`, `system-xs-semibold-uppercase`, `system-md-semibold`, `system-xs-regular`, `font-bold`.
- Semantic tokens: `bg-components-input-bg-normal`, `border-divider-subtle`, `text-text-secondary`, `bg-background-overlay-fullscreen`, `bg-components-panel-bg`, `text-text-destructive`, `bg-components-panel-bg-alt`, `border-components-panel-border`.

### `markdown-with-directive` — 3 runtime TSX; application-family

Directive/icon-card rendering, 44px rows. Structured presentation reusable; parser trust/allowlist separate.

- `web/app/components/base/markdown-with-directive/components/with-icon-card-item.tsx:14` — `'flex h-11 items-center space-x-3 rounded-lg bg-background-section px-2',`.
- `web/app/components/base/markdown-with-directive/components/with-icon-card-list.tsx:1`; no local surface class evidence.
- `web/app/components/base/markdown-with-directive/index.tsx:1`; no local surface class evidence.
- Geometry: `h-11`, `min-w-0`, `px-2`, `rounded-lg`, `w-full`.
- Type: `system-sm-medium`.
- Semantic tokens: `bg-background-section`, `text-text-secondary`, `text-text-accent`.

### `message-log-modal` — 1 runtime TSX; application-family

Message inspection modal with mounted transition state/named close. Persistent log data outside modal session chrome.

- `web/app/components/base/message-log-modal/index.tsx:49` — `<div className="shrink-0 px-4 py-1">`.
- Geometry: `max-w-[calc(100vw-16px)]`, `p-1`, `pt-3`, `px-4`, `py-1`, `rounded-xl`, `w-120`.
- Type: `system-xl-semibold`.
- Semantic tokens: `bg-components-panel-bg`, `border-components-panel-border`, `ring-components-input-border-active`, `text-text-primary`, `text-text-tertiary`.

### `new-audio-button` — 1 runtime TSX; application-family

Named icon playback command with active/disabled tokens; pending announcements feature-owned.

- `web/app/components/base/new-audio-button/index.tsx:85` — `aria-label={tooltipContent}`.
- Semantic tokens: `bg-state-accent-active`, `bg-state-accent-active-alt`, `text-text-accent`, `text-text-disabled`.

### `node-status` — 1 runtime TSX; application-family

Warning/error processing badge with icon+text, 6px radius/8px horizontal inset. Never color-only state.

- `web/app/components/base/node-status/index.tsx:15` — `const nodeStatusVariants = cva('flex items-center gap-1 rounded-md px-2 py-1 system-xs-medium', {`.
- Geometry: `gap-1`, `px-2`, `py-1`, `rounded-md`.
- Type: `system-xs-medium`.
- Semantic tokens: `bg-state-destructive-hover`, `bg-state-warning-hover`, `text-text-destructive`, `text-text-warning`.

### `notion-connector` — 1 runtime TSX; application-family

Provider-specific connect empty state icon/help/CTA. Derive generic connect/reconnect pattern, not branding/auth model.

- `web/app/components/base/notion-connector/index.tsx:13` — `<div className="flex flex-col items-start rounded-2xl bg-workflow-process-bg p-6">`.
- Geometry: `gap-y`, `h-12`, `p-3`, `p-6`, `pb-3`, `pt-1`, `rounded-2xl`, `rounded-[10px]`, `w-12`.
- Type: `system-md-semibold`, `system-sm-regular`.
- Semantic tokens: `bg-workflow-process-bg`, `border-components-card-border`, `shadow-shadow-shadow-5`, `text-text-secondary`, `text-text-tertiary`.

### `notion-icon` — 1 runtime TSX; asset-or-decorative-helper

20px provider page-icon/emoji fallback asset helper. Not generic navigation/tree behavior.

- `web/app/components/base/notion-icon/index.tsx:44` — `'flex size-5 items-center justify-center rounded-sm bg-gray-200 text-xs font-medium text-gray-500',`.
- Geometry: `rounded-sm`.
- Type: `font-medium`, `text-xs`.
- Semantic tokens: `text-text-tertiary`.

### `notion-page-selector` — 7 runtime TSX; application-family

Credential chooser/search/virtual rows/disclosure/selection, 296px list reference height. Auth/loading/selection independent; payload source-only.

- `web/app/components/base/notion-page-selector/base.tsx:221` — `<div className="rounded-xl border border-components-panel-border bg-background-default-subtle">`.
- `web/app/components/base/notion-page-selector/credential-selector/index.tsx:41` — `<SelectTrigger aria-label={currentDisplayName} className="w-42">`.
- `web/app/components/base/notion-page-selector/index.tsx:1`; no local surface class evidence.
- Geometry: `gap-x`, `gap-y`, `h-12`, `h-74`, `p-2`, `rounded-b-xl`, `rounded-t-xl`, `rounded-xl`, `h-9`, `max-h-50`, `min-w-0`, `px-3`, `w-42`, `w-80`, `h-6`, `max-w-30`.
- Type: `text-[13px]`, `font-medium`, `leading-4`, `text-xs`.
- Semantic tokens: `bg-background-default-subtle`, `bg-components-panel-bg`, `border-components-panel-border`, `text-text-tertiary`, `bg-components-button-ghost-bg-hover`, `bg-components-button-secondary-bg`, `bg-components-button-secondary-bg-hover`, `bg-state-base-hover`, `border-components-button-secondary-border`, `border-components-button-secondary-border-hover`, `shadow-shadow-shadow-3`, `text-components-button-secondary-text`.

### `page-unavailable.tsx` — 1 runtime TSX; application-family

Page unavailable code/explanation. Distinct context from app-unavailable and inline validation.

- `web/app/components/base/page-unavailable.tsx:14` — `<div className={cn('flex h-screen w-screen items-center justify-center', className)}>`.
- Geometry: `h-12.5`, `h-screen`, `pr-5`, `w-screen`.
- Type: `font-medium`, `leading-12.5`, `text-[24px]`, `text-sm`.

### `param-item` — 3 runtime TSX; application-family

Numeric parameter label/slider/number with score/top-k wrappers. Visible unit/help and domain bounds belong to feature.

- `web/app/components/base/param-item/index.tsx:62` — `<div className="flex min-h-6 flex-wrap items-center gap-y-1">`.
- `web/app/components/base/param-item/score-threshold-item.tsx:1`; no local surface class evidence.
- `web/app/components/base/param-item/top-k-item.tsx:1`; no local surface class evidence.
- Geometry: `gap-3`, `gap-y`, `min-h-6`, `min-w-25`, `w-18`, `w-50`, `w-full`, `rounded`.
- Type: `system-sm-semibold`.
- Semantic tokens: `text-text-secondary`.

### `premium-badge` — 1 runtime TSX; application-family

Entitlement/upgrade metadata. Geometry reusable; target plan-tier assumptions not authorized.

- `web/app/components/base/premium-badge/index.tsx:50` — `'i-custom-public-common-highlight h-6 w-11.5',`.
- Geometry: `h-4.5`, `h-6`, `pb-allow`, `w-11.5`, `w-12`.
- Semantic tokens: `ring-state-accent-solid`.

### `prompt-editor` — 65 runtime TSX; application-family

Lexical typed variable/context/query/history/HITL/agent-output blocks/pickers/shortcuts. Preserve editor transactions/caret focus/popup keyboard scope. Custom nodes not plain input; runtime/data contract source-only.

- `web/app/components/base/prompt-editor/constants.tsx:1`; no local surface class evidence.
- `web/app/components/base/prompt-editor/index.tsx:94` — `'aria-controls' | 'aria-haspopup' | 'aria-label' | 'aria-labelledby'`.
- `web/app/components/base/prompt-editor/plugins/agent-output-block/component.tsx:178` — `className="group/agent-output inline-flex min-w-4.5 cursor-pointer items-center gap-1 rounded-[5px] border border-util-colors-violet-violet-100 bg-util-colors-violet-violet-50 px-1 py-0.5 al`.
- Geometry: `gap-0.5`, `gap-0.75`, `gap-1`, `h-4`, `max-w-28`, `min-w-0`, `min-w-4`, `min-w-4.5`, `min-w-5`, `p-0`, `p-px`, `pl-0.5`, `pl-1`, `pr-0.5`, `px-0.5`, `px-1`.
- Type: `system-2xs-medium-uppercase`, `system-2xs-semibold-uppercase`, `system-xs-medium`, `system-xs-regular`, `text-[#6938EF]`, `text-[#DD2590]`, `text-[#FD853A]`, `text-xs`, `system-sm-regular`, `text-[13px]`, `font-medium`, `font-semibold`.
- Semantic tokens: `bg-util-colors-violet-violet-200`, `bg-util-colors-violet-violet-50`, `border-util-colors-violet-violet-100`, `border-util-colors-violet-violet-700`, `text-text-tertiary`, `text-util-colors-violet-violet-700`, `text-text-accent`, `text-util-colors-violet-violet-600`, `bg-components-panel-bg-blur`, `bg-divider-subtle`, `bg-state-base-hover`, `border-components-panel-border`.

### `prompt-log-modal` — 2 runtime TSX; application-family

Prompt inspection 56px header + role/content cards, whitespace/copy semantics. Logging data lives beyond overlay.

- `web/app/components/base/prompt-log-modal/card.tsx:11` — `<div className="px-4 py-2">`.
- `web/app/components/base/prompt-log-modal/index.tsx:31` — `className="relative z-10 flex flex-col rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-xl"`.
- Geometry: `h-8`, `pb-4`, `pt-2`, `px-4`, `py-2`, `rounded-xl`, `h-14`, `h-3.5`, `p-0`, `p-2`, `pl-6`, `pr-5`, `rounded-md`, `w-px`.
- Type: `font-semibold`, `text-base`.
- Semantic tokens: `bg-state-base-hover`, `text-text-secondary`, `bg-components-panel-bg`, `bg-divider-regular`, `border-components-panel-border`, `border-divider-regular`, `ring-components-button-secondary-accent-border`, `text-text-primary`, `text-text-tertiary`.

### `qrcode` — 1 runtime TSX; application-family

Named QR command with 232px-class popover/title/code. Retain accessible URL/text alternative; QR never sole access path.

- `web/app/components/base/qrcode/index.tsx:54` — `className="flex w-58 flex-col items-center rounded-lg p-4 shadow-xs"`.
- Geometry: `p-0`, `p-4`, `rounded-lg`, `w-58`.
- Type: `system-xs-regular`.
- Semantic tokens: `ring-components-input-border-active`, `text-text-accent-secondary`, `text-text-tertiary`.

### `radio-card` — 1 runtime TSX; application-family

Full option RadioItem with RadioControl, icon/title/help; 12px radius/padding, top-end indicator. Must belong to named RadioGroup.

- `web/app/components/base/radio-card/index.tsx:44` — `'relative rounded-xl border-[0.5px] border-components-option-card-option-border bg-components-option-card-option-bg p-3',`.
- Geometry: `gap-x`, `min-w-0`, `p-0`, `p-3`, `pr-8`, `rounded-lg`, `rounded-xl`, `w-full`.
- Type: `system-sm-semibold`, `system-xs-regular`.
- Semantic tokens: `bg-components-option-card-option-bg`, `bg-components-option-card-option-selected-bg`, `border-components-option-card-option-border`, `ring-components-input-border-active`, `text-text-secondary`, `text-text-tertiary`.

### `resize-handle` — 1 runtime TSX; application-family

Keyboard splitter role separator, orientation/min/max/now/controls and focus indicator. Sync arrow resizing and pointer drag.

- `web/app/components/base/resize-handle/index.tsx:59` — `'group/resize rounded-sm focus-visible:bg-state-accent-solid focus-visible:ring-2 focus-visible:ring-state-accent-solid focus-visible:outline-hidden',`.
- Geometry: `rounded-sm`.
- Semantic tokens: `bg-state-accent-solid`, `ring-state-accent-solid`.

### `search-input` — 1 runtime TSX; application-family

Named input-group search with search icon/separate clear command; query default field name. Placeholder not label; preserve describedby/key handling.

- `web/app/components/base/search-input/index.tsx:77` — `<InputGroupAddon className="ps-1.75 pe-1.25">`.
- Geometry: `pe-1.25`, `ps-0.75`, `ps-1.75`.
- Semantic tokens: `bg-components-input-bg-hover`, `text-components-input-text-placeholder`.

### `simple-pie-chart` — 1 runtime TSX; application-family

Decorative percentage sector default 80%, 12px orange. Not package ProgressCircle accessibility contract; readable percentage/status required.

- `web/app/components/base/simple-pie-chart/index.tsx:1`; no local surface class evidence.

### `skeleton` — 1 runtime TSX; application-family

Container/row/rectangle placeholders, neutral 20% texture and reserved geometry. Parent owns status; avoid duplicate reading of decorative skeleton.

- `web/app/components/base/skeleton/index.tsx:9` — `<div className={cn('flex flex-col gap-1', className)} {...rest}>`.
- Geometry: `gap-1`, `gap-2`, `h-2`, `rounded-xs`, `w-96`.
- Type: `font-medium`, `text-xs`.
- Semantic tokens: `bg-text-quaternary`, `text-text-quaternary`.

### `sort` — 1 runtime TSX; application-family

Split field chooser/direction action, names describe next order. Selection versus command remain separate; popup active and truncation preserved.

- `web/app/components/base/sort/index.tsx:43` — `<div className="inline-flex w-fit max-w-full min-w-0 items-center gap-px">`.
- Geometry: `gap-0.5`, `gap-2`, `gap-px`, `h-auto`, `max-h-72`, `max-w-full`, `min-h-8`, `min-w-0`, `p-0`, `p-1`, `px-1`, `px-2`, `py-1`, `py-1.5`, `rounded-s-lg`, `rounded-s-none`.
- Type: `system-sm-medium`, `system-sm-regular`, `text-[ButtonText]`, `text-[CanvasText]`.
- Semantic tokens: `bg-components-input-bg-normal`, `bg-state-base-hover-alt`, `text-text-secondary`, `text-text-tertiary`, `text-util-colors-blue-light-blue-light-600`.

### `svg-gallery` — 1 runtime TSX; application-family

SVG preview state/display adapter. Raw SVG trust boundary separate; name does not prove sanitization.

- `web/app/components/base/svg-gallery/index.tsx:10` — `const [imagePreview, setImagePreview] = useState('')`.

### `tab-slider-new` — 1 runtime TSX; application-family

Application-flavored SegmentedControl adapter, 32px items/nav-like active tokens. Still mode/radio semantics, not Tabs; target navigation exceptions win.

- `web/app/components/base/tab-slider-new/index.tsx:24` — `className={cn(className, 'relative flex gap-0 rounded-none bg-transparent p-0')}`.
- Geometry: `gap-0`, `h-8`, `p-0`, `px-3`, `py-1.75`, `rounded-none`.
- Type: `font-medium`, `leading-4.5`, `text-[13px]`.
- Semantic tokens: `bg-state-base-hover`, `border-components-main-nav-nav-button-border`, `text-components-main-nav-nav-button-text-active`, `text-text-tertiary`.

### `tag-input` — 1 runtime TSX; application-family

Multi-tag text with Enter default/custom key/required, named remove commands. Tag-commit Enter must not accidentally submit form; forward invalid/description.

- `web/app/components/base/tag-input/index.tsx:88` — `!isInWorkflow && 'min-w-50',`.
- Geometry: `gap-x`, `max-w-36.5`, `max-w-75`, `min-w-0`, `min-w-50`, `p-0`, `pb-1`, `pl-1`, `pl-1.5`, `pr-1`, `px-1.5`, `py-1`, `rounded-lg`, `rounded-md`, `w-full`.
- Type: `system-xs-regular`.
- Semantic tokens: `bg-components-badge-white-to-dark`, `bg-components-input-bg-normal`, `border-divider-deep`, `ring-components-input-border-active`, `text-text-placeholder`, `text-text-primary`, `text-text-secondary`, `text-text-tertiary`.

### `text-generation` — 0 runtime TSX; support-only-no-runtime-tsx

Zero runtime TSX; helper/hook-only support. No rendered text-generation API inferred.

- No runtime TSX; support inventory in JSON. No rendered API inferred.

### `theme-selector.tsx` — 1 runtime TSX; application-family

Light/dark/system radio menu and named icon trigger; decorative icon. Theme owner retains state.

- `web/app/components/base/theme-selector.tsx:53` — `<DropdownMenuContent dir={direction} sideOffset={6} className="w-36">`.
- Geometry: `px-1`, `w-36`.
- Type: `system-icon`, `system-md-regular`.
- Semantic tokens: `bg-state-base-hover`, `text-text-tertiary`.

### `upgrade-modal` — 1 runtime TSX; application-family

Entitlement dialog icon/explanation/CTA. Product tiers source-only, not target requirements.

- `web/app/components/base/upgrade-modal/index.tsx:43` — `className={cn(styles.surface, 'w-145 max-w-120 overflow-hidden', classNames?.content)}`.
- Geometry: `max-w-120`, `pt-8`, `px-8`, `rounded-xl`, `w-145`.
- Type: `text-sm`, `title-3xl-semi-bold`.
- Semantic tokens: `text-text-primary-on-surface`, `text-text-tertiary`.

### `user-avatar-list` — 1 runtime TSX; application-family

AvatarGroup adapter defaults maxVisible=3, sm, showCount=true. Informative user img names versus decorative redundancy; overflow number not full member access.

- `web/app/components/base/user-avatar-list/index.tsx:53` — `role="img"`.

### `video-gallery` — 2 runtime TSX; application-family

Message video/play/seek/volume/fullscreen lifecycle. Name custom controls and preserve keyboard/resource cleanup.

- `web/app/components/base/video-gallery/VideoPlayer.tsx:13` — `aria-hidden="true"`.
- `web/app/components/base/video-gallery/index.tsx:1`; no local surface class evidence.

### `voice-input` — 1 runtime TSX; application-family

Recording overlay starting/recording/transcribing/error/timer, recorder cleanup. Permission/stop/cancel feedback explicit; draft owner outlives recorder as needed.

- `web/app/components/base/voice-input/index.tsx:205` — `<div ref={ref} className={cn(s.wrapper, 'absolute inset-0 rounded-xl')}>`.
- Geometry: `h-4`, `pl-1`, `pl-[14.5px]`, `pr-[6.5px]`, `py-3.5`, `rounded-[10.5px]`, `rounded-lg`, `rounded-xl`, `w-11.25`, `w-full`.
- Type: `font-medium`, `text-sm`, `text-xs`.
- Semantic tokens: `bg-primary-100`, `bg-primary-25`, `ring-state-accent-solid`, `text-primary-600`, `text-primary-700`, `text-text-destructive`, `text-text-secondary`.

### `workspace-avatar` — 1 runtime TSX; application-family

Workspace initial identity chip sm default; decorative identity alone not switcher behavior.

- `web/app/components/base/workspace-avatar/index.tsx:11` — `xs: { root: 'rounded-md', text: 'text-[10px] leading-3' },`.
- Geometry: `p-1`, `rounded-lg`, `rounded-md`, `rounded-xl`.
- Type: `font-semibold`, `leading-3`, `leading-4`, `leading-5`, `leading-7`, `text-[10px]`, `text-[13px]`, `text-base`, `text-xl`.
- Semantic tokens: `bg-components-icon-bg-orange-dark-solid`, `border-divider-regular`, `text-shadow-shadow-1`.

### `zendesk` — 2 runtime TSX; behavior-integration-helper

Support-script/provider lifecycle, no generic visible primitive. Integration source-only.

- `web/app/components/base/zendesk/index.tsx:1`; no local surface class evidence.
- `web/app/components/base/zendesk/script.tsx:33` — `useEffect(() => {`.
- Type: `system-features`.

## Specialized patterns and immediate domain inventory

Complete immediate-family inventory; domain implementation analysis is explicitly representative/source-only, not a deep audit of every domain file.

### `access-rules-editor` — 5 runtime TSX

Access table named members/select-all/busy/page/add-member filter and bulk action; switch for automatic inclusion explained nearby. Selected account set distinct from current page.

- `web/app/components/access-rules-editor/index.tsx:223` — representative source evidence.
- `web/app/components/access-rules-editor/add-access-subject-menu.tsx:70` — representative source evidence.
- `web/app/components/access-rules-editor/automatic-include-workspace-members-section.tsx:23` — representative source evidence.

### `api-key` — 6 runtime TSX

800px dialog, fixed table/sticky header, masked monospace tokens and contextual delete names. Separate confirmation root/status/limit; close only after outcome, restore valid focus.

- `web/app/components/api-key/api-key-dialog-content.tsx:31` — representative source evidence.
- `web/app/components/api-key/api-key-list-content.tsx:62` — representative source evidence.
- `web/app/components/api-key/api-key-table.tsx:43` — representative source evidence.

### `app` — 223 runtime TSX

Builders/config/import/create/logs/publish/run panes. Fullscreen creation dialog has named hidden title/deliberate backdrop. Extract section/inspector hierarchy, not global shell/backend contract.

- `web/app/components/app/app-detail-prefetch.tsx:1` — representative source evidence.
- `web/app/components/app/create-app-dialog-shell.tsx:37` — representative source evidence.
- `web/app/components/app/create-app-dropdown.tsx:48` — representative source evidence.

### `app-sidebar` — 16 runtime TSX

Detail nav/back/breadcrumb/search. Source-only shell reference; preserve target navigation/logo/glass/accent exceptions.

- `web/app/components/app-sidebar/app-detail-section.tsx:33` — representative source evidence.
- `web/app/components/app-sidebar/app-detail-sidebar.tsx:1` — representative source evidence.
- `web/app/components/app-sidebar/app-detail-top.tsx:32` — representative source evidence.

### `apps` — 19 runtime TSX

Card catalog initial skeleton/empty/filter mismatch/starred groups/infinite load/retry. Stable list roles/names/busy/polite feedback, bounded descriptions and focus-visible actions.

- `web/app/components/apps/index.tsx:196` — representative source evidence.
- `web/app/components/apps/app-card-skeleton.tsx:23` — representative source evidence.
- `web/app/components/apps/app-list-catalog.tsx:240` — representative source evidence.

### `billing` — 42 runtime TSX

Quota capacity uses Meter, task uses Progress. Pricing/tier/entitlement source-only. Heading/help/action/measurement portable.

- `web/app/components/billing/annotation-full/index.tsx:16` — representative source evidence.
- `web/app/components/billing/apps-full-in-dialog/index.tsx:40` — representative source evidence.
- `web/app/components/billing/billing-page/index.tsx:28` — representative source evidence.

### `custom` — 5 runtime TSX

Brand editor upload pending label/preview/field sections. Preserve target brand exceptions; source logos excluded.

- `web/app/components/custom/custom-page/index.tsx:36` — representative source evidence.
- `web/app/components/custom/custom-web-app-brand/index.tsx:39` — representative source evidence.
- `web/app/components/custom/custom-web-app-brand/components/chat-preview-card.tsx:19` — representative source evidence.

### `datasets` — 298 runtime TSX

Knowledge sources/documents/chunks/retrieval/access settings. Metadata precedes body reading/Q-A, independent ingest/retrieval status. Source data/backend contracts not portable.

- `web/app/components/datasets/chunk.tsx:14` — representative source evidence.
- `web/app/components/datasets/creator-filter.tsx:97` — representative source evidence.
- `web/app/components/datasets/loading.tsx:1` — representative source evidence.
- `web/app/components/datasets/access-config/index.tsx:222` — representative source evidence.

### `detail-sidebar` — 2 runtime TSX

Context detail pane/toggle, local resize/scroll; not global target nav.

- `web/app/components/detail-sidebar/index.tsx:134` — representative source evidence.
- `web/app/components/detail-sidebar/toggle-button.tsx:43` — representative source evidence.

### `devtools` — 2 runtime TSX

Development instrumentation loaders only; no production design primitive.

- `web/app/components/devtools/agentation-loader.tsx:1` — representative source evidence.
- `web/app/components/devtools/react-scan/loader.tsx:1` — representative source evidence.

### `explore` — 16 runtime TSX

Resource gallery/category/installed navigation/item ops. Preserve empty/loading and current semantics; hierarchy source-only.

- `web/app/components/explore/category.tsx:40` — representative source evidence.
- `web/app/components/explore/installed-app/index.tsx:25` — representative source evidence.
- `web/app/components/explore/item-operation/index.tsx:38` — representative source evidence.

### `external-attribution-recorder.tsx` — 1 runtime TSX

Root instrumentation/attribution/loading adapter, not package family.

- `web/app/components/external-attribution-recorder.tsx:76` — representative source evidence.

### `full-screen-loading.tsx` — 1 runtime TSX

Root instrumentation/attribution/loading adapter, not package family.

- `web/app/components/full-screen-loading.tsx:4` — representative source evidence.

### `goto-anything` — 21 runtime TSX

Dialog + Autocomplete + scoped hotkeys, hidden title/search hint/status, bounded 480px list. Query separate selected target; hotkey scope ends at unmount.

- `web/app/components/goto-anything/index.tsx:442` — representative source evidence.
- `web/app/components/goto-anything/results.tsx:29` — representative source evidence.
- `web/app/components/goto-anything/actions/agent.tsx:28` — representative source evidence.

### `header` — 123 runtime TSX

Account/workspace/provider/admin/security/appearance settings. Max 1080px frame, persistent left menu and independent content scroll. Extract field/section/lifetime only; target header/nav excluded.

- `web/app/components/header/header-wrapper.tsx:18` — representative source evidence.
- `web/app/components/header/account-dropdown/index.tsx:43` — representative source evidence.
- `web/app/components/header/account-setting/index.tsx:217` — representative source evidence.

### `integrations` — 13 runtime TSX

Provider/tool categories/collapsible tool groups, responsive left Drawer, named independent scroll region. Same semantic navigation across presentation.

- `web/app/components/integrations/index.tsx:100` — representative source evidence.
- `web/app/components/integrations/modal.tsx:35` — representative source evidence.
- `web/app/components/integrations/page-header.tsx:28` — representative source evidence.

### `main-nav` — 15 runtime TSX

Shell/layout/skip link/account; inventory only. Target nav/logo/glass/accent wins.

- `web/app/components/main-nav/index.tsx:85` — representative source evidence.
- `web/app/components/main-nav/layout.tsx:45` — representative source evidence.
- `web/app/components/main-nav/server.tsx:1` — representative source evidence.

### `oauth-registration-analytics.tsx` — 1 runtime TSX

Root instrumentation/attribution/loading adapter, not package family.

- `web/app/components/oauth-registration-analytics.tsx:36` — representative source evidence.

### `oauth-registration-attribution.ts` — 0 runtime TSX

Root instrumentation/attribution/loading adapter, not package family.

### `plugins` — 202 runtime TSX

Catalog/detail/install/update/config. Cards identity/author/version/description/warning/footer, operations visible on focus/touch as well as hover. Permission/async operation owner outside chrome.

- `web/app/components/plugins/provider-card.tsx:49` — representative source evidence.
- `web/app/components/plugins/card/index.tsx:107` — representative source evidence.
- `web/app/components/plugins/marketplace/index.tsx:1` — representative source evidence.

### `provider` — 4 runtime TSX

I18n/direction providers only; portals and HTML direction agree.

- `web/app/components/provider/i18n-direction.tsx:1` — representative source evidence.
- `web/app/components/provider/i18n-server.tsx:1` — representative source evidence.
- `web/app/components/provider/i18n-stream.tsx:23` — representative source evidence.

### `rag-pipeline` — 52 runtime TSX

Graph builder shares workflow state; export/publish/knowledge flows source-only. Reuse canvas/inspector/action pattern, not storage/runtime contract.

- `web/app/components/rag-pipeline/index.tsx:1` — representative source evidence.
- `web/app/components/rag-pipeline/components/conversion.tsx:89` — representative source evidence.
- `web/app/components/rag-pipeline/components/export-confirm-modal.tsx:50` — representative source evidence.

### `share` — 12 runtime TSX

Published content/chat/text generation/composer/results/sidebar patterns; public sharing/auth model source-only.

- `web/app/components/share/text-generation/index.tsx:117` — representative source evidence.
- `web/app/components/share/text-generation/info-modal.tsx:27` — representative source evidence.
- `web/app/components/share/text-generation/menu-dropdown.tsx:63` — representative source evidence.

### `signin` — 1 runtime TSX

Countdown support only; no entire auth UI inferred.

- `web/app/components/signin/countdown.tsx:74` — representative source evidence.

### `snippet-list` — 4 runtime TSX

Catalog identity/metadata/bounded copy/search busy/status/keyboard more/create-import/error-empty.

- `web/app/components/snippet-list/index.tsx:67` — representative source evidence.
- `web/app/components/snippet-list/components/snippet-card.tsx:148` — representative source evidence.
- `web/app/components/snippet-list/components/snippet-create-button.tsx:41` — representative source evidence.

### `snippets` — 17 runtime TSX

Graph snippets + create/import dialogs, file/URL Tabs and nested version-confirmation decision. Draft/import op ownership outside child controls.

- `web/app/components/snippets/index.tsx:22` — representative source evidence.
- `web/app/components/snippets/create-snippet-dialog.tsx:133` — representative source evidence.
- `web/app/components/snippets/import-snippet-dsl-dialog.tsx:240` — representative source evidence.

### `step-by-step-tour` — 3 runtime TSX

Anchored spotlight/checklist/progress/floating-minimized restore. Measurement/focus/completion separate, viewport bounded; optional onboarding not essential workflow.

- `web/app/components/step-by-step-tour/coachmark.tsx:37` — representative source evidence.
- `web/app/components/step-by-step-tour/floating-widget.tsx:62` — representative source evidence.
- `web/app/components/step-by-step-tour/mount.tsx:810` — representative source evidence.

### `tools` — 36 runtime TSX

Provider grid/marketplace/custom collection Drawer; fixed title/body scroll/credential-test subflows. Required labels/help/field structure portable, schemas and auth source-only.

- `web/app/components/tools/tool-provider-grid.tsx:112` — representative source evidence.
- `web/app/components/tools/edit-custom-collection-modal/index.tsx:226` — representative source evidence.
- `web/app/components/tools/marketplace/index.tsx:54` — representative source evidence.

### `workflow` — 572 runtime TSX

Canvas/nodes/ports/edges/palette/selection/inspect/run/history/keyboard/context panes. Separate canvas/property keyboard scope; persistence provider-owned. Derive visual anatomy only, no source graph/storage contract.

- `web/app/components/workflow/index.tsx:642` — representative source evidence.
- `web/app/components/workflow/block-icon.tsx:18` — representative source evidence.
- `web/app/components/workflow/candidate-node-main.tsx:120` — representative source evidence.
- `web/app/components/workflow/panel/index.tsx:44` — representative source evidence.

### `workflow-app` — 11 runtime TSX

Wrapper owns collaboration/initial load/features; polite wait overlay. Page initialization locks distinct from per-node pending.

- `web/app/components/workflow-app/index.tsx:68` — representative source evidence.
- `web/app/components/workflow-app/components/workflow-children.tsx:46` — representative source evidence.
- `web/app/components/workflow-app/components/workflow-main.tsx:553` — representative source evidence.

## Reusable compositions to derive independently

1. **Settings:** title/help, real form, Fieldset for related choices, visible labels/errors, deliberate disabled reason, Save loading without focus loss. Draft and cancel/reset follow content owner. Evidence: package forms guide; header/account-setting; base/form.

2. **Catalog:** named search/count/filter chips, semantic list, stable skeleton, distinct zero-data/no-match/error/retry, bounded descriptions, focus/touch actions, pagination/infinite status. Evidence: apps/app-list-catalog; snippet-list; plugins/provider-card.

3. **Inspector/editor:** spatial canvas/list context, bounded right pane, labeled close, Tabs only for real panels, min-h-0 body scroll, accessible resize separator, operation-specific pending. Evidence: workflow/panel; base/resize-handle; base/agent-log-modal.

4. **Destructive mutation:** named object action -> specific AlertDialog -> cancel/confirm -> duplicate prevention -> outcome -> deliberate restoration if row disappears. Evidence: api-key/api-key-list-content and api-key-table.

5. **Knowledge reading:** identity/compact metadata, body typography for chunks/Q-A, citations separate from retrieval progress/warnings. Evidence: datasets/chunk; base/chat/citation; base/markdown-blocks.

6. **Typed selection:** Select short closed list, Combobox searchable values, source records kept for async label resolution, targeted chip removal names, per-open query separate selected value. Evidence: package selection guide and combobox implementation.

7. **Conversation:** author/readable body, branch/edit commands, tool/reasoning disclosure, citations/attachments, bounded composer and one response-status owner. Evidence: base/chat/chat/index and answer; base/file-uploader.

## Verification limits

- No browser/runtime/screen-reader verification, tests, installs or target API-parity checks in this subtask.
- Every package/base runtime TSX was read by full-source traversal and indexed per category; manual semantic synthesis deep-read owning primitives/guides and family behavior. Extraction is source evidence, not runtime proof.
- Every immediate domain family inventoried; deeper domain files sampled explicitly, not an exhaustive deep domain audit.
- Support helpers/assets separated; existence never implies rendered component or public API.

No repository mutation, tests, installs, Docker or public actions. Source evidence does not certify rendered browser/contrast/touch/screen-reader behavior.

Runtime classification note: 52 actual package UI TSX and 324 application base runtime TSX; filename-only non-test-name scans count 69/329 because test-directory support TSX is included. 76 base families and 52 public export entries are fully inventoried. Every immediate domain entry is included, while deep domain implementation review is representative sampling. Automated extraction is not a human line-by-line semantic or browser audit.
