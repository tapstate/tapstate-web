# Source edit and connection test prototype

> 状态：In Progress
> 日期：2026-08-21
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

让已创建的 Source 有直接、可并发安全的编辑入口，并为后端连接测试能力预留清晰且不误导用户的动作位置。

## 2. 页面 / 交互范围

本原型覆盖：

- 已选 Source 详情 header 的 Edit action。
- Edit action 的读取 pending、error 和 retry。
- 既有 SourceEditDialog 的加载、保存、冲突恢复和关闭行为。

本原型不覆盖：

- 在无 API 合同条件下展示可点击的 Test connection。
- 同步、运行时观察、预览。

## 3. 布局线框

```text
┌──────────────────────────────────────────────────────────────┐
│ [icon] orders                                                 │
│        mysql.local · mysql · 1 configured secret   Test Edit  │
├──────────────────────────────────────────────────────────────┤
│ Tables in orders                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ name                         type             selector  ›│ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Edit remains a dialog, not a new route. Its body is vertically ordered so field scanning follows the existing Formily vertical layout.

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：当前 Source workbench 和已完成的 Source create dialog。
- 必须保持一致的区域：紧凑 56px toolbar、语义 token、shadcn button geometry、无装饰性 icon frame。
- 允许为适配当前工程调整的区域：Edit action 在详情 header 中取代无效 disabled placeholder。
- 明确禁止新增到产品 UI 的内容：猜测的连接测试结果卡、mock latency、虚假的 healthy status。
- QA / debug / preview control 的承载方式：测试由 Vitest 和 acceptance 记录承载，不增加终端用户开关。

## 5. 关键交互

| 触发        | 页面反馈                      | 结果                              |
| ----------- | ----------------------------- | --------------------------------- |
| 点击 Edit   | action 固定宽度显示 spinner   | 拉取 `GET /sources/:id` 和 ETag   |
| detail 成功 | 打开已有编辑 dialog           | 可编辑最新 Source                 |
| detail 失败 | action 下方轻量错误和 Retry   | Source 页面保持可浏览             |
| 保存成功    | dialog 关闭，list/detail 更新 | 显示更新后的 Source projection    |
| 保存冲突    | dialog 保留本地草稿           | 用户可 reload 或保留草稿更新 ETag |

## 6. 状态覆盖

| 状态    | 表现                                     | 操作           | 文案 key                       |
| ------- | ---------------------------------------- | -------------- | ------------------------------ |
| Loading | Edit button 内 spinner，不改变高度或字号 | 等待           | `sources.create.loadingSchema` |
| Empty   | N/A，未选 Source 无 detail action        | 选择 Source    | N/A                            |
| Error   | action area 中的 error text + Retry      | 重试           | `sources.edit.errors.*`        |
| Success | dialog/updated detail                    | 编辑或继续浏览 | `sources.edit.*`               |

## 6.1 创建连接器选择区补充

```text
浅 muted 背景
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ [icon] MySQL │  │ [icon] Mongo │  │ [icon] ...   │
└──────────────┘  └──────────────┘  └──────────────┘
```

- Desktop 使用 3 列、tablet 使用 2 列、mobile 使用 1 列，避免连接器数量较少时单列表格显得空且笨重。
- 选择步骤的 header 标题为“选择连接器”，与卡片展示的 MySQL、MongoDB 等连接器对象一致；进入配置步骤后，header 改为所选连接器名称。
- 搜索框始终显示在网格上方的固定位置，不会随当前连接器数量改变选择区的垂直节奏。
- 选择区使用用户指定的 `bg-gray-50/40`，卡片为 `bg-background` 并移除 1px 边框；仅用弱 `0 1px 3px` 阴影区分两层。`bg-gray-50/40` 是为获得稳定的浅灰材料差而批准的局部 token 例外。
- Hover 上移 1px 并采用较深但仍克制的阴影，过渡统一为 `transition-all duration-300`。阴影是用户明确要求的层级表达例外，不与外框混用。
- ConnectorIcon 维持无背景、无边框，防止把品牌图标再次包进装饰容器。

## 7. 响应式规则

- Desktop：详情 action 在标题右侧，Edit 维持自然宽度。
- Tablet：详情 action 可换行但保持 32px 高。
- Mobile：详情 action 紧随 source 摘要换行，dialog 表单为单列纵向流。

## 8. 控件密度与视觉决策

| 控件 / 区域  | 默认规则                        | 本次选择                                    | 依据                              | 是否例外 |
| ------------ | ------------------------------- | ------------------------------------------- | --------------------------------- | -------- |
| Edit action  | shadcn compact secondary button | `outline` token, 32px high                  | current toolbar and design system | 否       |
| Edit pending | 固定 action slot                | 同字号 spinner + text                       | anti-jitter rule                  | 否       |
| Error        | destructive semantic text       | action-adjacent, no card                    | quiet product boundary            | 否       |
| Test action  | actionable only when supported  | retain non-interactive gap until API exists | honest product boundary           | 否       |

## 9. 原型资产

- Markdown wireframe：本文件 §3。
- HTML 原型：N/A。
- 截图：实现后在认证会话中完成。
- 设计稿链接：N/A。

## 10. 评审记录

| 时间       | Reviewer | 结论        | 备注                                                        |
| ---------- | -------- | ----------- | ----------------------------------------------------------- |
| 2026-08-21 | Codex    | In progress | existing Source workbench vocabulary is the design baseline |
