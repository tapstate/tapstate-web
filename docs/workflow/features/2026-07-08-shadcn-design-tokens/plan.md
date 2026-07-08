# Shadcn Design Tokens Implementation Plan

> 状态：Done
> 进度：100%
> 当前步骤：补充整体设计系统规范
> 下一步：如需继续，单独评估 Element Plus 更多组件状态映射与暗色主题启用策略
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-shadcn-design-tokens/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：已按用户原始输入建立 `./spec.md`，用户回复“继续”后按保守方案推进。
- Prototype 已确认 / 已说明跳过：已建立 `./prototype.md`，覆盖 token flow 和 hover 状态。
- 非目标已确认：不新增依赖、不改路由/数据/i18n、不全量替换业务页面 class、不做深色主题。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- `apps/web/src/styles/tailwind.css`：新增 shadcn 风格基础变量、Tailwind v4 `@theme inline` 映射、兼容 `--app-*` 别名。
- `apps/web/src/styles/element-plus.css`：将 Element Plus 根变量与 dropdown/select hover 状态映射到语义 token。
- `AGENTS.md`：补充 shadcn 圆角口径，明确默认控件按 `rounded-lg` / `var(--radius)` / 10px。
- `README.md`：补充设计系统文档入口。
- `docs/README.md`：补充 `docs/engineering/design-system.md` 文档地图。
- `docs/engineering/design-system.md`：新增 shadcn 对齐的整体设计系统规范。
- `docs/engineering/tech-stack.md`：补充长期样式规范，明确 Element Plus base radius 保持 `var(--radius)`。
- `docs/workflow/features/2026-07-08-shadcn-design-tokens/spec.md`：记录需求与验收标准。
- `docs/workflow/features/2026-07-08-shadcn-design-tokens/prototype.md`：记录 token 原型。
- `docs/workflow/features/2026-07-08-shadcn-design-tokens/plan.md`：记录执行进度和验证。
- `docs/workflow/features/2026-07-08-shadcn-design-tokens/acceptance.md`：记录验收。

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 阅读 repo workflow、engineering guide、当前 CSS 和 shadcn theming 资料 | 源码检查 | 已确认文件边界和 Tailwind v4 形态 |
| 2 | Done | 建立 feature spec / prototype / plan | 文档检查 | 保留用户原始输入 |
| 3 | Done | 在 `tailwind.css` 落地语义 token、`@theme inline` 映射和 `--app-*` 兼容别名 | `rg -n -e "@theme inline\|--background\|--color-accent"` | 不改变样式入口 |
| 4 | Done | 在 `element-plus.css` 将根变量和 dropdown/select hover 映射到语义 token | `rg -n -e "--el-dropdown-menuItem-hover-fill\|is-hovering:not"` | 优先变量，select 使用窄范围 class 补 hover text |
| 5 | Done | 修正 `--accent` 为 shadcn baseline fallback + lab override | `rg -n -e "--accent: #f5f5f5\|lab\\(96\\.52%"` | 用户指出之前沿用了 `--app-accent-soft`，已纠正 |
| 5.1 | Done | 复核 shadcn `Theme Tokens` 文档，补齐 `--sidebar-*` 和 radius scale 映射 | `rg -n -e "--color-sidebar-accent\|--radius-4xl\|--sidebar-ring"` | 文档明确 sidebar 和 radius 是 theme token contract |
| 5.2 | Done | 按官方 `apps/v4/app/globals.css` 搬完整 OKLCH token contract，包括 `.dark`、surface、code、selection | `rg -n -e "--color-surface\|--code-highlight\|--selection-foreground\|\\.dark"` | 用户明确不是只要 `--accent` |
| 5.3 | Done | 按 shadcn docs/base style 修正规范：Input、Button 等默认控件是 `rounded-lg`，Element Plus base radius 保持 `var(--radius)` / 10px | `rg -n -e "rounded-lg.*var\\(--radius\\)|--el-border-radius-base.*var\\(--radius\\)|基础控件圆角默认 10px"` | 不改 CSS，当前 Element Plus base 已正确 |
| 5.4 | Done | 新增 `docs/engineering/design-system.md`，覆盖 shadcn 对齐的整体设计规范，并更新 README / AGENTS / feature docs 入口 | `rg -n -e "Cyntex Shadcn-Aligned Design System\|组件状态规范\|Element Plus 映射\|shadcn 对齐"` | 用户明确不是只要圆角 |
| 6 | Done | 运行 `pnpm lint`、`pnpm typecheck` 和 `pnpm build` | 命令 exit 0 | build 用于确认 Tailwind v4 CSS 编译 |
| 7 | Done | 启动本地页面并做桌面/移动目检 | `pnpm dev` + 浏览器检查 | 桌面/移动无页面级横向溢出；dropdown hover 鼠标脚本超时，源码与 live token 已验证 |
| 8 | Done | 更新 acceptance 和 plan 验证记录 | 文档检查 | 记录剩余风险 |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-08 09:47 CST | Codex | 20% | 读取仓库规则、工程约束、当前 CSS；建立 spec/prototype/plan | 更新 CSS token | 无 |
| 2026-07-08 10:00 CST | Codex | 70% | 完成 token 初版、lint/typecheck/build 初验；用户指出 `--accent` 应使用 shadcn baseline | 修正 `--accent` 并重跑验证 | 无 |
| 2026-07-08 10:06 CST | Codex | 78% | 按用户指定文档复核 Theme Tokens，补齐 sidebar token 与 shadcn radius scale | 重跑验证并检查浏览器 | 无 |
| 2026-07-08 10:15 CST | Codex | 82% | 读取官方 `apps/v4/app/globals.css`，确认当前 token 使用 OKLCH，并包含 surface/code/selection | 重跑源码检查、lint、typecheck、build 和浏览器 token 检查 | 无 |
| 2026-07-08 10:46 CST | Codex | 100% | 完成 shadcn 官方 token contract 迁移、Element Plus hover 接线、命令验证和浏览器 token/viewport 检查 | 交付 | 无 |
| 2026-07-08 11:08 CST | Codex | 100% | 用户指出 shadcn docs/base style 中 form/button 默认 `rounded-lg`；已确认 Element Plus base 应保持 `var(--radius)` / 10px，并写入规范 | 重跑文档与源码检查 | 无 |
| 2026-07-08 11:24 CST | Codex | 100% | 用户明确要整体设计规范；新增设计系统文档并更新文档入口 | 重跑文档检查和 whitespace 检查 | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：本次是 CSS token 配置，没有现成 CSS 单测框架；先定义源码检查项，修改前 `rg -n -e "@theme inline\|--color-accent\|--el-select-option-hover-background"` 应无法完整证明目标状态。
- 单元 / 组件 / E2E：不新增。当前仓库没有 CSS 单测或组件测试配置，避免为样式 token 引入新测试依赖。
- 手工 UI 检查：启动 `pnpm dev`，桌面和移动视口检查 shell、dropdown/select hover（若现有页面没有 select，则通过 Element Plus 组件存在的样式规则和页面基础渲染检查覆盖）。
- 验证分级：Level 2。共享 CSS 和组件 hover 状态变更，需要 lint/typecheck 与页面目检；不触及构建产物、依赖、路由懒加载或 Vite 配置，默认跳过 `pnpm build`。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-08 10:00 CST | `--accent` 使用了 `rgba(17, 24, 39, 0.06)` | 误把既有 `--app-accent-soft` 当作 shadcn token baseline | 对照用户给出的 shadcn fallback 与 lab 值 | 应将 shadcn `--accent` 改为 `#f5f5f5` + lab override，`--app-*` 只能作为兼容别名 |
| 2026-07-08 10:15 CST | 初次修正只覆盖 `--accent` / sidebar / radius，仍不完整 | 没有直接读取官方 `app/globals.css` 完整源码 | 通过 GitHub contents API 解码官方 `apps/v4/app/globals.css` | 官方当前 token contract 是 OKLCH，并包含 `.dark`、surface、code、selection；应整段迁移 token contract |
| 2026-07-08 11:08 CST | 误把 registry `rounded-md` 口径推广到当前 docs 控件标准 | shadcn v4 repo 内 registry 和 docs/base style 存在多套组件实现 | 对照用户贴出的 docs Input DOM，并读取 `apps/v4/styles/base-nova/ui/input.tsx`、`button.tsx` | docs/base style 的 Input、Button 默认是 `rounded-lg`；本项目规范应以 `--el-border-radius-base: var(--radius)` / 10px 对齐 |

## 7. Review Checklist

- [x] 功能满足 spec。
- [x] 没有扩大范围。
- [x] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [x] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [x] 用户可见文案都走 i18n；本次无用户可见文案。
- [x] 三套 locale key 同步；本次无 locale 变更。
- [x] loading / empty / error / success 四态可用；本次为全局 token，无新增业务状态。
- [x] 与 prototype 的布局、交互和响应式规则一致。
- [x] 桌面和移动视口无页面级溢出、重叠、错位；移动表格区域保留内部横向滚动。
- [x] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-08 10:46 CST | `rg -n -e "@custom-variant dark\|--color-surface\|--code-highlight\|--selection-foreground\|--el-dropdown-menuItem-hover-fill"` | Pass | shadcn token contract 与 Element Plus hover 接线存在 |
| 2026-07-08 10:51 CST | `git diff --check` | Pass | 无 whitespace error |
| 2026-07-08 10:46 CST | `pnpm lint` | Pass | exit 0 |
| 2026-07-08 10:46 CST | `pnpm typecheck` | Pass | exit 0 |
| 2026-07-08 10:51 CST | `pnpm build` | Pass with warnings | exit 0；仍有既有 `@vueuse/core` pure annotation warning 和大 chunk warning |
| 2026-07-08 11:08 CST | `rg -n -e "rounded-lg.*var\\(--radius\\)|--el-border-radius-base.*var\\(--radius\\)|基础控件圆角默认 10px"` | Pass | 确认 shadcn 控件圆角规范与 Element Plus base radius 关系 |
| 2026-07-08 11:24 CST | `rg -n -e "Cyntex Shadcn-Aligned Design System\|组件状态规范\|Element Plus 映射\|shadcn 对齐"` | Pass | 确认整体设计系统文档与入口引用存在 |
| 2026-07-08 10:46 CST | 桌面视口检查 | Pass | 1280px：live token 为官方 OKLCH；document width = viewport width |
| 2026-07-08 10:46 CST | 移动视口检查 | Pass with note | 390px：document width = viewport width；表格区域内部横向滚动正常 |

## 9. Finish Notes

- 交付摘要：按官方 shadcn `apps/v4/app/globals.css` 搬入基础 token contract，并把 Element Plus 基础变量、dropdown hover、select hover 接到 `--accent` 等语义 token；新增整体设计系统规范，覆盖 token、Tailwind、Element Plus、组件状态、控件族、密度、布局和验收检查。
- 最终进度：100%。
- 最终步骤：完成验收记录。
- 剩余风险：实际 dropdown hover 鼠标自动化脚本超时，已用源码规则、build 和 live token 替代验证；`element-plus.css` 工作树中有大量先前未提交差异，本次只在根 token 和 select/dropdown hover 区域上叠加。
- Follow-up：如要真正启用 `.dark` 主题，需要单独设计主题切换、Element Plus 暗色 token 覆盖和页面灰阶 class 迁移。
