# Pipeline DAG editor prototype

> 状态：Approved
> 日期：2026-08-23
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-23-pipeline-dag-editor/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

> 2026-08-24 update: The interaction direction remains current. Node positions now persist through the separate Pipeline layout endpoint; the semantic DAG continues to come only from the backend `PipelineView` projection.

## 1. 原型目标

将 Pipeline 的结构化 DSL 显示为可理解、可检查的 DAG，而不是展示虚构的执行指标。画布借鉴 Dify 的直接操控方式，不保留页面 header 或固定三栏壳，所有局部操作作为画布上的悬浮 surface 出现。

## 2. 页面 / 交互范围

本原型覆盖：

- 全视口画布、dot grid、缩放、平移、fit view、minimap 和左上返回入口。
- 左下添加节点面板，Source / Target Source / Transform 节点，带类型的 handles、边、节点选择和右侧按需检查器。
- 纯浏览器内的节点位置拖动和未解析引用诊断。

本原型不覆盖：保存、拖线改写 DSL、生命周期、调试运行、YAML、协作光标、AI 生成、评论和假指标。

## 3. 布局线框

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Pipelines                                                                  │
│                                                                             │
│ [ Add nodes ]                                                                │
│  Source / Target Source / Transform                                         │
│                        ┌ Source ┐  ┌ Map ┐  ┌ Nest ┐  ┌ View ┐              │
│                      ──┤ crm    ├─►│ clean├─►│ c360 ├─►│ c360 ├──►          │
│                        └────────┘  └──────┘  └──────┘  └──────┘              │
│                                                        [ Inspector ]         │
│                   dotted canvas · pan · zoom · selection                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：Dify 的 React Flow workflow source and interaction model, plus Tapstate current app shell.
- 必须保持一致的区域：无边全屏平移缩放画布、紧凑节点、细连接边、浅色点阵背景、左上返回和悬浮属性检查模式。
- 允许为适配当前工程调整的区域：使用 Tapstate semantic tokens、10px control radius、Lucide 图标和现有按钮。
- 明确禁止新增到产品 UI 的内容：Dify brand assets、AI generation、协作 presence、comment、运行假数据。
- QA / debug / preview control 的承载方式：fixtures only in Vitest; no product toggle.

## 5. 关键交互

| 触发            | 页面反馈                                     | 结果                           |
| --------------- | -------------------------------------------- | ------------------------------ |
| 点击节点        | 节点获得 selection ring，检查器显示 DSL 摘要 | 读到 type、id、inputs、outputs |
| 拖动节点        | 仅在当前 session 更新坐标                    | 改善阅读，不写 Pipeline DSL    |
| 点击 Fit view   | 视口缩放到所有节点                           | 恢复全图上下文                 |
| 发现未知 `from` | 保留 diagnostics 且不画伪造边                | 用户看到结构错误               |

## 6. 状态覆盖

| 状态    | 表现                       | 操作             | 文案 key                   |
| ------- | -------------------------- | ---------------- | -------------------------- |
| Loading | 固定高度 canvas skeleton   | 等待             | `pipelines.editor.loading` |
| Empty   | 无 Pipeline 说明和创建入口 | 创建或返回       | `pipelines.editor.empty.*` |
| Error   | error state + Retry        | 重试             | `pipelines.editor.error.*` |
| Success | graph + inspector          | 选择、缩放、平移 | `pipelines.editor.*`       |

## 7. 响应式规则

- Desktop：画布满视口，添加节点面板左下 248px，检查器右侧 288px。
- Tablet：添加节点面板收为图标 toolbar，检查器保持 260px。
- Mobile：添加节点面板改为左下快捷入口，检查器从右侧滑出，控件触控目标至少 44px。

## 8. 控件密度与视觉决策

| 控件 / 区域 | 默认规则               | 本次选择                               | 依据                 | 是否例外 |
| ----------- | ---------------------- | -------------------------------------- | -------------------- | -------- |
| Canvas      | 稳定容器、无装饰背景   | 全视口低对比点阵                       | Dify 画布交互        | 否       |
| Nodes       | 不堆卡片、语义层级     | 轻边框矩形，类型色只用于 icon / handle | 高密度 DAG 扫描      | 否       |
| Inspector   | 应用 secondary surface | 选中时右侧悬浮 surface                 | 画布不被布局栅格截断 | 否       |
| Selection   | 可见 focus ring        | semantic ring，非 glow                 | a11y / UI guideline  | 否       |

## 9. 原型资产

- Markdown wireframe：本文件 §3。
- HTML 原型：N/A，验证使用真实 React Flow surface。
- 截图：实现阶段补充。
- 设计稿链接：N/A。

## 10. 评审记录

| 时间       | Reviewer       | 结论     | 备注                                          |
| ---------- | -------------- | -------- | --------------------------------------------- |
| 2026-08-23 | User direction | Approved | 指定 React Flow，并以 Dify 作为交互与视觉参考 |
