# Pipeline DAG editor

> 状态：In Progress
> 日期：2026-08-23
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-23-pipeline-dag-editor/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/features/pipelines/`、`apps/web/app/routes/_pipeline-editor.pipelines.$pipelineId.edit.tsx`

> 2026-08-24 update: This file records the pre-contract exploration. The shipped editor reads backend `PipelineView.dag` and saves only independent canvas layout. The local `PipelineDsl` adapter and `/pipelines/new/edit` route are retired. Semantic DAG create and replace remain pending a typed command and ETag contract.

## 1. Intake

### 用户原始输入

> tapstate-web 继续 Source 的删除功能，然后开始推进 Pipeline 模块
> Pipeline 的编辑，技术栈使用 react-flow 来实现编辑画布。Pipeline 的 dsl 解析成 DagGraph 结构
> nodes/edges 渲染。样式你可以完全参考 Dify 他也用了 react-flow
> 这个编辑页面是一个无边的画布页面。面板浮动在画布上。不需要 header，左上角可以返回。
> Pipeline 的编辑也要开始做，后端实现 `PipelineView` 投影。

### 背景与上下文

现有 Pipeline 页面提供资源 Explorer、列表和多种创建方式，但还没有以 DAG 编辑 Pipeline 的路径。DAG editor 是独立的全屏工作区，不继承应用全局侧栏，也没有页面 header。点阵画布铺满视口，左上仅保留返回入口，添加节点与节点配置以悬浮 surface 覆盖在画布上。后端的结构化 `PipelineView` 写接口尚未落地，因此本切片建立一个不读写 YAML 的纯前端图转换层和画布。它的输入是与未来 `PipelineView` 对齐的结构化 Pipeline DSL 对象，不是 canonical YAML 字节。

列表首先消费既有 `GET /api/artifacts?kind=pipeline` 的只读 artifact 合同。该合同只保证 Pipeline 的 `id`、`kind`、`canonicalForm` 和 `contentHash`，不保证生命周期、子资源、运行指标或修改时间，因此列表只呈现 ID、类型和内容版本，不能伪造这些未提供的数据。

### 假设

- `@xyflow/react` 是 React Flow 的当前官方 React 包，使用其受控 nodes / edges API。
- Pipeline DSL 的 source、transforms、view、serve 结构遵循 `PipelineResource` 的投影语义；`from` 的自然顺序由后端解析器决定，前端只使用已结构化的明确引用。
- 目标节点是 `serve.sync[].source` 或 `serve.push[].source` 引用的顶层 Source，不是另一种资源。画布将其渲染为带 Source 数据库图标的 destination node。
- 节点坐标是浏览器短暂编辑状态，不写入 DSL，也不作为另一份 Pipeline 持久化事实。

### 未决问题

- 后端 `PipelineView` 的最终 JSON 字段和 create / replace 端点尚未可用。接通时必须以其合同替换编辑器的 local draft source，不能猜测或新增 YAML API。
- 初版不定义任意拖线如何反向改写 transform `from`，该写语义需要随结构化 Pipeline command 合同一起交付。

## 2. Decomposition

### 目标

- 将结构化 Pipeline DSL 确定性解析为领域 `DagGraph`，含 nodes、edges 和未解析引用诊断。
- 通过 React Flow 渲染 source、transform、view、serve 四类节点，并保留可选、可选中、可缩放和平移的画布。
- 通过 React Flow 渲染 source、target Source、transform、view、serve 节点，所有 edge 使用 Bezier 曲线；`filter`、`map`、`union`、`nest`、`join` 和 `js` 各有独立图标。
- 独立编辑页面使用左侧添加节点面板、中部 Dify 风格点阵画布、右侧节点配置面板；节点拖动仅改变本次浏览器会话的布局。
- 画布不包在 card 或栅格页面壳内。添加节点面板固定悬浮在左下，节点配置面板仅在选中节点时悬浮在右侧，左上只保留返回按钮。
- 保留当前 `/pipelines` 的 Explorer、列表和 Wizard / SQL / AI 创建入口；DAG editor 由 `/pipelines/new/edit` 单独创建路径进入。
- Explorer 和表格从已存储 Pipeline artifact 构建，提供 loading、empty、error 与 retry；不再显示本地示例 Pipeline、模拟 View/API 明细或伪运行数据。

### 非目标

- 不解析、生成或提交 YAML；不增加前端 Pipeline store 或本地 mock persistence。
- 不在本切片实现 Pipeline HTTP CRUD、ETag 写入、生命周期、运行时指标、日志或任意连线反写。
- 不复制 Dify 的组件、token、协作、AI 生成、comment 或执行调试面。

### 用户路径

1. 用户在 Pipeline Explorer 中查看列表，或从创建菜单选择 DAG editor。
2. 独立编辑器从左侧加入读取 Source、目标 Source 和 Transform，转换成 `DagGraph` 并显示 source 到 output 的依赖边。
3. 用户选择节点，在检查器读取 type、id 和引用关系；拖动节点调整本次会话的可读布局。
4. 未解析引用会保留为诊断，不会被静默丢弃或伪造边。

### 影响面

- IA / 路由：列表仍是既有 `/pipelines`；新建 DAG 使用不含 `AppShell` 的 pathless authenticated route，在 `/pipelines/new/edit` 呈现。
- 状态管理：React Flow 受控图状态仅在 editor 内；未来 server state 仍归 TanStack Query。
- 数据 / API：不新增 HTTP 合同；列表读取既有 `GET /api/artifacts?kind=pipeline`，编辑器仍等待未来 typed `PipelineView` 合同。
- 权限：复用认证壳，不新增权限解释。
- i18n：所有工具栏、空态、诊断和检查器文案进入三套 locale。
- 错误处理：结构化 DSL 的未知引用为页面可见诊断，HTTP typed error 接通时沿用后端 coded error。

### 备选方案

| 方案                                            | 优点                             | 风险                                        | 结论   |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------- | ------ |
| `@xyflow/react` 受控画布 + 纯 `DagGraph` 转换器 | 成熟画布交互，领域映射可独立测试 | 需明确视觉坐标不是 DSL                      | 采用   |
| 手写 SVG 画布                                   | 无依赖                           | 可达性、选择、缩放与手势成本高              | 不采用 |
| 在前端解析 canonical YAML                       | 可直接消费 artifact              | 复制后端 parser，破坏 typed projection 边界 | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md

## 4. UI / IA Sketch

```text
Pipeline editor, outside AppShell
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Pipelines                                                               │
│                                                                            │
│ [ Add nodes ]                         ◦ Source ── Filter ── View         │
│  Read Sources                                       ╲                     │
│  Target Source                             Serve ─── Target Source       │
│  Transforms                                               [ Inspector ]   │
│                                                                            │
│                     dot canvas, pan / zoom / select, Bezier              │
└──────────────────────────────────────────────────────────────────────────┘
```

## 5. 状态矩阵

| 状态                 | 页面表现                              | 用户可做什么     | 文案 key                         |
| -------------------- | ------------------------------------- | ---------------- | -------------------------------- |
| Loading              | 画布区域 skeleton，编辑动作禁用       | 等待投影         | `pipelines.editor.loading`       |
| Empty                | 说明尚无可编辑 Pipeline，保留创建路径 | 返回列表或创建   | `pipelines.editor.empty.*`       |
| Error                | API 或协议错误和 retry                | 重试或返回       | `pipelines.editor.error.*`       |
| Success              | 无边画布、悬浮节点面板和按需检查器    | 添加、选择、拖动 | `pipelines.editor.*`             |
| Unresolved reference | 节点保留，检查器展示诊断              | 检查 DSL         | `pipelines.editor.diagnostics.*` |

## 6. i18n 范围

新增或变更的 locale key：

- `pipelines.editor.*`
- `pipelines.node.*`（含 `target`）
- `pipelines.inspector.*`

必须同步 `en`、`zh-CN` 与 `zh-TW`。

## 7. 数据与接口

- 是否需要新接口：本切片否。列表消费既有 artifact 读取合同，后续编辑与保存消费 `PipelineView` typed JSON。
- 列表读取：`GET /api/artifacts?kind=pipeline`，响应为 `{ artifacts: StoredArtifact[] }`；每项严格校验 `id`、`kind: "pipeline"`、`canonicalForm`、64 位 `contentHash`。
- 是否使用 mock：产品页不新增 mock persistence。转换器与组件测试使用显式 fixture，仅作为测试输入。
- 错误码 / 错误文案：未知引用暂为转换器诊断；HTTP 已接通后使用后端 coded errors。

## 8. 验收标准

- [x] 结构化 Pipeline DSL 可确定性转换为 `DagGraph.nodes` / `DagGraph.edges`，含 source、target Source、transform、view 和 serve。
- [x] 未解析引用不会静默消失，且在画布检查器中有明确诊断。
- [x] React Flow 节点、Bezier 边、选中态、缩放和平移可用；节点坐标不会伪装为 Pipeline DSL 的保存结果。
- [x] 页面移除本地伪运行指标，文案经 i18n 并在 `en`、`zh-CN`、`zh-TW` 同步。
- [ ] parser / component tests、typecheck、i18n、build 与桌面和窄屏目检通过。

## 9. 风险

- `PipelineView` 后端投影必须在独立的 `tapstate` 工作流中实现。当前 checkout 正被别的工作流使用，不能在该工作树直接写入；前端仍不得回退到解析 YAML。
- 最终 `PipelineView` 若与当前结构假设不同，必须在有合同测试的同一变更中调整 adapter，而不是让画布消费 Java 或 YAML 形状。
- 常规 Pipeline 可为多输入多输出图，自动布局只能提供稳健初始位置，用户拖动不能改变真实 DSL 依赖。
