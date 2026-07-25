# React Technology Stack Migration

> 状态：Draft
> 日期：2026-07-24
> Owner：Tapstate Web
> Feature folder：docs/workflow/features/2026-07-24-react-stack-migration/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md（实现完成后建立）
> 相关页面 / 模块：apps/web 全应用、仓库工程配置、agent/workflow 文档

## 1. Intake

### 用户原始输入

> [$think] 我要更换项目的技术栈。从 vue3 全面转向 react。配套的 Vite + React 19 + Tailwind + Next + TanStack Query + Zustand + Shadcn + oxlint + **i18next**
> AGENTS 文档，页面目录结构全都要大改。但是页面样式布局暂时还保留
>
> 确定好方案跟我确认，我要更换模型执行
>
> 然后用新的 worktree 来做这个大的调整。方便对比主分支的页面样式布局。
>
> Vite + Next 都保留， Vite 还是开发还有打包使用，Next 主要还是用路由， 目前是 SPA。
> 目录结构可以参考下 Dify

### 背景与上下文

当前主应用是 pnpm monorepo 下的 Vue 3 + Vite SPA，使用 Vue Router、Pinia、Element Plus、Tailwind CSS v4 和 vue-i18n。用户要求把前端运行时与配套工程治理全面迁移到 React 19，同时保留现有页面的视觉样式和布局。

当前应用约 7,400 行前端源码，具有浏览器端路由守卫、sessionStorage token、`/auth` 与 `/api` 代理、三套 locale、数据源列表与创建流程，以及多个工作台页面。迁移范围超过 8 个文件，属于 Level 3 高风险、全应用技术栈迁移。

用户已明确 Vite 与 Next 都要保留：Vite 继续承担开发服务器与打包职责，Next 主要承担路由组织能力，应用仍按 SPA 思路迁移。Dify 当前 `web/` 目录提供了参考形态：`app/` 路由目录、`features/` 业务模块、`service/` API 层、`hooks/`、`context/`、`i18n/`、`types/`、`utils/` 横向分层，并同时存在 `next.config.ts` 与 `vite.config.ts`。

### 假设

- 这里的 Next 指 Next.js 的 App Router 目录约定与 `next/link`、`next/navigation` 等路由 API，而不是引入 Next.js 作为唯一 dev/build/runtime。
- Vite 与 Next 的结合通过 `vinext` 落地：`vinext dev` 和 `vinext build` 使用 Vite 工具链，同时支持 Next 风格路由能力。
- 迁移后的页面以 client component 为主，不引入 Server Actions、API Routes、RSC 数据获取或 SSR 专属业务逻辑。
- 新 worktree 是执行迁移的唯一编辑工作区；原主分支工作区保留为视觉基线，用于同时启动旧版页面做桌面和移动对照。
- Dify 只作为目录与工程组织参考，不复制 Dify 的业务抽象、依赖规模、服务契约或 i18n 命名。

### 未决问题

- 无阻塞未决问题。当前方案按“Vite/vinext dev-build + Next App Router 风格路由 + SPA/client-first”执行。

## 2. Decomposition

### 目标

- 将 `apps/web` 从 Vue 3 全面迁移到 React 19，不保留 Vue/React 双运行时。
- 保留 Vite 开发与打包路径，通过 `vinext` 承接 Next App Router 风格路由。
- 使用 Tailwind CSS v4、shadcn/ui、lucide-react 保持现有 shadcn-aligned 工作台视觉语言。
- 用 TanStack Query 管理服务端状态；用 Zustand 管理 auth session、UI drawer/dialog 等客户端状态。
- 用 i18next + react-i18next 替代 vue-i18n，并继续同步维护 `en`、`zh-CN`、`zh-TW`。
- 用 Oxlint 替换 ESLint 主门禁；保留 strict TypeScript。
- 参考 Dify 调整页面和模块目录：路由放 `apps/web/app/`，业务放 `apps/web/features/`，API 放 `apps/web/service/`。
- 更新 `AGENTS.md`、`CLAUDE.md`、`.claude/rules/`、README、工程与设计系统文档，移除 Vue、Element Plus、Pinia、vue-i18n 硬规则。
- 使用新 worktree 执行迁移，让主分支页面作为视觉和布局基线。

### 非目标

- 不引入 Next.js 原生 `next dev` / `next build` 作为主构建链。
- 不引入 SSR、Server Actions、API Routes、Edge Runtime、Next middleware 或后端 BFF。
- 不改后端 API、鉴权 token 格式、代理路径或业务数据契约。
- 不重设计 IA、页面布局、视觉层级、信息架构或业务流程。
- 不复制 Dify 的大型依赖栈、插件系统、埋点、Storybook、icon 生成链路或服务端 i18n 协商。
- 不在当前主分支 worktree 中实施迁移代码。

### 用户路径

1. 未登录用户访问任意受保护路径，被带到 `/login`；登录成功后进入 `/sources`。
2. 已登录用户进入主工作台，看到与当前一致的侧栏、顶部操作区、内容面板和 Ask Tapstate 入口。
3. 用户在 `/sources` 查看数据源列表，使用过滤、刷新、创建数据源、表单校验和提交反馈。
4. 用户在 `/pipelines` 与 `/explorations` 查看现有页面内容，四态表现与主分支视觉一致。
5. 用户切换语言、打开通知入口、退出登录，路由和状态变化不出现页面闪烁或布局跳动。

### 影响面

- IA / 路由：从 `src/router/index.ts` 的 Vue Router 配置迁移到 `apps/web/app/` 的 Next App Router 风格文件路由；保留 `/login`、`/sources`、`/pipelines`、`/explorations` 和 fallback 到 `/sources` 的行为。
- 状态管理：Pinia store 迁移为 Zustand store；auth token/sessionStorage 行为保持一致；UI 状态从 `uiState` 迁移为独立 store。
- 数据 / API：`services/*Client.ts` 迁移到 `service/`，fetch 契约、`/auth`、`/api` 路径和错误映射保持不变；页面数据读取迁移为 TanStack Query hooks。
- 权限：路由守卫改为 client-side auth gate；未登录访问受保护 app layout 时跳转 `/login`。
- i18n：locale JSON 迁移到 i18next resources；所有用户可见文案继续要求三语言同步。
- 错误处理：API 401 清理 auth 并跳转登录；页面级 loading、empty、error、success 四态继续保留；表单保留 disabled、validation、submitting。
- 工程治理：依赖、scripts、TypeScript、Oxlint、Vite/vinext/Next 配置、shadcn 组件生成、文档规则同步改写。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| Vite + vinext + Next App Router 风格路由 | 满足用户“Vite 开发/打包 + Next 路由 + SPA”的组合诉求；可参考 Dify；迁移后目录更接近现代 React 产品工程 | `vinext` 当前为 beta；Next API surface 需要先做兼容性门禁；不要使用 SSR/RSC 专属能力 | 采用 |
| 原生 Next.js App Router + `next dev` / `next build` | Next 能力最完整，官方路径风险最低 | 违背“Vite 还是开发还有打包使用”；部署/runtime 边界变化更大 | 不采用 |
| Vite + React Router / TanStack Router | 最贴近普通 SPA，工程风险低 | 不满足用户明确要求保留 Next 作为路由；目录语义不像 Dify/Next | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：N/A

## 4. UI / IA Sketch

```text
apps/web/app
├── layout.tsx                         Root providers: Query, i18next, auth, styles
├── login/page.tsx                     Public login route
├── (main)/layout.tsx                  Auth gate + shell
├── (main)/sources/page.tsx            Data sources
├── (main)/pipelines/page.tsx          Pipelines
├── (main)/explorations/page.tsx       Explorations
└── not-found.tsx                      Redirect or link back to /sources

Visual shell
┌──────────────────────────────────────────────────────────────┐
│ Sidebar             │ Header actions                         │
│ brand + nav         ├────────────────────────────────────────┤
│ sources             │ Main panel                             │
│ pipelines           │ route page content                     │
│ explorations        │                                        │
│                     │                         Ask Tapstate   │
└─────────────────────┴────────────────────────────────────────┘
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 主内容区域显示稳定骨架屏或 spinner，不改变 sidebar/header 尺寸 | 等待、保留导航可读性 | 复用现有 loading 语义 key，迁移到 i18next |
| Empty | 保留当前空态版式、图标/标题/说明/主操作密度 | 执行创建、刷新或返回主路径 | 复用现有 empty key |
| Error | 页面或局部列表显示错误提示和重试入口；401 触发登出跳转 | 重试、重新登录、切换页面 | 复用现有 error/auth key |
| Success | 保留现有列表、卡片、表单、详情布局 | 浏览、过滤、创建、提交、切换语言、退出 | 复用现有 success/action key |

## 6. i18n 范围

locale 文件目标位置：

- `apps/web/i18n/locales/en.json`
- `apps/web/i18n/locales/zh-CN.json`
- `apps/web/i18n/locales/zh-TW.json`

需要迁移的现有 key 范围：

- `app.*`
- `nav.*`
- `auth.*`
- `ask.*`
- `sources.*`
- `pipelines.*`
- `explorations.*`
- 所有表单 validation、loading、empty、error、success 文案

新增校验要求：

- 三套 locale key 必须完全一致。
- JSX 用户可见文本不得裸写；迁移过程中出现的临时英文也必须进入三套 locale。
- Oxlint 不负责完整 i18n 语义校验时，补充 `pnpm --filter web i18n:check` 作为机器门禁。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否；继续使用现有 `/auth` 与 `/api` 代理。
- 错误码 / 错误文案：沿用现有 fetch client 错误映射；401 清理 auth session 并跳转 `/login`。

### 数据流

```text
app/(main)/sources/page.tsx
  -> features/sources/hooks.ts
  -> TanStack Query
  -> service/source-client.ts
  -> service/http-client.ts
  -> backend /api

stores/auth-store.ts
  -> service/http-client.ts token getter
  -> app/(main)/layout.tsx auth gate
  -> app/login/page.tsx login/logout flow

i18n/index.ts
  -> app/providers.tsx
  -> shadcn/local components
  -> page text, form validation, state messages
```

Cycle check：API client 不直接 import React page；Query hooks 可以 import API client；auth store 只暴露 token getter/clear 方法，避免 service 与 router 形成循环。

## 8. 验收标准

- [ ] 迁移在新 worktree 中完成，主分支 worktree 可同时启动作为视觉基线。
- [ ] `apps/web` 不再包含 `.vue`、Vue Router、Pinia、Element Plus、vue-i18n、lucide-vue-next、vue-tsc 或 Vue i18n 构建插件。
- [ ] `apps/web` 使用 React 19、Next、vinext、Vite、Tailwind v4、TanStack Query、Zustand、shadcn/ui、Oxlint、i18next。
- [ ] `/login`、`/sources`、`/pipelines`、`/explorations` 路由行为与当前主分支一致。
- [ ] 页面样式布局与主分支桌面和移动截图对照无明显结构回归：sidebar/header/panel/Ask Tapstate、表单、列表、空态、错误态不溢出、不重叠。
- [ ] 三套 locale key 同步，用户可见文案全部经过 i18next。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过。
- [ ] `AGENTS.md`、`CLAUDE.md`、`.claude/rules/`、README、工程文档同步反映 React 技术栈。

## 9. 风险

- `vinext` 当前 registry 版本为 `1.0.0-beta.3`，需要在迁移第一步验证 `vinext dev`、`vinext build`、Next App Router 常用 API、静态资源和 Vite proxy 是否可用。若失败，必须回到用户确认：改用原生 Next 构建，或改用 Vite + React Router/TanStack Router。
- Next App Router 的 SSR/RSC 能力不进入本次范围；若实现中误用 server component 数据流，会破坏 SPA 迁移边界。
- Element Plus 到 shadcn/ui 的组件行为不可能自动一比一；视觉保真必须靠现有 CSS token、局部 wrapper 和截图对照收敛。
- Oxlint 不等价于当前 ESLint + vue-i18n 插件组合；i18n 裸字符串和 locale parity 需要单独门禁。
- 大迁移需要一次原子 PR 合并；在所有页面完成前，迁移 worktree 不应并回主分支。
