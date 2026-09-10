# tapstate-web Agent Instructions

## Goal

把这个仓库当作企业级前端产品来研发，同时保持当前项目早期阶段所需要的轻量和可调整性。代码、产品 IA、工程约束和设计规范是仓库的长期事实来源；不强制为每个需求建立独立的流程文档。

## Read Order

开始任务前按需阅读：

1. `README.md`：仓库结构、启动与基础命令。
2. `docs/README.md`：产品与工程文档地图。
3. `UI_DESIGN_GUIDELINES.md`：只有生成、修改、迁移、审查或验收 UI 时读取。
4. `docs/product/information-architecture.md`：需求触及 IA、一级导航、路由分组或产品对象边界时读取。
5. `docs/engineering/tech-stack.md`：需求触及依赖、构建、i18n、测试策略或工程约束时读取。
6. `docs/engineering/design-system.md`：需求触及视觉、组件、样式或前端架构时读取。

## Working Principles

- 项目仍在早期探索阶段，优先采用简单、可回滚、容易调整的实现。
- 小改动直接完成；较大的改动在聊天、issue 或 PR 中说明范围、风险和验证方式，不在仓库内强制创建额外的过程文档。
- 先确认现有目录、依赖和数据流，再做最小范围修改。
- 按业务域和职责组织代码；只有当文件数量或依赖关系产生真实认知负担时再继续拆目录。
- 不做无关重构、依赖升级或全仓格式化；发现后续坏味道时记录在 PR 或交付说明中。

## UI Quality Gate

生成或修改 UI 前必须遵循根目录 `UI_DESIGN_GUIDELINES.md` 和 `docs/engineering/design-system.md`，主动检查并修正 Anti-Slop、布局、排版、颜色、交互和表单问题。

## Frontend Rules

- 使用 React 19，页面路由使用 TanStack Router File Routes，路由源码放在 `apps/web/app/routes/`，由 `@tanstack/router-plugin` 生成 `apps/web/app/routeTree.gen.ts`；开发、预览和打包都使用 Vite。
- 遵循 strict TypeScript；避免 `any`，除非有明确技术原因。
- shadcn/ui 风格组件和 Radix primitives 是默认 UI 基座；不要为了单个页面引入新的重型 UI 依赖。
- Select / Dropdown / Menu 必须优先使用 `apps/web/components/ui/*` 的 shadcn-compatible primitives；不要在业务页使用原生 `<select>` 或手写 floating dropdown。
- 动效使用 Motion，保持克制，优先用于浮层进入/退出、状态切换和局部过渡。
- 服务端状态使用 TanStack Query；客户端 UI/session 状态使用 Zustand。
- 国际化使用 i18next + react-i18next。用户可见文案必须走 i18next；新增 key 必须同步 `en`、`zh-CN`、`zh-TW`。
- 样式入口必须分层：`main.css` 只汇总 import，Tailwind 放 `tailwind.css`，应用语义样式放 `app.css`。
- Tailwind v4 显式使用 `@layer theme, base, components, utilities;`；自定义默认样式放 `@layer base`，应用语义 class 放 `@layer components`，确保 utilities 能覆盖默认样式。
- UI 风格按 `docs/engineering/design-system.md` 的 shadcn / Linear 产品工作台规范收敛：语义 token 优先、状态完整、信息密度清晰；`--radius` 为 `0.625rem`，表单控件、按钮、Select trigger 默认使用 `rounded-lg` / `var(--radius)` / 10px。
- 图标优先用 lucide-react，不手写一次性复杂 SVG。
- UI 组件应考虑 loading、empty、error、success；表单还要考虑 disabled、validation、submitting。
- 页面应该是企业产品工作台气质：信息密度清晰、布局稳定、操作路径短，不做营销式 hero。
- 固定格式区域要有稳定尺寸约束，例如表格、工具栏、侧栏、状态卡、画布容器。

## Verification Policy

按改动风险选择验证，不要求每次小改都跑完整构建：

### Level 1：轻量改动

适用：单点 UI 微调、图标 / 按钮入口替换、局部 class、默认文案、少量 i18n key、无数据流和构建链路变化。

```sh
pnpm lint
pnpm typecheck
```

### Level 2：中等改动

适用：组件结构变化、多个文件联动、表单交互、状态切换、i18n 语言切换、需要实际页面确认的 UI 行为。

```sh
pnpm lint
pnpm typecheck
pnpm --filter web test
```

涉及 UI 布局时，补充桌面 / 移动视口检查，确认文字不溢出、元素不重叠，主要状态可用。

### Level 3：高风险改动

适用：新增页面 / 路由、依赖或构建配置变化、样式入口变化、跨模块重构、数据契约 / 权限 / 业务流程变化。

```sh
pnpm lint
pnpm typecheck
pnpm --filter web test
pnpm build
```

命令失败时先判断是否由本次改动导致，不回滚用户已有改动；在交付说明中写清失败原因和剩余风险。
