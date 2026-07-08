# Cyntex Shadcn-Aligned Design System

> 状态：长期设计规范
> 日期：2026-07-08
> 范围：Cyntex Web 的视觉 token、Tailwind 使用、Element Plus 外观映射、组件状态和 UI 质量门禁
> 参考源：shadcn/ui theming docs、shadcn `apps/v4/app/globals.css`、shadcn 当前 docs/base style 组件、Element Plus 官方 CSS 变量

## 1. 目标

Cyntex Web 的 UI 以 shadcn 的语义 token 和组件状态语言为基础，以 Element Plus 作为 Vue 交互组件实现层，以 Tailwind CSS 作为布局和局部表达工具。

这份规范解决三个问题：

- 让颜色、圆角、边框、focus、hover、selected、disabled、invalid 等状态有统一语义来源。
- 让 Tailwind utility、Element Plus CSS 变量和应用语义 class 不再各自发明视觉规则。
- 让新页面保持企业产品工作台气质：安静、紧凑、清晰、可扫描，避免营销页和装饰性 UI。

## 2. 设计气质

- **产品工作台优先**：默认界面用于高频操作、扫描、比较和编辑，不做大 hero、浮夸插画或卡片堆叠。
- **低噪声、高密度**：文字、表格、表单、列表和工具栏应该紧凑但可读，操作路径短。
- **语义驱动**：颜色和状态优先来自 `--background`、`--foreground`、`--accent`、`--destructive` 等 token，而不是页面内硬编码灰阶。
- **稳定布局**：表格、侧栏、工具栏、浮层、表单控件、状态卡等固定格式区域要有稳定尺寸约束，不能因 hover、loading、图标或长文本导致跳动。
- **克制圆角和阴影**：控件默认使用 shadcn `rounded-lg` / `var(--radius)`；阴影只用于浮层、popover、dialog 或需要层级表达的 surface。

## 3. Token 规范

### 3.1 基础 token contract

`apps/web/src/styles/tailwind.css` 是 shadcn token 的源头，必须包含并维护这些语义组：

| 组 | Token | 用途 |
|---|---|---|
| 页面 | `--background` / `--foreground` | app 背景和主文本 |
| 容器 | `--card` / `--card-foreground` | cards、panels、table 容器 |
| 浮层 | `--popover` / `--popover-foreground` | dropdown、select popper、tooltip、popover |
| 主操作 | `--primary` / `--primary-foreground` | primary button、selected check、关键强调 |
| 次级区域 | `--secondary` / `--secondary-foreground` | secondary button、轻量背景 |
| 弱化信息 | `--muted` / `--muted-foreground` | placeholder、辅助文本、弱背景 |
| 交互 hover | `--accent` / `--accent-foreground` | menu/list/select/tree item hover、ghost hover |
| 破坏性 | `--destructive` / `--destructive-foreground` | danger button、错误、invalid |
| 线框 | `--border` / `--input` / `--ring` | border、form border、focus ring |
| 侧栏 | `--sidebar-*` | app sidebar 和 sidebar item 状态 |
| 扩展 surface | `--surface` / `--surface-foreground` | 代码块、内嵌 panel、低层级 surface |
| 代码与选区 | `--code-*` / `--selection-*` | code block、selection |
| 图表 | `--chart-*` | dashboard/chart 序列色 |

新增颜色时先判断是否能归入上表语义。不能归入时，先在 feature spec 里说明原因，再新增 token。

### 3.2 Tailwind 映射

Tailwind v4 必须通过 `@theme inline` 暴露语义 utility：

- `bg-background`、`text-foreground`
- `bg-card`、`text-card-foreground`
- `bg-popover`、`text-popover-foreground`
- `bg-primary`、`text-primary-foreground`
- `bg-accent`、`text-accent-foreground`
- `border-border`、`border-input`、`ring-ring`
- `bg-sidebar`、`bg-surface`、`bg-code`、`bg-selection`

页面内优先使用这些语义 utility。允许少量 `gray-*` 用于迁移期局部细节，但新增共享 UI、组件状态和长期页面结构不得继续以原始灰阶作为语义来源。

### 3.3 App 兼容层

现有 `--app-*` 变量是兼容层，不是新的视觉源头。

- 新样式优先使用 shadcn token 或 Tailwind 语义 utility。
- 旧页面可以继续使用 `--app-bg`、`--app-text`、`--app-accent-soft`。
- 调整 `--app-*` 时应让它们继续别名到 shadcn token，避免分叉。

## 4. 圆角规范

shadcn 当前 token：

- `--radius: 0.625rem`
- `--radius-sm: calc(var(--radius) * 0.6)`
- `--radius-md: calc(var(--radius) * 0.8)`
- `--radius-lg: var(--radius)`
- `--radius-xl` 及以上用于更大容器

执行规则：

| 场景 | 默认圆角 | 说明 |
|---|---|---|
| Form controls / Button / Input / Select trigger | `rounded-lg` / `var(--radius)` / 10px | 对齐 shadcn docs/base style 当前 Input、Button 默认 |
| Element Plus base radius | `--el-border-radius-base: var(--radius)` | 不改成 `--radius-md` |
| Menu / Select / Dropdown item | `--radius-sm` 到 `--radius` | 依组件密度决定，hover 背景不得溢出 item |
| Tag / badge / compact icon button | `--radius-sm` 或局部 `min()` | 保持紧凑 |
| Dialog / Drawer / Card / Popover | `--radius` 到 `--radius-xl` | 只有容器层级需要更柔和边界时才放大 |
| Pill / avatar / status dot | `999px` | 仅用于天然胶囊或圆形元素 |

## 5. Element Plus 映射

Element Plus 是默认交互组件库，但外观必须接入 shadcn token。

### 5.1 根变量

| Element Plus 变量 | 映射 |
|---|---|
| `--el-bg-color` | `var(--card)` |
| `--el-bg-color-page` | `var(--background)` |
| `--el-bg-color-overlay` | `var(--popover)` |
| `--el-fill-color` | `var(--secondary)` |
| `--el-fill-color-light` | `var(--accent)` |
| `--el-fill-color-lighter` | `var(--muted)` |
| `--el-border-color` | `var(--border)` |
| `--el-text-color-primary` | `var(--foreground)` |
| `--el-text-color-secondary` | `var(--muted-foreground)` |
| `--el-color-primary` | `var(--primary)` |
| `--el-color-danger` / `--el-color-error` | `var(--destructive)` |
| `--el-border-radius-base` | `var(--radius)` |

### 5.2 覆盖优先级

1. 官方 CSS 变量。
2. 组件级 CSS 变量。
3. 局部 `.el-*` class。

写具体 class 时必须控制范围，例如 `.el-select__popper.el-select__popper`，不要写会泄漏到全站的粗暴覆盖。

## 6. 组件状态规范

| 状态 | 规范 |
|---|---|
| Default | 背景、文字、边框来自对应语义 token，不使用临时 hex 表达组件身份 |
| Hover | 菜单、列表、树、select、dropdown item 使用 `--accent` / `--accent-foreground` |
| Active / Selected | 保留明确选中语义；可用 `--primary` 表示 check、active indicator 或主选中态 |
| Focus visible | 使用 `--ring`；focus ring 必须可见，不被 outline reset 吞掉 |
| Disabled | 降低透明度或使用 disabled token；禁用态不得响应 hover |
| Invalid / Error | 使用 `--destructive`、`--destructive-foreground` 和 destructive ring |
| Loading / Submitting | 保持控件尺寸稳定，loading icon 或 spinner 不改变布局宽高 |
| Empty / Error / Success | 页面级四态必须有可读文本和稳定容器，不用调试控件替代真实状态 |

## 7. 组件族规范

### Button

- 默认高度跟随 shadcn 紧凑工作台节奏，优先 32px 左右。
- 默认圆角为 `var(--radius)`。
- Primary 使用 `--primary` / `--primary-foreground`。
- Outline / ghost hover 使用 muted 或 accent 语义，不使用页面内随机灰阶。
- Icon-only button 要有稳定正方形尺寸，hover 背景用 accent 或组件级 fill token。

### Form Controls

- Input、Textarea、Select trigger、Date picker 等默认圆角为 `var(--radius)`。
- Border 使用 `--input` 或 `--border`。
- Placeholder 使用 `--muted-foreground`。
- Focus 使用 `--ring`，invalid 使用 `--destructive`。
- Disabled 保持可辨认，不因为透明度过低导致文本不可读。

### Dropdown / Select / Popover

- Floating surface 使用 `--popover` / `--popover-foreground`。
- Item hover 使用 `--accent` / `--accent-foreground`。
- Popper border 使用 `--border`，shadow 用于浮层层级，不用重阴影制造装饰感。
- Select selected check 可使用 `--primary`，但 hover 时文字仍要可读。

### Table / List / Tree

- 默认强调信息密度和扫描效率。
- Row hover 使用 accent 语义。
- Border 和 divider 使用 `--border`，不要用多套灰阶。
- 表格内部允许横向滚动，但页面级不得出现横向溢出。

### Dialog / Drawer / Message

- Surface 使用 card 或 popover 语义。
- 圆角使用 `--radius` 到 `--radius-xl`，避免超大圆角。
- Header、footer、body 间距稳定；loading/submitting 不能造成按钮跳动。

### Sidebar / Navigation

- 侧栏使用 `--sidebar-*` token。
- 当前导航、hover、focus 要有清楚差异。
- 折叠态图标按钮保持可达性和稳定尺寸。

### Code / Technical Preview

- Code block 使用 `--code-*`。
- Inline code 不用彩色标签伪装状态。
- Selection 使用 `--selection` / `--selection-foreground`。

## 8. 字体、密度和布局

- 默认字体使用 `--font-sans`，等宽内容使用 `--font-mono`。
- 工作台正文和控件以 13px / 14px 为主；紧凑元信息可用 11px / 12px。
- 标题要克制，面板内标题不使用 hero 级字号。
- letter spacing 默认 0，不用负字距。
- 间距优先使用 4px grid。
- Toolbar、filter bar、table header、side panel、popover item 等固定格式区域必须有稳定 height、min-width、max-width 或 grid constraints。
- 不嵌套 UI card；页面 section 不做漂浮卡片，card 只用于重复条目、modal、真实框定工具。

## 9. 验收检查

涉及 UI 或样式规范变更时，至少检查：

- 是否使用 shadcn 语义 token，而不是新增硬编码色值。
- Element Plus 覆盖是否优先变量，具体 `.el-*` class 是否范围足够窄。
- Button / form control / select trigger 是否保持 `var(--radius)` 默认圆角。
- Dropdown / select / list / tree item hover 是否使用 `--accent`。
- Focus visible、disabled、invalid、loading、empty、error、success 是否都有可用表现。
- 桌面和移动视口是否无页面级横向溢出、文字溢出和元素重叠。
- `pnpm lint`、`pnpm typecheck` 是否按风险等级执行；样式入口、Tailwind theme 或构建边界变更时补 `pnpm build`。

