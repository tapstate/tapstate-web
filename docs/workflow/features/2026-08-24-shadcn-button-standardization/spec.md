# Shadcn Button Standardization

> 状态：Ready for implementation
> 日期：2026-08-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-24-shadcn-button-standardization/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：应用壳、登录、Ask Tapstate、Sources、Pipelines、Explorations

## 1. Intake

### 用户原始输入

> 项目中的 button 应该使用 shadcn 提供的

### 背景与上下文

项目已有 `apps/web/components/ui/button.tsx`，但业务组件仍混用原生 `<button>` 与 shadcn `Button`。这会让焦点环、禁用态、圆角、尺寸和语义 variant 在不同页面间不一致。

### 假设

- 本次范围覆盖 `apps/web` 业务源码中的原生 `<button>`，不改测试选择器，也不改 shadcn 内部 primitive 的实现。
- 现有布局、文案、业务回调、键盘语义和 aria 属性保持不变。
- 自定义布局类通过 `Button` 的 `className` 保留，语义颜色优先映射到既有 `variant`。

### 未决问题

- 无。若某个第三方组件要求原生 button 形态，将在实现和验收记录中单独说明。

## 2. Decomposition

### 目标

- 让业务 UI 按钮统一使用 `@/components/ui/button` 的 `Button`。
- 保留 icon-only、tab、tree item、segmented control、submit 和 dialog action 的现有交互语义。
- 通过源码检查确认没有遗漏的业务原生 `<button>`。

### 非目标

- 不重做页面视觉，不调整产品信息架构或路由。
- 不新增依赖，不重写 `Button` 的 variant API。
- 不迁移测试文件中的 DOM 查询，也不修改 `components/ui` 内部的 primitive 实现。

### 用户路径

1. 用户打开任意现有页面。
2. 用户点击页面按钮、图标操作、tab、树节点或表单提交按钮。
3. 控件使用统一的 shadcn focus、disabled、hover 和尺寸基础，同时维持原有结果。

### 影响面

- IA / 路由：无。
- 状态管理：无。
- 数据 / API：无。
- 权限：无。
- i18n：无新增或变更 key。
- 错误处理：无。

### 备选方案

| 方案                          | 优点               | 风险                                | 结论   |
| ----------------------------- | ------------------ | ----------------------------------- | ------ |
| 只迁移主 CTA                  | 改动小             | 仍保留大量实现分裂                  | 不采用 |
| 全部业务按钮迁移到现有 Button | 规则完整，行为集中 | 涉及多个组件，需要逐项检查语义      | 采用   |
| 新增一层全局 button wrapper   | 便于统一           | 重复现有 shadcn 组件，扩大 API 变化 | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：

## 4. UI / IA Sketch

```text
现有页面结构与布局保持不变
按钮实现：业务 <button>  ->  @/components/ui/button Button
                         -> variant / size / className 保留局部语义
```

## 5. 状态矩阵

| 状态    | 页面表现                                | 用户可做什么                 | 文案 key |
| ------- | --------------------------------------- | ---------------------------- | -------- |
| Loading | 原有 spinner 与稳定按钮尺寸             | 等待或取消（按现有页面行为） | 既有 key |
| Empty   | 原有空态主操作                          | 创建或进入下一步             | 既有 key |
| Error   | 原有 retry / close / destructive action | 重试或关闭                   | 既有 key |
| Success | 原有主操作、tab、tree、列表入口         | 继续编辑、切换或打开详情     | 既有 key |

## 6. i18n 范围

不新增或修改 locale key。现有用户可见文案继续使用既有 i18next key。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：不变。

## 8. 验收标准

- [ ] 业务源码中的按钮统一使用 `@/components/ui/button` 的 `Button`，允许 shadcn 内部 primitive 保持原状。
- [ ] 现有点击、提交、选择、disabled、aria-label、键盘焦点和测试行为保持不变。
- [ ] `pnpm lint` 与 `pnpm typecheck` 通过，静态扫描只剩测试或 shadcn 内部允许的 button 用法。

## 9. 风险

- `Button` 默认带有统一的尺寸和 focus 样式，若局部按钮依赖原生默认 display，需要通过已有 `className` 显式保留布局。
- Base UI Button 的 ref / props 类型需要与 Dialog、DropdownMenu 等组合组件兼容，迁移后以 typecheck 验证。
