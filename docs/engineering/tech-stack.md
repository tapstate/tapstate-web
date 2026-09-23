# Tapstate Web Engineering Guide

> 状态：工程参考 + 未决雷达
> 范围：前端技术栈、工程门禁、i18n、依赖和构建约束
> 读取时机：需求触及依赖、构建、i18n、测试策略、工程门禁或架构选型时读取或更新
> 关联文档：
>
> - `docs/engineering/design-system.md` — 视觉 token、组件规范和前端架构边界的权威来源；本文件的"样式与 UI 工程边界"只覆盖构建/目录层面的约束，不重复定义视觉规则。
> - `apps/web/components/ui/AGENTS.md` — `components/ui/*` 组件契约（token 使用规则、圆角/间距角色化），改动该目录下文件时视为必读。
> - `docs/engineering/overlay-conventions.md` — Select/Dropdown/Dialog/Popover 等浮层组件的 z-index 归属和受控 `open`/`onOpenChange` 契约。
> - `docs/engineering/ui-design-constraints.md` — 上述约束（尤其是"裸值禁令""失效 class 机器检查"）的来源、取舍依据和落地进度记录。

## 已定选型

| 领域        | 选型                                                         | 状态 | 备注                                                                                                                                                 |
| ----------- | ------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 框架        | React 19                                                     | KEEP | 前端应用运行时                                                                                                                                       |
| 路由模型    | TanStack Router File Routes                                  | KEEP | 路由源码放 `apps/web/app/routes/`，由 `@tanstack/router-plugin` 生成 `apps/web/app/routeTree.gen.ts`                                                 |
| 开发 / 打包 | Vite 8                                                       | KEEP | `vite` / `vite build` / `vite preview`                                                                                                               |
| 仓库形态    | pnpm monorepo                                                | KEEP | root scripts 直接覆盖 repo root；子包命令保留包内入口并向上发现根配置                                                                                |
| UI 基座     | shadcn/ui + Base UI                                            | KEEP | 基于 Base UI primitives 本地维护 shadcn 风格组件，避免引入大型 UI 套件；视觉与组件契约见 `design-system.md` / `components/ui/AGENTS.md`              |
| 动效        | Motion                                                       | KEEP | 轻量进入/退出动效，优先用于 floating surface、状态切换和局部过渡                                                                                     |
| 图标        | lucide-react                                                 | KEEP | 不手写复杂一次性 SVG                                                                                                                                 |
| 服务端状态  | TanStack Query                                               | KEEP | API list/detail/create 等 server state                                                                                                               |
| 客户端状态  | Zustand                                                      | KEEP | auth session、UI drawer/dialog 等                                                                                                                    |
| 国际化      | i18next + react-i18next                                      | KEEP | `en` / `zh-CN` / `zh-TW`                                                                                                                             |
| Lint        | Oxlint via root `pnpm lint` / package `pnpm lint`            | KEEP | 根级 `pnpm lint` 直接执行 `oxlint .` 并附带 `pnpm format:check`，覆盖 repo root 与 `apps/*`；子包命令依赖 OXC 向上发现根配置                         |
| Format      | OXC formatter via root `pnpm format` / package `pnpm format` | KEEP | `.oxfmtrc.json`: 2 spaces, single quotes, no semicolons; 根级 `pnpm format` / `pnpm format:check` 直接作用于 repo root，子包命令默认向上发现同一配置 |
| 测试        | Vitest + jsdom                                               | KEEP | 纯逻辑和组件交互优先                                                                                                                                 |
| 样式基座    | Tailwind CSS v4 + shadcn token                               | KEEP | `main.css` / `tailwind.css` / `app.css` 分层；语义 token 表见 `design-system.md` 第 3 节                                                             |

## 国际化硬约束

1. 用户可见文案必须通过 `t()` 或 i18next 资源读取，不在 JSX 里写裸字符串。
2. 三套 locale 文件必须 key 集合一致：`pnpm --filter web i18n:check` 是机器门禁。
3. key 命名使用 `feature.scope.key`，禁止 `text1` / `msg` 这类无意义 key。
4. 复数、日期、数字优先用 i18next / Intl 能力，不手拼多语言文案。
5. 用户可见错误文案优先对接后端错误码 catalog；前端不要另起一套翻译事实。

## 样式与 UI 工程边界

本节只覆盖样式文件的构建/分层职责；具体应该用哪个 token、哪个组件、什么状态规范，以 `design-system.md` 为准，不在本文件重复。

- `apps/web/styles/main.css` 只作为样式入口，负责按顺序 import。
- `apps/web/styles/tailwind.css` 只负责 Tailwind theme、Tailwind layer 入口和 `@layer base` 默认样式；语义 token 的命名和分组必须遵循 `design-system.md` 第 3 节，禁止在此新增未经该文件登记的裸值颜色/间距。
- `apps/web/styles/app.css` 负责应用壳层和通用语义 class，统一放进 `@layer components`。
- Tailwind v4 必须显式使用 `@layer theme, base, components, utilities;`。
- 表单控件、按钮、Select trigger 默认圆角使用 shadcn `rounded-lg` / `var(--radius)` / 10px。
- Select / Dropdown / Menu 必须优先使用 `apps/web/components/ui/*` 的 shadcn-compatible primitives；不要使用原生 `<select>` 或业务页内手写 floating dropdown。这类浮层组件的 z-index 归属和受控挂载方式遵循 `overlay-conventions.md`，业务调用点禁止覆盖 z-index。
- Motion 动效要克制，优先 opacity / translate / scale 等低干扰过渡；不要用动效改变信息层级或操作路径。
- 新增 UI 先复用 `components/ui` 或现有 feature 组件；新增 production UI 依赖必须在 PR 或变更说明中写明理由。

## Vite / TanStack Router 边界

- Vite 是唯一开发、预览和打包入口；不要引入其他前端 runtime 或路由框架作为运行层。
- TanStack Router 负责 SPA 路由。路由源码按 File Route 形态维护在 `apps/web/app/routes/`。
- `@tanstack/router-plugin` 在 Vite 中生成 `apps/web/app/routeTree.gen.ts`；业务代码不得恢复手写 route tree。
- `apps/web/app/router.tsx` 保留为 router instance 入口，负责 `createRouter({ routeTree })` 和 `@tanstack/react-router` 类型注册；File Routes 生成的是 route tree，不替代 router instance。
- 当前应用按 SPA/client-first 方式实现；不要引入 Server Actions、API Routes、Edge Runtime 或后端 BFF，除非先完成架构评审并更新本文件。
- 每次变更路由或 Vite 配置时，运行 `pnpm typecheck`、`pnpm build`，必要时启动 `pnpm dev` 做路由 smoke check。

## 验证命令

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm --filter web i18n:check
pnpm --filter web test
pnpm build
```

> 失效 Tailwind class 检查（对比源码引用的 class 名与编译产物，揪出编译不出 CSS 的死 class）尚未实现，脚本落地后将作为 `pnpm build` 后的强制步骤加入本清单，决策依据见 `ui-design-constraints.md`。在此之前，同一事项仍列在下方"未决雷达"中，不视为已生效的门禁。

## 未决雷达

- 组件测试覆盖范围和浏览器自动化策略。
- 视觉回归截图门禁。
- bundle budget 工具。
- 前端错误监控 + RUM。
- 从后端 OpenAPI / canonical 生成 client + 类型的工具链。
- CSP / 安全头策略。
- 浏览器 / 设备支持矩阵。
- 失效 Tailwind class 的机器检查脚本（CI 门禁位置已定，见上方"验证命令"，具体实现待写；决策背景见 `ui-design-constraints.md`）。
- 语义 token 化的渐进式迁移执行进度（overlay 类组件优先，见 `ui-design-constraints.md` 的迁移顺序），当前尚未开始按 PR 拆分执行。
