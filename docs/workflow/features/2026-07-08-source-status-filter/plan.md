# Data Source Connection Status Filter Plan

> 状态：In Progress
> 进度：55%
> 当前步骤：接入数据源页面 UI 与状态
> 下一步：同步 locale 并运行页面级 typecheck
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-source-status-filter/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，见 ./spec.md。
- Prototype 已确认 / 已说明跳过：是，见 ./prototype.md。
- 非目标已确认：不改路由、IA、API、权限、状态枚举范围或整体页面重构。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- 新增：`docs/workflow/features/2026-07-08-source-status-filter/spec.md`
- 新增：`docs/workflow/features/2026-07-08-source-status-filter/prototype.md`
- 新增：`docs/workflow/features/2026-07-08-source-status-filter/plan.md`
- 新增：`docs/workflow/features/2026-07-08-source-status-filter/acceptance.md`
- 新增：`apps/web/src/components/dataSourcesFilter.ts`
- 新增：`apps/web/src/components/dataSourcesFilter.test.ts`
- 修改：`apps/web/src/components/DataSourcesPage.vue`
- 修改：`apps/web/src/i18n/locales/en.json`
- 修改：`apps/web/src/i18n/locales/zh-CN.json`
- 修改：`apps/web/src/i18n/locales/zh-TW.json`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 建立 feature spec、prototype、plan | 文档静态检查 | 已完成 |
| 2 | Done | 新增 `dataSourcesFilter.test.ts`，先验证缺少筛选 helper 失败 | `./node_modules/.bin/tsc --target ES2022 --module commonjs --moduleResolution node --ignoreDeprecations 6.0 --strict --skipLibCheck --outDir /tmp/cyntex-source-filter-test apps/web/src/components/dataSourcesFilter.test.ts` 失败于缺少 `./dataSourcesFilter` | RED |
| 3 | Done | 新增 `dataSourcesFilter.ts`，实现搜索 + 状态筛选 helper | tsc 编译后 `node /tmp/cyntex-source-filter-test/dataSourcesFilter.test.js` 通过 | GREEN |
| 4 | In Progress | 接入 `DataSourcesPage.vue`：状态 ref、Select UI、过滤结果、选中项回退、无匹配空态 | `pnpm typecheck` | 页面逻辑 |
| 5 | Todo | 同步三套 locale key | `rg "connectionStatus\|noResults" apps/web/src/i18n/locales` | i18n |
| 6 | Todo | 运行 lint/typecheck，启动页面做桌面和移动目检 | `pnpm lint`、`pnpm typecheck`、`pnpm dev` | Level 2 |
| 7 | Todo | 自检并写 acceptance | acceptance 对照 spec | 收尾 |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-08 | Codex | 20% | 已读取仓库流程、技术栈、设计系统和数据源页面，实现范围已收敛 | 新增失败的筛选 helper 行为检查 | 无 |
| 2026-07-08 | Codex | 35% | 已创建 spec/prototype/plan；RED 检查按预期失败于缺少筛选 helper | 实现筛选 helper 并运行 GREEN 检查 | 无 |
| 2026-07-08 | Codex | 55% | 已实现纯 TS helper；独立 tsc 编译和 node 行为检查通过 | 接入数据源页面 UI 与 locale | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：`dataSourcesFilter.test.ts` 先引用尚不存在的 helper，确认 tsc 失败；实现 helper 后编译并用 node 执行，确认搜索 + 状态叠加过滤行为。独立 tsc 命令需加 `--ignoreDeprecations 6.0`，避免 TypeScript 6 将 `moduleResolution node` 弃用提示升级为失败原因。
- 单元 / 组件 / E2E：项目暂无正式测试框架；本次使用纯 TS 行为检查作为最小单元验证，不新增依赖。
- 手工 UI 检查：启动 `pnpm dev`，检查 `/sources` 桌面与移动视口的筛选入口、无匹配空态和选中项回退。
- 验证分级：
  - Level 2：中等交互 / UI 改动，运行 `pnpm lint`、`pnpm typecheck`、`pnpm dev` 并做本地页面目检。
  - `pnpm build`：跳过，除非 typecheck/lint 暴露构建边界风险；本次不改依赖、Vite 配置、路由懒加载或样式入口。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-08 | RED 命令先失败于 `moduleResolution=node10` 弃用，而不是缺少 helper | 独立 tsc 命令使用了 TypeScript 6 已弃用的 `node` moduleResolution 别名 | 在命令中加入 `--ignoreDeprecations 6.0` 后重跑 | RED 失败原因恢复为缺少 `./dataSourcesFilter`，可继续实现 |
| 2026-07-08 | GREEN 行为检查第一次失败，`prod` 搜索返回 `prod` 与 `events` | `events` 的 host 为 `kafka.prod.internal`，测试搜索词过宽 | 将该断言搜索词改为 `production`，只匹配 source name | helper 行为符合既有搜索范围；测试表达已收窄 |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [ ] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
|  | `pnpm lint` | Pending |  |
|  | `pnpm typecheck` | Pending |  |
|  | `pnpm build` | Skipped | Level 2，未触及构建边界 |
|  | 桌面视口检查 | Pending |  |
|  | 移动视口检查 | Pending |  |

## 9. Finish Notes

- 交付摘要：Pending。
- 最终进度：Pending。
- 最终步骤：Pending。
- 剩余风险：Pending。
- Follow-up：Pending。
