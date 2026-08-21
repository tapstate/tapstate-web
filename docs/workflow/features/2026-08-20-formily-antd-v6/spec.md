# Formily Ant Design v6 Renderer Migration

> 状态：In Progress
> 日期：2026-08-20
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-20-formily-antd-v6/
> 对应 prototype：[./prototype.md](./prototype.md)
> 对应 plan：[./plan.md](./plan.md)
> 对应 acceptance：[./acceptance.md](./acceptance.md)
> 相关页面 / 模块：Source create / edit dialogs；`ConnectorFormily`

## 1. Intake

### 用户原始输入

> formily form ui 这一层换成 @potop/formily-antd-v6 这个依赖吧。它是基于 react19 + antd v6 的。我目前主应用用的 shadcn ui 还没考虑用 antd 只有表单用没冲突吧啊？
>
> 理论上@potop/formily-antd-v6 里面的 components 都要注入
>
> form 的布局模式应该是vertical
>
> source-form 的前缀太特指 source 了，项目中其他地方也会用到 formily 表单渲染
>
> 另外。样式要往 shadcn 方向设置。包括颜色，圆角
>
> 我已经看到 input 组件样式应用了 shadcn。radio-button 还没有。这个可以参考 shadcn 的 button-group
>
> spec text 里面还有个 messages 里面放了国际化语言，schema 里面的 title/tooltip/description 里模版字符串解析

### 背景与上下文

当前 `ConnectorFormily` 以本地 shadcn 适配器逐项映射 Formily 控件。用户要求把动态表单的 UI 渲染层替换为 `@potop/formily-antd-v6`。该适配器的 npm 最新版本为 2.0.2，peer dependencies 包含 `antd@^6.0.0`、React / React DOM / react-is `>=18`；当前应用使用 React 19.2.8，兼容范围满足。

### 假设

- `antd@^6.6.1` 与 `@potop/formily-antd-v6@^2.0.2` 只在 `ConnectorFormily` 边界使用。
- `@tapstate-web/formily` 继续负责 form 实例、schema field 与值同步，不更换 Formily 核心 API。
- 不导入 AntD 全局 reset；其 CSS-in-JS 与 `ConfigProvider` 仅为动态表单生成样式。

### 未决问题

- AntD 表单控件在现有大弹窗内的实际密度和 dropdown layering 是否符合现有 shadcn 工作台基线。

## 2. Decomposition

### 目标

- 安装并锁定 Ant Design 6 与 Formily AntD v6 适配器。
- 注册 adapter 的全部公开、可由 Formily `x-component` 渲染的 React 组件；连接器 schema 可直接使用它们。
- 将 Formily adapter 的全局布局上下文显式设为 `vertical`，保持单列表单项。
- 保留现有 secret 草稿状态、数组 JSON 编辑、Formily schema、创建 / 编辑数据契约与提交验证。
- 通过局部 `ConfigProvider` 隔离 AntD 的 class prefix 和组件 token，不改变 shadcn 的 dialog shell、按钮或其他应用页面。
- 将 Formily AntD 的 provider、项目级 class namespace 与 token 收敛为可复用边界；Source 仅消费该通用边界。
- 让 AntD 动态字段的 surface、文本、边框、弱化状态、hover、focus 和 error 色引用现有 shadcn CSS token；控件圆角保持 10px。
- 将 Formily `Radio.Group` 渲染为 shadcn 风格的 segmented button-group，避免 AntD 默认 radio-button 外观。
- 根据当前 i18next locale 选择 connector spec 顶层 `messages` 中对应语言的文案，并递归替换 schema 的 `title`、`tooltip`、`description`；未命中的模板与组件字段保持原样。

### 非目标

- 不将主应用或 shadcn primitives 迁移到 AntD。
- 不引入 AntD 全局 reset。
- 不改变 connector spec、API、source config 数据结构或 i18n key。
- 不重做 source create dialog 的已确认布局。
- 不把 adapter 的 hooks、React contexts 或 `FormDialog` / `FormDrawer` 等命令式工厂注册为 `x-component`。

### 用户路径

1. 用户选择 connector 并进入创建或编辑表单。
2. 标准字段以 Formily AntD v6 控件渲染、校验并更新 Formily 值。
3. Secret / array 的现有专用编辑行为继续生成相同的 source config。
4. 用户提交或取消，行为与迁移前一致。

### 影响面

- IA / 路由：无。
- 状态管理：Formily form state 与 secret draft state 保持现有接口。
- 数据 / API：无。
- 权限：无。
- i18n：不新增用户可见文案。
- 错误处理：保留 Formily feedback 与现有 API / validation 错误。

### 备选方案

| 方案                                                      | 优点                       | 风险                               | 结论   |
| --------------------------------------------------------- | -------------------------- | ---------------------------------- | ------ |
| 保持本地 shadcn Formily adapters                          | 无额外 bundle 与双设计系统 | 无法满足指定依赖迁移               | 不采用 |
| 在全应用引入 AntD reset / provider                        | 统一 AntD 默认体验         | 会影响 shadcn、Base UI 与现有页面  | 不采用 |
| 仅在 `ConnectorFormily` 使用 AntD adapter + 局部 provider | 满足动态表单迁移且边界可控 | 增加局部 bundle / 需验证浮层与样式 | 采用   |

## 3. Prototype Gate

- [x] 需要 prototype，见：[./prototype.md](./prototype.md)。

## 4. UI / IA Sketch

```text
Source create / edit dialog (shadcn shell)
┌────────────────────────────────────────────────┐
│ Dialog header / footer remain shadcn            │
├────────────────────────────────────────────────┤
│ Form section                                    │
│ ┌─ ConfigProvider (AntD v6, local prefix) ───┐ │
│ │ Formily FormItem + Input / Select / Switch │ │
│ │ ConfiguredSecretInput / ArrayInput         │ │
│ └─────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## 5. 状态矩阵

| 状态    | 页面表现                                     | 用户可做什么       | 文案 key                       |
| ------- | -------------------------------------------- | ------------------ | ------------------------------ |
| Loading | Dialog 延续已有 schema loading 区域          | 等待               | `sources.create.loadingSchema` |
| Empty   | 无 connector fields 时保留稳定空表单区域     | 取消或返回         | N/A                            |
| Error   | Formily inline feedback 与已有 request error | 修改字段、重试提交 | 既有 validation / error keys   |
| Success | 提交成功后关闭 dialog、刷新 source list      | 查看新增 source    | 既有 create / edit 流程        |

## 6. i18n 范围

不新增或修改 locale key；现有 secret 行为继续引用现有三语 keys。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：沿用现有组件测试 mock。
- 错误码 / 错误文案：沿用现有 source create / edit error mapping。

## 8. 验收标准

- [ ] `@potop/formily-antd-v6` 与 `antd` 安装版本满足适配器 peer constraints，React 19 typecheck / build 通过。
- [ ] 全部公开 schema-renderable AntD v6 adapter 已注入；标准字段直接使用 adapter 原生组件名，仅保留 configured secret 与 JSON array 两个业务专用 renderer。
- [ ] 创建与编辑 dialog 的 secret、array、validation、disabled / submitting 行为无回归。
- [ ] shadcn dialog / button / input 组件未被 AntD 全局 reset 改写。
- [ ] Formily AntD class namespace 不包含 source 业务语义，后续 Formily renderer 可复用相同 provider。
- [ ] Formily AntD 控件颜色与圆角使用 shadcn token / `--radius` 对应的 10px，而非硬编码灰色或独立品牌色。
- [ ] `Radio.Group` 使用 shadcn button-group 的背景、边框、选中态与圆角，不显示 AntD radio-button 视觉。
- [ ] 当前 i18next locale 对应的 `messages` 字符串可解析 schema 的 `title`、`tooltip`、`description`，支持混合模板、嵌套 properties，并保留未知模板。
- [ ] 桌面和移动视口无表单溢出、dropdown 覆盖或焦点层级问题。

## 9. 风险

- 同时存在 shadcn 与 AntD 会增加 bundle 及局部视觉差异。
- AntD dropdown / tooltip 默认 portal 和 Base UI dialog overlay 的 z-index、focus management 需要实测。
- 第三方 adapter 的维护质量和 AntD v6 未来兼容性需持续关注。
