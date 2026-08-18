# Source Workbench Prototype

> 状态：Approved
> 日期：2026-08-18
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-18-source-workbench/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

把 Source projection 变成一个可完成 CRUD 的工作台，同时保持当前简洁、低噪声的 app shell 视觉。

## 2. 页面 / 交互范围

本原型覆盖：

- 列表筛选、空态、详情摘要、配置投影。
- 创建和编辑共享 typed connector field renderer。
- 删除确认和 in-use 冲突。
- ETag 冲突恢复。

本原型不覆盖：

- Pipeline 运行态、连接测试、同步、数据预览。

## 3. 布局线框

```text
┌─────────────────────────────────────────────────────┐
│ Data Sources                                  + New │
├───────────────┬─────────────────────────────────────┤
│ Search        │ Source title · connector · actions  │
│ Source list   ├─────────────────────────────────────┤
│               │ selector cards / config projection  │
└───────────────┴─────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：现有 Source 页面作为局部视觉基线。
- 必须保持一致的区域：左侧 Source 列表、浅灰工作区、圆角边框、黑色主操作按钮。
- 允许为适配当前工程调整的区域：详情页改为独立路由，创建/编辑对话框共用字段渲染器。
- 明确禁止新增到产品 UI 的内容：Pipeline 级联删除、YAML 编辑器、runtime metrics 假数据。
- QA / debug / preview control 的承载方式：只写入测试和 acceptance，不暴露在页面。

## 5. 关键交互

| 触发 | 页面反馈 | 结果 |
| ---- | -------- | ---- |
| 点击 New | 打开创建对话框，加载 connector catalog | 创建成功后回到详情 |
| 点击 Source | 导航 `/sources/:id` | 加载 SourceView 和 ETag |
| 点击 Edit | 打开编辑对话框，id/connector disabled | 保存成功更新 query cache |
| 保存遇到 412 | 保留本地草稿，显示两种操作 | Reload 替换草稿；Retry 使用最新 ETag |
| 点击 Delete | 打开危险确认 | 204 后返回列表 |
| 删除遇到 in-use | 展示排序后的 referrer ids | 不执行级联删除 |

## 6. 状态覆盖

| 状态 | 表现 | 操作 | 文案 key |
| ---- | ---- | ---- | ---- |
| Loading | spinner + disabled actions | 等待 | `sources.states.loading` |
| Empty | 引导卡 + Create | 创建 | `sources.empty.*` |
| Error | alert + Retry | 重试/返回 | `sources.states.error` |
| Success | detail projection | 编辑/删除 | `sources.detail.*` |

## 7. 响应式规则

- Desktop：`md` 以上保持列表侧栏 + 主内容双栏。
- Tablet：侧栏缩窄，详情操作允许换行。
- Mobile：侧栏转为横向滚动列表；详情配置卡单列；对话框内容可滚动且 footer 固定。

## 8. 控件密度与视觉决策

| 控件 / 区域 | 默认规则 | 本次选择 | 依据 | 是否例外 |
| ----------- | -------- | ------------ | ---- | -------- |
| 主操作 | 深色实心、紧凑圆角 | 沿用现有 Source 页面 | 既有局部模式 | 否 |
| 次操作 | 白底细边框 | Edit/Cancel/Reload | 既有局部模式 | 否 |
| 危险操作 | 红色仅用于确认和错误 | Delete dialog | 状态语义 | 否 |
| 配置字段 | label + helper/error | connector catalog renderer | 表单可扫描性 | 否 |

## 9. 原型资产

- Markdown wireframe：本文件 §3。
- HTML 原型：N/A，现有页面作为视觉基线。
- 截图：验收阶段补充。
- 设计稿链接：N/A。

## 10. 评审记录

| 时间 | Reviewer | 结论 | 备注 |
| ---- | -------- | ---- | ---- |
| 2026-08-18 | Product direction | Approved | Source-only，Pipeline 延后 |
