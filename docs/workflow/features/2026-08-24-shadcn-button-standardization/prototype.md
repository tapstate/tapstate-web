# Shadcn Button Standardization Prototype

> 状态：Approved for implementation
> 日期：2026-08-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-24-shadcn-button-standardization/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

不改变现有页面的布局和交互，只统一按钮的基础实现、focus ring、disabled 行为、圆角和语义 variant。

## 2. 页面 / 交互范围

本原型覆盖：应用壳 footer、登录表单、Ask Tapstate、Explorations、Pipelines、Sources 及其 dialog / form controls。

本原型不覆盖：shadcn 内部组件实现、测试代码 DOM 查询、非 button 的链接和表格行点击行为。

## 3. 布局线框

```text
┌──────────────────────────────────────────────┐
│ 现有 app shell / page / dialog                │
│   原有内容与布局                              │
│   [Button: default / outline / ghost / icon]  │
└──────────────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：现有仓库实现与 `docs/engineering/design-system.md`。
- 必须保持一致的区域：所有按钮的可见位置、文案、图标、触发结果、选中态和禁用态。
- 允许为适配当前工程调整的区域：使用 `Button` 的 `variant`、`size` 与 `className` 替换原生元素基础样式。
- 明确禁止新增到产品 UI 的内容：新的 CTA、状态切换器、debug 控件或装饰性按钮。
- QA / debug / preview control 的承载方式：仅源码扫描、lint、typecheck 与既有测试，不暴露到产品界面。

## 5. 关键交互

| 触发                               | 页面反馈                             | 结果                     |
| ---------------------------------- | ------------------------------------ | ------------------------ |
| 点击普通操作                       | 保留原 hover / active / focus 表现   | 执行原回调               |
| 点击 icon-only 操作                | 保留 aria-label 与稳定正方形尺寸     | 执行原回调或打开既有菜单 |
| 点击 selected tab / segmented item | 保留 aria-pressed / selected class   | 切换原状态               |
| 表单提交或异步操作                 | 保留 submitting / disabled / spinner | 执行原提交或 retry       |

## 6. 状态覆盖

| 状态    | 表现                                 | 操作                 | 文案 key |
| ------- | ------------------------------------ | -------------------- | -------- |
| Loading | 原按钮尺寸稳定，spinner 保持在按钮内 | 按现有 disabled 规则 | 既有 key |
| Empty   | 原空态按钮                           | 创建或重试           | 既有 key |
| Error   | 原错误态 retry / destructive action  | 重试、关闭或确认     | 既有 key |
| Success | 原页面操作按钮                       | 继续操作             | 既有 key |

## 7. 响应式规则

- Desktop：保留原工具栏、表格和 app shell 尺寸。
- Tablet：保留原按钮的收缩、换行和横向滚动策略。
- Mobile：icon-only 按钮继续保持可触达尺寸，带文案按钮不强制换行。

## 8. 控件密度与视觉决策

| 控件 / 区域            | 默认规则                                   | 本次选择                           | 依据                         | 是否例外            |
| ---------------------- | ------------------------------------------ | ---------------------------------- | ---------------------------- | ------------------- |
| 普通操作               | shadcn `default` / `outline` / `secondary` | 复用现有语义                       | design-system Button 规范    | 否                  |
| 次要 icon 操作         | shadcn `ghost` + `icon-sm` / `icon`        | 保留局部 class 与 aria label       | 既有 Button API              | 否                  |
| tab / tree / segmented | `ghost` 或自定义局部 class                 | 保留 selected / pressed 样式       | 交互语义优先，避免误用主 CTA | 是，局部 class 例外 |
| 表单提交               | `default`                                  | 保留 `w-full`、loading 与 disabled | design-system 状态规范       | 否                  |

## 9. 原型资产

- Markdown wireframe：本文件。
- HTML 原型：N/A，直接复用现有页面。
- 截图：N/A。
- 设计稿链接：N/A。

## 10. 评审记录

| 时间       | Reviewer | 结论     | 备注                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------ |
| 2026-08-24 | Codex    | Approved | 用户要求明确，采用现有 shadcn Button，页面视觉与业务行为保持不变。 |
