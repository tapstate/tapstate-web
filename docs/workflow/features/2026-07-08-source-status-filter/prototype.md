# Data Source Connection Status Filter Prototype

> 状态：Draft
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-source-status-filter/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

- 在不改变数据源页面主结构的前提下，为连接状态增加一个稳定、可扫描的筛选入口。
- 确认筛选入口对左侧列表和主表格的共同作用范围。

## 2. 页面 / 交互范围

本原型覆盖：

- `/sources` 数据源页面。
- 左侧搜索区新增连接状态 Select。
- 左侧数据源列表和全部数据源表格的过滤结果。
- 当前详情对象被筛掉时的回退行为。

本原型不覆盖：

- 新建数据源流程。
- 后端连接检测、错误码和权限。
- 数据源详情页 tab 内容重构。

## 3. 布局线框

```text
┌────────────────────────────────────────────────────────────┐
│ Header: Data Sources                              Create    │
├──────────────────┬─────────────────────────────────────────┤
│ Search sources   │ All Sources / selected source detail     │
│ ┌──────────────┐ │                                         │
│ │ input        │ │ Filtered table uses same filteredSources │
│ └──────────────┘ │                                         │
│ ┌──────────────┐ │ Empty row when no source matches         │
│ │ Status: all ▼│ │                                         │
│ └──────────────┘ │                                         │
│ All Sources      │                                         │
│ production_db ●  │                                         │
│ legacy_mongodb ● │                                         │
└──────────────────┴─────────────────────────────────────────┘
```

## 4. 源稿 / 设计保真边界

适用于迁移、还原、复刻、按设计稿实现类需求。

- 源稿 / 设计稿 / 导出代码：N/A。
- 必须保持一致的区域：现有 header、左侧列表、详情页和全部数据源表格层级。
- 允许为适配当前工程调整的区域：搜索区域可从单一 input 扩展为 input + select 的竖向控件组。
- 明确禁止新增到产品 UI 的内容：调试切换器、状态 mock 控件、测试说明文字。
- QA / debug / preview control 的承载方式：不新增。

## 5. 关键交互

| 触发 | 页面反馈 | 结果 |
|---|---|---|
| 选择“全部” | Select 显示全部；列表和表格恢复不按状态限制 | 仍受搜索词限制 |
| 选择“已连接” | 列表和表格只显示绿色连接状态数据源 | 连接错误数据源被隐藏 |
| 选择“连接错误” | 列表和表格只显示红色错误状态数据源 | 已连接数据源被隐藏 |
| 输入搜索词后切换状态 | 搜索词保留，结果按搜索词与状态共同过滤 | 两个条件叠加 |
| 当前详情数据源被筛选排除 | 详情区域回到“全部数据源”表格 | 避免展示筛选外对象 |

## 6. 状态覆盖

| 状态 | 表现 | 操作 | 文案 key |
|---|---|---|---|
| Loading | 不新增；沿用页面预览 loading 约定 | N/A | `sources.states.loading` |
| Empty | 主表格显示无匹配结果行 | 调整筛选或搜索 | `sources.filters.noResults` |
| Error | 连接错误状态仍用红色 badge 和详情提示表达 | 切换到错误筛选快速查看 | `sources.connectionError` |
| Success | 列表和表格展示筛选后的数据源集合 | 切换筛选、点击详情 | `sources.filters.connectionStatus.*` |

注意：四态覆盖是验收要求，不代表可以把状态切换器、测试按钮或 preview toggle 暴露给最终用户。

## 7. 响应式规则

- Desktop：左侧栏宽度保持 `md:w-64`；搜索和筛选竖向排列，Select 宽度 100%。
- Tablet：保持与 desktop 类似，控件不横向溢出。
- Mobile：左侧栏变为顶部区域，搜索与筛选仍竖排；下方数据源列表横向滚动逻辑保持不变。

## 8. 原型资产

- Markdown wireframe：本文件 §3。
- HTML 原型：N/A。
- 截图：验收阶段补充本地目检结论。
- 设计稿链接：N/A。

## 9. 评审记录

| 时间 | Reviewer | 结论 | 备注 |
|---|---|---|---|
| 2026-07-08 | Codex self-review | Pass | 采用左侧搜索区 Select，避免扩大布局和路由范围。 |
