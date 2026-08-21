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

补充：后端已经提供连接测试。Web 调用既有 `POST /api/connections:test`，一次请求直接返回完整报告，不使用流式响应或轮询。

### 背景与上下文

创建弹窗已经可用。仓库已有带 ETag 和 secret 保留策略的编辑对话框及 `PUT /api/sources/:id` client。后端已有通用 connection test endpoint，但 Web client 尚未接入。

`SourceView.config` 会移除已保存密钥，而 `POST /api/connections:test` 需要当前 `settings`。因此测试入口放在创建和编辑表单的 footer，使用当前草稿而不是已保存详情。编辑已有密钥且保持原值时，浏览器不持有该值，用户必须先选择替换并重新输入后才能测试。

### 假设

- 编辑仍通过 `GET /api/sources/:id` 获取带 quoted ETag 的最新 Source，再通过 `PUT /api/sources/:id` 保存。
- 连接测试使用 `POST /api/connections:test`，请求体为 `{ id, connectorId, settings }`，直接返回 `{ connectionId, connectorId, outcome, checks, testedAt }`。
- 已配置的 secret 在编辑时仍为 write-only，保持、替换、清除的现有语义不变。

### 未决问题

- 后端测试失败的具体 error code 是否需要映射为更细粒度的前端行动建议；当前统一展示安全的请求失败提示。

## 2. Decomposition

### 目标

- 在 Source 详情操作栏接入 Edit。
- 打开编辑前加载最新 Source 和 ETag，避免列表投影缺少并发控制信息。
- 编辑保存后同步更新 Source 列表、编辑缓存和选中详情。
- 为创建和编辑 Source 的当前草稿提供一次性连接测试和完整报告反馈。

### 非目标

- 不新增 Source 专用 test endpoint，也不读取后端持久化的历史 test result。
- 不改变 Source id 或 connector，但应准确以“Source ID” / “数据源 ID”展示其全局唯一、创建后不可修改的语义。
- 不变更 connector schema 或 Formily runtime。
- 不把连接器选择退回高噪声的单列表格行，且不为图标增加背景或边框容器。
- 不实现同步、数据预览或运行时观测。

### 用户路径

1. 用户在 Source 工作台选择一个 Source。
2. 用户点击 Edit，页面获取最新 Source 与 ETag 后打开编辑对话框。
3. 用户修改配置并保存，成功后详情和列表立即使用服务端返回的 SourceView。
4. 用户在创建或编辑表单点击 Test connection，前端校验当前连接字段后调用既有 endpoint，并在表单中显示完整报告。
5. 编辑时若密钥仍是“保持原值”，前端要求重新输入，不发送脱敏的配置。

### 影响面

- IA / 路由：无新增路由，沿用 Source master-detail workbench。
- 状态管理：TanStack Query 负责单 Source detail 和 list cache。
- 数据 / API：编辑使用已有 get/update client；连接测试使用同步的 `POST /api/connections:test`。
- 权限：沿用认证 `apiFetch`。
- i18n：补齐 `Source ID` 标题、创建说明和 ID 专属校验 / 冲突文案，且同步 `en`、`zh-CN`、`zh-TW`。
- 错误处理：详情加载失败保持在工具栏 action 区附近，不把页面误显示为 editable。

### 备选方案

| 方案                              | 优点                                   | 风险                             | 结论   |
| --------------------------------- | -------------------------------------- | -------------------------------- | ------ |
| 在点击 Edit 后拉取 detail 和 ETag | 并发保存正确，不依赖 list projection   | 多一次读取                       | 采用   |
| 从 list projection 直接构造编辑器 | 实现少                                 | 缺 ETag，可能覆盖远端修改        | 不采用 |
| 在详情中直接测试保存配置          | 入口更短                               | 浏览器没有已配置密钥的明文       | 不采用 |
| 在 create/edit 表单测试当前草稿   | 使用用户当前输入，保留 write-only 边界 | 用户需在编辑时重新输入保留的密钥 | 采用   |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：N/A

## 4. UI / IA Sketch

```text
┌──────────────────────────────────────────────────────────────┐
│ Source name · connector                                Edit   │
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
│                         [inline test report]              │
├──────────────────────────────────────────────────────────────┤
│                          Cancel  Test connection  Save       │
└──────────────────────────────────────────────────────────────┘
```

## 5. 状态矩阵

| 状态            | 页面表现                                     | 用户可做什么     | 文案 key                         |
| --------------- | -------------------------------------------- | ---------------- | -------------------------------- |
| Edit loading    | Edit button 固定尺寸 spinner，其他详情不跳动 | 等待             | `sources.create.loadingSchema`   |
| Edit load error | 工具栏附近的轻量 error，可重试 Edit          | 重试             | `sources.edit.errors.*`          |
| Edit ready      | 可关闭的配置 dialog                          | 编辑、取消、保存 | `sources.edit.*`                 |
| Validation      | 字段级错误                                   | 修正后保存       | `sources.edit.validation.*`      |
| Submitting      | 保存按钮固定尺寸 pending，关闭禁用           | 等待             | `sources.edit.submitting`        |
| Conflict        | 保留草稿，提供 reload / keep draft           | 恢复或重试       | `sources.edit.errors.conflict.*` |
| Test validation | 与创建/编辑一致的字段级校验                  | 修正当前草稿     | `sources.*.validation.*`         |
| Test pending    | Test button spinner，字段与关闭动作禁用      | 等待             | `sources.test.testing`           |
| Test success    | 表单内报告展示 outcome 和每项 check          | 编辑或继续保存   | `sources.test.passed`            |
| Test error      | 表单内轻量 destructive feedback              | 修正或重试       | `sources.test.errors.*`          |
| Retained secret | 不发请求，提示重新输入已配置密钥             | 替换后测试       | `sources.test.reenterSecrets`    |

## 6. i18n 范围

本阶段新增 `sources.test.*`，并同步 `en`、`zh-CN`、`zh-TW`。已有 Source ID 和编辑文案保持不变。

## 7. 数据与接口

- 是否需要新接口：否。使用既有 `POST /api/connections:test`。
- 是否使用 mock：组件测试 mock `testConnection`；client test 验证实际 path、POST body 和完整响应。
- 错误码 / 错误文案：编辑复用 `source.version-conflict`、`source.precondition-required` 和网络错误；测试按 network、protocol、server 安全归类。

## 8. 验收标准

- [x] Source detail 的 Edit 入口可获取最新 Source detail 和 ETag 后打开编辑器。
- [x] 保存后 Source list、detail cache 和选中详情均更新为服务端返回值。
- [x] 编辑加载中、加载错误、validation、submitting、conflict 状态稳定且可用。
- [x] 创建和编辑表单可发出 `POST /api/connections:test`，并渲染一次请求返回的完整检查报告。
- [x] 编辑时不会将保持原值的脱敏密钥用于测试；用户须替换并重新输入后才可测试。
- [ ] 相关组件测试、typecheck、i18n check、格式、build 和 diff 检查通过，等待 authenticated UI inspection。

## 9. 风险

- 既有未接入编辑对话框的布局早于最新 Source create/Formily 规范，接入前需评估并避免暴露已被拒绝的双列表单布局。
- 连接测试请求含用户当前输入的密钥，只能经认证 `apiFetch` 提交，不能写入 UI、日志或缓存。
