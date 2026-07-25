# React Technology Stack Migration Plan

> 状态：Done with follow-up
> 进度：100%
> 当前步骤：Handoff
> 下一步：用户在本机浏览器中做主分支 / 迁移 worktree 的完整桌面与移动视觉对比，确认后再决定是否提交/PR
> 日期：2026-07-24
> Owner：Tapstate Web
> Feature folder：docs/workflow/features/2026-07-24-react-stack-migration/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：已确认。
- Prototype 已确认 / 已说明跳过：已确认。
- 非目标已确认：已确认；不引入 SSR、Server Actions、API Routes、后端 BFF 或 UI 重设计。
- 是否新增依赖：是，React 19 / TanStack Router / TanStack Query / Zustand / i18next / Radix / shadcn-compatible primitives / oxlint。
- 是否影响 IA / 权限 / 数据契约：影响前端目录、路由和 auth gate；不改后端 API 契约。
- 是否使用新 worktree：是。实际路径为 `/Users/xf/tapdata/github/memory/tapstate-web/.worktrees/react-migration`，分支 `codex/react-stack-migration`。主 worktree `/Users/xf/tapdata/github/memory/tapstate-web` 保留为视觉基线。

## 2. Target Stack

| Layer | Decision |
|---|---|
| Runtime / build | Vite via `vite`, `vite build`, `vite preview` |
| Routing semantics | TanStack Router; route source kept in file-based shape under `apps/web/app/routes/` |
| UI framework | React 19 |
| Styling | Tailwind CSS v4 + semantic `styles/app.css` |
| UI primitives | Local shadcn-compatible `components/ui/*` primitives backed by Radix where useful |
| Motion | Motion for lightweight floating surface and state transition animation |
| Server state | TanStack Query |
| Client state | Zustand |
| i18n | i18next + react-i18next, `en` / `zh-CN` / `zh-TW` key parity |
| Lint | oxlint through `vite-plus` lint command |

Current SPA/client-first boundary remains. Next/vinext is no longer part of the runtime, dependency graph, or route API surface. `@tanstack/router-plugin` is still blocked by pnpm supply-chain trust gate, so the file-based route source is wired through a hand-written `app/route-tree.tsx` until the plugin is approved.

## 3. Target Directory Shape

```text
apps/web
├── app
│   ├── main.tsx
│   ├── router.tsx
│   ├── route-tree.tsx
│   ├── styles.ts
│   └── routes/
│       ├── __root.tsx
│       ├── providers.tsx
│       ├── _authenticated.tsx
│       ├── _authenticated/
│       │   ├── sources.tsx
│       │   ├── pipelines.tsx
│       │   └── explorations.tsx
│       ├── login.tsx
│       ├── index.tsx
│       └── not-found.tsx
├── components
│   ├── layout/
│   └── ui/
├── features
│   ├── ask-tapstate/
│   ├── explorations/
│   ├── pipelines/
│   └── sources/
├── i18n
│   ├── index.ts
│   └── locales/{en,zh-CN,zh-TW}.json
├── service
├── stores
├── styles
└── utils
```

Old `apps/web/src/**/*.vue`, Vue router, Pinia, Element Plus, vue-i18n, Next, and vinext files are removed in this worktree.

## 4. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 创建 `.worktrees/react-migration` worktree，分支 `codex/react-stack-migration` | `git status --short` | 主 worktree 保留视觉基线 |
| 2 | Done | 更新 root 与 `apps/web` scripts/dependencies；移除 Vue/Next/vinext 栈依赖 | `pnpm install`; `vp lint --help` | `shadcn` CLI 不 pin 为依赖，避免 pnpm trust gate |
| 3 | Done | 配置 `vite.config.ts`、`tsconfig*`、aliases、Tailwind plugin、React JSX | `pnpm --filter web typecheck` | Vite 负责 dev/build/preview |
| 4 | Done | 新增 shadcn-compatible `components/ui/*` primitives | `pnpm lint`; `pnpm --filter web typecheck` | Button/Input/Dialog/Badge/Table/Skeleton/Alert/Select/DropdownMenu |
| 5 | Done | 新增 TanStack Router root、route tree、providers、QueryClient、i18next provider | `pnpm build` | client-first SPA |
| 6 | Done | 迁移 auth/session 到 Zustand 与 `/login` | `auth-session.test.ts`; `pnpm --filter web test` | 保持 sessionStorage token 行为 |
| 7 | Done | 迁移 source API client、filter、form validation 到 `service/` / `features/sources` | source form/filter tests | 不改 API 契约 |
| 8 | Done | 迁移 shell：sidebar/header/Ask Tapstate/AppShell | `pnpm build` | 保留工作台布局 |
| 9 | Done | 迁移 `/sources`、`/pipelines`、`/explorations` 页面到 TanStack Router routes | `pnpm build` | 样式布局尽量延续原 Vue 页面 |
| 10 | Done | 迁移 i18n locale 和 React `useTranslation()` | `pnpm --filter web i18n:check` | 三套 key 一致 |
| 11 | Done | 删除 Vue-era production files/deps/CSS | `rg` residual scan | `apps/web/src` 删除，保留新 `styles/*` |
| 12 | Done | 更新 AGENTS、README、工程文档、workflow 模板 | residual scan | 硬规则切到 React/i18next/oxlint |
| 13 | Done with follow-up | 浏览器运行时 smoke；桌面/移动目检待复核 | in-app browser 打开 `http://127.0.0.1:5174/`；console error 为空 | 运行时崩溃已复核；完整视觉对比仍建议用户本机执行 |
| 14 | Done | 清理 Next-era `'use client'` 文件头残留 | `rg "^['\"]use client['\"]"`; `pnpm lint`; `pnpm --filter web typecheck` | 纯 Vite SPA 不需要该 directive |
| 15 | Done | 修正 i18n Ally workspace 配置到 React/i18next 与新 locale 路径 | JSON parse; `pnpm --filter web i18n:check`; residual scan | `.vscode/settings.json` 不再指向 Vue-era `apps/web/src/i18n/locales` |
| 16 | Done | 添加 Motion；新增 shadcn-compatible Select / DropdownMenu primitives；替换业务页原生 select 和手写 dropdown | `rg "<select|<option"`; `pnpm lint`; `pnpm --filter web typecheck`; `pnpm --filter web test`; `pnpm --filter web i18n:check`; `pnpm build` | Dropdown/Select 浮层使用 Motion 轻量进入动效 |
| 17 | Done | 将 header 多语言切换迁移到 `DropdownMenu`，将创建数据源弹窗迁移到 `Dialog` | `rg "<dialog|<details|<summary"`; `pnpm lint`; `pnpm --filter web typecheck`; `pnpm --filter web i18n:check`; `pnpm build` | `DialogContent` close label 必须由调用方传入 i18n 文案 |
| 18 | Done | 按 shadcn official registry 对齐 Dialog 动画和结构；补 `animate-in/out` data-state utilities | `pnpm dlx shadcn@latest add dialog`; registry fetch; `pnpm lint`; `pnpm --filter web typecheck`; `pnpm build`; compiled CSS scan | pnpm trust gate 阻止 CLI 安装，改为从 shadcn registry 合并模板 |
| 19 | Done | 清理嵌套 pnpm 安装残留与 `shadcn` CLI 运行依赖；补 Base UI wrapper 的 shadcn/Radix API 兼容层 | `pnpm install`; React realpath probe; `pnpm --filter web typecheck`; in-app browser console smoke | 解决 `useContext` null crash 与 `ERR_PNPM_TRUST_DOWNGRADE` |

## 5. Progress Log

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-24 | Codex | 0% | Draft spec/prototype/plan prepared for confirmation | Await user approval and model handoff | None |
| 2026-07-24 | Codex | 8% | Created migration worktree `.worktrees/react-migration` on `codex/react-stack-migration`; copied feature docs | Update package scripts and dependencies | None |
| 2026-07-24 | Codex | 12% | Switched package scripts/deps to React/vinext; pnpm trust gate rejected project-pinned `shadcn` CLI | Install without shadcn CLI and provide local shadcn-compatible primitives | None |
| 2026-07-24 | Codex | 60% | React app shell, routes, stores, i18n, source/pipeline/exploration pages ported | Run gates and update docs | None |
| 2026-07-24 | Codex | 90% | AGENTS/README/engineering docs/templates updated; lint warnings reduced; full build passed | Browser visual check | Browser policy blocked localhost 5174 navigation |
| 2026-07-24 | Codex | 95% | acceptance drafted; build artifacts cleaned | User visual comparison and optional commit/PR | Browser visual check still pending |
| 2026-07-24 | Codex | 96% | Fixed vinext `ERR_TOO_MANY_REDIRECTS` caused by `not-found` redirecting to `/sources`; verified `/`, `/sources`, `/login`, unknown route HTTP status | User visual comparison and optional commit/PR | Browser visual screenshot check still pending |
| 2026-07-24 | Codex | 97% | Removed Next/vinext runtime and route API surface; switched scripts to Vite + TanStack Router; cleaned all Next-era `'use client'` headers | User visual comparison and optional commit/PR | Browser visual screenshot check still pending |
| 2026-07-24 | Codex | 98% | Fixed i18n Ally preview config: locale path now `apps/web/i18n/locales`, frameworks now `react-i18next` / `i18next`; removed Vue Volar / ESLint workspace hints | User visual comparison and optional commit/PR | Browser visual screenshot check still pending |
| 2026-07-24 | Codex | 99% | Added Motion dependency; introduced `components/ui/select.tsx` and `components/ui/dropdown-menu.tsx`; replaced native selects and pipelines hand-written dropdown | User visual comparison and optional commit/PR | Browser visual screenshot check still pending |
| 2026-07-24 | Codex | 99% | Migrated header language switch to shadcn-compatible `DropdownMenu`; migrated source-create modal to Radix-backed `Dialog` | User visual comparison and optional commit/PR | Browser visual screenshot check still pending |
| 2026-07-24 | Codex | 99% | `pnpm dlx shadcn@latest add dialog` blocked by pnpm trust gate; fetched official shadcn dialog registry and merged animation/overlay/content classes; added compiled data-state animation utilities | User visual comparison and optional commit/PR | Browser visual screenshot check still pending |
| 2026-07-24 | Codex | 100% | Removed nested `apps/web` pnpm project artifacts from filesystem; removed app-pinned `shadcn` CLI dependency; replaced `shadcn/tailwind.css` import with local variant bridge; added Base UI `asChild` / close props compatibility; verified browser console has no `useContext` crash | User visual comparison and optional commit/PR | Full desktop/mobile visual comparison still pending |

## 6. TDD / Verification Strategy

- Unit checks:
  - auth session read/write/clear.
  - source filter helper.
  - source form validation.
- Static checks:
  - i18n key parity across `en` / `zh-CN` / `zh-TW`.
  - residual scan for Vue-era imports/dependencies/files.
  - residual scan for Next/vinext imports, dependencies, config files, and `'use client'` directives.
  - residual scan for native `<select>` / `<option>` in active app code.
  - residual scan for native `<dialog>` / `<details>` / `<summary>` in active app code.
- Build checks:
  - `pnpm lint`
  - `pnpm --filter web typecheck`
  - `pnpm --filter web test`
  - `pnpm build`
- Manual visual checks:
  - Intended: compare main worktree on 5173 and migration worktree on 5174 at desktop/mobile viewports.
  - Actual: in-app browser smoke test opened `http://127.0.0.1:5174/`, routed to `/login`, and console error log was empty. Full desktop/mobile visual comparison is still pending.

## 7. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-24 | Sandbox registry DNS failed against npm registry | Network blocked in sandbox | Retried dependency operations with approved network escalation | Dependencies installed successfully |
| 2026-07-24 | `pnpm install` blocked after adding `shadcn` CLI | pnpm trust gate rejected transitive `@babel/core@7.29.7` downgrade window | Removed `shadcn` CLI as project dependency, kept `components.json` and local shadcn-compatible primitives | Avoid pinning CLI in app dependency graph |
| 2026-07-24 | `sharp` build script ignored | pnpm build approval required | `pnpm approve-builds sharp`, then `pnpm install` | Install succeeded |
| 2026-07-24 | dev server failed with `listen EPERM ::1:5174` | sandbox blocked local port listen | reran `pnpm --filter web dev -- -p 5174` with approved escalation | dev server started |
| 2026-07-24 | Browser rejected `http://localhost:5174` navigation | browser security policy blocks that localhost target | stopped browser work and dev server | Manual visual check remains pending |
| 2026-07-24 | vinext 页面访问报 `ERR_TOO_MANY_REDIRECTS` | `app/not-found.tsx` 无条件 `redirect('/sources')`，当 `/sources` 请求落入 not-found 时形成 `/sources -> /sources` 自循环 | `curl -I http://localhost:5174/sources` returned `307 location: /sources`; changed not-found to render a real i18next 404 page | `/sources` and `/login` return 200; unknown route returns 404; `/` redirects once to `/sources` then 200 |
| 2026-07-24 | `pnpm dlx shadcn@latest add dialog` failed | pnpm supply-chain trust gate blocked transient shadcn CLI dependency graph | fetched `https://ui.shadcn.com/r/styles/new-york/dialog.json` with `curl` and merged official dialog template manually | Dialog effect now follows shadcn overlay/content data-state animation classes without bypassing trust policy |
| 2026-07-24 | Browser crashed with `Cannot read properties of null (reading 'useContext')` in TanStack Router `Matches` | `apps/web` had become a nested pnpm project, so app code and TanStack Router could resolve React across different node_modules boundaries | removed nested `apps/web/node_modules` to a temp backup, removed nested lock/workspace files from filesystem, ran root `pnpm install`, and compared app React vs router React realpaths | both now resolve to the same root React path; in-app browser opened `/login` with no console errors |
| 2026-07-24 | Root `pnpm install` failed with `[ERR_PNPM_TRUST_DOWNGRADE]` for `semver@6.3.1` | app-pinned `shadcn@4.14.0` CLI pulled a transient Babel dependency chain blocked by workspace trust policy | removed `shadcn` from `apps/web/package.json`; replaced `@import "shadcn/tailwind.css"` with local `styles/shadcn.css`; reran root `pnpm install` | install passed with `trustPolicy: no-downgrade` intact |

## 8. Review Checklist

- [x] 功能满足 spec 的工程迁移目标。
- [x] 没有引入 SSR、Server Actions、API Routes、BFF 或 UI 重设计。
- [x] 用户可见文案走 i18next；三套 locale key 同步。
- [x] Loading / empty / error / success 四态在迁移页面中保留。
- [x] 表单 disabled / validation / submitting 可用。
- [x] 新增 shadcn-compatible primitives，并保留 shadcn token/radius/工作台风格。
- [x] Select / Dropdown 使用 shadcn-compatible primitives；浮层进入使用 Motion 轻量动效。
- [x] Header 多语言切换和创建数据源弹窗使用 shadcn-compatible primitives。
- [x] Vite build 与 TanStack Router route wiring 已验证。
- [x] 不存在 Vue-era production dependency 或 `.vue` 源文件残留。
- [x] TypeScript、lint、build 结果记录清楚。
- [ ] 桌面和移动视口无明显溢出、重叠、错位：浏览器策略阻塞，待用户本机复核。

## 9. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-24 | `pnpm install` | Passed | `shadcn` CLI 未作为项目依赖；`sharp` build approved |
| 2026-07-24 | `pnpm --filter web exec vp lint --help` | Passed | vite-plus lint CLI 可用 |
| 2026-07-24 | `pnpm lint` | Passed with warnings | 2 个动态 Lucide 图标 a11y warning；命令 exit 0 |
| 2026-07-24 | `pnpm --filter web i18n:check` | Passed | 三套 locale key 一致 |
| 2026-07-24 | `pnpm --filter web typecheck` | Passed | `tsc --noEmit` |
| 2026-07-24 | `pnpm --filter web test` | Passed | 3 files / 4 tests；Vite 9 alias deprecation warning 来自工具链 |
| 2026-07-24 | `pnpm build` | Passed | Vite build |
| 2026-07-24 | residual scan for Vue-era stack | Passed | no residual in active app/docs/package targets; Next config `eslint` field excluded as valid config key |
| 2026-07-24 | `rg "^['\"]use client['\"]" apps/web` | Passed | no Next-era client directive residual |
| 2026-07-24 | `.vscode/settings.json` / `.vscode/extensions.json` JSON parse | Passed | workspace editor config remains valid JSON |
| 2026-07-24 | residual scan for i18n Ally Vue-era config | Passed with historical-doc matches | active `.vscode` config clean; older completed feature docs still reference old Vue paths as history |
| 2026-07-24 | `rg "<select|</select|<option" apps/web` | Passed | no native select / option residual in active app source |
| 2026-07-24 | `rg "<dialog|</dialog|<details|<summary" apps/web` | Passed | no native dialog/details/summary residual in active app source |
| 2026-07-24 | `pnpm --filter web test` | Passed | 3 files / 4 tests |
| 2026-07-24 | `pnpm build` | Passed | Vite build; bundle-size warning remains |
| 2026-07-24 | compiled CSS scan for shadcn dialog animation selectors | Passed | `data-[state=open]:animate-in`, zoom and slide selectors are present in Vite output |
| 2026-07-24 | `pnpm install` after shadcn dependency cleanup | Passed | trust policy passed; no `semver@6.3.1` downgrade error |
| 2026-07-24 | React module realpath probe | Passed | app React and TanStack Router React resolve to the same root `react@19.2.8` file |
| 2026-07-24 | in-app browser smoke for `http://127.0.0.1:5174/` | Passed | routed to `/login`; console error log empty; `useContext` crash not reproduced |
| 2026-07-24 | desktop/mobile visual browser check | Follow-up | runtime smoke passed; full main-vs-worktree visual comparison still pending |
| 2026-07-24 | `curl -I http://localhost:5174/sources` | Passed | returns 200 after redirect fix |
| 2026-07-24 | `curl -I http://localhost:5174/login` | Passed | returns 200 after redirect fix |
| 2026-07-24 | `curl -I -L --max-redirs 5 http://localhost:5174/` | Passed | `/` returns 307 to `/sources`, then 200 |
| 2026-07-24 | `curl -I -L --max-redirs 5 http://localhost:5174/does-not-exist` | Passed | unknown route returns 404, no redirect loop |

## 10. Finish Notes

- 交付摘要：Vue 3 app 已迁移为 React 19 + Vite + TanStack Router + Tailwind + TanStack Query + Zustand + i18next + Motion + shadcn-compatible primitives + oxlint。
- 最终进度：100%。
- 最终步骤：代码和文档迁移完成；浏览器视觉验收待用户本机复核。
- 剩余风险：
  - 迁移后的页面已完成运行时 smoke，但尚未完成主分支 / 迁移 worktree 的桌面与移动截图对比。
  - `pnpm lint` 有 2 个动态 Lucide icon 相关 a11y warning，命令通过；后续可通过抽象 IconCell 组件或规则配置消除。
  - `not-found` 已改为真实 404 页面，不能再在 404 边界内重定向到业务路由。
- Follow-up：
  - 用户在本机分别启动主 worktree 和 `.worktrees/react-migration`，对 `/login`、`/sources`、`/pipelines`、`/explorations` 做桌面/移动视觉对比。
  - 视觉确认后再决定是否 commit / push / PR。
