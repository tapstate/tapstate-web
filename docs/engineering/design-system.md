# Tapstate Shadcn-Aligned Design System

> 状态：长期设计规范
> 日期：2026-07-24
> 范围：Tapstate Web 的视觉 token、Tailwind 使用、shadcn-compatible 组件、组件状态和 UI 质量门禁

## 1. 目标

Tapstate Web 的 UI 以 shadcn 的语义 token、Radix 可达性交互和 Tailwind CSS v4 为基础，呈现企业产品工作台气质：安静、紧凑、清晰、可扫描。

这份规范解决三个问题：

- 让颜色、圆角、边框、focus、hover、selected、disabled、invalid 等状态有统一语义来源。
- 让 Tailwind utility、组件 variants 和应用语义 class 不各自发明视觉规则。
- 让新页面保持工作台密度，避免营销页、装饰性卡片堆叠和临时视觉捷径。

## 2. 设计气质

- 产品工作台优先：默认界面用于高频操作、扫描、比较和编辑。
- 低噪声、高密度：文字、表格、表单、列表和工具栏紧凑但可读。
- 语义驱动：颜色和状态优先来自 `--background`、`--foreground`、`--accent`、`--destructive` 等 token。
- 稳定布局：表格、侧栏、工具栏、浮层、表单控件、状态卡等固定格式区域必须有稳定尺寸约束。
- 克制圆角和阴影：控件默认使用 shadcn `rounded-lg` / `var(--radius)`；阴影只用于浮层、popover、dialog 或需要层级表达的 surface。

## 3. Token Contract

`apps/web/styles/tailwind.css` 是 shadcn token 的源头，必须维护这些语义组：

| 组 | Token | 用途 |
|---|---|---|
| 页面 | `--background` / `--foreground` | app 背景和主文本 |
| 容器 | `--card` / `--card-foreground` | cards、panels、table 容器 |
| 浮层 | `--popover` / `--popover-foreground` | dropdown、select、tooltip、popover |
| 主操作 | `--primary` / `--primary-foreground` | primary button、selected check、关键强调 |
| 次级区域 | `--secondary` / `--secondary-foreground` | secondary button、轻量背景 |
| 弱化信息 | `--muted` / `--muted-foreground` | placeholder、辅助文本、弱背景 |
| 交互 hover | `--accent` / `--accent-foreground` | menu/list/select/tree item hover、ghost hover |
| 破坏性 | `--destructive` / `--destructive-foreground` | danger button、错误、invalid |
| 线框 | `--border` / `--input` / `--ring` | border、form border、focus ring |
| 侧栏 | `--sidebar-*` | app sidebar 和 sidebar item 状态 |

新增颜色时先判断是否能归入上表语义。不能归入时，先在 feature spec 里说明原因，再新增 token。

## 4. 圆角与密度

- `--radius: 0.625rem`。
- Form controls / Button / Input / Select trigger 默认 `rounded-lg` / `var(--radius)` / 10px。
- Menu / Select / Dropdown item 可使用 `--radius-sm` 到 `--radius`。
- Dialog / Drawer / Card / Popover 使用 `--radius` 到 `--radius-xl`。
- 工作台正文和控件以 13px / 14px 为主；紧凑元信息可用 11px / 12px。
- 间距优先使用 4px grid。

## 5. 组件规范

### Button

- 默认高度跟随 shadcn 紧凑工作台节奏，优先 32px 左右。
- Primary 使用 `--primary` / `--primary-foreground`。
- Outline / ghost hover 使用 muted 或 accent 语义。
- Icon-only button 要有稳定正方形尺寸和可达 `aria-label`。

### Form Controls

- Input、Textarea、Select trigger 默认圆角为 `var(--radius)`。
- Border 使用 `--input` 或 `--border`。
- Placeholder 使用 `--muted-foreground`。
- Focus 使用 `--ring`，invalid 使用 `--destructive`。
- Disabled 保持可辨认，不因为透明度过低导致文本不可读。

### Dropdown / Select / Popover

- Floating surface 使用 `--popover` / `--popover-foreground`。
- Item hover 使用 `--accent` / `--accent-foreground`。
- Popper border 使用 `--border`，shadow 用于浮层层级。

### Table / List / Tree

- 默认强调信息密度和扫描效率。
- Row hover 使用 accent 语义。
- Border 和 divider 使用 `--border`。
- 表格内部允许横向滚动，但页面级不得出现横向溢出。

### Dialog / Drawer

- Surface 使用 card 或 popover 语义。
- Header、footer、body 间距稳定；loading/submitting 不能造成按钮跳动。
- 关闭、提交、取消等控件必须有 disabled/submitting 状态。

## 6. 状态规范

| 状态 | 规范 |
|---|---|
| Default | 背景、文字、边框来自对应语义 token |
| Hover | 菜单、列表、树、select、dropdown item 使用 accent 语义 |
| Active / Selected | 保留明确选中语义 |
| Focus visible | 使用 `--ring`，focus ring 必须可见 |
| Disabled | 禁用态不得响应 hover |
| Invalid / Error | 使用 `--destructive` |
| Loading / Submitting | 控件尺寸稳定，loading icon 不改变布局宽高 |
| Empty / Error / Success | 页面级四态必须有可读文本和稳定容器 |

## 7. 验收检查

- 是否使用 shadcn 语义 token，而不是新增硬编码色值。
- 新增或修改的 variant、颜色、圆角、高度、padding、图标是否有设计系统、既有局部模式或 feature prototype 依据。
- Button / form control / select trigger 是否保持 `var(--radius)` 默认圆角。
- Dropdown / select / list / tree item hover 是否使用 `--accent`。
- Focus visible、disabled、invalid、loading、empty、error、success 是否都有可用表现。
- 桌面和移动视口是否无页面级横向溢出、文字溢出和元素重叠。
- `pnpm lint`、`pnpm typecheck`、`pnpm build` 是否按风险等级执行。
