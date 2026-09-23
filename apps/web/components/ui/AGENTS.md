# components/ui — 组件契约

> 位置：`apps/web/components/ui/AGENTS.md`
> 读取时机：新增/修改 `components/ui/*` 下任何原子组件之前
> 适用对象：人和 AI 编码代理（Codex / Claude Code 等）一律先读这份，再动手改代码
> 关联文档：overlay 类组件的 z-index / 受控模式契约见 [`apps/web/docs/overlay-conventions.md`](./overlay-conventions.md)，本文件不重复

## 1. Token 使用规则（最高优先级）

- **禁止在 `components/ui/*` 里出现裸值。** 颜色、圆角、间距、阴影一律使用 `tailwind.css` 里 `@theme` 声明的语义 token class（如 `text-text-secondary`、`border-border-default`、`rounded-control`），不允许出现 `text-gray-600`、`border-[#e5e5e5]`、`rounded-[10px]` 这类字面值。
- 如果某个视觉效果在现有 token 里找不到对应项，**先去 `tailwind.css` 补一个语义 token，再在组件里引用**，不要为了赶进度先写死值"等以后再改"——这类"以后再改"的死值是低级错误的最大来源。
- 新增 token 时命名遵循 `--{类别}-{角色}-{状态?}` 的层级，例如 `--color-border-default` / `--color-border-hover` / `--color-text-tertiary`，不要用 `--color-gray-200` 这种描述"值"而不是"角色"的命名。

## 2. 组件结构规范

- 每个原子组件一个目录：`components/ui/<component-name>/index.tsx`，样式变体用 `class-variance-authority`（或等价的 variant 工具）集中定义在同一文件的顶部，不要在 JSX 里用三元表达式拼 class 字符串。
- Base UI primitive 的行为（开关、键盘导航、焦点管理）一律直接复用 Base UI 自带能力，**不要在业务层重新实现**这些交互逻辑；如果默认行为不满足需求，先确认是不是用错了 API，再考虑自定义。
- 组件对外只暴露必要的 props；内部实现细节（比如具体用了哪个 Radix primitive）不通过 props 泄漏给调用方。

## 3. 圆角与间距的角色化约束

- 表单控件、按钮、Select trigger 统一使用 `rounded-control`（对应 `var(--radius)`，当前值 10px / shadcn `rounded-lg`），**不允许每个组件各自定义一个圆角值**。
- 卡片类容器（Card、Popover 面板、Dialog 面板）统一使用 `rounded-surface`，与表单控件的圆角角色区分开，即便数值目前相同，也要用不同的语义名，避免以后要单独调整时牵一发动全身。
- 组件内部间距（padding/gap）只能从预定义的 spacing scale 取值（4/8/12/16/24/32...），禁止出现 `p-[13px]` 这类任意值——任意值是"内外边距不对齐"问题里最常见的一种。

## 4. 可访问性基线（不可协商）

- 所有可交互元素（button、trigger、link）必须有可见的 `focus-visible` 样式，禁止裸写 `outline-none` 而不补焦点样式；需要移除默认轮廓时统一用 `outline-hidden` + 自定义 `focus-visible:ring-*`。
- 图标按钮（icon-only button）必须有 `aria-label` 或等价的可访问名称。
- 颜色对比度、键盘可达性、reduced-motion 处理，按 [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) 的清单自查，不需要重新发明一套。

## 5. 新增组件前的检查清单

在往 `components/ui/` 加新组件之前，按顺序确认：

1. shadcn/ui 或 Base UI 是否已有对应 primitive？有则复用，不重新造轮子。
2. 是否需要新增语义 token？需要则先在 `tailwind.css` 补齐。
3. 是否是 overlay 类组件（会浮层展示）？是则额外遵守 `overlay-conventions.md` 的契约。
4. 组件是否需要国际化文案？按 `Tapstate Web Engineering Guide` 的 i18n 硬约束处理，不写裸字符串。
5. 提交前跑 `pnpm lint`、`pnpm typecheck`，确认没有引入裸值 token（人工审查 + 后续接入的失效 class 检查脚本共同把关）。
