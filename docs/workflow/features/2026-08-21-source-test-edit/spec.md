# Source edit and connection test

> 状态：In Progress
> 日期：2026-08-21
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/features/sources/`, `apps/web/service/source-client.ts`

## 1. Intake

### 用户原始输入

> Source 的创建有了，还要测试/编辑

补充：后端 `id` 是 Source 的全局唯一标识符，不能在 UI 中伪装成普通“Name”。创建时需说明它创建后不可修改，编辑时保持可见但只读。

补充：创建 Source 的连接器选择恢复多列展示。选择区使用 `bg-gray-50/40`，使纯白卡片与底层产生可感知但低对比的材料差；卡片无边框并使用弥散阴影，hover 仅上移 1px 并加深阴影。该非语义灰色是用户明确指定的局部视觉例外。

补充：连接器搜索框是选择页的固定布局区域，不随当前目录中连接器数量变化而隐藏。

### 背景与上下文

创建弹窗已经可用。仓库已有带 ETag 和 secret 保留策略的编辑对话框及 `PUT /api/sources/:id` client，但 Source 页面没有编辑入口。详情工具栏的 Test action 目前为 disabled 占位。

检索当前 Web client、feature 文档与仓库 API 合同后，没有发现可调用的 Source connection test endpoint，也没有定义测试请求应该使用已保存配置还是未保存草稿。不能以猜测的路径或 payload 替代后端合同。

### 假设

- 编辑仍通过 `GET /api/sources/:id` 获取带 quoted ETag 的最新 Source，再通过 `PUT /api/sources/:id` 保存。
- 连接测试需要后端提供明确的 endpoint、返回结构和 secret 处理规则后才能实现。
- 已配置的 secret 在编辑时仍为 write-only，保持、替换、清除的现有语义不变。

### 未决问题

- 后端用于连接测试的 HTTP method、path、request body、success payload 和 error code。
- 测试的对象是已保存 Source，还是编辑表单内尚未保存的 draft。

## 2. Decomposition

### 目标

- 在 Source 详情操作栏接入 Edit。
- 打开编辑前加载最新 Source 和 ETag，避免列表投影缺少并发控制信息。
- 编辑保存后同步更新 Source 列表、编辑缓存和选中详情。
- 为连接测试保留已知接口缺口与完整 UI 状态设计，待合同确认后实现。

### 非目标

- 不猜测或新增未确认的后端 test endpoint。
- 不改变 Source id 或 connector，但应准确以“Source ID” / “数据源 ID”展示其全局唯一、创建后不可修改的语义。
- 不变更 connector schema 或 Formily runtime。
- 不把连接器选择退回高噪声的单列表格行，且不为图标增加背景或边框容器。
- 不实现同步、数据预览或运行时观测。

### 用户路径

1. 用户在 Source 工作台选择一个 Source。
2. 用户点击 Edit，页面获取最新 Source 与 ETag 后打开编辑对话框。
3. 用户修改配置并保存，成功后详情和列表立即使用服务端返回的 SourceView。
4. 后端提供测试合同后，用户可在详情工具栏触发 Test connection，并看到按钮级 pending 与轻量结果反馈。

### 影响面

- IA / 路由：无新增路由，沿用 Source master-detail workbench。
- 状态管理：TanStack Query 负责单 Source detail 和 list cache。
- 数据 / API：编辑使用已有 get/update client。连接测试暂缺 API 合同。
- 权限：沿用认证 `apiFetch`。
- i18n：补齐 `Source ID` 标题、创建说明和 ID 专属校验 / 冲突文案，且同步 `en`、`zh-CN`、`zh-TW`。
- 错误处理：详情加载失败保持在工具栏 action 区附近，不把页面误显示为 editable。

### 备选方案

| 方案                              | 优点                                 | 风险                                | 结论   |
| --------------------------------- | ------------------------------------ | ----------------------------------- | ------ |
| 在点击 Edit 后拉取 detail 和 ETag | 并发保存正确，不依赖 list projection | 多一次读取                          | 采用   |
| 从 list projection 直接构造编辑器 | 实现少                               | 缺 ETag，可能覆盖远端修改           | 不采用 |
| 猜测 `POST /sources/:id/test`     | 看似快速                             | 请求语义、secret 与错误处理不可验证 | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：N/A

## 4. UI / IA Sketch

```text
┌──────────────────────────────────────────────────────────────┐
│ Source name · connector                         Test   Edit   │
├──────────────────────────────────────────────────────────────┤
│ tables / current Source projection                            │
└──────────────────────────────────────────────────────────────┘

Edit dialog
┌──────────────────────────────────────────────────────────────┐
│ Source name · connector                                  ×   │
├──────────────────────────────────────┬───────────────────────┤
│ configuration form, vertically stacked│ existing setup help   │
│ metadata, tables, SRS                 │                       │
├──────────────────────────────────────┴───────────────────────┤
│                                         Cancel       Save    │
└──────────────────────────────────────────────────────────────┘
```

## 5. 状态矩阵

| 状态                 | 页面表现                                     | 用户可做什么     | 文案 key                         |
| -------------------- | -------------------------------------------- | ---------------- | -------------------------------- |
| Edit loading         | Edit button 固定尺寸 spinner，其他详情不跳动 | 等待             | `sources.create.loadingSchema`   |
| Edit load error      | 工具栏附近的轻量 error，可重试 Edit          | 重试             | `sources.edit.errors.*`          |
| Edit ready           | 可关闭的配置 dialog                          | 编辑、取消、保存 | `sources.edit.*`                 |
| Validation           | 字段级错误                                   | 修正后保存       | `sources.edit.validation.*`      |
| Submitting           | 保存按钮固定尺寸 pending，关闭禁用           | 等待             | `sources.edit.submitting`        |
| Conflict             | 保留草稿，提供 reload / keep draft           | 恢复或重试       | `sources.edit.errors.conflict.*` |
| Test pending         | 待后端合同实现                               | 等待             | future `sources.test.*`          |
| Test success / error | 待后端合同实现                               | 重试或编辑       | future `sources.test.*`          |

## 6. i18n 范围

本阶段补充 `sources.create.idLabel`、`sources.create.idHint`、ID 专属校验 / 冲突文案和 `sources.edit.idLabel`，均同步 `en`、`zh-CN`、`zh-TW`。连接测试合同落地时必须同步新增其对应 key。

## 7. 数据与接口

- 是否需要新接口：编辑否。连接测试是，当前仓库未定义。
- 是否使用 mock：编辑组件测试 mock 已有 `getSource` / `updateSource` contract。
- 错误码 / 错误文案：编辑复用 `source.version-conflict`、`source.precondition-required` 和网络错误。测试错误码待 API 合同。

## 8. 验收标准

- [x] Source detail 的 Edit 入口可获取最新 Source detail 和 ETag 后打开编辑器。
- [x] 保存后 Source list、detail cache 和选中详情均更新为服务端返回值。
- [x] 编辑加载中、加载错误、validation、submitting、conflict 状态稳定且可用。
- [x] 不产生猜测的连接测试请求，测试接口缺口有明确记录。
- [ ] 相关组件测试、typecheck、i18n check、格式和 diff 检查通过，等待 authenticated UI inspection。

## 9. 风险

- 既有未接入编辑对话框的布局早于最新 Source create/Formily 规范，接入前需评估并避免暴露已被拒绝的双列表单布局。
- 测试 endpoint 一旦决定使用 draft，需要明确 write-only secret 如何传递且绝不能泄露至页面或日志。
