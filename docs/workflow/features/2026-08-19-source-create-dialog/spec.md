# Source Create Dialog

> Status: Approved
> Date: 2026-08-20
> Owner: Codex
> Feature folder: docs/workflow/features/2026-08-19-source-create-dialog/
> Prototype: ./prototype.md
> Plan: ./plan.md
> Acceptance: ./acceptance.md
> Affected modules: `apps/web/features/sources/`, `apps/web/components/ui/`, `apps/web/i18n/locales/`

## 1. Intake

### User original input

> 创建 source 的弹窗组件，ui 还是很乱。请按 SaaS Large Modal UX & Layout Standard (shadcn/ui) 重做 `<CreateSourceModal />`：使用非全屏的 `max-w-[1100px] w-full h-[90vh] max-h-[800px] p-0 flex flex-col gap-0 overflow-hidden bg-background rounded-2xl shadow-2xl border border-border` dialog shell 和带轻微 blur 的 backdrop。
>
> 弹窗维护 `step: 'select' | 'configure'` 两步：第一步是有搜索的连接器网格；第二步是固定头部、固定表单动作栏、中间表单 / 文档左右滚动分栏。配置页必须有明确的返回上一步按钮，而不是把关闭弹窗当成返回。表单模式切换使用 Apple 风格 segmented control。颜色、背景、文字、边框均使用 shadcn 语义 token。参考图展示了宽大的类型选择器与左右配置面板。
>
> 2026-08-21 follow-up: 当前连接器数量少，选择器改为一行一个连接器。参考 ChatGPT 插件市场与 Linear 列表的低噪声扫描体验，当前两项目录不显示搜索框，目录达到 3+ 项时再显示窄搜索框；图标保持裸图标，不新增图标背景或边框。

### Background and context

现有创建流程已经能从 connector `spec.text` 解析真实 Formily schema，也已有 picker-to-form 状态流转，但其默认紧凑 Dialog 壳、局部 CSS 与文档区布局未形成独立工作台视窗，选择与配置阶段的空间层级不够清晰。

### Assumptions

- `SourceCreateDialog` 是该请求中的 `<CreateSourceModal />` 对应实现；保留现有公共组件名和调用契约，避免扩大到路由或 API 改名。
- 连接器目录、详情与创建接口维持不变；右栏继续使用当前可获得的通用 connector guidance，暂不虚构服务端文档数据。
- `ConnectorDetail.modes` 是当前可切换模式的来源；存在多个模式时以 segmented control 呈现。

### Open questions

- 服务端尚未为每个 connector 暴露可渲染的 setup guide 内容；本次右栏为稳定的帮助区域和占位说明。

## 2. Decomposition

### Goals

- 将 Source 创建弹窗改造成高度受限的 1100px SaaS workspace modal，保留底层上下文。
- 用明确的 `select | configure` 状态机实现选择器与配置器；选择器为居中的单列表面，支持搜索、选择、返回、加载、错误、空目录和创建成功关闭。
- 配置阶段提供固定 header、左右分栏滚动和左侧固定动作栏；动态 Formily 字段继续来自 `configOptions.connection`。
- 使用 shadcn 语义 token、已有 primitives、lucide 图标与 i18next 文案。

### Non-goals

- 不改动 Source detail、Source edit、路由、API DTO、权限或 connector schema 解析逻辑。
- 不新增 UI 依赖、不实现 connector 专属帮助文档后端、不添加全屏 wizard。
- 不把 QA、preview 或状态切换控件暴露给终端用户。

### User path

1. 用户打开 Create source，在大弹窗中搜索或扫描连接器类型。
2. 点击一行连接器，进入配置步骤；header 中可返回类型选择，关闭按钮仍用于退出弹窗。
3. 用户在左栏填写 source ID、读取模式与 schema 驱动字段，右栏查看 setup guidance。
4. 用户取消或提交；提交成功时继续执行既有 `onCreated` / 关闭流程，失败时在当前步骤显示可读错误。

### Impact

- IA / routing: none.
- Client state: component-local `step`, form, loading and submission state only.
- Data / API: existing `listConnectors`, `getConnector`, `createSource`; no contract change.
- Permissions: none.
- i18n: reuse existing Source-create keys; no new user-facing copy expected.
- Error handling: retain connector-list, spec and create error handling in the owning step.

### Alternatives

| Option                                              | Benefit                                                  | Risk                                                     | Decision |
| --------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- | -------- |
| Keep default Dialog and add more CSS                | Smallest diff                                            | Cannot create fixed shell / split-scroll layout reliably | Rejected |
| Use a single large Dialog with local two-step state | Retains focus trap, API contract and existing form logic | Requires restructuring render tree                       | Selected |
| Add a route-level creation page                     | Largest available canvas                                 | Changes IA and breaks requested modal workflow           | Rejected |

## 3. Prototype Gate

- [x] Prototype required for complex UI and interaction; see [prototype.md](./prototype.md).

## 4. State matrix

| State                    | Modal behaviour                                                                                  | User action                           | Copy source                        |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------- |
| Loading catalog          | Stable body row inside selector                                                                  | Wait or close                         | `sources.create.loadingConnectors` |
| Empty catalog / search   | Stable empty message without card grid; search is available only for catalogs with 3+ connectors | Refine search or close when available | existing create empty keys         |
| Connector / schema error | Alert in current step; configure header retains Back                                             | Return to selector or close / reopen  | `sources.create.errors.*`          |
| Submitting               | Create button stays dimensionally stable and disables dismiss / duplicate submit                 | Wait                                  | `sources.create.submitting`        |
| Success                  | Invoke existing callback and close modal                                                         | Review created source in page         | existing parent success handling   |

## 5. i18n scope

- Existing `sources.create.*` keys cover the revised labels, helpers, loading, validation and error states.
- Verify exact key parity in `en`, `zh-CN`, and `zh-TW` with `pnpm --filter web i18n:check`.

## 6. Data and interfaces

- New interface: no.
- Mock data: no; existing tests retain connector fixtures.
- Form source: `ConnectorDetail.spec.text` -> `configOptions.connection`; unavailable or invalid specs remain errors, never synthetic forms.

## 7. Acceptance criteria

- [ ] The modal uses the specified large shell, 90vh / 800px cap, semantic-token surface and blurred non-black backdrop; it is never fullscreen.
- [ ] Selector step includes a fixed header, a compact one-connector-per-row list with dividers and complete loading / empty / error states. Search is shown only when the catalog has 3+ connectors.
- [ ] Configure step has a clear back-to-selector control, split-scroll form / documentation body, and a fixed left-side cancel / create action bar.
- [ ] Multiple connector modes render as an accessible segmented control rather than radio buttons or a native select.
- [ ] Existing schema-backed form submission and return-focus interaction pass tests; all visible copy remains localized.
- [ ] Desktop and mobile visual checks show no overflow, overlap, inaccessible controls or banned visual patterns.

## 8. Risks

- Dialog primitives inject compact default spacing, footer and close button styles; the implementation must explicitly override or replace those slots.
- The right documentation pane is intentionally desktop-only; the primary form must remain complete when it is hidden below the `lg` breakpoint.
