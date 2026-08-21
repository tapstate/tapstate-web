# Formily Ant Design v6 Renderer Prototype

> 状态：Approved for implementation
> 日期：2026-08-20
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-20-formily-antd-v6/
> 对应 spec：[./spec.md](./spec.md)
> 对应 plan：[./plan.md](./plan.md)

## 1. 原型目标

在不影响来源弹窗信息架构与 shadcn shell 的前提下，将 connector 的动态字段外观与 Formily decorator 迁移到 AntD v6 adapter。

## 2. 页面 / 交互范围

本原型覆盖：

- Source create / edit dialog 内的 `ConnectorFormily` 字段区域。
- 文字、数字、选择、布尔字段的 Formily AntD v6 映射。
- 已配置 Secret 的 keep / replace / clear 草稿行为与 JSON array 编辑作为业务专用控制器，普通密码直接使用 adapter 的 Password。

本原型不覆盖：

- Selector grid、dialog shell、footer action、help sidebar。
- AntD page-level layout、message、notification、modal、table。

## 3. 布局线框

```text
┌──────────────── Source dialog ────────────────┐
│ shadcn header                                  │
├────────────────────────────────────────────────┤
│ muted form pane                                │
│   connection title / source id (shadcn)        │
│   ┌─ Formily AntD v6 boundary ───────────────┐ │
│   │ Label / required mark                     │ │
│   │ [ AntD input or select ]                  │ │
│   │ Inline Formily validation feedback        │ │
│   └───────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│ shadcn footer actions                          │
└────────────────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：现有 Source create / edit dialogs 与用户确认的两步大弹窗。
- 必须保持一致的区域：dialog 尺寸、header / footer、selector、左右分栏、返回 / 关闭行为。
- 允许为适配当前工程调整的区域：Formily 控件的 class prefix、内部控件 styling 与 feedback layout。
- 明确禁止新增到产品 UI 的内容：AntD 全局 navigation、layout、modal、message、全局 reset。
- QA / debug / preview control 的承载方式：测试仅在 Vitest / local dev 环境，不增加用户界面开关。

## 5. 关键交互

| 触发                         | 页面反馈                       | 结果                                        |
| ---------------------------- | ------------------------------ | ------------------------------------------- |
| 在 Input / NumberPicker 编辑 | Formily `onInput` 更新表单状态 | create / edit config 同步更新               |
| 选择 Select 选项             | AntD Select 关闭菜单并更新值   | conditional visibility reactions 正常执行   |
| 切换 Switch                  | 布尔值更新                     | schema reaction / submit 使用当前值         |
| 选择 Radio.Group             | segmented button-group 更新值  | 不显示 AntD radio-button，schema 值正常同步 |
| Secret replace / clear       | 保留现有草稿控制               | secret API payload 语义不变                 |
| 提交中                       | 各动态控件 disabled            | 不产生重复输入 / 状态改变                   |

## 6. 状态覆盖

| 状态    | 表现                                                 | 操作       | 文案 key             |
| ------- | ---------------------------------------------------- | ---------- | -------------------- |
| Loading | 现有 loader，不先渲染不完整 schema                   | 等待       | 既有 loading keys    |
| Empty   | Formily 没有 properties 时无额外装饰                 | 取消或返回 | N/A                  |
| Error   | `FormItem` inline feedback；request error 独立 alert | 修正、提交 | 既有 validation keys |
| Success | 现有 submit completion 路径关闭 dialog               | 继续操作   | 既有 flow            |

## 7. 响应式规则

- Desktop：Formily fields 宽度跟随 `max-w-3xl` 表单列；dropdown 可从 body portal 溢出。
- Tablet：保持单列、无横向滚动。
- Mobile：保持单列；AntD 控件宽度 `100%`，不展示误入的 page-level AntD layout。

## 8. 控件密度与视觉决策

| 控件 / 区域          | 默认规则                       | 本次选择                                                               | 依据                                                    | 是否例外       |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------- | -------------- |
| Formily boundary     | shadcn token / 10px radius     | AntD local `ConfigProvider`，36px controls、13px font、10px radius     | 依赖迁移且保持工作台密度                                | 是，局限字段区 |
| AntD class namespace | 应用 primitives 不污染其他页面 | `prefixCls="tap-formily"`                                              | 项目级 Formily namespace，可供未来 renderer 复用        | 是，隔离策略   |
| Form controls        | token-based color / focus      | 不引入 reset；局部 provider 引用 shadcn semantic CSS token             | 对齐 background、foreground、muted、border、ring、error | 否             |
| Radio.Group          | shadcn button-group segmented  | `bg-muted` + `border-border` 容器；选中项使用 `bg-background` / shadow | 保持模式选择与项目 button-group 的交互语言一致          | 否             |
| Secret / array       | 专用业务行为                   | 仅 configured secret 保持 custom renderer；普通密码使用 Password，数组使用 ArrayInput | adapter 无现成 draft semantics / JSON text semantics    | 是，功能必要   |

## 9. 原型资产

- Markdown wireframe：本文件第 3 节。
- HTML 原型：N/A。
- 截图：实施后以本地 desktop / mobile 目检记录。
- 设计稿链接：用户在当前对话提供的 source dialog reference。

## 10. 评审记录

| 时间       | Reviewer | 结论                        | 备注                                  |
| ---------- | -------- | --------------------------- | ------------------------------------- |
| 2026-08-20 | Codex    | Approved for implementation | 只让 AntD 覆盖 Formily 动态控件区域。 |
