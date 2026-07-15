# Source Creation And Routed Application Layout

> 状态：Approved
> 日期：2026-07-14
> Owner：xufei@tapdata.io
> Feature folder：docs/workflow/features/2026-07-14-source-creation/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：App shell、router、Sources、Cyntex connector catalog、Source CRUD

## 1. Intake

### 用户原始输入

> DefaultLayout.vue 直接去掉了？现在登录后的页面布局乱了，没有菜单 header 那些。布局应该在路由加上。另外 source 页面加上 source 添加的接口，注意添加 source 的时候 config 配置之前在 tapdata 上是通过获取 pdk 的 connection property 然后 formily 表单动态渲染。这块看下 Cyntex 怎么做的。开始吧我去睡觉把这些工作做完。

### 背景与上下文

登录接入把根 `App.vue` 改成了直接渲染页面组件，导致仍然存在的 `DefaultLayout` 不再可达。Sources 页面目前展示静态 mock，创建按钮没有行为。Cyntex 后端的 Source CRUD 已在 `ws/frontend-source-api`，而 `core-catalog` 已把 PDK Formily connection properties 归一化成稳定的 `ConfigField`。

### 假设

- Source CRUD PR 的结构化 JSON 契约保持不变。
- v1 Web 表单消费 Cyntex 归一化 catalog，不在浏览器加载或执行原始 PDK Formily schema。
- 当前归一化字段覆盖 string、number、boolean、array、enum、secret、default 和单控制字段显隐；无法安全降维的复杂 reaction 不在本次恢复为浏览器表达式执行。

### 未决问题

- 无阻塞未决问题。复杂 connector schema fidelity 由后续 catalog ingest 报告与兼容工作负责。

## 2. Decomposition

### 目标

- 登录页保持裸布局，所有受保护页面恢复 sidebar、header、内容容器和 Ask Cyntex。
- 后端复用 authenticated connector catalog list，并增加 detail read API。
- Sources 页面读取真实 Source 列表并创建 Source。
- 创建表单根据 connector catalog 动态渲染 config，不硬编码 PostgreSQL/MySQL 字段。

### 非目标

- 不重做 `DataSourcesPage` 已定型的页面框架；保留左侧 Source 导航、All Sources 表格、Source 详情、表详情和 tabs 层级，只替换数据与动作接线。
- 不引入 Formily 依赖或执行原始 `x-reactions` 表达式。
- 不实现 connection test、discover schema、Source update/delete、OAuth 或 connector registration。
- 不保留静态 source 指标、预览行或伪造 connected/error 状态作为真实数据。

### 用户路径

1. 用户登录后进入 `/sources`，看到完整应用布局。
2. 页面加载真实 Sources；空列表显示创建入口。
3. 用户点击 Create source，选择 connector。
4. 页面获取 connector detail，根据 config fields 动态渲染表单并应用默认值、类型、secret 和显隐规则。
5. 用户填写 id、mode 和 config，提交 `POST /api/sources`。
6. 成功后关闭弹窗、刷新列表并选中新 Source；错误保留输入并显示可恢复反馈。

### 影响面

- IA / 路由：登录 route 与受保护 layout route 分层。
- 状态管理：组件内 Source/catalog loading、error、dialog 和 form 状态；鉴权继续由 Pinia auth store 提供。
- 数据 / API：复用既有 connector list，新增 connector detail；消费既有 Source CRUD。
- 权限：connector list/get 与 source list 使用 read scope；source create 使用 write scope。
- i18n：三套 locale 增加 catalog、create form、状态和错误文案。
- 错误处理：401 沿用 auth store 清理；coded errors 映射为表单或页面反馈。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| Web 引入 Formily 并直接执行 PDK schema | 与 Tapdata 表面一致 | 把旧前端运行时、任意 reaction 和重依赖带入新产品 | 拒绝 |
| 后端暴露 Cyntex 归一化 ConfigField，Web 用 Element Plus 渲染 | 契约稳定、可验证、复用现有 catalog | 复杂 reaction 是有意的有损投影 | 采用 |
| 前端硬编码常用数据库表单 | 实现快 | connector 扩展必然分叉，违背 PDK 生态约束 | 拒绝 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md

## 4. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | Source 列表或 connector detail 显示稳定 loading state | 等待或关闭弹窗 | `sources.states.loading`, `sources.create.loadingSchema` |
| Empty | 无 Source 时显示简洁空态和 Create source | 打开创建弹窗 | `sources.states.empty` |
| Error | 页面级或表单级 alert，保留可重试入口 | 重试、修正、关闭 | `sources.errors.*` |
| Success | 列表显示真实 Source；创建成功关闭弹窗并刷新 | 继续浏览或再创建 | `sources.create.success` |

## 5. i18n 范围

新增或变更 `sources.create.*`、`sources.catalog.*`、`sources.errors.*`、`sources.status.configured`，同步三套 locale。

## 6. 数据与接口

- 既有接口：`GET /api/connectors`、`GET /api/sources`、`POST /api/sources`。
- 新接口：`GET /api/connectors/{id}`。
- 不使用 mock。
- connector 缺失返回 `connector.not-found`；其他后端 coded error 原样用于错误分类，不显示 secret 值。

## 7. 验收标准

- [x] 登录页无 sidebar/header，`/sources`、`/pipelines`、`/explorations` 均有完整 `DefaultLayout`。
- [x] 业务子路由切换不重建 layout。
- [x] connector list/detail exact JSON、auth、scope 和 404 coded error 有测试。
- [x] Source 页面不再使用 mockSources，真实 loading/empty/error/success 可用。
- [x] `DataSourcesPage` 既有信息架构和视觉骨架保持不变，API 对接不改页面结构。
- [x] 创建表单按 catalog 动态渲染 default、enum、number、boolean、secret 和 visibleWhen。
- [x] 成功提交 Source JSON 并刷新列表；错误时保留输入且可重试。
- [x] 三套 locale、lint、typecheck、build、后端 focused/full tests 和桌面/移动浏览器检查通过。

## 8. 风险

- Catalog 的复杂 Formily reaction 是有损归一化；本次不在浏览器执行旧表达式。
- Source CRUD 尚在 PR 分支；前端联调依赖该分支或合并后的后端。
- 后端没有 connection-test 状态时，UI 只能诚实显示 configured，不能声称 connected。
