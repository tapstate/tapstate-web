# Shadcn Design Tokens

> 状态：Accepted for implementation
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-shadcn-design-tokens/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：apps/web/src/styles/

## 1. Intake

### 用户原始输入

> 把 shadcn 定义的基础样式变量落地到本项目。比如常见的：--background， --foreground， --accent...
>  tailwindcss 看下在 shadcn 那边是怎么配置的融合一下
> 然后 element-plus 开始使用这些变量，比如 dropdown item/ select item hover 的背景色使用 --accent
>
> 表单组件/按钮，默认都是 rounded-lg ，你知道 shadcn 的标准吗？落地到规范里面
>
> Element Plus base  就是 --radius，这样它的 form/button 圆角才能是 10px 啊
>
> 不仅是圆角😂，你懂的。我要的是整体的设计规范

### 背景与上下文

项目当前已经使用 Tailwind CSS v4、Element Plus 和分层样式入口：

- `apps/web/src/styles/main.css` 只汇总 import。
- `apps/web/src/styles/tailwind.css` 负责 Tailwind layer、theme 和 `@layer base`。
- `apps/web/src/styles/element-plus.css` 负责 Element Plus 变量与组件级覆盖。
- `apps/web/src/styles/app.css` 已经使用 `--app-bg`、`--app-text`、`--app-accent-soft` 等应用 token。

本需求希望把 shadcn 常见的语义 token 名落地为本项目可复用的基础变量，并让 Tailwind 和 Element Plus 使用同一套语义变量，避免后续样式继续分裂成 `--app-*`、Element Plus 私有变量和 Tailwind utility 各自维护。

2026-07-08 复核 shadcn 官方 `apps/v4/app/globals.css` 与 theming 文档 `Theme Tokens`：token contract 包含 background/foreground pairs、chart、sidebar、surface、code、selection，以及通过 `@theme inline` 把 `--color-*` 与 `--radius-*` 暴露给 Tailwind utilities。

### 假设

- 本次只落地 light 主题 token，不引入深色主题切换。
- 不新增依赖，不安装 shadcn CLI，不引入 React/Radix 组件。
- shadcn 基础 token 采用 shadcn 官方 `app/globals.css` 当前 baseline 值；现有产品工作台视觉通过 `--app-*` 兼容别名逐步承接。
- 保留现有 `--app-*` 别名，降低对既有页面 class 的影响。
- 用户的“继续”视为同意按保守方案推进：先把 token 与 hover/fill 状态打通，不做大范围视觉重绘。
- 用户进一步明确要参考 shadcn 文档 `app/globals.css` 整段，不只是 `--accent`；当前官方源使用 OKLCH token。
- 用户进一步指出 shadcn docs 当前表单控件 / Button 实际默认为 `rounded-lg`；按本次迁移的 radius scale，`rounded-lg` 对应 `var(--radius)`，即 `0.625rem` / 10px，因此 Element Plus 的 `--el-border-radius-base` 应保持 `var(--radius)`，不应改成 `--radius-md`。
- 用户进一步明确需要整体设计规范，不只是 token 和圆角；长期规范需要覆盖设计气质、token contract、Tailwind、Element Plus 映射、组件状态、控件族、密度、布局和验收检查。

### 未决问题

- 深色主题是否需要完整 token 矩阵：本次不处理，作为 follow-up。
- 是否把业务组件中的 `bg-gray-*` 全量替换为语义 token：本次不处理，避免无关 churn。

## 2. Decomposition

### 目标

- 在 `:root` 和 `.dark` 落地 shadcn 官方基础语义变量：`--background`、`--foreground`、`--card`、`--popover`、`--primary`、`--secondary`、`--muted`、`--accent`、`--destructive`、`--border`、`--input`、`--ring`、`--radius`、`--chart-*`、`--sidebar-*`、`--surface`、`--code-*`、`--selection-*` 等。
- 按 shadcn + Tailwind CSS v4 的思路，在 `@theme inline` 中把 `--color-background`、`--color-foreground`、`--color-accent`、`--color-sidebar-*`、`--color-surface`、`--color-code-*`、`--color-selection-*` 和 `--radius-*` 等 Tailwind token 映射到 CSS 变量。
- 让现有 `--app-*` token 作为兼容别名指向新的语义 token。
- 让 Element Plus 的基础颜色、fill、dropdown item hover、select item hover 使用这些语义 token，尤其是 `--accent` / `--accent-foreground`。
- 让 Element Plus 默认表单控件、按钮、Select trigger 的 base radius 对齐 shadcn `rounded-lg`，即 `--el-border-radius-base: var(--radius)` / 10px；更紧凑的 item/tag/icon-only 场景再使用 `--radius-sm` 或局部规则。
- 将 shadcn 对齐的整体设计规范沉淀到 `docs/engineering/design-system.md`，并让 `AGENTS.md`、`README.md`、`docs/README.md`、`docs/engineering/tech-stack.md` 指向该规范。
- 保持样式文件职责边界：Tailwind token 在 `tailwind.css`，Element Plus 覆盖在 `element-plus.css`。

### 非目标

- 不新增或替换 UI 组件库。
- 不重构页面布局、路由、i18n、状态管理或数据流。
- 不全量替换业务页面中的 Tailwind 灰阶 class。
- 不实现多主题切换 UI。

### 用户路径

1. 开发者在 CSS 或 Tailwind class 中使用 `var(--accent)` / `bg-accent`。
2. Element Plus 下拉菜单、Select 选项等交互项 hover 时读取同一套 `--accent` 背景。
3. 后续页面继续沿用现有 `--app-*` 时，也能通过别名获得一致视觉。

### 影响面

- IA / 路由：无。
- 状态管理：无。
- 数据 / API：无。
- 权限：无。
- i18n：无用户可见文案变更。
- 错误处理：无。
- 样式系统：影响全局 CSS token、Tailwind utility token 和 Element Plus hover/fill token。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| A. shadcn token 成为语义源，`--app-*` 作为兼容别名 | 与用户请求一致；Tailwind / Element Plus / app class 可逐步统一；改动集中 | 需要一次性梳理 token 命名 | 采用 |
| B. 只新增 `--background` 等变量，不改 Element Plus | 改动最小 | 用户明确要求 Element Plus 开始使用这些变量，价值不足 | 不采用 |
| C. 完全照搬 shadcn 默认 OKLCH 主题 | 与上游最一致 | 可能破坏当前企业工作台视觉和既有灰阶 | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：

## 4. UI / IA Sketch

```text
CSS token flow

:root semantic tokens
  --background
  --foreground
  --accent
  --accent-foreground
  --border
  --ring
        │
        ├─ @theme inline
        │    bg-background / text-foreground / bg-accent / border-border
        │
        ├─ app compatibility aliases
        │    --app-bg / --app-text / --app-accent-soft
        │
        └─ Element Plus variables
             --el-bg-color / --el-fill-color-light
             dropdown item hover / select item hover
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 不涉及数据加载；样式 token 在初始 CSS 中生效 | 正常等待应用加载 | N/A |
| Empty | 不涉及空态数据 | N/A | N/A |
| Error | 若 CSS token 缺失，表现为回退到浏览器默认或 Element Plus 默认色 | 开发者通过源码和浏览器样式检查定位 | N/A |
| Success | 页面背景、文本、边框、下拉/选择项 hover 使用统一语义 token | 正常使用应用与交互组件 | N/A |

## 6. i18n 范围

新增或变更的 locale key：无。

不需要同步 locale 文件，因为本次只改 CSS token 和组件视觉变量。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：无。

## 8. 验收标准

- [ ] `tailwind.css` 中存在 shadcn 官方基础变量，并通过 `@theme inline` 暴露 Tailwind 颜色、sidebar、surface、code、selection 和 radius token。
- [ ] `--accent` 等 token 使用 shadcn 官方 `app/globals.css` 当前 OKLCH baseline，而不是现有 `--app-*` 近似值。
- [ ] 现有 `--app-*` 变量仍可用，并映射到新的语义 token。
- [ ] Element Plus 根变量开始引用 `--background`、`--foreground`、`--border`、`--accent` 等语义 token。
- [ ] Element Plus `--el-border-radius-base` 保持 `var(--radius)`，确保 form/button/input/select trigger 等默认控件按 shadcn `rounded-lg` 呈现为 10px。
- [ ] `docs/engineering/design-system.md` 存在并覆盖整体设计规范：气质、token、Tailwind、Element Plus、状态、组件族、密度、布局和验收检查。
- [ ] Dropdown item hover 和 Select item hover 背景使用 `--accent`，hover 文字使用 `--accent-foreground`。
- [ ] 不新增依赖，不改变路由、数据流和 i18n 文件。
- [ ] `pnpm lint` 和 `pnpm typecheck` 通过；本次不触及构建边界，`pnpm build` 可按 Level 2 跳过。
- [ ] 桌面和移动视口中菜单、选择框、布局没有明显溢出或重叠。

## 9. 风险

- 全局 token 会影响所有页面和 Element Plus 组件，需要通过实际页面检查 hover 与对比度。
- Tailwind v4 `@theme inline` 若放置顺序错误，可能导致 utility token 不可用。
- Element Plus 内部 hover 选择器优先级可能覆盖 CSS 变量，需要用组件级变量优先，必要时使用窄范围 `.el-*` class 覆盖。
