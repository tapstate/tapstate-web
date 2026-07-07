# cyntex-web

Cyntex 前端这条线的独立工作区,也是企业级 Web 应用本体。收拢两样东西:

- **前端设计 / IA / 技术栈思考**(`docs/`)
- **前端代码**(pnpm monorepo:Vue 3 + Vite + Element Plus + Pinia + vue-i18n)

## 治理定位

- **memory 仓不追踪本目录**(见 `memory/.gitignore` 的 `/cyntex-web/`)。跟 `memory/cyntex/` 同等待遇:嵌套工作区,不进 memory 版本控制。
- 本目录(将)是独立 git 仓。文档与代码都进它自己的版本控制。
- **两层规则**:全局底座是 `memory/AGENTS.md`(walk-up 自动加载,前端同样生效);前端专属约束叠在本目录的 `AGENTS.md`、`CLAUDE.md`、`.agents/skills/`、`.claude/rules/`、`docs/` 与配置里(eslint / i18n / tsconfig)。
- 与 memory 的关系:本目录是**消费方**——依据 `memory/research/legacy-feature-inventory.md` 与 `memory/reference/canonical-form.md` 做设计;该回 memory 的 ADR / plan / progress 不沉淀在这。

## 目录结构

```
cyntex-web/
├── docs/                              产品、工程与 agent 流程文档
│   ├── README.md                          文档地图
│   ├── product/
│   │   └── information-architecture.md    顶层 IA / 菜单设计
│   ├── engineering/
│   │   └── tech-stack.md                  技术栈登记 + 未决雷达
│   └── workflow/
│       ├── README.md                      agent 研发流程与阶段门禁
│       ├── templates/                     spec / prototype / plan / acceptance 模板
│       └── features/                      每个需求一个 feature 文件夹
├── AGENTS.md                          Codex / agent 项目规则
├── CLAUDE.md                          Claude Code 项目入口
├── .agents/                           Codex repo-scoped skills
├── .claude/                           Claude Code path rules
├── apps/
│   └── web/                           主应用(Vue 3 + Vite)
│       └── src/
│           ├── i18n/
│           │   ├── index.ts               createI18n(Composition API)
│           │   └── locales/{en,zh-CN,zh-TW}.json
│           ├── layouts/DefaultLayout.vue  IA 的 7 区导航壳 + 顶部 context + 语言切换
│           ├── router/index.ts
│           ├── views/                     对应 IA 的 7 个区(占位)
│           └── styles/
├── packages/                          共享包预留(ui / shared / design-tokens)
├── .vscode/                           i18n Ally 配置(Cursor 预览国际化)
├── eslint.config.mjs                  含 vue-i18n no-raw-text 门禁
├── tsconfig.base.json                 strict + noImplicitAny
└── pnpm-workspace.yaml
```

## 前置与启动

需要 Node 20+ 与 pnpm 9+。

```sh
pnpm install
pnpm dev          # 起 apps/web → http://localhost:5173
pnpm build
pnpm typecheck
pnpm lint
```

依赖版本以各 `package.json` 的 `^` 范围为准;lockfile 以实际 install 为准(版本会拉兼容最新)。

## Agent 智能研发流程

本仓库已内置 Codex / Claude Code 共享协作规则：

- Codex 读取 `AGENTS.md`。
- Claude Code 读取 `CLAUDE.md`，并通过 `@AGENTS.md` 导入同一套规则。
- 主流程：需求输入 → 需求拆解 / spec → 原型 / prototype → 实现计划 / plan → 实现 → 审查 → 验收 / acceptance。
- 每个非微小需求使用一个 feature 文件夹：`docs/workflow/features/YYYY-MM-DD-slug/`。
- 最小闭环：`spec.md` → `plan.md` → `acceptance.md`；UI / IA / 路由 / 复杂交互再补 `prototype.md`。
- 流程说明见 `docs/workflow/README.md`，模板见 `docs/workflow/templates/`。

## 国际化(i18n)

- 方案:**vue-i18n v9+**,Composition API(`useI18n`),`legacy: false`。
- 结构:`src/i18n/locales/<locale>.json`,文件名 = locale。`@intlify/unplugin-vue-i18n` 按 locale 扁平合并(不引入命名空间前缀),key 直接平铺,例:`zh-CN.json` 里 `context.demoLine` → 模板用 `t('context.demoLine')`。
- 构建时由 `@intlify/unplugin-vue-i18n` 编译。
- **硬门禁**:`@intlify/eslint-plugin-vue-i18n` 的 `no-raw-text` → 模板里裸字符串直接报错,所有用户可见文案必须走 `t()`。

### IDE 预览(Cursor / VS Code)

1. 装扩展 **i18n Ally**(`lokalise.i18n-ally`)—— `.vscode/extensions.json` 已声明推荐。
2. 打开任意 `.vue`,`{{ t('xxx') }}` 旁会内联显示当前语言的文案;缺失 key 高亮;支持跳转到 locale 文件。
3. 路径与结构已在 `.vscode/settings.json` 配好(`pathMatcher: {locale}.json`,`namespace: false`)。

### IDE 预览(IntelliJ IDEA / WebStorm)

JetBrains 系装 **Vue I18n** 插件(marketplace 搜 "Vue i18n"),识别同样的 `locales/<locale>.json` 标准结构。Cursor / VS Code 因 i18n Ally 支持最完整,推荐优先。

### 新增文案

1. 在三个 locale 文件(`en` / `zh-CN` / `zh-TW`)里加**同一个 key**。
2. 模板里 `{{ t('key.path') }}` 引用。
3. 三套 key 的一致性校验(雷达项,待落地为 CI 门禁)。

## 企业级约束(摘要)

详见 `docs/engineering/tech-stack.md`。要点:strict TS + 禁 any、i18n no-raw-text 门禁、Element Plus locale 联动、四态 UI、错误文案对接后端错误码 catalog、bundle budget(雷达)。

### 样式基线

- 全局圆角默认 `10px`。
- `apps/web/src/styles/main.css` 只做入口汇总；Tailwind、Element Plus 覆盖、应用语义样式拆到独立文件。
- Tailwind CSS 优先用于布局和局部样式表达，项目显式使用 `@layer theme, base, components, utilities;`。
- Element Plus 负责交互组件,但其外观要通过官方 CSS 变量优先覆盖，无法用变量解决时才写具体 `.el-*` class。
- `text-[13px]` 这类 utility 应该能覆盖 `@layer base` 默认字号；如果没有生效，先检查是否被未分层 CSS、Element Plus 内部节点或更具体选择器覆盖。
