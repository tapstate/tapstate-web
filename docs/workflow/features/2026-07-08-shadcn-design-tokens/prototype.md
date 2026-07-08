# Shadcn Design Tokens Prototype

> 状态：Accepted for implementation
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-shadcn-design-tokens/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

- 说明 shadcn 语义 token 如何进入本项目 CSS 架构。
- 说明 Tailwind v4 utility token 如何映射到 CSS 变量。
- 说明 Element Plus dropdown / select hover 状态如何读取 `--accent`。

## 2. 页面 / 交互范围

本原型覆盖：

- 全局 light 主题 token。
- Tailwind `bg-background`、`text-foreground`、`bg-accent`、`text-accent-foreground` 等 utility token 映射。
- shadcn `rounded-lg` / `var(--radius)` 作为表单控件和按钮默认圆角。
- shadcn 对齐的整体设计规范：设计气质、token、Tailwind、Element Plus、组件状态、控件族、密度、布局和验收检查。
- Element Plus dropdown item 和 select item 的 default / hover / selected / disabled 基础视觉。

本原型不覆盖：

- 深色主题。
- 页面 IA、路由、业务数据和表单流程。
- 全量业务组件灰阶 class 替换。

## 3. 布局线框

```text
Global CSS
┌────────────────────────────────────────────────────────┐
│ tailwind.css                                           │
│  @layer theme, base, components, utilities             │
│  @theme inline                                         │
│    --color-background: var(--background)               │
│    --color-accent: var(--accent)                       │
│    --color-sidebar-accent: var(--sidebar-accent)       │
│    --color-surface: var(--surface)                     │
│    --color-code: var(--code)                           │
│    --color-selection: var(--selection)                 │
│    --radius-lg: var(--radius)                          │
│  @layer base                                           │
│    :root { --background; --foreground; --accent; }     │
│    :root { --chart-*; --sidebar-*; --surface; }        │
│    :root { --code-*; --selection-*; --radius-*; }      │
│    .dark { same shadcn token contract }                │
├────────────────────────────────────────────────────────┤
│ element-plus.css                                       │
│  :root { --el-bg-color: var(--background); ... }       │
│  .el-dropdown-menu { hover fill -> var(--accent) }     │
│  .el-select__popper { item hover -> var(--accent) }    │
└────────────────────────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：shadcn/ui theming 文档和当前项目 CSS。
- 必须保持一致的区域：语义 token 名称、Tailwind v4 `@theme inline` 映射思想、Element Plus hover 使用 `--accent`。
- 圆角保真：`--radius: 0.625rem` 是 shadcn 基准 token，Tailwind `rounded-lg` 映射到 `var(--radius)`；Input、Button、Select trigger 等默认控件按 `rounded-lg` / 10px 对齐，Element Plus `--el-border-radius-base` 保持 `var(--radius)`。
- 整体规范保真：不是复刻 React/Radix 组件实现，而是把 shadcn 的语义 token、状态语言、控件密度和工作台气质映射到 Vue + Element Plus + Tailwind 的工程结构中。
- 允许为适配当前工程调整的区域：`--app-*` 产品语义层和应用壳层可以继续承接当前工作台气质；shadcn 基础 token contract 按官方 `app/globals.css` 补齐，例如 `--accent`、`--sidebar-*`、`--surface`、`--code-*`、`--selection-*` 和 radius scale。
- 明确禁止新增到产品 UI 的内容：主题切换器、demo 控件、调试面板。
- QA / debug / preview control 的承载方式：仅通过浏览器检查和源码检查，不进入产品 UI。

## 5. 关键交互

| 触发 | 页面反馈 | 结果 |
|---|---|---|
| Hover dropdown item | 背景变为 `--accent`，文字为 `--accent-foreground` | 与 shadcn 的 `hover:bg-accent hover:text-accent-foreground` 语义一致 |
| Hover select item | 背景变为 `--accent`，文字为 `--accent-foreground` | 下拉选择项与 dropdown item 一致 |
| Select selected item | 选中态保留主色 check 标记，背景不破坏 hover 可读性 | 现有选择交互稳定 |
| Disabled item | disabled 不响应 hover 或保持 Element Plus disabled 透明度 | 避免误导可操作性 |

## 6. 状态覆盖

| 状态 | 表现 | 操作 | 文案 key |
|---|---|---|---|
| Loading | 首屏加载期间 CSS token 已随样式入口加载 | 无新增操作 | N/A |
| Empty | 空态页面继续使用 `--app-text-muted`，间接读取语义 token | 无新增操作 | N/A |
| Error | 错误色走 `--destructive` / Element Plus danger token | 无新增操作 | N/A |
| Success | 正常页面和组件 hover 使用统一 token | 正常点击、hover、选择 | N/A |

注意：四态覆盖是验收要求，不代表可以把状态切换器、测试按钮或 preview toggle 暴露给最终用户。

## 7. 响应式规则

- Desktop：不改变布局尺寸；检查 sidebar/header/panel 与下拉浮层 hover 是否正常。
- Tablet：不改变布局断点；检查下拉浮层没有遮挡关键内容。
- Mobile：不改变移动布局；检查现有顶部/侧栏折行后无重叠，token 不影响滚动。

## 8. 原型资产

- Markdown wireframe：见本文件。
- HTML 原型：N/A，CSS token 集成无需独立 HTML 原型。
- 截图：验收阶段按需记录。
- 设计稿链接：N/A。

## 9. 评审记录

| 时间 | Reviewer | 结论 | 备注 |
|---|---|---|---|
| 2026-07-08 09:47 CST | Codex | Accepted for implementation | 用户要求明确；采用保守 token bridge 方案 |
