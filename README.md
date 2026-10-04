# tapstate-web

Tapstate 前端这条线的独立工作区，也是企业级 Web 应用本体。仓库同时收拢两样东西：

- **前端设计 / IA / 技术栈思考**（`docs/`）
- **前端代码**（pnpm monorepo：Vite + React 19 + TanStack Router File Routes + Tailwind CSS + TanStack Query + Zustand + i18next + Motion）

## 治理定位

- **memory 仓不追踪本目录**（见 `memory/.gitignore` 的 `/tapstate-web/`）。跟 `memory/tapstate/` 同等待遇：嵌套工作区，不进 memory 版本控制。
- 本目录是独立 git 仓。文档与代码都进它自己的版本控制。
- **两层规则**：全局底座是 `memory/AGENTS.md`（walk-up 自动加载，前端同样生效）；前端专属约束叠在本目录的 `AGENTS.md`、`CLAUDE.md`、`.agents/skills/`、`.claude/rules/`、`docs/` 与配置里（oxlint / i18next / tsconfig）。
- 与 memory 的关系：本目录是**消费方**——依据 `memory/research/legacy-feature-inventory.md` 与 `memory/reference/canonical-form.md` 做设计；memory 侧的决策和进度记录不沉淀在这。

## 目录结构

```text
tapstate-web/
├── docs/                              产品与工程文档
│   ├── README.md                          文档地图
│   ├── product/
│   │   └── information-architecture.md    顶层 IA / 菜单设计
│   └── engineering/
│   │   ├── design-system.md               shadcn 对齐的设计系统规范
│   │   └── tech-stack.md                  技术栈登记 + 未决雷达
├── AGENTS.md                          Codex / agent 项目规则
├── CLAUDE.md                          Claude Code 项目入口
├── .agents/                           Codex repo-scoped skills
├── .claude/                           Claude Code path rules
├── apps/
│   └── web/                           主应用（Vite + React + TanStack Router）
│       ├── app/                           Vite 入口、router、route tree 与 routes
│       ├── components/                    跨 feature 复用组件与应用壳
│       ├── features/                      页面级业务模块
│       ├── i18n/                          i18next 初始化与 locales
│       ├── service/                       API client / DTO adapter
│       ├── stores/                        Zustand stores
│       ├── styles/                        main.css / tailwind.css / app.css
│       └── utils/
├── packages/                          共享包预留（ui / shared / design-tokens）
├── .vscode/                           i18n Ally 配置（Cursor 预览国际化）
├── tsconfig.base.json                 strict + noImplicitAny
└── pnpm-workspace.yaml
```

## 前置与启动

需要 Node 20+ 与 pnpm 9+。

```sh
pnpm install
pnpm dev          # Vite dev server → http://localhost:5173
pnpm format       # OXC formatter writes supported repo files in place
pnpm build        # Vite build
pnpm typecheck
pnpm lint         # oxlint diagnostics + repo-wide format check
```

格式约定由根目录 `.oxfmtrc.json` 控制；根级 `pnpm format` / `pnpm lint` 直接在 repo root 执行 OXC，因此 root 与 `apps/*` 内的受支持文件都会吃到同一套配置。当前显式收敛为 2 空格缩进、单引号、JS/TS 语句末尾不加分号。

本项目使用 Vite + TanStack Router：

- Vite 负责本地开发服务器、预览与打包产物。
- Web 部署形态由 Vite mode 决定：本地默认 mode 和 `onprem` 使用 on-prem 行为，`cloud` 启用云版专属行为。分别用 `pnpm --filter web dev --mode onprem`、`pnpm --filter web dev --mode cloud` 启动；打包时对应使用 `pnpm --filter web build --mode onprem` 或 `pnpm --filter web build --mode cloud`。
- Cloud build 的 401 和 `/login` 会整页返回 `VITE_CLOUD_CONSOLE_URL`；显式退出只结束当前 Cluster 会话并停留在 Cluster 的退出完成页。Week 2 预览默认值为 `https://dev.cloud.tapstate.com/`，其他环境打包时必须显式覆盖。
- TanStack Router 负责 SPA 路由；路由源码按 File Routes 形态维护在 `apps/web/app/routes/`，由 `@tanstack/router-plugin` 生成 `apps/web/app/routeTree.gen.ts`。
- 当前仍按 SPA / client-first 落地；不引入 SSR、Server Actions、API Routes 或 BFF。

依赖版本以各 `package.json` 的 `^` 范围为准；lockfile 以实际 install 为准。

## Agent 工作约定

本仓库使用一套 Codex / Claude Code 共享规则：

- Codex 读取 `AGENTS.md`。
- Claude Code 读取 `CLAUDE.md`，并通过 `@AGENTS.md` 导入同一套规则。
- 项目处于早期阶段，默认直接按范围实现；较大改动在聊天、issue 或 PR 中记录范围、风险与验证结果。
- UI 改动必须遵循 `UI_DESIGN_GUIDELINES.md` 和 `docs/engineering/design-system.md`。

## 国际化（i18n）

- 方案：**i18next + react-i18next**。
- 结构：`apps/web/i18n/locales/<locale>.json`，文件名 = locale；当前维护 `en` / `zh-CN` / `zh-TW` 三套。
- React 页面和组件通过 `useTranslation()` 获取 `t()`。
- **硬门禁**：用户可见文案必须走 i18next；新增 key 必须同步三套 locale，并运行 `pnpm --filter web i18n:check`。

### IDE 预览（Cursor / VS Code）

1. 装扩展 **i18n Ally**（`lokalise.i18n-ally`）—— `.vscode/extensions.json` 已声明推荐。
2. 打开 React 组件，`t('xxx')` 旁会内联显示当前语言的文案；缺失 key 高亮；支持跳转到 locale 文件。
3. 路径与结构已在 `.vscode/settings.json` 配好（`pathMatcher: {locale}.json`，`namespace: false`）。

### 新增文案

1. 在三个 locale 文件（`en` / `zh-CN` / `zh-TW`）里加**同一个 key**。
2. 组件里通过 `t('key.path')` 引用。
3. 运行 `pnpm --filter web i18n:check` 校验三套 key 一致性。

## 企业级约束（摘要）

详见 `docs/engineering/tech-stack.md` 和 `docs/engineering/design-system.md`。要点：strict TypeScript、避免 `any`、i18next 三语一致、React 页面四态、TanStack Router 管路由、TanStack Query 管服务端状态、Zustand 管客户端会话 / UI 状态、Motion 管轻量动效、错误文案对接后端错误码 catalog、bundle budget 持续雷达。

### 样式基线

- shadcn 对齐的整体设计规范见 `docs/engineering/design-system.md`；新增 UI 先按 token、组件状态、Radix 可访问语义和工作台密度规则执行。
- 表单控件、按钮和 Select trigger 默认圆角按 shadcn `rounded-lg` / `var(--radius)` / `10px` 落地。
- `apps/web/styles/main.css` 只做入口汇总；Tailwind、应用语义样式拆到独立文件。
- Tailwind CSS 优先用于布局和局部样式表达，项目显式使用 `@layer theme, base, components, utilities;`。
- shadcn 组件是代码资产，不是黑盒依赖；需要沉淀时放进 `apps/web/components/ui/`，先保持 API、状态和 a11y 行为稳定。
- Select / Dropdown / Menu 使用 `apps/web/components/ui/*` 的 shadcn-compatible primitives，不在业务页使用原生 `<select>` 或手写 floating dropdown。
- `text-[13px]` 这类 utility 应该能覆盖 `@layer base` 默认字号；如果没有生效，先检查是否被未分层 CSS 或更具体选择器覆盖。
