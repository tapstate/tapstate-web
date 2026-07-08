# Data Source Connection Status Filter

> 状态：Draft
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-source-status-filter/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/src/components/DataSourcesPage.vue`

## 1. Intake

### 用户原始输入

> 在数据源页面增加一个连接状态筛选，支持“全部 / 已连接 / 连接错误”。
>
> 重试

### 背景与上下文

数据源页面已有搜索框、左侧数据源列表和“全部数据源”表格，数据源状态目前只有 `connected` 与 `error` 两类，但用户只能通过视觉状态点和表格状态列识别，无法快速筛出连接异常的数据源。

### 假设

- 本次筛选只使用现有前端状态字段，不新增 API、权限或数据契约。
- 筛选条件与搜索条件叠加：先按连接状态，再按名称、类型、host 搜索。
- “全部”表示不限制连接状态。
- 当当前选中的数据源被新筛选条件排除时，页面回到“全部数据源”视图，避免详情页展示筛选外对象。

### 未决问题

- 无；按以上假设执行。

## 2. Decomposition

### 目标

- 在数据源页面增加连接状态筛选入口，选项为“全部 / 已连接 / 连接错误”。
- 筛选结果同步影响左侧数据源列表和“全部数据源”表格。
- 筛选文案走 `vue-i18n`，同步 en / zh-CN / zh-TW。
- 抽出可验证的筛选 helper，覆盖搜索与连接状态叠加逻辑。

### 非目标

- 不改路由、IA、导航结构。
- 不新增后端接口、错误码、权限控制或真实数据加载。
- 不调整数据源状态枚举范围，不新增“同步中”“未知”等状态。
- 不重构数据源页面整体布局或视觉体系。

### 用户路径

1. 用户进入 `/sources` 数据源页面。
2. 用户在搜索框下方打开连接状态筛选。
3. 用户选择“全部”“已连接”或“连接错误”。
4. 左侧列表与全部数据源表格立即按状态和搜索词叠加过滤。
5. 若没有匹配结果，表格显示可读空态。

### 影响面

- IA / 路由：不影响。
- 状态管理：新增页面局部 `connectionStatusFilter` 状态。
- 数据 / API：不影响，继续使用当前 mock 数据。
- 权限：不影响。
- i18n：新增连接状态筛选 label、全部选项、无匹配结果文案。
- 错误处理：不新增错误态；保留现有连接错误提示。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 在左侧搜索框下方加 Select 筛选 | 与现有浏览列表距离近，移动端自然竖排，影响范围小 | 侧栏更紧凑，需要控制宽度和空态 | 采用 |
| 在全部数据源表格上方加筛选条 | 更贴近表格筛选语义 | 选中单个数据源详情时筛选入口不可见，左侧列表行为不直观 | 不采用 |
| 做成状态 segmented tabs | 入口更快 | 会与“全部数据源”按钮和页面 tab 概念混淆 | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：

## 4. UI / IA Sketch

```text
┌──────────────────────────────────────────────┐
│ Data Sources                         Create  │
├──────────────┬───────────────────────────────┤
│ Search       │ All Sources / Source Detail   │
│ Status ▼     │                               │
│ All Sources  │ Table uses same filtered set  │
│ Source list  │                               │
└──────────────┴───────────────────────────────┘
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 本次不新增加载态；沿用页面当前预览 loading 文案约定 | N/A | `sources.states.loading` |
| Empty | 筛选后无匹配结果时，全部数据源表格显示单行空态 | 调整搜索词或状态筛选 | `sources.filters.noResults` |
| Error | 本次不新增页面错误态；连接错误数据源仍显示红色状态与详情提示 | 可切换到“连接错误”快速定位 | `sources.connectionError` |
| Success | 左侧列表和全部数据源表格展示过滤后的数据源 | 搜索、切换筛选、进入详情 | `sources.filters.connectionStatus.*` |

## 6. i18n 范围

新增或变更的 locale key：

- `sources.filters.connectionStatus.label`
- `sources.filters.connectionStatus.all`
- `sources.filters.noResults`

必须同步：

- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
- `apps/web/src/i18n/locales/zh-TW.json`

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：继续使用 `DataSourcesPage.vue` 当前 mock source 列表。
- 错误码 / 错误文案：不新增错误码；连接错误沿用现有 `sources.connectionError`。

## 8. 验收标准

- [ ] 数据源页面出现连接状态筛选，选项为“全部 / 已连接 / 连接错误”。
- [ ] 选择“已连接”时，列表和表格只显示 `connected` 数据源。
- [ ] 选择“连接错误”时，列表和表格只显示 `error` 数据源。
- [ ] 状态筛选与搜索词叠加生效。
- [ ] 当前选中数据源被筛选排除时，详情视图回到全部数据源表格。
- [ ] 新增用户可见文案已同步 en / zh-CN / zh-TW。

## 9. 风险

- 当前项目没有正式测试框架，本次用纯 TS helper + 临时 tsc 编译和 node 执行作为最小行为验证。
- 页面已有较多硬编码颜色，本次只做局部增量，不扩大到设计系统重构。
