# Reference application: exhaustive route and page study

Source revision: `21a2081267a217ead3ec847c2d3a2522f3c30c2d`. Study date: 2026-10-25. Coverage: **114 of 114 page files**, **1389 source files read or indexed**, **36 page families**. These are source observations, not browser-verified appearance or interaction claims.

## Placement and maintenance

This pinned source-study catalog accompanies the machine-readable `page-evidence.json`. It is a pinned source study that supports DESIGN.md; it does not replace product rules or claim runtime acceptance. A subsequent source upgrade should regenerate the route inventory and re-evaluate changed evidence. Paths beginning with `web/` are relative to the reference web workspace. `component-package/src` names the neutral shared UI workspace. Rare branded identifiers or filenames are neutralized as `reference-application`; line numbers and surrounding directories are preserved. No local absolute path, repository URL, source branding, logo, or source name is needed to consume these findings.

## Evidence boundary and exhaustive coverage

Every route file was opened by the inventory reader, including thin wrappers, redirects, parallel detail-sidebar slots, and intentionally unfinished routes. The inventory resolves rendered local imports and follows wrapper chains into their actual page implementation. Every ancestor layout is indexed as possible inherited evidence. Fixed agent section and log/annotation dispatchers are resolved before following selected edges. The JSON retains the exact page path, canonical route, route group, parallel-slot identity, implementation paths, layout chain, composition evidence, observed tokens, controls, six state/quality categories, and an adaptation rule with caveat. There is no assumption that a route wrapper itself contains the actual UI.

The auxiliary traversal follows rendered imports through five levels; layout traversal follows two levels. Import membership is not page reachability. Route/selected-primary evidence is separated from possible dependency evidence. This yields detailed source evidence but does not prove that every render prop, dynamic import, external component, event path, feature branch, or dependency has been exhaustively followed. Empty evidence means not established within the inspected sources, never that the product lacks the feature. Tests and stories are not normative evidence.

All rules below have two parts: source-backed composition and an inferred reusable principle. Browser checks were not performed. Pixel geometry, computed colors, contrast, actual focus order, focus restoration, touch behavior, screen-reader announcements, permission enforcement, network failures, and long-content overflow remain unverified. A CSS class proves an authored intent; it does not prove the intended result.

## What the whole route system teaches

The reference is not one homogeneous page template. Its route system separates console management, full-workspace editors, standalone authentication, account tasks, shared/embedded runtimes, public human-input forms, eligibility flows, and an independently rendered unavailable document. Even within console management, older dataset pages coexist with newer knowledge workspace pages. Newer resource-management pages often use a compact title and description, dedicated toolbar, bounded scroll area, explicit state controllers, and composable drawers. Older pages sometimes mix those responsibilities. Treat the newer systematic examples as stronger evidence for reusable composition, while retaining concrete exceptions.

The strongest cross-family rule is to assign height, overflow, and state ownership deliberately. Console layouts bound the viewport; collection pages keep the title and toolbar outside the scrolling results; canvas routes explicitly permit horizontal overflow; detail pages use `min-h-0` and `min-w-0` to let children shrink. Authentication uses a narrow readable column instead of forcing that console geometry onto a task that needs one form. Shared runtimes preserve dynamic viewport and safe-area behavior. These are different task geometries, not cosmetic variants of one card.

Semantic tokens do most of the visual coordination. `text-text-primary` carries headings and key values; secondary text carries supporting labels and body content; tertiary text carries descriptions, metadata, and quieter affordances. `bg-background-body`, panel backgrounds, card backgrounds, section fills, subtle dividers, and interaction-state fills signal different ownership levels. The source does not justify copying one fixed color palette. Map these roles to target tokens and preserve the target accent and liquid-glass decisions. An apparent token frequency is descriptive, never an accessibility or aesthetic certification.

Actions follow task hierarchy. Filters and search are grouped into a toolbar; collection creation/import actions sit apart from query controls; per-item operations move into menus; destructive operations use focused dialogs with references or explicit naming confirmation in stronger examples. Runtime tasks use a primary action and a clear return/retry action. This study does not authorize adding source-domain actions, billing, AI workflows, connectors, or deployment contracts to Tapstate.

Loading is most useful when it predicts the eventual geometry. Agent monitoring reserves chart cards, collection skeletons preserve card shape, and access settings skeletons preserve heading/form/table structure. The newer skill list distinguishes initial load, refresh, and pagination so already loaded content can stay visible. Empty states distinguish first-use onboarding from a filter yielding zero results. Failures expose retry near the failed region in stronger implementations; some auth catches only log to the console, which is a gap rather than a rule to reuse.

Accessibility appears as a combination of primitives and local composition: field labels and validation messages, `aria-busy`, live status text, `role="alert"`, hidden decorative icons, visible keyboard focus, semantic links/buttons, labelled drawers/dialogs, and reduced-motion alternatives. It is uneven across generations. Reusing a primitive does not automatically label a page or restore focus; page composition must complete those responsibilities.

Responsive adaptation changes the arrangement and disclosure strategy rather than simply shrinking everything. Roster help becomes a labelled icon; integration contextual navigation becomes a drawer; log detail uses responsive backdrop behavior; retrieval stacks task/result panels before forming a side-by-side workspace; pagination simplifies on narrow screens. Use each arrangement only when the target task has the corresponding hierarchy. Preserve global app-owned navigation.

## Route-group coverage

| Route group / root   | Page files | Interpretation                                                                             |
| -------------------- | ---------: | ------------------------------------------------------------------------------------------ |
| `(commonLayout)`     |         81 | Console shell, resource collections/details, canonicalization, and parallel sidebar slots. |
| `(education)`        |          2 | Eligibility verification and application tasks.                                            |
| `(humanInputLayout)` |          1 | Public human action form with explicit token/status handling.                              |
| `(shareLayout)`      |         12 | Standalone/embedded runtimes and their own authentication/recovery.                        |
| `account`            |          2 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `activate`           |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `device`             |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `forgot-password`    |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `init`               |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `install`            |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `oauth-callback`     |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `reset-password`     |          3 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `signin`             |          3 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `signup`             |          3 | Standalone account, authentication, recovery, installation, or access-transition task.     |
| `webapp-unavailable` |          1 | Standalone account, authentication, recovery, installation, or access-transition task.     |

## Family synthesis and reusable rules

### Account profile (1 page files)

Group identity summary, editable account fields, security settings, and account deletion into separate sections, with edits handled in focused dialogs.

**Boundary:** Premium/education banners and account deletion policy are source-specific. This does not authorize adding target account capabilities.

- Code: `web/app/account/(commonLayout)/page.tsx:10` — `<div className="mx-auto w-full max-w-160 px-6 pt-12">`
- Code: `web/app/account/(commonLayout)/page.tsx:11` — `<AccountPage />`
- Code: `web/app/account/(commonLayout)/account-page/index.tsx:60` — `if (!userProfile) return null`
- Code: `web/app/account/(commonLayout)/account-page/index.tsx:63` — `return (`
- Code: `web/app/account/(commonLayout)/account-page/index.tsx:64` — `<div className="flex px-3 py-1">`

**State/quality evidence:** accessibility: `web/app/account/(commonLayout)/account-page/index.tsx:87`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Agent access surfaces (2 page files)

Selected-section composition anchor: `web/features/agent-v2/agent-detail/access/page.tsx:41`.

Separate access delivery cards from permission-policy editing; use a persistent section heading and bounded content width, and expose failed fetch recovery in place.

**Boundary:** Access entry points and permission policy must follow Tapstate authorization; disabled UI is not backend authorization.

- Code: `web/features/agent-v2/agent-detail/access/page.tsx:41` — `<AgentDetailSectionSurface label={t(($) => $['agentDetail.sections.access'])}>`
- Code: `web/features/agent-v2/agent-detail/access/page.tsx:42` — `<header className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-6 pt-3 pb-2">`
- Code: `web/features/agent-v2/agent-detail/access/page.tsx:43` — `<div className="min-w-0">`
- Code: `web/features/agent-v2/agent-detail/access/page.tsx:44` — `<h2 className="system-xl-semibold text-text-primary">`
- Code: `web/features/agent-v2/agent-detail/access-config/page.tsx:102` — `<div className="flex h-full min-h-0 flex-col overflow-hidden bg-background-default-subtle">`
- Code: `web/features/agent-v2/agent-detail/access-config/page.tsx:103` — `<header className="flex min-h-15.5 shrink-0 flex-col justify-center px-6 py-3">`

**State/quality evidence:** error: `web/features/agent-v2/agent-detail/access-config/page.tsx:113`; accessibility: `web/features/agent-v2/agent-detail/access/page.tsx:53`; responsive: `web/features/agent-v2/agent-detail/access/page.tsx:43`; permission: `web/features/agent-v2/agent-detail/access/page.tsx:14`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Agent configuration workspace (1 page files)

Selected-section composition anchor: `web/features/agent-v2/agent-detail/configure/page.tsx:32`.

Scope editor state to the selected resource and compose editing plus auxiliary panels inside the detail shell.

**Boundary:** Editor sessions, AI generation, publishing, and panel semantics are product contracts rather than primitive library defaults.

- Code: `web/features/agent-v2/agent-detail/configure/page.tsx:31` — `<ScopeProvider key={agentId} atoms={agentConfigureScopedAtoms} name="AgentConfigure">`
- Code: `web/features/agent-v2/agent-detail/configure/page.tsx:32` — `<AgentConfigurePageContent agentId={agentId} />`
- Code: `web/features/agent-v2/agent-detail/configure/page.tsx:63` — `<AgentConfigureComposerScope`

**State/quality evidence:** permission: `web/features/agent-v2/agent-detail/configure/page.tsx:48`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Agent collection (1 page files)

Use a compact title and help row, a separate filter toolbar, and one bounded scroll region for the collection; adapt visible help copy to a labelled icon on narrow screens.

**Boundary:** Copy list and loading composition only when the target has equivalent collection behavior; do not copy resource branding or domain actions.

- Code: `web/app/(commonLayout)/agents/page.tsx:9` — `return <RosterPage />`
- Code: `web/features/agent-v2/roster/page.tsx:109` — `<div className="flex h-0 min-w-0 grow flex-col overflow-hidden bg-background-body max-md:overflow-y-auto">`
- Code: `web/features/agent-v2/roster/page.tsx:108` — `return (`
- Code: `web/features/agent-v2/roster/page.tsx:110` — `<div className="shrink-0 bg-background-body px-2 pt-4 pb-2 sm:px-8">`

**State/quality evidence:** empty: `web/features/agent-v2/roster/page.tsx:91`; accessibility: `web/features/agent-v2/roster/page.tsx:123`; responsive: `web/features/agent-v2/roster/page.tsx:109`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Agent logs (1 page files)

Selected-section composition anchor: `web/features/agent-v2/agent-detail/logs/page.tsx:126`.

Place explanation above wrapping query controls, retain a bounded results area, open a selected record in a responsive detail drawer, and keep pagination separate from the table.

**Boundary:** The source uses mobile-dependent backdrop and pagination behavior. Browser verification is required before adopting breakpoints or focus-return assumptions.

- Code: `web/features/agent-v2/agent-detail/logs/page.tsx:126` — `<AgentDetailSectionSurface`
- Code: `web/features/agent-v2/agent-detail/logs/page.tsx:130` — `<header className="h-auto shrink-0 px-3 pt-3 pb-2 lg:h-26.5 lg:px-6">`
- Code: `web/features/agent-v2/agent-detail/logs/page.tsx:131` — `<div className="min-w-0">`
- Code: `web/features/agent-v2/agent-detail/logs/page.tsx:132` — `<h2 className="system-xl-semibold text-text-primary">`

**State/quality evidence:** accessibility: `web/features/agent-v2/agent-detail/logs/page.tsx:141`; responsive: `web/features/agent-v2/agent-detail/logs/page.tsx:32`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Agent monitoring (1 page files)

Selected-section composition anchor: `web/features/agent-v2/agent-detail/monitoring/page.tsx:94`.

Group time/source controls above a responsive metric chart grid, preserve chart-shaped placeholders, and place retry near the failed metric section.

**Boundary:** Metric selection, chart type, tracing, and time-window defaults are product-specific; do not invent target metrics.

- Code: `web/features/agent-v2/agent-detail/monitoring/page.tsx:94` — `<AgentDetailSectionSurface label={t(($) => $['agentDetail.sections.monitoring'])}>`
- Code: `web/features/agent-v2/agent-detail/monitoring/page.tsx:95` — `<ScrollArea className="min-h-0 flex-1 overflow-hidden">`
- Code: `web/features/agent-v2/agent-detail/monitoring/page.tsx:96` — `<ScrollAreaViewport>`
- Code: `web/features/agent-v2/agent-detail/monitoring/page.tsx:97` — `<ScrollAreaContent className="pb-3">`

**State/quality evidence:** loading: `web/features/agent-v2/agent-detail/monitoring/page.tsx:90`; error: `web/features/agent-v2/agent-detail/monitoring/page.tsx:91`; accessibility: `web/features/agent-v2/agent-detail/monitoring/page.tsx:133`; responsive: `web/features/agent-v2/agent-detail/monitoring/page.tsx:99`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Application delivery and policy (3 page files)

Use a compact heading/description above environment tabs or deployment tables; keep access-policy forms bounded and split environment selection from scrollable content.

**Boundary:** Deployment and access actions require existing product permissions and contracts. This research does not authorize deployment or copying product pages.

- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-config/page.tsx:16` — `<Suspense`
- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-config/page.tsx:18` — `<SkeletonContainer className="gap-4 p-6" aria-busy="true">`
- Code: `web/app/components/app/access-config/index.tsx:42` — `const [pageSize, setPageSize] = useState<number>(RESOURCE_ACCESS_SETTINGS_PAGE_SIZE)`
- Code: `web/app/components/app/access-config/index.tsx:66` — `] = useState<boolean | null>(null)`
- Code: `web/app/components/app/access-config/index.tsx:67` — `const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null)`
- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-point/page.tsx:13` — `<Suspense fallback={<LoadingPlaceholder className="h-full" />}>`

**State/quality evidence:** loading: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-config/page.tsx:18`; accessibility: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-config/page.tsx:18`; responsive: `web/app/components/app/access-config/index.tsx:205`; permission: `web/app/components/app/access-config/index.tsx:267`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Application and snippet editors (3 page files)

Let an editor own its full available canvas and horizontal overflow; isolate resource-keyed state and supply domain contexts before rendering the workspace.

**Boundary:** Canvas topology, workflow behavior, and code generation are outside UI reuse. Keep central translator/dispatcher contracts intact.

- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/configuration/page.tsx:5` — `return <Configuration key={appId} />`
- Code: `web/app/components/app/configuration/index.tsx:12` — `<AppToaster manager={appConfigurationToastManager} offset={{ top: 60 }} />`
- Code: `web/app/components/app/configuration/index.tsx:10` — `return (`
- Code: `web/app/components/app/configuration/index.tsx:13` — `<ConfigurationView {...viewModel} />`
- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/workflow/page.tsx:5` — `<div className="size-full overflow-x-auto">`
- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/workflow/page.tsx:6` — `<WorkflowApp />`

**State/quality evidence:** loading: `web/app/components/workflow-app/index.tsx:126`; permission: `web/app/components/workflow-app/index.tsx:95`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Application overview, logs and annotations (3 page files)

Keep route wrappers thin; pass the resource identifier and explicit display mode into shared observability surfaces, and match suspense placeholders to the eventual form or table shape.

**Boundary:** A shared implementation does not make logs and annotations interchangeable. Placeholder existence is not proof every fetch failure has recovery.

- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/annotations/page.tsx:9` — `<Suspense`
- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/annotations/page.tsx:11` — `<SkeletonContainer className="gap-4 p-6" aria-busy="true">`
- Code: `web/app/components/app/log-annotation/index.tsx:17` — `const LogAnnotation: FC<Props> = ({ appId, pageType }) => {`
- Code: `web/app/components/app/log-annotation/index.tsx:24` — `return (`
- Code: `web/app/components/app/log-annotation/index.tsx:25` — `<div className="flex h-full flex-col px-6 pt-3">`
- Code: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/logs/page.tsx:6` — `return <Main appId={appId} pageType={PageType.log} />`

**State/quality evidence:** loading: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/annotations/page.tsx:11`; accessibility: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/annotations/page.tsx:11`; permission: `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/overview/view.tsx:38`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Authentication and recovery (19 page files)

Use a narrow, responsive form column with heading/explanation, labelled fields, field-local errors, pending submit feedback, and a clear secondary return action. Verification-code inputs declare numeric mode and one-time-code completion.

**Boundary:** Source auth policy, anti-bot, SSO, password rules, and token query handling must not be copied into target contracts. Source errors sometimes only reach console logging; do not normalize that gap.

- Code: `web/app/(shareLayout)/webapp-reset-password/check-code/page.tsx:64` — `<div className="flex flex-col gap-3">`
- Code: `web/app/(shareLayout)/webapp-reset-password/check-code/page.tsx:65` — `<div className="inline-flex size-14 items-center justify-center rounded-2xl border border-components-panel-border-subtle bg-background-default-dodge text-text-accent-light-mode-only shadow-lg">`
- Code: `web/app/components/signin/countdown.tsx:19` — `return (`
- Code: `web/app/components/signin/countdown.tsx:20` — `<Suspense fallback={<CountdownFallback />}>`
- Code: `web/app/components/signin/countdown.tsx:21` — `<CountdownContent`
- Code: `web/app/(shareLayout)/webapp-reset-password/page.tsx:56` — `<div className="flex flex-col gap-3">`

**State/quality evidence:** loading: `web/app/(shareLayout)/webapp-signin/page.tsx:57`; error: `web/app/(shareLayout)/webapp-reset-password/set-password/page.tsx:36`; accessibility: `web/app/(shareLayout)/webapp-reset-password/check-code/page.tsx:88`; responsive: `web/app/(shareLayout)/webapp-reset-password/set-password/page.tsx:89`; permission: `web/app/install/installForm.tsx:121`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Device authorization (1 page files)

Render explicit authorization stages and distinct success, invalid-code, rate-limit, lookup-failure, and SSO-error surfaces; give each a next action near its message.

**Boundary:** Device flow endpoints, retry rules, URL scrubbing, and account switching are security behavior and require a target contract.

- Code: `web/app/device/page.tsx:44` — `const [view, setView] = useState<View>({ kind: 'code_entry' })`
- Code: `web/app/device/page.tsx:45` — `const [errMsg, setErrMsg] = useState<string | null>(null)`
- Code: `web/app/device/components/authorize-account.tsx:29` — `const AuthorizeAccount: FC<Props> = ({`
- Code: `web/app/device/components/authorize-account.tsx:66` — `return (`
- Code: `web/app/device/components/authorize-account.tsx:67` — `<div className="flex flex-col gap-5">`

**State/quality evidence:** accessibility: `web/app/device/page.tsx:305`; permission: `web/app/device/components/authorize-account.tsx:97`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Eligibility verification (2 page files)

Separate verification/loading/retry/rejection/success states, then route a valid application token into a dedicated form under a simple task shell.

**Boundary:** Eligibility, billing, and policy copy are source-specific. Reuse state hierarchy only.

- Code: `web/app/(education)/education/apply/page.tsx:13` — `return <EducationApplyRoute token={token} />`
- Code: `web/app/education/apply/application-entry.tsx:23` — `return <EducationApplyPage token={token} plan={featuresQuery.data.plan} />`
- Code: `web/app/education/apply/application-entry.tsx:19` — `if (featuresQuery.isPending) return null`
- Code: `web/app/education/apply/application-entry.tsx:21` — `if (!featuresQuery.data?.enabled) return redirect('/')`
- Code: `web/app/(education)/education/verify/page.tsx:4` — `return <EducationVerifyPage />`
- Code: `web/app/education/verify/verify-flow.tsx:43` — `return <EducationVerifyFlow />`

**State/quality evidence:** loading: `web/app/education/verify/verify-flow.tsx:190`; error: `web/app/education/verify/verify-flow.tsx:110`; accessibility: `web/app/education/verify/verify-flow.tsx:126`; permission: `web/app/education/verify/verify-flow.tsx:93`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Workspace home (1 page files)

Compose home from a stable shell, independently hydrated content, and a shell-matched skeleton; use task or recommendation sections rather than inventing a dashboard of unrelated metrics.

**Boundary:** Recommendations and promotional banners are product-specific. Preserve app-owned shell, accents, and liquid-glass surfaces.

- Code: `web/app/(commonLayout)/page.tsx:9` — `return <HomePage />`
- Code: `web/features/home/page.tsx:44` — `<HydrationBoundary state={dehydratedState}>`
- Code: `web/features/home/page.tsx:43` — `return (`
- Code: `web/features/home/page.tsx:45` — `<Suspense`

**State/quality evidence:** loading: `web/features/home/page.tsx:49`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Human input form (1 page files)

Treat a public action form as a state machine: loading, unavailable or expired, already completed, and the loaded actionable form must be separate surfaces.

**Boundary:** Token validity and submission behavior are application security and workflow contracts; styling reuse cannot define them.

- Code: `web/app/(humanInputLayout)/form/[token]/page.tsx:7` — `<div className="h-dvh min-w-75 bg-chatbot-bg pb-[env(safe-area-inset-bottom)]">`
- Code: `web/app/(humanInputLayout)/form/[token]/page.tsx:8` — `<FormContent />`
- Code: `web/app/(humanInputLayout)/form/[token]/form.tsx:20` — `custom_config?: Record<string, CustomConfigValueType> | null`
- Code: `web/app/(humanInputLayout)/form/[token]/form.tsx:24` — `resolved_default_values: Record<string, HumanInputResolvedValue>`
- Code: `web/app/(humanInputLayout)/form/[token]/form.tsx:61` — `return <LoadingPlaceholder className="h-full" />`

**State/quality evidence:** loading: `web/app/(humanInputLayout)/form/[token]/form.tsx:61`; responsive: `web/app/(humanInputLayout)/form/[token]/page.tsx:7`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Installed application runtime (1 page files)

Keep runtime-specific errors, access denial, and initial loading distinct inside a framed application surface.

**Boundary:** Runtime framing and access handling depend on target context; do not copy the source shell, logo, accent, or deployment contracts.

- Code: `web/app/(commonLayout)/installed/[appId]/page.tsx:13` — `return <Main id={appId} />`
- Code: `web/app/components/explore/installed-app/index.tsx:25` — `<div className="h-full bg-background-body pt-2 pl-2">{children}</div>`
- Code: `web/app/components/explore/installed-app/index.tsx:32` — `<div className={h-full overflow-hidden rounded-2xl shadow-md ${installedAppSurfaceClassName}}>`
- Code: `web/app/components/explore/installed-app/index.tsx:44` — `return 'chat'`

**State/quality evidence:** loading: `web/app/components/explore/installed-app/index.tsx:229`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Integration management (1 page files)

Use a contextual sidebar and section renderer on wide screens, replacing sidebar access with a titled drawer on narrow screens; wrap long labels and preserve focused disclosure affordances.

**Boundary:** The Tapstate global navigation remains app-owned. This contextual sidebar is evidence for task-local navigation, not permission to replace the shell.

- Code: `web/app/(commonLayout)/integrations/[[...slug]]/page.tsx:10` — `searchParams?: Promise<IntegrationRouteSearchParams>`
- Code: `web/app/(commonLayout)/integrations/[[...slug]]/page.tsx:21` — `return <IntegrationsPage section={target.section} syncDocumentTitle />`

**State/quality evidence:** accessibility: `web/app/components/integrations/index.tsx:111`; responsive: `web/app/components/integrations/index.tsx:100`; permission: `web/app/components/integrations/index.tsx:44`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Knowledge creation and connectors (6 page files)

Give multistep ingestion a full-height panel with a stable header and bounded body; keep authentication/source loading distinct from editable steps.

**Boundary:** Ingestion steps, connectors, and templates are domain workflows. Do not impose them on Tapstate tasks without a corresponding product brief.

- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/create/page.tsx:13` — `return <DatasetUpdateForm datasetId={datasetId} />`
- Code: `web/app/components/datasets/create/index.tsx:74` — `const [dataSourceType, setDataSourceType] = useState<DataSourceType>(DataSourceType.FILE)`
- Code: `web/app/components/datasets/create/index.tsx:77` — `const [retrievalMethodCache, setRetrievalMethodCache] = useState<RETRIEVE_METHOD | ''>('')`
- Code: `web/app/components/datasets/create/index.tsx:78` — `const [fileList, setFiles] = useState<FileItem[]>([])`
- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/create-from-pipeline/page.tsx:5` — `return <CreateFromPipeline />`
- Code: `web/app/components/datasets/documents/create-from-pipeline/index.tsx:69` — `const [datasource, setDatasource] = useState<Datasource>()`

**State/quality evidence:** loading: `web/app/components/datasets/create/index.tsx:146`; error: `web/features/new-rag/create/page.tsx:140`; accessibility: `web/features/new-rag/create/page.tsx:404`; responsive: `web/app/components/datasets/documents/create-from-pipeline/index.tsx:257`; permission: `web/app/components/datasets/create/index.tsx:64`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Legacy document management (2 page files)

Keep document list header and controls outside its growing content region; separate loading, nonempty results, and actionable first-use empty state. In detail views use a resource header plus content and metadata panes.

**Boundary:** Responsive detail drawers and document parsing state are implementation-specific. A placeholder API route is not normative UI evidence.

- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/[documentId]/page.tsx:13` — `return <MainDetail datasetId={datasetId} documentId={documentId} />`
- Code: `web/app/components/datasets/documents/detail/index.tsx:54` — `const DocumentDetail: FC<DocumentDetailProps> = ({ datasetId, documentId }) => {`
- Code: `web/app/components/datasets/documents/detail/index.tsx:82` — `const [importStatus, setImportStatus] = useState<SegmentImportStatus>()`
- Code: `web/app/components/datasets/documents/detail/index.tsx:150` — `return 2500`
- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/page.tsx:13` — `return <Main datasetId={datasetId} />`
- Code: `web/app/components/datasets/documents/index.tsx:31` — `const Documents: FC<IDocumentsProps> = ({ datasetId }) => {`

**State/quality evidence:** loading: `web/app/components/datasets/documents/detail/index.tsx:392`; empty: `web/app/components/datasets/documents/index.tsx:187`; error: `web/app/components/datasets/documents/detail/index.tsx:347`; accessibility: `web/app/components/datasets/documents/detail/index.tsx:310`; responsive: `web/app/components/datasets/documents/detail/index.tsx:29`; permission: `web/app/components/datasets/documents/detail/index.tsx:78`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Knowledge collection (1 page files)

Distinguish first-use empty state from filtered-empty results, announce state transitions, and gate creation/external configuration with workspace permissions.

**Boundary:** Legacy and new knowledge views coexist behind availability state; neither is a universal component standard.

- Code: `web/app/(commonLayout)/datasets/page.tsx:4` — `return <List />`
- Code: `web/app/components/datasets/list/index.tsx:60` — `const [tagFilterValue, setTagFilterValue] = useState<string[]>([])`
- Code: `web/app/components/datasets/list/index.tsx:120` — `if (activeStepByStepTourTaskId !== 'knowledge') return`
- Code: `web/app/components/datasets/list/index.tsx:121` — `if (!hasResolvedFirstPage || !activeKnowledgeGuideGroup) return`

**State/quality evidence:** empty: `web/app/components/datasets/list/index.tsx:33`; accessibility: `web/app/components/datasets/list/index.tsx:165`; permission: `web/app/components/datasets/list/index.tsx:31`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Knowledge pipeline canvas (1 page files)

Give the pipeline the full task workspace and explicitly allow horizontal canvas overflow.

**Boundary:** This only establishes container behavior; pipeline nodes, processors, persistence, and validation remain product-owned.

- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/pipeline/page.tsx:6` — `<div className="size-full overflow-x-auto">`
- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/pipeline/page.tsx:7` — `<RagPipeline />`
- Code: `web/app/components/rag-pipeline/index.tsx:17` — `if (data) return initialNodes(data.graph.nodes, data.graph.edges)`
- Code: `web/app/components/rag-pipeline/index.tsx:19` — `return []`
- Code: `web/app/components/rag-pipeline/index.tsx:22` — `if (data) return initialEdges(data.graph.edges, data.graph.nodes)`

**State/quality evidence:** loading: `web/app/components/rag-pipeline/index.tsx:30`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Retrieval testing (2 page files)

Compose query/history and result regions as a task pair, announce query state, and move secondary detail into a drawer where space is constrained.

**Boundary:** Search/ranking semantics and result metadata are domain-specific. Legacy and new versions use different layouts.

- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/hitTesting/page.tsx:13` — `return <Main datasetId={datasetId} />`
- Code: `web/app/components/datasets/hit-testing/index.tsx:55` — `const HitTestingPage: FC<Props> = ({ datasetId }: Props) => {`
- Code: `web/app/components/datasets/hit-testing/index.tsx:61` — `const [hitResult, setHitResult] = useState<HitTestingResponse | undefined>()`
- Code: `web/app/components/datasets/hit-testing/index.tsx:65` — `const [queries, setQueries] = useState<DatasetQueryContentResponse[]>([])`
- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/retrieval/page.tsx:6` — `return <RetrievalTestPage knowledgeSpaceId={knowledgeSpaceId} />`
- Code: `web/features/new-rag/retrieval/page.tsx:22` — `<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-components-panel-bg px-6 pt-3 pb-5">`

**State/quality evidence:** loading: `web/app/components/datasets/hit-testing/index.tsx:192`; empty: `web/app/components/datasets/hit-testing/index.tsx:172`; error: `web/app/components/datasets/hit-testing/index.tsx:138`; accessibility: `web/app/components/datasets/hit-testing/index.tsx:196`; responsive: `web/app/components/datasets/hit-testing/index.tsx:38`; permission: `web/app/components/datasets/hit-testing/index.tsx:75`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Knowledge settings (4 page files)

Use a heading plus concise description, constrained form width, role-based text colors, and visible load-error recovery; preserve label and section geometry in loading skeletons.

**Boundary:** Danger zones must follow actual authorization and confirmation requirements; no source styling implies the same destructive action belongs in the target.

- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/access-config/page.tsx:12` — `return <DatasetAccessConfigPage datasetId={datasetId} />`
- Code: `web/app/components/datasets/access-config/index.tsx:37` — `const [pageSize, setPageSize] = useState<number>(RESOURCE_ACCESS_SETTINGS_PAGE_SIZE)`
- Code: `web/app/components/datasets/access-config/index.tsx:81` — `] = useState<boolean | null>(null)`
- Code: `web/app/components/datasets/access-config/index.tsx:82` — `const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null)`
- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/[documentId]/settings/page.tsx:13` — `return <Settings datasetId={datasetId} documentId={documentId} />`
- Code: `web/app/components/datasets/documents/detail/settings/index.tsx:17` — `return <DocumentSettings datasetId={datasetId} documentId={documentId} />`

**State/quality evidence:** loading: `web/app/components/datasets/access-config/index.tsx:222`; error: `web/features/new-rag/settings/page.tsx:93`; accessibility: `web/features/new-rag/settings/page.tsx:26`; responsive: `web/app/components/datasets/access-config/index.tsx:234`; permission: `web/app/components/datasets/access-config/index.tsx:48`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Marketplace, templates and creators (3 page files)

Host browse content inside a dedicated scrollable surface with permission-provider ownership; keep filter/selection state in canonical URLs and validate public query parameters.

**Boundary:** Third-party discovery, install permissions, creator profiles, and branding are domain-specific. Reuse container and state separation only.

- Code: `web/app/(commonLayout)/marketplace/creator/[uniqueHandle]/page.tsx:15` — `searchParams: Promise<CreatorPageSearchParams>`
- Code: `web/app/(commonLayout)/marketplace/creator/[uniqueHandle]/page.tsx:21` — `<div`
- Code: `web/app/components/plugins/marketplace/creator-profile/reference-application-profile.tsx:38` — `const [selected, setSelected] = useState<SelectedCreation | null>(null)`
- Code: `web/app/components/plugins/marketplace/creator-profile/reference-application-profile.tsx:72` — `return`
- Code: `web/app/components/plugins/marketplace/creator-profile/reference-application-profile.tsx:81` — `if (navigation.openPlugin(selection.plugin)) return { preserveQuery: true }`
- Code: `web/app/(commonLayout)/marketplace/page.tsx:8` — `<div`

**State/quality evidence:** empty: `web/app/components/plugins/marketplace/templates/index.tsx:44`; error: `web/app/components/plugins/marketplace/templates/index.tsx:193`; permission: `web/app/components/plugins/marketplace/marketplace-install-permission-provider.tsx:7`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### New document management (2 page files)

Keep task, permission, and model runtime recovery as explicit controllers around a results surface; mount processing-task and metadata drawers beside that surface.

**Boundary:** Controller ownership and permission recovery are application architecture, not styling primitives. No browser recovery behavior was exercised.

- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/documents/[documentId]/page.tsx:10` — `return <DocumentDetailPage documentId={documentId} knowledgeSpaceId={knowledgeSpaceId} />`
- Code: `web/features/new-rag/documents/detail/page.tsx:30` — `<div className="flex min-h-80 min-w-0 flex-1 items-center justify-center">`
- Code: `web/features/new-rag/documents/detail/page.tsx:29` — `return (`
- Code: `web/features/new-rag/documents/detail/page.tsx:31` — `<LoadingPlaceholder />`
- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/documents/page.tsx:6` — `return <DocumentsPage knowledgeSpaceId={knowledgeSpaceId} />`
- Code: `web/features/new-rag/documents/page.tsx:13` — `<DocumentsStateBoundary knowledgeSpaceId={knowledgeSpaceId}>`

**State/quality evidence:** loading: `web/features/new-rag/documents/detail/page.tsx:31`; error: `web/features/new-rag/documents/detail/page.tsx:38`; accessibility: `web/features/new-rag/documents/detail/page.tsx:32`; responsive: `web/features/new-rag/documents/detail/page.tsx:30`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### New knowledge overview (1 page files)

Order a knowledge workspace from status/readiness and onboarding to metrics, attention/outcomes, activity, and inventory, while exposing recovery without replacing all settled content.

**Boundary:** Use only sections supported by target data. Source-specific readiness and task-sync orchestration are not generic library features.

- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/page.tsx:6` — `return <KnowledgeOverviewPage knowledgeSpaceId={knowledgeSpaceId} />`
- Code: `web/features/new-rag/overview/page.tsx:30` — `<OverviewStateBoundary knowledgeSpaceId={knowledgeSpaceId}>`
- Code: `web/features/new-rag/overview/page.tsx:29` — `return (`
- Code: `web/features/new-rag/overview/page.tsx:31` — `<KnowledgeOverviewContent />`

**State/quality evidence:** error: `web/features/new-rag/overview/page.tsx:133`; accessibility: `web/features/new-rag/overview/page.tsx:81`; responsive: `web/features/new-rag/overview/page.tsx:41`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Knowledge quality (1 page files)

Use a titled tab workspace with tab-local action slots, mount the active analysis panel, and preserve a separate report state when drilling into results.

**Boundary:** Evaluation concepts and report routing are source-domain behavior. Tabs must use target-supported state and accessible semantics.

- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/quality/page.tsx:4` — `return <QualityPage />`
- Code: `web/features/new-rag/quality/page.tsx:26` — `const [actionSlot, setActionSlot] = useState<HTMLDivElement | null>(null)`
- Code: `web/features/new-rag/quality/page.tsx:35` — `return (`
- Code: `web/features/new-rag/quality/page.tsx:36` — `<div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto px-6 pt-3 pb-20">`

**State/quality evidence:** responsive: `web/features/new-rag/quality/page.tsx:36`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### New source management (2 page files)

Use title/help, readiness guidance, explicit loading/error/empty branches, then search/filter/sort and selectable rows; present retry in the failed region.

**Boundary:** Only expose import/create actions allowed by the real permission model. Do not turn loading into an empty state.

- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/sources/new/page.tsx:19` — `<AddSourcePage`
- Code: `web/features/new-rag/sources/create/page.tsx:175` — `setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>`
- Code: `web/features/new-rag/sources/create/page.tsx:70` — `return name`
- Code: `web/features/new-rag/sources/create/page.tsx:77` — `if (type === 'boolean') return value === 'true'`
- Code: `web/features/new-rag/sources/create/page.tsx:78` — `if (type === 'integer') return Number.parseInt(value, 10)`
- Code: `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/sources/page.tsx:6` — `return <SourcesPage knowledgeSpaceId={knowledgeSpaceId} />`

**State/quality evidence:** loading: `web/features/new-rag/sources/create/page.tsx:513`; empty: `web/features/new-rag/sources/create/page.tsx:1076`; error: `web/features/new-rag/sources/create/page.tsx:390`; accessibility: `web/features/new-rag/sources/create/page.tsx:199`; responsive: `web/features/new-rag/sources/create/page.tsx:743`; permission: `web/features/new-rag/sources/create/page.tsx:31`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### OAuth consent (1 page files)

Show the requesting application, active account with switch action, requested scopes, and a visually clear authorize/return decision; retain initial loading and error surfaces.

**Boundary:** Consent is a security decision: scope semantics, redirects, and silent authorization remain application-owned. Source-branded accent is not reusable.

- Code: `web/app/account/oauth/authorize/page.tsx:144` — `<div className="flex flex-col gap-4 bg-background-default-subtle text-text-secondary">`
- Code: `web/app/account/oauth/authorize/page.tsx:145` — `<div className="body-md-regular">`
- Code: `web/app/components/base/loading-placeholder/index.tsx:15` — `return (`
- Code: `web/app/components/base/loading-placeholder/index.tsx:16` — `<div className={cn('flex w-full items-center justify-center', className)}>`
- Code: `web/app/components/base/loading-placeholder/index.tsx:17` — `<Spinner aria-label={label ?? t(($) => $.loading, { ns: 'common' })} />`

**State/quality evidence:** loading: `web/app/account/oauth/authorize/page.tsx:167`; error: `web/app/account/oauth/authorize/page.tsx:154`; accessibility: `web/app/account/oauth/authorize/page.tsx:202`; permission: `web/app/account/oauth/authorize/page.tsx:24`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Parallel detail-sidebar slots (28 page files)

Keep detail navigation in a named shell slot and render the same resource-aware sidebar across child routes; creation routes may deliberately clear that slot.

**Boundary:** This describes navigation ownership only. Preserve the Tapstate app shell, navigation, and logo. A null slot is intentional absence, not an empty-state design.

- Code: `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/access/page.tsx:4` — `return <AgentDetailSidebarSlot />`
- Code: `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/sidebar-page.tsx:4` — `return <AgentDetailSidebar />`
- Code: `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/configure/page.tsx:4` — `return <AgentDetailSidebarSlot />`
- Code: `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/logs/page.tsx:4` — `return <AgentDetailSidebarSlot />`
- Code: `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/monitoring/page.tsx:4` — `return <AgentDetailSidebarSlot />`
- Code: `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/page.tsx:4` — `return <AgentDetailSidebarSlot />`

**State/quality evidence:** No page-local evidence established. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Unfinished route (1 page files)

Treat a literal placeholder as an inventory exception, never as a reusable composition or quality standard.

**Boundary:** The implementation is a single text div; no finished interaction, state, accessibility, or responsive standard can be inferred.

- Code: `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/api/page.tsx:4` — `return <div>dataset detail api</div>`

**State/quality evidence:** No page-local evidence established. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Canonicalization and transition routes (5 page files)

Canonicalize obsolete or incomplete routes before rendering; validate route/query state and preserve meaningful selection in the canonical destination.

**Boundary:** These routes are behavior evidence, not page layouts. Do not invent a UI for a deliberate redirect.

- Code: `web/app/(commonLayout)/agents/[agentId]/page.tsx:1` — `import { redirect } from '@/next/navigation'`
- Code: `web/app/(commonLayout)/agents/[agentId]/page.tsx:10` — `redirect(/agents/${agentId}/configure)`
- Code: `web/app/(commonLayout)/explore/installed/[appId]/page.tsx:2` — `import { redirect } from '@/next/navigation'`
- Code: `web/app/(commonLayout)/explore/installed/[appId]/page.tsx:13` — `redirect(buildInstalledAppPath(appId))`
- Code: `web/app/(commonLayout)/plugins/page.tsx:14` — `searchParams?: Promise<LegacyPluginsSearchParams>`
- Code: `web/app/(commonLayout)/snippets/[snippetId]/page.tsx:1` — `import { redirect } from '@/next/navigation'`

**State/quality evidence:** No page-local evidence established. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Shared and embedded runtimes (7 page files)

Authenticate and fetch access/configuration before rendering chat or text-generation content; preserve dynamic viewport height, safe-area space, and explicit unavailable states.

**Boundary:** Embedded and standalone runtimes differ. The source access boundary includes source-specific messages and redirects; adapt, never transplant them.

- Code: `web/app/(shareLayout)/agent/[token]/page.tsx:10` — `<AuthenticatedLayout>`
- Code: `web/app/(shareLayout)/agent/[token]/page.tsx:11` — `<ChatWithHistoryWrap isNewAgent renderAgentContent={AgentRosterResponseContent} />`
- Code: `web/app/components/base/chat/chat-with-history/index.tsx:21` — `const ChatWithHistory: FC<ChatWithHistoryProps> = ({ className }) => {`
- Code: `web/app/components/base/chat/chat-with-history/index.tsx:28` — `const sidebarToggleRef = useRef<HTMLButtonElement>(null)`
- Code: `web/app/components/base/chat/chat-with-history/index.tsx:31` — `const sidePanelBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`
- Code: `web/app/(shareLayout)/chat/[token]/page.tsx:8` — `<AuthenticatedLayout>`

**State/quality evidence:** loading: `web/app/components/base/chat/chat-with-history/index.tsx:113`; accessibility: `web/app/(shareLayout)/components/authenticated-layout.tsx:101`; responsive: `web/app/components/base/chat/chat-with-history/index.tsx:8`; permission: `web/app/(shareLayout)/agent/[token]/page.tsx:6`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Skill collection and detail (2 page files)

Build management collections with a separate toolbar, card-shaped skeletons, explicit initial/refresh/pagination errors, accessible card actions, and guarded destructive dialogs.

**Boundary:** Archive upload, tag management, resource naming confirmation, and reference dependency checks are product behavior. The reference has two UI generations; do not copy its branding.

- Code: `web/app/(commonLayout)/skills/[skillId]/page.tsx:4` — `return <SkillDetailPage />`
- Code: `web/features/skills/detail-page.tsx:9` — `return <SkillDetailPage key={skillId} skillId={skillId} />`
- Code: `web/app/(commonLayout)/skills/page.tsx:9` — `return <SkillsPage />`
- Code: `web/features/skills/page.tsx:94` — `<div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] border-divider-regular bg-background-default">`
- Code: `web/features/skills/page.tsx:81` — `return consoleQuery.workspaces.current.skills.get.key({ type })`
- Code: `web/features/skills/page.tsx:93` — `return (`

**State/quality evidence:** loading: `web/features/skills/page.tsx:109`; empty: `web/features/skills/page.tsx:734`; error: `web/features/skills/page.tsx:199`; accessibility: `web/features/skills/page.tsx:95`; responsive: `web/features/skills/page.tsx:110`; permission: `web/features/skills/page.tsx:68`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Snippet collection (1 page files)

Use breadcrumbs for nested studio collections, a wrapping filter/search/action toolbar, state announcements, initial retry, and incremental card skeletons.

**Boundary:** A nested collection may need breadcrumbs; a top-level destination may not. Search/result semantics remain target-owned.

- Code: `web/app/(commonLayout)/snippets/page.tsx:4` — `return <SnippetList />`
- Code: `web/app/components/snippet-list/index.tsx:65` — `<div`
- Code: `web/app/components/snippet-list/index.tsx:52` — `if (publishStatus === 'published') return true`
- Code: `web/app/components/snippet-list/index.tsx:53` — `if (publishStatus === 'draft') return false`
- Code: `web/app/components/snippet-list/index.tsx:54` — `return undefined`

**State/quality evidence:** loading: `web/app/components/snippet-list/index.tsx:134`; empty: `web/app/components/snippet-list/index.tsx:269`; error: `web/app/components/snippet-list/index.tsx:166`; accessibility: `web/app/components/snippet-list/index.tsx:195`; responsive: `web/app/components/snippet-list/index.tsx:207`; permission: `web/app/components/snippet-list/index.tsx:31`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Unavailable document (1 page files)

Make denial/unavailability independently renderable with localized document metadata, a readable explanation, useful identifiers, and optional locale/theme controls.

**Boundary:** Do not copy branding or exposable diagnostic details blindly. Backend error semantics and disclosure policy remain target-owned.

- Code: `web/app/webapp-unavailable/page.tsx:21` — `export async function generateMetadata(): Promise<Metadata> {`
- Code: `web/app/webapp-unavailable/page.tsx:52` — `<AppNotAccessible`
- Code: `web/features/app-access-error/page.tsx:38` — `const returnTo = ${pathname}${query ? ?${query} : ''}`
- Code: `web/features/app-access-error/page.tsx:39` — `const signInHref = ${basePath}/signin?${new URLSearchParams({ redirect_url: returnTo })}`
- Code: `web/features/app-access-error/page.tsx:48` — `return () => {`

**State/quality evidence:** loading: `web/features/app-access-error/page.tsx:155`; accessibility: `web/features/app-access-error/page.tsx:73`; responsive: `web/features/app-access-error/page.tsx:62`. Only route/selected-primary constructs are cited; unresolved descendant snippets are possible dependencies, not page evidence.

**Inference:** Apply the composition rule to equivalent target tasks; retain target domain behavior. **Browser status:** unverified.

### Application collection (1 page file)

Compose the application collection from its list and explicit creation/import dialogs. Creation and modification controls are governed by workspace permissions. The creation dialog directs initial focus to the resource-name field instead of leaving focus placement implicit.

**Code:** `web/app/components/apps/index.tsx:196` provides the collection container; `:230` uses `<DialogContent initialFocus={createNameRef}>`; `:16` imports workspace permission state and `:22` imports the permission helper. The route at `web/app/(commonLayout)/apps/page.tsx:9` delegates to this implementation.

**Boundary:** Template import, onboarding, metadata creation, and tracking remain source-domain contracts. The reusable rule concerns list/dialog composition and focus ownership; it does not authorize adding source application features. **Browser status:** unverified.

## Complete page inventory

Each row names its actual page file, task family, immediate rendered implementation, and a concrete code location. Parallel slots appear as separate files even when their URL is shared with a main page. Their presence must not inflate the number of distinct user destinations. The JSON contains the full descendant evidence and state categories.

| Page source under `web/app/`                                                                         | Family                  | Primary implementation (web-relative)                                                                                                                                                                                       | Evidence                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `(commonLayout)/@detailSidebar/agents/[agentId]/access/page.tsx`                                     | parallel-slot           | `app/(commonLayout)/@detailSidebar/agents/[agentId]/sidebar-page.tsx`                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/access/page.tsx:4`                                      |
| `(commonLayout)/@detailSidebar/agents/[agentId]/configure/page.tsx`                                  | parallel-slot           | `app/(commonLayout)/@detailSidebar/agents/[agentId]/sidebar-page.tsx`                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/configure/page.tsx:4`                                   |
| `(commonLayout)/@detailSidebar/agents/[agentId]/logs/page.tsx`                                       | parallel-slot           | `app/(commonLayout)/@detailSidebar/agents/[agentId]/sidebar-page.tsx`                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/logs/page.tsx:4`                                        |
| `(commonLayout)/@detailSidebar/agents/[agentId]/monitoring/page.tsx`                                 | parallel-slot           | `app/(commonLayout)/@detailSidebar/agents/[agentId]/sidebar-page.tsx`                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/monitoring/page.tsx:4`                                  |
| `(commonLayout)/@detailSidebar/agents/[agentId]/page.tsx`                                            | parallel-slot           | `app/(commonLayout)/@detailSidebar/agents/[agentId]/sidebar-page.tsx`                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/agents/[agentId]/page.tsx:4`                                             |
| `(commonLayout)/@detailSidebar/app/[appId]/access-config/page.tsx`                                   | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/access-config/page.tsx:4`                                    |
| `(commonLayout)/@detailSidebar/app/[appId]/access-point/page.tsx`                                    | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/access-point/page.tsx:4`                                     |
| `(commonLayout)/@detailSidebar/app/[appId]/annotations/page.tsx`                                     | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/annotations/page.tsx:4`                                      |
| `(commonLayout)/@detailSidebar/app/[appId]/configuration/page.tsx`                                   | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/configuration/page.tsx:4`                                    |
| `(commonLayout)/@detailSidebar/app/[appId]/deploy/page.tsx`                                          | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/deploy/page.tsx:4`                                           |
| `(commonLayout)/@detailSidebar/app/[appId]/logs/page.tsx`                                            | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/logs/page.tsx:4`                                             |
| `(commonLayout)/@detailSidebar/app/[appId]/overview/page.tsx`                                        | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/overview/page.tsx:4`                                         |
| `(commonLayout)/@detailSidebar/app/[appId]/workflow/page.tsx`                                        | parallel-slot           | `app/(commonLayout)/@detailSidebar/app/[appId]/sidebar-page.tsx`                                                                                                                                                            | `web/app/(commonLayout)/@detailSidebar/app/[appId]/workflow/page.tsx:4`                                         |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/access-config/page.tsx`                          | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/access-config/page.tsx:4`                           |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/api/page.tsx`                                    | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/api/page.tsx:4`                                     |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/[documentId]/page.tsx`                 | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/[documentId]/page.tsx:4`                  |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/[documentId]/settings/page.tsx`        | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/[documentId]/settings/page.tsx:4`         |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/create/page.tsx`                       | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/create/page.tsx:4`                        |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/create-from-pipeline/page.tsx`         | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/create-from-pipeline/page.tsx:4`          |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/page.tsx`                              | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/documents/page.tsx:4`                               |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/hitTesting/page.tsx`                             | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/hitTesting/page.tsx:4`                              |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/pipeline/page.tsx`                               | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/pipeline/page.tsx:4`                                |
| `(commonLayout)/@detailSidebar/datasets/[datasetId]/settings/page.tsx`                               | parallel-slot           | `app/(commonLayout)/@detailSidebar/datasets/[datasetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/datasets/[datasetId]/settings/page.tsx:4`                                |
| `(commonLayout)/@detailSidebar/datasets/connect/page.tsx`                                            | parallel-slot           | intentional null slot                                                                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/datasets/connect/page.tsx:2`                                             |
| `(commonLayout)/@detailSidebar/datasets/create/page.tsx`                                             | parallel-slot           | intentional null slot                                                                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/datasets/create/page.tsx:2`                                              |
| `(commonLayout)/@detailSidebar/datasets/create-from-pipeline/page.tsx`                               | parallel-slot           | intentional null slot                                                                                                                                                                                                       | `web/app/(commonLayout)/@detailSidebar/datasets/create-from-pipeline/page.tsx:2`                                |
| `(commonLayout)/@detailSidebar/snippets/[snippetId]/orchestrate/page.tsx`                            | parallel-slot           | `app/(commonLayout)/@detailSidebar/snippets/[snippetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/snippets/[snippetId]/orchestrate/page.tsx:4`                             |
| `(commonLayout)/@detailSidebar/snippets/[snippetId]/page.tsx`                                        | parallel-slot           | `app/(commonLayout)/@detailSidebar/snippets/[snippetId]/sidebar-page.tsx`                                                                                                                                                   | `web/app/(commonLayout)/@detailSidebar/snippets/[snippetId]/page.tsx:4`                                         |
| `(commonLayout)/agents/[agentId]/access/page.tsx`                                                    | agent-access            | `features/agent-v2/agent-detail/page.tsx`, `features/agent-v2/agent-detail/access/page.tsx`                                                                                                                                 | `web/app/(commonLayout)/agents/[agentId]/access/page.tsx:10`                                                    |
| `(commonLayout)/agents/[agentId]/access-config/page.tsx`                                             | agent-access            | `features/agent-v2/agent-detail/page.tsx`, `features/agent-v2/agent-detail/access-config/page.tsx`                                                                                                                          | `web/app/(commonLayout)/agents/[agentId]/access-config/page.tsx:5`                                              |
| `(commonLayout)/agents/[agentId]/configure/page.tsx`                                                 | agent-configure         | `features/agent-v2/agent-detail/page.tsx`, `features/agent-v2/agent-detail/configure/page.tsx`                                                                                                                              | `web/app/(commonLayout)/agents/[agentId]/configure/page.tsx:10`                                                 |
| `(commonLayout)/agents/[agentId]/logs/page.tsx`                                                      | agent-logs              | `features/agent-v2/agent-detail/page.tsx`, `features/agent-v2/agent-detail/logs/page.tsx`                                                                                                                                   | `web/app/(commonLayout)/agents/[agentId]/logs/page.tsx:10`                                                      |
| `(commonLayout)/agents/[agentId]/monitoring/page.tsx`                                                | agent-monitoring        | `features/agent-v2/agent-detail/page.tsx`, `features/agent-v2/agent-detail/monitoring/page.tsx`                                                                                                                             | `web/app/(commonLayout)/agents/[agentId]/monitoring/page.tsx:10`                                                |
| `(commonLayout)/agents/[agentId]/page.tsx`                                                           | redirect                | inline route body / redirect                                                                                                                                                                                                | `web/app/(commonLayout)/agents/[agentId]/page.tsx:1`                                                            |
| `(commonLayout)/agents/page.tsx`                                                                     | agent-list              | `features/agent-v2/roster/page.tsx`                                                                                                                                                                                         | `web/app/(commonLayout)/agents/page.tsx:9`                                                                      |
| `(commonLayout)/app/(appDetailLayout)/[appId]/access-config/page.tsx`                                | app-access              | `app/components/app/access-config/index.tsx`, `app/components/base/skeleton/index.tsx`                                                                                                                                      | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-config/page.tsx:16`                                |
| `(commonLayout)/app/(appDetailLayout)/[appId]/access-point/page.tsx`                                 | app-access              | `app/components/app/access-point/index.tsx`, `app/components/base/loading-placeholder/index.tsx`                                                                                                                            | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/access-point/page.tsx:13`                                 |
| `(commonLayout)/app/(appDetailLayout)/[appId]/annotations/page.tsx`                                  | app-observability       | `app/components/app/log-annotation/index.tsx`, `app/components/base/skeleton/index.tsx`                                                                                                                                     | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/annotations/page.tsx:9`                                   |
| `(commonLayout)/app/(appDetailLayout)/[appId]/configuration/page.tsx`                                | app-editor              | `app/components/app/configuration/index.tsx`                                                                                                                                                                                | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/configuration/page.tsx:5`                                 |
| `(commonLayout)/app/(appDetailLayout)/[appId]/deploy/page.tsx`                                       | app-access              | `app/components/app/deploy/index.tsx`                                                                                                                                                                                       | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/deploy/page.tsx:4`                                        |
| `(commonLayout)/app/(appDetailLayout)/[appId]/logs/page.tsx`                                         | app-observability       | `app/components/app/log-annotation/index.tsx`                                                                                                                                                                               | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/logs/page.tsx:6`                                          |
| `(commonLayout)/app/(appDetailLayout)/[appId]/overview/page.tsx`                                     | app-observability       | `app/components/base/loading-placeholder/index.tsx`, `app/(commonLayout)/app/(appDetailLayout)/[appId]/overview/view.tsx`                                                                                                   | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/overview/page.tsx:16`                                     |
| `(commonLayout)/app/(appDetailLayout)/[appId]/workflow/page.tsx`                                     | app-editor              | `app/components/workflow-app/index.tsx`                                                                                                                                                                                     | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/workflow/page.tsx:5`                                      |
| `(commonLayout)/apps/page.tsx`                                                                       | app-list                | `app/components/apps/index.tsx`                                                                                                                                                                                             | `web/app/(commonLayout)/apps/page.tsx:9`                                                                        |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/access-config/page.tsx`                   | knowledge-settings      | `app/components/datasets/access-config/index.tsx`                                                                                                                                                                           | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/access-config/page.tsx:12`                   |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/api/page.tsx`                             | placeholder             | inline route body / redirect                                                                                                                                                                                                | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/api/page.tsx:4`                              |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/[documentId]/page.tsx`          | knowledge-documents     | `app/components/datasets/documents/detail/index.tsx`                                                                                                                                                                        | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/[documentId]/page.tsx:13`          |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/[documentId]/settings/page.tsx` | knowledge-settings      | `app/components/datasets/documents/detail/settings/index.tsx`                                                                                                                                                               | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/[documentId]/settings/page.tsx:13` |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/create/page.tsx`                | knowledge-create        | `app/components/datasets/create/index.tsx`                                                                                                                                                                                  | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/create/page.tsx:13`                |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/create-from-pipeline/page.tsx`  | knowledge-create        | `app/components/datasets/documents/create-from-pipeline/index.tsx`                                                                                                                                                          | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/create-from-pipeline/page.tsx:5`   |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/page.tsx`                       | knowledge-documents     | `app/components/datasets/documents/index.tsx`                                                                                                                                                                               | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/documents/page.tsx:13`                       |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/hitTesting/page.tsx`                      | knowledge-retrieval     | `app/components/datasets/hit-testing/index.tsx`                                                                                                                                                                             | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/hitTesting/page.tsx:13`                      |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/pipeline/page.tsx`                        | knowledge-pipeline      | `app/components/rag-pipeline/index.tsx`                                                                                                                                                                                     | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/pipeline/page.tsx:6`                         |
| `(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/settings/page.tsx`                        | knowledge-settings      | `app/components/datasets/settings/form/index.tsx`                                                                                                                                                                           | `web/app/(commonLayout)/datasets/(datasetDetailLayout)/[datasetId]/settings/page.tsx:8`                         |
| `(commonLayout)/datasets/connect/page.tsx`                                                           | knowledge-create        | `app/components/datasets/external-knowledge-base/connector/index.tsx`                                                                                                                                                       | `web/app/(commonLayout)/datasets/connect/page.tsx:12`                                                           |
| `(commonLayout)/datasets/create/page.tsx`                                                            | knowledge-create        | `app/components/datasets/create/index.tsx`                                                                                                                                                                                  | `web/app/(commonLayout)/datasets/create/page.tsx:12`                                                            |
| `(commonLayout)/datasets/create-from-pipeline/page.tsx`                                              | knowledge-create        | `app/components/datasets/create-from-pipeline/index.tsx`                                                                                                                                                                    | `web/app/(commonLayout)/datasets/create-from-pipeline/page.tsx:12`                                              |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/documents/[documentId]/page.tsx`                     | new-knowledge-documents | `features/new-rag/documents/detail/page.tsx`                                                                                                                                                                                | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/documents/[documentId]/page.tsx:10`                     |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/documents/page.tsx`                                  | new-knowledge-documents | `features/new-rag/documents/page.tsx`                                                                                                                                                                                       | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/documents/page.tsx:6`                                   |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/page.tsx`                                            | new-knowledge-overview  | `features/new-rag/overview/page.tsx`                                                                                                                                                                                        | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/page.tsx:6`                                             |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/quality/page.tsx`                                    | new-knowledge-quality   | `features/new-rag/quality/page.tsx`                                                                                                                                                                                         | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/quality/page.tsx:4`                                     |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/retrieval/page.tsx`                                  | knowledge-retrieval     | `features/new-rag/retrieval/page.tsx`                                                                                                                                                                                       | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/retrieval/page.tsx:6`                                   |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/settings/page.tsx`                                   | knowledge-settings      | `features/new-rag/settings/page.tsx`                                                                                                                                                                                        | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/settings/page.tsx:6`                                    |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/sources/new/page.tsx`                                | new-knowledge-sources   | `features/new-rag/sources/create/page.tsx`                                                                                                                                                                                  | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/sources/new/page.tsx:19`                                |
| `(commonLayout)/datasets/new/[knowledgeSpaceId]/sources/page.tsx`                                    | new-knowledge-sources   | `features/new-rag/sources/page.tsx`                                                                                                                                                                                         | `web/app/(commonLayout)/datasets/new/[knowledgeSpaceId]/sources/page.tsx:6`                                     |
| `(commonLayout)/datasets/new/create/page.tsx`                                                        | knowledge-create        | `features/new-rag/create/page.tsx`                                                                                                                                                                                          | `web/app/(commonLayout)/datasets/new/create/page.tsx:9`                                                         |
| `(commonLayout)/datasets/page.tsx`                                                                   | knowledge-list          | `app/components/datasets/list/index.tsx`                                                                                                                                                                                    | `web/app/(commonLayout)/datasets/page.tsx:4`                                                                    |
| `(commonLayout)/explore/installed/[appId]/page.tsx`                                                  | redirect                | inline route body / redirect                                                                                                                                                                                                | `web/app/(commonLayout)/explore/installed/[appId]/page.tsx:2`                                                   |
| `(commonLayout)/installed/[appId]/page.tsx`                                                          | installed               | `app/components/explore/installed-app/index.tsx`                                                                                                                                                                            | `web/app/(commonLayout)/installed/[appId]/page.tsx:13`                                                          |
| `(commonLayout)/integrations/[[...slug]]/page.tsx`                                                   | integrations            | `app/components/integrations/index.tsx`                                                                                                                                                                                     | `web/app/(commonLayout)/integrations/[[...slug]]/page.tsx:10`                                                   |
| `(commonLayout)/marketplace/creator/[uniqueHandle]/page.tsx`                                         | marketplace             | `app/components/plugins/marketplace/creator-profile/reference-application-profile.tsx`, `app/components/plugins/marketplace/marketplace-install-permission-provider.tsx`                                                    | `web/app/(commonLayout)/marketplace/creator/[uniqueHandle]/page.tsx:15`                                         |
| `(commonLayout)/marketplace/page.tsx`                                                                | marketplace             | `app/components/plugins/marketplace/embedded.tsx`, `app/components/plugins/marketplace/marketplace-install-permission-provider.tsx`                                                                                         | `web/app/(commonLayout)/marketplace/page.tsx:8`                                                                 |
| `(commonLayout)/page.tsx`                                                                            | home                    | `features/home/page.tsx`                                                                                                                                                                                                    | `web/app/(commonLayout)/page.tsx:9`                                                                             |
| `(commonLayout)/plugins/page.tsx`                                                                    | redirect                | inline route body / redirect                                                                                                                                                                                                | `web/app/(commonLayout)/plugins/page.tsx:14`                                                                    |
| `(commonLayout)/skills/[skillId]/page.tsx`                                                           | skills                  | `features/skills/detail-page.tsx`                                                                                                                                                                                           | `web/app/(commonLayout)/skills/[skillId]/page.tsx:4`                                                            |
| `(commonLayout)/skills/page.tsx`                                                                     | skills                  | `features/skills/page.tsx`                                                                                                                                                                                                  | `web/app/(commonLayout)/skills/page.tsx:9`                                                                      |
| `(commonLayout)/snippets/[snippetId]/orchestrate/page.tsx`                                           | app-editor              | `app/components/snippets/index.tsx`                                                                                                                                                                                         | `web/app/(commonLayout)/snippets/[snippetId]/orchestrate/page.tsx:6`                                            |
| `(commonLayout)/snippets/[snippetId]/page.tsx`                                                       | redirect                | inline route body / redirect                                                                                                                                                                                                | `web/app/(commonLayout)/snippets/[snippetId]/page.tsx:1`                                                        |
| `(commonLayout)/snippets/page.tsx`                                                                   | snippet-list            | `app/components/snippet-list/index.tsx`                                                                                                                                                                                     | `web/app/(commonLayout)/snippets/page.tsx:4`                                                                    |
| `(commonLayout)/templates/[[...category]]/page.tsx`                                                  | marketplace             | `app/components/plugins/marketplace/templates/index.tsx`, `app/components/plugins/marketplace/templates/template-detail-route.tsx`                                                                                          | `web/app/(commonLayout)/templates/[[...category]]/page.tsx:44`                                                  |
| `(commonLayout)/tools/page.tsx`                                                                      | redirect                | inline route body / redirect                                                                                                                                                                                                | `web/app/(commonLayout)/tools/page.tsx:6`                                                                       |
| `(education)/education/apply/page.tsx`                                                               | education               | `app/education/apply/application-entry.tsx`                                                                                                                                                                                 | `web/app/(education)/education/apply/page.tsx:13`                                                               |
| `(education)/education/verify/page.tsx`                                                              | education               | `app/education/verify/verify-flow.tsx`                                                                                                                                                                                      | `web/app/(education)/education/verify/page.tsx:4`                                                               |
| `(humanInputLayout)/form/[token]/page.tsx`                                                           | human-input             | `app/(humanInputLayout)/form/[token]/form.tsx`                                                                                                                                                                              | `web/app/(humanInputLayout)/form/[token]/page.tsx:7`                                                            |
| `(shareLayout)/agent/[token]/page.tsx`                                                               | share-runtime           | `app/components/base/chat/chat-with-history/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                             | `web/app/(shareLayout)/agent/[token]/page.tsx:10`                                                               |
| `(shareLayout)/chat/[token]/page.tsx`                                                                | share-runtime           | `app/components/base/chat/chat-with-history/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                             | `web/app/(shareLayout)/chat/[token]/page.tsx:8`                                                                 |
| `(shareLayout)/chatbot/[token]/page.tsx`                                                             | share-runtime           | `app/components/base/chat/embedded-chatbot/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                              | `web/app/(shareLayout)/chatbot/[token]/page.tsx:8`                                                              |
| `(shareLayout)/completion/[token]/page.tsx`                                                          | share-runtime           | `app/components/share/text-generation/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                                   | `web/app/(shareLayout)/completion/[token]/page.tsx:7`                                                           |
| `(shareLayout)/environment/chat/[token]/page.tsx`                                                    | share-runtime           | `app/components/base/chat/chat-with-history/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                             | `web/app/(shareLayout)/environment/chat/[token]/page.tsx:8`                                                     |
| `(shareLayout)/environment/workflow/[token]/page.tsx`                                                | share-runtime           | `app/components/share/text-generation/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                                   | `web/app/(shareLayout)/environment/workflow/[token]/page.tsx:7`                                                 |
| `(shareLayout)/webapp-reset-password/check-code/page.tsx`                                            | auth                    | `app/components/signin/countdown.tsx`                                                                                                                                                                                       | `web/app/(shareLayout)/webapp-reset-password/check-code/page.tsx:64`                                            |
| `(shareLayout)/webapp-reset-password/page.tsx`                                                       | auth                    | inline route body / redirect                                                                                                                                                                                                | `web/app/(shareLayout)/webapp-reset-password/page.tsx:56`                                                       |
| `(shareLayout)/webapp-reset-password/set-password/page.tsx`                                          | auth                    | inline route body / redirect                                                                                                                                                                                                | `web/app/(shareLayout)/webapp-reset-password/set-password/page.tsx:45`                                          |
| `(shareLayout)/webapp-signin/check-code/page.tsx`                                                    | auth                    | `app/components/signin/countdown.tsx`                                                                                                                                                                                       | `web/app/(shareLayout)/webapp-signin/check-code/page.tsx:33`                                                    |
| `(shareLayout)/webapp-signin/page.tsx`                                                               | auth                    | `app/components/base/app-unavailable.tsx`, `app/components/base/loading-placeholder/index.tsx`, `app/(shareLayout)/webapp-signin/components/external-member-sso-auth.tsx`, `app/(shareLayout)/webapp-signin/normalForm.tsx` | `web/app/(shareLayout)/webapp-signin/page.tsx:56`                                                               |
| `(shareLayout)/workflow/[token]/page.tsx`                                                            | share-runtime           | `app/components/share/text-generation/index.tsx`, `app/(shareLayout)/components/authenticated-layout.tsx`                                                                                                                   | `web/app/(shareLayout)/workflow/[token]/page.tsx:7`                                                             |
| `account/(commonLayout)/page.tsx`                                                                    | account                 | `app/account/(commonLayout)/account-page/index.tsx`                                                                                                                                                                         | `web/app/account/(commonLayout)/page.tsx:10`                                                                    |
| `account/oauth/authorize/page.tsx`                                                                   | oauth-consent           | `app/components/base/loading-placeholder/index.tsx`                                                                                                                                                                         | `web/app/account/oauth/authorize/page.tsx:144`                                                                  |
| `activate/page.tsx`                                                                                  | auth                    | `app/signin/_header.tsx`, `app/activate/activateForm.tsx`                                                                                                                                                                   | `web/app/activate/page.tsx:12`                                                                                  |
| `device/page.tsx`                                                                                    | device-auth             | `app/device/components/authorize-account.tsx`, `app/device/components/authorize-sso.tsx`, `app/device/components/chooser.tsx`, `app/device/components/code-input.tsx`                                                       | `web/app/device/page.tsx:44`                                                                                    |
| `forgot-password/page.tsx`                                                                           | auth                    | `app/forgot-password/ChangePasswordForm.tsx`, `app/signin/_header.tsx`, `app/forgot-password/ForgotPasswordForm.tsx`                                                                                                        | `web/app/forgot-password/page.tsx:17`                                                                           |
| `init/page.tsx`                                                                                      | auth                    | `app/init/InitPasswordPopup.tsx`                                                                                                                                                                                            | `web/app/init/page.tsx:12`                                                                                      |
| `install/page.tsx`                                                                                   | auth                    | `app/signin/_header.tsx`, `app/install/installForm.tsx`                                                                                                                                                                     | `web/app/install/page.tsx:12`                                                                                   |
| `oauth-callback/page.tsx`                                                                            | auth                    | inline route body / redirect                                                                                                                                                                                                | `web/app/oauth-callback/page.tsx:15`                                                                            |
| `reset-password/check-code/page.tsx`                                                                 | auth                    | `app/components/signin/countdown.tsx`                                                                                                                                                                                       | `web/app/reset-password/check-code/page.tsx:61`                                                                 |
| `reset-password/page.tsx`                                                                            | auth                    | inline route body / redirect                                                                                                                                                                                                | `web/app/reset-password/page.tsx:49`                                                                            |
| `reset-password/set-password/page.tsx`                                                               | auth                    | inline route body / redirect                                                                                                                                                                                                | `web/app/reset-password/set-password/page.tsx:35`                                                               |
| `signin/check-code/page.tsx`                                                                         | auth                    | `app/components/signin/countdown.tsx`, `app/signin/components/turnstile.tsx`                                                                                                                                                | `web/app/signin/check-code/page.tsx:48`                                                                         |
| `signin/invite-settings/page.tsx`                                                                    | auth                    | `app/components/base/loading-placeholder/index.tsx`                                                                                                                                                                         | `web/app/signin/invite-settings/page.tsx:188`                                                                   |
| `signin/page.tsx`                                                                                    | auth                    | `app/signin/sign-in-page.tsx`                                                                                                                                                                                               | `web/app/signin/page.tsx:18`                                                                                    |
| `signup/check-code/page.tsx`                                                                         | auth                    | `app/components/signin/countdown.tsx`                                                                                                                                                                                       | `web/app/signup/check-code/page.tsx:72`                                                                         |
| `signup/page.tsx`                                                                                    | auth                    | `app/signup/components/input-mail.tsx`                                                                                                                                                                                      | `web/app/signup/page.tsx:26`                                                                                    |
| `signup/set-password/page.tsx`                                                                       | auth                    | intentional null slot                                                                                                                                                                                                       | `web/app/signup/set-password/page.tsx:55`                                                                       |
| `webapp-unavailable/page.tsx`                                                                        | unavailable             | `features/app-access-error/page.tsx`                                                                                                                                                                                        | `web/app/webapp-unavailable/page.tsx:21`                                                                        |

## Stronger implementation examples and concrete adoption checks

1. **A collection is a composed system, not a grid alone.** Preserve the relationship between title, toolbar, busy status, empty/filter-empty, loaded items, incremental loading, and retry. The skill collection is a particularly explicit example: `web/features/skills/page.tsx:803` begins the labelled/busy grid surface; initial skeleton, placeholder/error, settled list, refresh retry, and pagination are distinct branches nearby. Its card action area responds to focus-within and non-hover input in addition to hover (`:482`, `:536`). Do not copy its domain behavior or branded icons.

2. **Keep resource detail navigation outside route content.** The common shell receives a named `detailSidebar` (`web/app/(commonLayout)/layout.tsx:19`); repeated parallel slot pages point to resource-aware sidebar implementations, while create/connect slots intentionally return null. This gives nested pages contextual continuity. The target shell/nav/logo remains owned by Tapstate, so adapt only the slot ownership principle if needed.

3. **Model recovery as part of the page.** New document management explicitly mounts task, permission, and model controllers before its results and drawers (`web/features/new-rag/documents/page.tsx:13`). This establishes responsibility separation. It does not prove every network sequence recovers correctly; that needs runtime tests and a target contract.

4. **Distinguish permission to see a page from permission to use its actions.** Dataset layout waits for access readiness (`web/app/(commonLayout)/datasets/layout.tsx:51`); agent detail uses resource section access helpers (`web/features/agent-v2/agent-detail/layout.tsx:8`) and a loading/error boundary (`:53`, `:57`); access pages use permission hooks and dedicated editors. Keep denied, still-loading, and editable states distinct. UI gating never substitutes for backend enforcement.

5. **A form needs an error model and an action model.** Signup code verification sets `inputMode="numeric"`, `autoComplete="one-time-code"`, a six-digit pattern and field-level missing/pattern errors (`web/app/signup/check-code/page.tsx:98`). The submit button carries pending state (`:116`) and resend is separate (`:119`). Password confirmation revalidates when the original password changes (`web/app/signup/set-password/page.tsx:141`). Reuse these affordances while preserving target password/auth policy.

6. **Give each task the right scroll owner.** Logs keep header and pagination distinct from the results region (`web/features/agent-v2/agent-detail/logs/page.tsx:130`, `:214`, `:253`). Agent roster uses a scroll viewport and content wrapper (`web/features/agent-v2/roster/page.tsx:141`). Retrieval stacks then changes to rows at the large breakpoint (`web/features/new-rag/retrieval/page.tsx:48`). Canvas routes use explicit `overflow-x-auto` wrappers. Do not use a global overflow-hidden rule without a corresponding child scroll owner.

7. **Separate initial failure from stale or partially loaded content.** Strong list implementations keep settled cards and offer refresh/pagination retry; monitoring offers retry inside metric content. This prevents a background failure from replacing useful visible data. Use target data semantics to determine when retaining stale information is safe.

8. **Keep unavailable pages renderable without the normal app bootstrap.** The unavailable route derives document locale and loads locale resources directly (`web/app/webapp-unavailable/page.tsx:21`, `:38`), then renders a dedicated access-error page. The useful principle is independent failure rendering with clear, localizable explanation, not a mandate to copy source branding or diagnostic disclosure.

## Exceptions that must survive adaptation

- Tapstate owns its app shell, main navigation, logo, accent, and liquid-glass product surfaces. No evidence here overrides those user decisions.
- Do not upgrade or replace a component package merely to match pages. This study is research, not an implementation request.
- Thin wrappers, deliberate redirects, null sidebar slots, and the literal dataset API placeholder are different categories. A route count is not a count of finished visual designs.
- Old and new knowledge experiences have separate state and layout architectures; identify which source generation an example belongs to before extracting a rule.
- Source component APIs and CSS tokens can inform composition, but source-specific business workflows, security behavior, AI editing, storage formats, connectors, and deployment actions remain outside reuse scope.
- Evidence paths and line numbers are revision-bound. Subsequent edits require checking the cited source before turning an observation into a durable target rule.

## Honest remaining gaps

No browser session was used for this delegated source-only study. No screenshot, computed style, contrast ratio, keyboard journey, screen-reader announcement, focus restoration, permission-denied journey, long-content overflow, network-failure recovery, or physical-device result is asserted. Rendered imports are followed to a bounded depth rather than every transitive dependency. Dynamic import and render-prop internals may need additional tracing. The machine-readable file deliberately preserves these limits for each page instead of filling missing evidence with generic claims.

## Branch-reachability correction

The earlier import graph followed every rendered sibling of a shared dispatcher. This could incorrectly surface access-editor state evidence on configuration, logs, or monitoring. The corrected graph resolves each route's fixed `AgentDetailPage.section` before selecting its child. The log/annotation surface similarly resolves `pageType`: annotations select the annotation edge; logs select ordinary/workflow log possibilities and exclude the annotation dispatch edge. The ordinary/workflow choice still depends on runtime resource mode and is not asserted selected.

All 114 records were reassessed. State, controls, tokens, and all family quality anchors now use only route source plus selected immediate implementations. New knowledge routes directly select their own overview, documents, sources, retrieval, quality, or settings implementation; sibling pages supply no local evidence. Deeper snippets are explicitly `possible_transitive_dependency_evidence` or `possible_transitive_controls_actions`. Unknown flags, tabs, permission predicates, render props, and child conditions are not assumed reachable. Ancestor layout dependencies are possible inherited evidence, not page-local states. Authored conditional constructs still do not prove runtime behavior or visual quality.

Revised validation: {'pages': 114, 'inventory_exact': True, 'families': 36, 'literal_citations_checked': 8225, 'line_mismatches': 0, 'dispatches': 7, 'dispatch_edge_failures': 0, 'nonaccess_local_contamination': 0}. All family state/quality summaries are rebuilt from route/selected-primary evidence. No browser verification performed.
