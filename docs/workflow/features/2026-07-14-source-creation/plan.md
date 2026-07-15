# Source Creation And Layout Plan

> 状态：Done
> 进度：100%
> 当前步骤：实现与验收完成
> 下一步：等待 PR review/CI
> 日期：2026-07-14
> Owner：xufei@tapdata.io
> Feature folder：docs/workflow/features/2026-07-14-source-creation/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，用户要求直接开始并完成。
- Prototype 已确认：是，采用 route layout + compact dynamic dialog。
- 非目标已确认：不做 connection test/discovery/edit/delete，不引入 Formily。
- 是否新增依赖：否，复用 Vue、Pinia、Element Plus、lucide 和原生 fetch。
- 是否影响 IA / 权限 / 数据契约：修复既定 IA 布局；新增 read-scoped connector catalog HTTP contract。

## 2. 受影响文件

- `apps/web/src/App.vue`, `router/index.ts`, `layouts/DefaultLayout.vue` 接缝。
- `apps/web/src/services/` Source/catalog clients。
- `apps/web/src/components/DataSourcesPage.vue` 与新增动态创建组件/纯函数。
- 三套 locale 和 feature docs。
- Cyntex `control-core`, `rest-api`, `app`, messages/error golden 和相关 tests。
- Memory `plans/frontend-source-api.md`, `reference/frontend-source-api.md`, progress 与 WORKSTREAMS coverage。

## 3. Implementation Steps

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | Router 嵌套 `DefaultLayout`，App 根只负责顶层切换 | typecheck + route browser smoke | protected layout 常驻 |
| 2 | Done | TDD 扩展 connector catalog detail、operation 与 coded 404 | focused JUnit RED/GREEN | 不暴露原始 PDK schema |
| 3 | Done | 复用 `/api/connectors` list，新增 detail 并接入 assembly | HTTP contract + app assembly tests | read scope、unaudited |
| 4 | Done | 前端 Source/catalog client 与动态 config helper | executable assertions + typecheck | secret 不记录/回显 |
| 5 | Done | 在既有 Sources 页面框架内接入真实列表和 Create dialog | desktop/mobile browser checks | mock 数据已移除；左栏、总表、详情和 tabs 结构保留 |
| 6 | Done | 全量验证、review、acceptance 和 progress closeout | 31-module Maven test + lint/typecheck/build | cyntex PR #15、web PR #1 已更新 |

## 4. Progress Log

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---:|---|---|---|
| 2026-07-14 | Codex | 10% | 定位 layout 根因；确认 Source CRUD PR #15；确认 Cyntex catalog 已归一化 PDK Formily 字段 | layout 修复与后端 RED tests | 无 |
| 2026-07-15 | Codex | 100% | route layout、connector detail、真实 Source 列表、动态创建表单、三套 locale、桌面/移动联调与全量闸门完成 | 提交并 push | 全仓 lint 仍被 4 个既有 2026-07-08 Markdown 表格错误阻断；本次文件 scoped lint 全绿 |

## 5. TDD / Verification Strategy

- Layout：先以当前 `/sources` 缺少 `.app-sidebar/.app-header` 作为失败见证，修复后浏览器断言三者共存。
- Backend：先写 `ConnectorCatalogServiceTest` 与 `ConnectorCatalogApiTest`，确认缺类型/404 后最小实现。
- Frontend：动态默认值、显隐、类型提交和 hidden-field omission 放在纯函数模块；以 executable assertion 或 type-safe test file 固化。
- 手工 UI：登录裸页、Source layout、loading/empty/error/success、dialog connector 切换、secret、长字段、500px viewport。
- 验证等级：Level 3。后端 focused + full reactor；前端 changed-file lint、vue-tsc、Vite build 与浏览器截图。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-14 | 登录后菜单/header 消失 | App 根绕过 DefaultLayout | 读取 App/router/layout | DefaultLayout 未删除，只是路由不可达；route.path key 还会重建 layout |

## 7. Review Checklist

- [x] 功能满足 spec，未引入 Formily 或旧 Tapdata 业务架构。
- [x] Login 与 protected layout 分层，业务切页不重建壳。
- [x] connector API exact JSON、auth、scope、coded 404 通过。
- [x] Source 页面无 mock，四态和表单状态完整。
- [x] 三套 locale 同步，secret 不泄漏。
- [x] 桌面/移动无溢出重叠。
- [x] TypeScript、lint、build、Maven 与 architecture gates 记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-14 | Repo/contract recon | Pass | Source API branch + catalog normalization confirmed |
| 2026-07-15 | scoped ESLint | Pass | `apps/web/src`、vite/tsconfig 与本次 feature docs 全绿 |
| 2026-07-15 | `vue-tsc -b` | Pass | 由 production build 执行 |
| 2026-07-15 | Vite build | Pass | 1704 modules；仅既有 chunk 与第三方 annotation warning |
| 2026-07-15 | Maven 31-module test | Pass | 2:09；control/rest-api/app/arch-tests 与全依赖链全绿 |
| 2026-07-15 | desktop/mobile browser | Pass | 登录→protected layout→动态 PostgreSQL 表单→创建→自动选中；390×844 无重叠 |

## 9. Finish Notes

- 交付摘要：恢复 route-level DefaultLayout；新增 connector detail；Sources 改为真实 API；动态 config 表单和创建闭环完成。
- 最终进度：100%
- 最终步骤：Verified
- 剩余风险：复杂 PDK reactions 不在 v1 Web 执行；Source CRUD PR 尚未合并；全仓 lint 有 4 个既有旧文档错误。
- Follow-up：connection test/discovery 作为独立 feature 对接已规划后端能力。
