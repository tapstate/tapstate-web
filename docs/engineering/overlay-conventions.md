# Overlay 组件契约：z-index、受控模式、焦点

> 位置：`docs/engineering/overlay-conventions.md`
> 适用范围：所有会产生浮层的组件——Select、Dropdown、Dialog、Popover、Menu、Tooltip、Drawer
> 读取时机：新增/修改任意 overlay 类组件，或业务代码里调用这些组件时
> 关联文档：组件通用契约见 [`apps/web/components/ui/AGENTS.md`](../components/ui/AGENTS.md)

## 1. z-index 归属：只在组件内部管理

- z-index 的层级完全由 `components/ui/` 内部统一管理，**业务调用方禁止传入任何形式的 z-index 覆盖**：不允许 `className="z-50"`、不允许通过 `style={{ zIndex: 999 }}`、不允许给组件加一个专门的 `zIndex` prop 当逃生舱。
- 如果某个业务场景下浮层被别的元素遮挡了，先检查是不是用错了组件（比如该用 Dialog 却用了 Popover），而不是加一个更大的 z-index 值去"压过去"——后者是 z-index 数值螺旋上升、最终失控的根源。
- 所有 overlay 组件的 z-index 层级在 `tailwind.css` 里统一定义为语义 token（如 `--z-overlay-dropdown`、`--z-overlay-dialog`、`--z-overlay-toast`），层级关系一目了然，新增浮层类型时在这张表里加一行，不在业务代码里现拍一个数字。

## 2. 受控模式：统一 `open` / `onOpenChange`

- Dialog、Popover、Dropdown 等一律使用受控模式：组件内部状态通过外部传入的 `open` 和 `onOpenChange` 管理，**不允许用 `{isOpen && <Dialog />}` 这种 JSX 条件渲染去挂载/卸载浮层**。
- 原因：条件渲染会在关闭的瞬间直接把节点从 DOM 里摘掉，导致关闭动画（fade-out、scale-out）根本没有机会播放完，视觉上表现为"浮层突然消失"而不是"平滑关闭"——这也是排查"动效感觉很生硬"问题时最常见的原因之一。
- 复杂表单类弹窗（比如包含未保存变更确认的 Dialog）需要把业务状态（表单值、脏检查）放进 `DialogContent` 内部管理，而不是和 `open` 状态混在一起，保证浮层的挂载/卸载完全由 Base UI/Radix 自身的过渡机制接管。

## 3. 焦点与可访问性

- 所有 overlay 触发元素（trigger）和浮层内部的可交互元素必须有 `focus-visible` 样式；键盘打开浮层后，焦点必须自动移入浮层内的第一个可交互元素（Radix 默认行为，不要手动覆盖）。
- 关闭浮层（Esc、点击遮罩层、点击关闭按钮）后，焦点必须还给触发它的元素，不要让焦点丢失到 `<body>`。
- 风险性确认类浮层（如删除确认、放弃未保存变更）**不放关闭图标**，只保留"取消/确认"两个显式按钮，避免用户通过右上角小叉草率关闭而误判操作已取消。

## 4. 新增 overlay 组件时的检查清单

1. z-index 是否已在 `tailwind.css` 的层级表里登记？不允许现场发明一个数值。
2. 是否用了受控 `open`/`onOpenChange`？业务状态是否和开关状态解耦？
3. 键盘可达性：Tab 顺序、Esc 关闭、焦点归还是否都验证过？
4. 是否所有触发点都复用同一个组件实例的模式（同一套 z-index、同一套动效），没有另起一份手写的 floating dropdown？——按 `Tapstate Web Engineering Guide` 的规定，业务页面禁止手写 floating dropdown，一律走 `components/ui/*`。
