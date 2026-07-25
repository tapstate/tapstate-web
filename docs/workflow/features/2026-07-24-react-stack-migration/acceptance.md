# React Technology Stack Migration Acceptance

> 日期：2026-07-24
> Feature folder：docs/workflow/features/2026-07-24-react-stack-migration/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

代码、依赖、目录结构、i18n、文档和构建链路已完成迁移并通过静态/构建门禁。2026-07-24 追加的运行时 smoke 已在 in-app browser 打开 `http://127.0.0.1:5174/` 并确认控制台无 error；完整主分支 / 迁移 worktree 桌面与移动视觉对比仍以 follow-up 形式交付。

2026-07-24 追加修复：vinext 启动后页面报 `ERR_TOO_MANY_REDIRECTS`，根因是 `app/not-found.tsx` 在 404 边界无条件 `redirect('/sources')`，导致 `/sources` 落入 not-found 时形成 `/sources -> /sources` 自循环。已改为真实 i18next 404 页面，并通过 HTTP redirect 链验证。

2026-07-24 追加修复：i18n Ally 预览失效，根因是 `.vscode/settings.json` 仍指向旧 `apps/web/src/i18n/locales` 且 enabled framework 仍是 `vue`。已改为 `apps/web/i18n/locales` + `react-i18next` / `i18next`，并移除 Vue Volar / ESLint workspace hints。

2026-07-24 追加迭代：添加 Motion 依赖，新增 shadcn-compatible `Select` 和 `DropdownMenu` primitives，替换业务页原生 `<select>` 和 pipelines 手写 dropdown；浮层进入使用 Motion 轻量动效。

2026-07-24 追加修正：header 多语言切换也迁移到 `DropdownMenu`；创建数据源弹窗从原生 `<dialog>` 迁移到 Radix-backed `Dialog`。`DialogContent` 的 close label 改为必填 i18n 文案，避免组件默认裸英文。

2026-07-24 追加修正：`pnpm dlx shadcn@latest add dialog` 因 pnpm trust gate 阻止 transient shadcn CLI dependency graph，未直接落地。改用 shadcn official registry 的 `new-york/dialog` 模板合并 Dialog overlay/content/data-state 动画 class，并补齐 Tailwind v4 下缺失的 `animate-in/out` data-state utilities。

2026-07-24 追加修复：页面访问时报 `Cannot read properties of null (reading 'useContext')`，根因是 `apps/web` 曾被当作嵌套 pnpm 项目安装，可能让 app code 与 TanStack Router 跨 node_modules 边界解析 React；同时 app-pinned `shadcn@4.14.0` CLI 触发 `semver@6.3.1` trust downgrade。已清理嵌套安装残留、移除 `shadcn` CLI 运行依赖、将 CLI 样式 import 替换为本地 shadcn variant bridge，并补 Base UI wrapper 的 `asChild` / close props 兼容层。

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| 使用新 worktree 执行迁移，主分支保留视觉基线 | Passed | worktree：`/Users/xf/tapdata/github/memory/tapstate-web/.worktrees/react-migration`；branch：`codex/react-stack-migration` |
| Vue 3 全面转向 React 19 | Passed | active app moved from `apps/web/src/**/*.vue` to `apps/web/app` / `features` / `components` |
| Vite + TanStack Router，Vite 负责 dev/build/preview，TanStack Router 负责 SPA 路由 | Passed | scripts use `vite` / `vite build` / `vite preview`; route source kept under `apps/web/app/routes/` |
| Tailwind + shadcn + enterprise workspace style | Passed | Tailwind v4 layered CSS retained; local shadcn-compatible primitives added under `components/ui` |
| Motion 动效依赖 | Passed | `motion` added to `apps/web` dependencies; Select/Dropdown floating surface uses `motion/react` |
| Select / Dropdown 不使用原生控件或手写浮层 | Passed | active app source has no `<select>` / `<option>` residual; pipelines create menu moved to `DropdownMenu` |
| Header language switch / Dialog 使用 shadcn-compatible primitives | Passed | header language switch uses `DropdownMenu`; source create modal uses `Dialog` |
| Dialog 效果对齐 shadcn | Passed | Dialog uses shadcn registry overlay/content classes and compiled data-state animation utilities |
| TanStack Query + Zustand | Passed | Query provider and source data query added; auth/ui state moved to Zustand |
| i18next 替代 vue-i18n | Passed | `i18n/index.ts` + `react-i18next`; three locale files kept in parity |
| i18n Ally 可扫描新 locale 目录 | Passed | `.vscode/settings.json` points to `apps/web/i18n/locales` and enables `react-i18next` / `i18next` |
| oxlint 替代 eslint-era linting | Passed | `pnpm lint` uses `vp lint` / oxlint plugin set |
| AGENTS / README / engineering docs / templates 更新到新栈 | Passed | old Vue/Element/vue-i18n guidance removed from active docs |
| 页面样式布局暂时保留 | Partially verified | static/build/runtime smoke passed; full browser visual comparison pending |

## 3. 源稿 / 设计保真对照

| 对照项 | 结果 | 备注 |
|---|---|---|
| 标题 / toolbar / 主操作 | Source-level preserved | login, sources, pipelines, explorations keep existing workspace layout concepts |
| 页面布局与区域层级 | Source-level preserved | shell/sidebar/header/content/card/table structure retained in React components |
| 交互入口 | Source-level preserved | route nav, language switch, Ask Tapstate, create source entry retained |
| 未引入源稿外产品 UI | Passed | no marketing hero or unrelated UI expansion |
| Desktop/mobile rendered comparison | Blocked | Browser policy rejected localhost visual check |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `pnpm install` | Passed | `shadcn` CLI not pinned due trust gate; local primitives used |
| `pnpm lint` | Passed with warnings | 2 dynamic Lucide icon a11y warnings; command exit 0 |
| `pnpm --filter web i18n:check` | Passed | keys match across `en`, `zh-CN`, `zh-TW` |
| `pnpm --filter web typecheck` | Passed | `tsc --noEmit` |
| `pnpm --filter web test` | Passed | 3 files / 4 tests |
| `.vscode/settings.json` / `.vscode/extensions.json` JSON parse | Passed | workspace editor config remains valid JSON |
| `pnpm build` | Passed | Vite build |
| `pnpm install` after shadcn dependency cleanup | Passed | trust policy passed; no `semver@6.3.1` downgrade error |
| React module realpath probe | Passed | app React and TanStack Router React resolve to the same root `react@19.2.8` file |
| in-app browser smoke for `http://127.0.0.1:5174/` | Passed | routed to `/login`; console error log empty; `useContext` crash not reproduced |
| `curl -I http://localhost:5174/sources` | Passed | returns 200 after redirect fix |
| `curl -I http://localhost:5174/login` | Passed | returns 200 after redirect fix |
| `curl -I -L --max-redirs 5 http://localhost:5174/` | Passed | `/` redirects once to `/sources`, then 200 |
| `curl -I -L --max-redirs 5 http://localhost:5174/does-not-exist` | Passed | unknown route returns 404, no redirect loop |
| residual scan | Passed | no Vue-era active dependency/import/file residual in app/docs/package scan |
| `rg "<select|</select|<option" apps/web` | Passed | no native select / option residual in active app source |
| `rg "<dialog|</dialog|<details|<summary" apps/web` | Passed | no native dialog/details/summary residual in active app source |
| compiled CSS scan for shadcn dialog animation selectors | Passed | `data-[state=open]:animate-in`, zoom and slide selectors are present in Vite output |
| 桌面视口检查 | Follow-up | runtime smoke passed; main-vs-worktree visual comparison pending |
| 移动视口检查 | Follow-up | runtime smoke passed; main-vs-worktree visual comparison pending |

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Passed by source review | Sources and page previews expose loading states |
| Empty | Passed by source review | Sources/pipelines/explorations empty states retained |
| Error | Passed by source review | Query and preview error states retained |
| Success | Passed by source review | Main success/table/content states retained |
| Disabled / validation / submitting | Passed by tests/source review | login/source-create flows include disabled/submitting/error handling |

## 6. 剩余风险

- 真实浏览器运行时 smoke 已完成；完整视觉截图对比未完成，仍建议用户本机复核 `/login`、`/sources`、`/pipelines`、`/explorations` 的 desktop/mobile。
- `pnpm lint` 保留 2 个动态 Lucide icon a11y warning，命令通过；后续可用统一 IconCell/ActionButton 抽象消除。
- `shadcn` CLI 因 pnpm trust gate 未作为项目依赖固定；当前落地为 `components.json` + local shadcn-compatible primitives。
- 404 边界已禁止 redirect 到业务路由；后续如果需要 “not found 后回工作区”，必须渲染链接或按钮，由用户主动点击。
