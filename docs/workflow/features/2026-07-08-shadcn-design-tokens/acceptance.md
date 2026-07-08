# Shadcn Design Tokens Acceptance

> 日期：2026-07-08
> Feature folder：docs/workflow/features/2026-07-08-shadcn-design-tokens/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| `tailwind.css` 中存在 shadcn 官方基础变量，并通过 `@theme inline` 暴露 Tailwind 颜色、sidebar、surface、code、selection 和 radius token | Pass | 已按官方 `apps/v4/app/globals.css` 当前 OKLCH token contract 落地 |
| `--accent` 等 token 使用 shadcn 官方 `app/globals.css` 当前 OKLCH baseline，而不是现有 `--app-*` 近似值 | Pass | live browser computed `--accent = oklch(0.97 0 0)` |
| 现有 `--app-*` 变量仍可用，并映射到新的语义 token | Pass | `--app-bg`、`--app-text`、`--app-accent-soft` 等保留为兼容层 |
| Element Plus 根变量开始引用 `--background`、`--foreground`、`--border`、`--accent` 等语义 token | Pass | `--el-bg-color`、`--el-fill-color-light`、`--el-text-color-primary` 等已接入 |
| Element Plus 默认控件圆角按 shadcn `rounded-lg` / `var(--radius)` 保持 10px | Pass | `--el-border-radius-base: var(--radius)` 保持不改；form/button/input/select trigger 默认吃 base radius |
| `docs/engineering/design-system.md` 存在并覆盖整体设计规范：气质、token、Tailwind、Element Plus、状态、组件族、密度、布局和验收检查 | Pass | 已新增长期设计系统文档，并更新 README / AGENTS / tech-stack 入口 |
| Dropdown item hover 和 Select item hover 背景使用 `--accent`，hover 文字使用 `--accent-foreground` | Pass with note | 源码规则已落地；实际鼠标 hover 自动化脚本超时，未记录最终 hover computed style |
| 不新增依赖，不改变路由、数据流和 i18n 文件 | Pass | 只改 CSS 和 workflow 文档 |
| `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过 | Pass | build exit 0，带既有第三方 warning |
| 桌面和移动视口中菜单、选择框、布局没有明显溢出或重叠 | Pass with note | 桌面/移动无页面级横向溢出；移动表格区域内部横向滚动 |

## 3. 源稿 / 设计保真对照

| 对照项 | 结果 | 备注 |
|---|---|---|
| shadcn `@theme inline` token 映射 | Pass | 迁移 color、sidebar、surface、code、selection、radius 映射 |
| shadcn `:root` token | Pass | 迁移当前官方 OKLCH light token |
| shadcn `.dark` token | Pass | 迁移当前官方 OKLCH dark token；本次不启用主题切换 |
| shadcn 控件圆角标准 | Pass | docs/base style 中 Input、Button 等默认控件为 `rounded-lg`；本项目 Element Plus base radius 对齐 `var(--radius)` / 10px |
| shadcn 整体设计规范 | Pass | 规范化为 Vue + Element Plus + Tailwind 的项目设计系统，而不是照搬 React/Radix 代码 |
| Element Plus hover 接入 | Pass with note | 接入 `--accent` / `--accent-foreground`；自动化 hover 实测未完成 |
| 未引入源稿外产品 UI | Pass | 无 demo 控件、调试控件或主题切换入口 |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `rg -n -e "@custom-variant dark\|--color-surface\|--code-highlight\|--selection-foreground\|--el-dropdown-menuItem-hover-fill"` | Pass | 确认完整 token 与 Element Plus hover 接线 |
| `rg -n -e "rounded-lg.*var\\(--radius\\)\|--el-border-radius-base.*var\\(--radius\\)\|基础控件圆角默认 10px"` | Pass | 确认 shadcn 控件圆角规范与 Element Plus base radius 关系 |
| `rg -n -e "Cyntex Shadcn-Aligned Design System\|组件状态规范\|Element Plus 映射\|shadcn 对齐"` | Pass | 确认整体设计系统文档与入口引用存在 |
| `git diff --check` | Pass | 无 whitespace error |
| `pnpm lint` | Pass | exit 0 |
| `pnpm typecheck` | Pass | exit 0 |
| `pnpm build` | Pass with warnings | exit 0；`@vueuse/core` pure annotation warning 和大 chunk warning 仍存在 |
| 桌面视口检查 | Pass | 1280px：computed token 为官方 OKLCH；document width = viewport width |
| 移动视口检查 | Pass with note | 390px：document width = viewport width；表格内部横向滚动 |

验证方式说明：

- 本次属于共享 CSS token 与组件 hover 映射变更，补跑 `pnpm build` 确认 Tailwind v4 语法和 `@theme inline` 编译。
- 实际 dropdown hover 鼠标自动化在浏览器工具中超时；验收以源码规则、build、live token computed style 和视口目检作为证据。

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Pass | CSS token 随样式入口加载 |
| Empty | Pass | 无业务空态变更 |
| Error | Pass | destructive token 已按 shadcn contract 提供 |
| Success | Pass | 页面正常渲染，token computed style 正确 |

## 6. 剩余风险

- `.dark` token 已迁入但没有主题切换入口，正式启用暗色主题需要单独评估 Element Plus 暗色覆盖和业务页面 Tailwind 灰阶 class。
- `element-plus.css` 在工作树里已有大量相对 HEAD 的未提交差异；本次只在根 token 和 select/dropdown hover 区域叠加，未整理既有差异。
- Dropdown hover 最终 computed style 未由鼠标自动化捕获，但 CSS 变量和规则已通过源码与 build 验证。
