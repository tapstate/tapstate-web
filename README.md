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
│   │   ├── DESIGN.md                      UI 视觉与组件规范
│   │   ├── design-system.md               共享 token 与组件契约
│   │   ├── tech-stack.md                  技术栈登记 + 未决雷达
│   │   └── ui/                            完整页面/组件/token 研究与执行手册
├── AGENTS.md                          Codex / agent 项目规则
├── CLAUDE.md                          Claude Code 项目入口
├── .agents/                           Codex repo-scoped skills
├── .claude/                           Claude Code path rules
├── apps/
│   ├── cloud/                         独立 Cloud Console（Vite + React + TanStack Router）
│   └── web/                           Cluster Console / on-prem 主应用（Vite + React + TanStack Router）
│       ├── app/                           Vite 入口、router、route tree 与 routes
│       ├── components/                    跨 feature 复用组件与应用壳
│       ├── features/                      页面级业务模块
│       ├── i18n/                          i18next 初始化与 locales
│       ├── service/                       API client / DTO adapter
│       ├── stores/                        Zustand stores
│       ├── styles/                        main.css / tailwind.css / app.css
│       └── utils/
├── packages/                          shared component and form packages
├── .vscode/                           i18n Ally 配置（Cursor 预览国际化）
├── tsconfig.base.json                 strict + noImplicitAny
└── pnpm-workspace.yaml
```

## 前置与启动

需要 Node 20+ 与 pnpm 9+。

```sh
pnpm install
pnpm dev          # Vite dev server → http://localhost:5173
pnpm --filter cloud dev  # Cloud Console → http://localhost:5174
pnpm format       # OXC formatter writes supported repo files in place
pnpm build        # Vite build
pnpm --filter cloud build
pnpm typecheck
pnpm lint         # oxlint diagnostics + repo-wide format check
```

格式约定由根目录 `.oxfmtrc.json` 控制；根级 `pnpm format` / `pnpm lint` 直接在 repo root 执行 OXC，因此 root 与 `apps/*` 内的受支持文件都会吃到同一套配置。当前显式收敛为 2 空格缩进、单引号、JS/TS 语句末尾不加分号。

本项目使用 Vite + TanStack Router：

- Vite 负责本地开发服务器、预览与打包产物。
- Web 部署形态由 Vite mode 决定：本地默认 mode 和 `onprem` 使用 on-prem 行为，`cloud` 启用云版专属行为。分别用 `pnpm --filter web dev --mode onprem`、`pnpm --filter web dev --mode cloud` 启动；打包时对应使用 `pnpm --filter web build --mode onprem` 或 `pnpm --filter web build --mode cloud`。
- Cloud build 的 401 和 `/login` 会整页返回 Cloud Console；`*.cloud.tapstate.com` 集群运行时返回 `https://cloud.tapstate.com/`，`*.dev.cloud.tapstate.com` 返回 `https://dev.cloud.tapstate.com/`。其他自定义主机可用 `VITE_CLOUD_CONSOLE_URL` 指定返回地址，未配置时使用 dev 预览地址。显式退出先结束当前 Cluster 会话，再请求 Cloud Console 全局退出，并在 Cloud 退出成功或会话已失效时整页跳转至 Cloud `/auth`。其他 Cloud 退出错误会留在当前页面并允许重试。
- TanStack Router 负责 SPA 路由；路由源码按 File Routes 形态维护在 `apps/web/app/routes/`，由 `@tanstack/router-plugin` 生成 `apps/web/app/routeTree.gen.ts`。
- Cloud Console 在 `apps/cloud` 独立构建；使用同一套 File Routes / Oxlint / OXC / i18next 基线，业务路由在认证接通前默认拒绝访问。
- 当前仍按 SPA / client-first 落地；不引入 SSR、Server Actions、API Routes 或 BFF。
- 本地 Cloud / Cluster 联调使用 [仓库启动器](docs/engineering/local-cloud-preview.md)，每次显式输入远端 origin。

依赖版本以各 `package.json` 的 `^` 范围为准；lockfile 以实际 install 为准。

## Agent 工作约定

本仓库使用一套 Codex / Claude Code 共享规则：

- Codex 读取 `AGENTS.md`。
- Claude Code 读取 `CLAUDE.md`，并通过 `@AGENTS.md` 导入同一套规则。
- 项目处于早期阶段，默认直接按范围实现；较大改动在聊天、issue 或 PR 中记录范围、风险与验证结果。
- UI 改动必须遵循 `UI_DESIGN_GUIDELINES.md`、`docs/engineering/DESIGN.md` 和 `docs/engineering/design-system.md`。

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

- 产品内 UI 规范见 `docs/engineering/DESIGN.md`，共享变量和组件 API 见 `docs/engineering/design-system.md`。
- Web 和 Cloud 直接使用 `@tapstate-web/ui/<component>` 公共子路径；包内 `src/` 保持组件源目录结构。Base UI 承担底层交互；应用适配器只处理 Formily、i18n 和路由等应用行为。
- `apps/web/styles/main.css` 和 `apps/cloud/app/styles/main.css` 汇总各自样式入口；组件样式和内容 token 以 `packages/ui` 为准。
- Tailwind CSS v4 使用 CSS-first token，并显式声明 `@layer theme, base, components, utilities;`。
- `.app-shell`、`.app-shell__main`、Cloud `.main-surface` 及其主题行为由各应用维护，UI 组件不得重设外层布局和表面。
- Select / Dropdown / Menu 使用共享 primitive，不在业务页使用原生 `<select>` 或手写 floating dropdown。

UI 规范、组件导出或研究目录变更运行 `pnpm ui:docs:check`。完整源码研究通过 `docs/engineering/ui/README.md` 按任务加载，静态覆盖不能代替页面渲染与交互验收。
