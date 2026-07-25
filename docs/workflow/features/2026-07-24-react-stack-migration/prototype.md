# React Technology Stack Migration Prototype

> 状态：Draft
> 日期：2026-07-24
> Owner：Tapstate Web
> Feature folder：docs/workflow/features/2026-07-24-react-stack-migration/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

- 证明 Vue 到 React 迁移后，页面 IA、路由行为、工作台布局和视觉密度仍与当前主分支一致。
- 以 Dify 的目录组织为参考，把路由、业务模块、服务、hooks、状态、i18n、样式边界提前定清楚。
- 明确 Element Plus 组件迁移到 shadcn/ui 后的视觉保真边界和验收方式。

## 2. 页面 / 交互范围

本原型覆盖：

- `/login`
- `/sources`
- `/pipelines`
- `/explorations`
- 受保护主 layout、sidebar、header、Ask Tapstate
- 语言切换、退出登录、auth gate、404/fallback
- 数据源列表、过滤、创建 dialog/form、提交反馈

本原型不覆盖：

- SSR、Server Actions、API Routes、Edge Runtime、Next middleware。
- 后端接口、鉴权协议、数据模型改造。
- 新产品页面、新导航项、新营销式 UI、重新设计视觉语言。
- Dify 的插件、模型、Workflow、埋点、Storybook 或服务端 i18n 体系。

## 3. 布局线框

```text
Desktop
┌────────────────────────────────────────────────────────────────────┐
│ app-shell                                                          │
│ ┌────────────────┬───────────────────────────────────────────────┐ │
│ │ Sidebar        │ Header                                        │ │
│ │ brand          │ ask button | language | notification | user   │ │
│ │ sources        ├───────────────────────────────────────────────┤ │
│ │ pipelines      │ Main panel                                    │ │
│ │ explorations   │ route content                                 │ │
│ │                │ list / cards / form / empty / error           │ │
│ └────────────────┴───────────────────────────────────────────────┘ │
│                                             Ask Tapstate floating   │
└────────────────────────────────────────────────────────────────────┘

Mobile
┌────────────────────────────────────┐
│ Header compact actions             │
├────────────────────────────────────┤
│ Route content                       │
│ stable cards/forms/lists            │
├────────────────────────────────────┤
│ Collapsed navigation / drawer entry │
└────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：当前 `main` 分支本地页面是唯一视觉基线。
- 必须保持一致的区域：sidebar 宽度和导航层级、header 高度和右侧操作区、main panel 外观、Ask Tapstate 入口位置、登录页布局、数据源列表和创建表单的信息密度、loading/empty/error/success 四态结构。
- 允许为适配当前工程调整的区域：Element Plus 浮层、select、dialog、dropdown 的内部 DOM 与 shadcn/Radix DOM 不一致时，可通过 class wrapper 和 token 保持视觉语义一致，不要求 DOM 结构一致。
- 明确禁止新增到产品 UI 的内容：迁移说明、框架标识、调试开关、截图对比控件、状态切换器、未国际化临时英文。
- QA / debug / preview control 的承载方式：只通过本地 dev server、浏览器 devtools、测试数据和截图文件完成；不得暴露给最终用户界面。

视觉对比方式：

- 主分支 worktree 启动旧 Vue 页面，固定端口 `5173`。
- React 迁移 worktree 启动新页面，固定端口 `5174`。
- 对 `/login`、`/sources`、`/pipelines`、`/explorations` 分别做 desktop `1440x900` 和 mobile `390x844` 对照。

## 5. 关键交互

| 触发 | 页面反馈 | 结果 |
|---|---|---|
| 未登录访问 `/sources` | 短暂 auth gate 后进入登录页 | URL 为 `/login` |
| 登录成功 | button/submitting 状态稳定 | 进入 `/sources` |
| 点击 sidebar 导航 | active item 立即变化，main panel 切换 | 进入目标 route |
| 点击语言切换 | dropdown 打开，当前语言 disabled/selected | 页面文案切换，不刷新页面 |
| 点击 Ask Tapstate | 浮层打开，背景布局不跳动 | 可关闭恢复 |
| 打开创建数据源 | dialog/sheet 打开，focus 可达 | 表单 ready |
| 表单提交失败 | 字段错误或错误提示稳定显示 | 用户可修正或重试 |
| API 返回 401 | auth 清理，跳转登录 | 受保护页面不可继续操作 |
| 未知路径 | fallback 到 `/sources` 或显示可返回工作台的 not-found | 不进入空白页 |

## 6. 状态覆盖

| 状态 | 表现 | 操作 | 文案 key |
|---|---|---|---|
| Loading | skeleton/spinner 保持容器尺寸；header/sidebar 不闪烁 | 等待或切换导航 | existing loading keys migrated |
| Empty | 保留当前空态文案、图标密度和主操作位置 | 创建、刷新、返回 | existing empty keys migrated |
| Error | 错误说明 + retry；401 触发登录 | 重试或重新登录 | existing error/auth keys migrated |
| Success | 列表、卡片、表单、按钮与主分支布局一致 | 正常浏览和操作 | existing success/action keys migrated |

表单附加状态：

| 状态 | 表现 | 操作 |
|---|---|---|
| Disabled | 控件可读但不可操作，hover 不冒充 active | 等待前置条件 |
| Validation | 字段错误靠近控件，颜色使用 destructive token | 修正输入 |
| Submitting | 按钮 loading 不改变宽高，重复提交被阻止 | 等待提交结果 |

## 7. 响应式规则

- Desktop：延续当前 sidebar + header + main panel 工作台结构；页面级不得横向溢出。
- Tablet：sidebar 可保持窄栏或进入 drawer，但导航入口必须稳定；表格和列表允许内部横向滚动。
- Mobile：主内容优先，导航收敛到 drawer/compact entry；表单控件宽度自适应，长文案换行而不是溢出。

## 8. 控件密度与视觉决策

| 控件 / 区域 | 默认规则 | 本次选择 | 依据 | 是否例外 |
|---|---|---|---|---|
| Button | shadcn `button`，`rounded-lg`，32px 左右高度 | 通过 `components/ui/button.tsx` 和局部 class 复刻当前按钮密度 | design-system + 当前页面 | 否 |
| Input / Textarea | shadcn form control，border/input/ring token | 替代 Element Plus input，保持当前表单高度和错误态 | design-system + source form | 否 |
| Dropdown / Select | shadcn/Radix floating surface，accent hover | 语言切换和表单 select 用 dropdown/select primitives | design-system + header/form | 否 |
| Dialog / Sheet | shadcn dialog/sheet，popover/card surface | 创建数据源流程保留 modal 层级和按钮区 | SourceCreateDialog 当前布局 | 否 |
| Table / List | 稳定行高、border token、内部滚动 | 数据源列表保留扫描密度 | DataSourcesPage 当前布局 | 否 |
| Sidebar | `--sidebar-*` token | 视觉和 active 状态按当前主分支复刻 | design-system | 否 |
| Ask Tapstate | floating panel/button | 保持入口位置和尺寸，不新增说明文案 | 当前 AppHeader/AskTapstate | 否 |

## 9. 原型资产

- Markdown wireframe：本文件。
- HTML 原型：不单独建立；React 迁移 worktree 的本地页面即原型实现。
- 截图：实现阶段保存主分支与迁移 worktree 的 desktop/mobile 对照截图。
- 设计稿链接：N/A，当前主分支页面为源稿。

## 10. 评审记录

| 时间 | Reviewer | 结论 | 备注 |
|---|---|---|---|
| 2026-07-24 | Codex | Draft ready for user confirmation | 方案采用 Vite/vinext + Next App Router 风格路由，参考 Dify 目录结构，视觉保留主分支基线 |
