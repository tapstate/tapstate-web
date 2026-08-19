# Source Workbench CRUD

> 状态：In Progress
> 进度：97%
> 当前步骤：验证与分支交付
> 下一步：恢复隔离控制面后完成浏览器写操作和窄屏验收
> 日期：2026-08-19
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-18-source-workbench/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，Source-only。
- Prototype 已确认 / 已说明跳过：是，Markdown prototype。
- 非目标已确认：是，Pipeline UI/runtime 延后。
- 是否新增依赖：是，`@formily/core`、`@formily/json-schema`、`@formily/react`。
- 是否影响 IA / 权限 / 数据契约：新增 detail route；复用已落地 JSON contract。

## 2. 受影响文件

- `apps/web/service/source-client.ts`
- `apps/web/service/source-client.test.ts`
- `apps/web/features/sources/`
- `apps/web/app/routes/_authenticated.sources.$id.tsx`
- `apps/web/i18n/locales/{en,zh-CN,zh-TW}.json`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| 1 | Done | Source client list/detail/create/update/delete、ETag、错误合同 | Vitest + typecheck | RED-GREEN completed |
| 2 | Done | Formily connector UI bridge、table selector、secret、SRS | form/service tests | Source page does not own Formily internals |
| 3 | Done | detail route、edit dialog、delete dialog、query cache | component tests | 412/in-use state is recoverable |
| 4 | Done | 三套 locale、loading/empty/error/mobile polish | i18n check + local UI smoke | 只覆盖 Source |
| 5 | In Progress | acceptance、push `ws/source-crud-ui-retirement` | lint/typecheck/build | PR continues to open late as draft |

## 4. Progress Log

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
| ---- | ----- | ---- | ------ | ------ | ---- |
| 2026-08-18 | Codex | 95% | 完成 Source CRUD、Formily connector UI bridge、路由和三套 locale；隔离控制面已验证 catalog 与 Source HTTP CRUD | 恢复隔离控制面，完成浏览器 create/edit/delete 和 375px 检查 | 当前本机隔离 Mongo / dev server 未运行 |
| 2026-08-19 | Codex | 97% | 修复 detail child route、配置过的 required secret 的 keep/replace、空 SRS 序列化和 literal/regex selector 的 options 合同；新增 7 个回归断言 | 恢复隔离控制面，完成浏览器 create/detail/edit/delete 和 375px 检查 | 当前本机隔离 Mongo / dev server 未运行 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：client 对 list/detail parsing、malformed JSON、ETag capture/reuse、412/428、secret omission、delete conflict。
- 单元 / 组件 / E2E：Vitest service/form tests；详情和对话框用真实 query boundary，必要时浏览器目检。
- 手工 UI 检查：本地 dev server，桌面和 375px。
- 视觉决策扫描：对照本 feature prototype 和现有 Source 页面局部模式。
- 验证分级：Level 3，涉及路由、跨模块数据契约和真实 CRUD。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
| ---- | ---- | ---- | ---- | ---- |
| 2026-08-18 | UI skill update check 无法写入 `/Users/xf/.cache/waza/last-check` | sandbox 权限限制 | 执行官方脚本 | 不影响代码实现，验收记录保留 |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] TypeScript、lint 和 build 结果记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
| ---- | ----------- | ---- | ---- |
| 2026-08-18 | UI update check | Blocked | cache 路径权限不足 |
| 2026-08-18 | `pnpm --filter web test` | Passed | 6 files / 17 tests |
| 2026-08-18 | `pnpm typecheck` | Passed | |
| 2026-08-18 | `pnpm --filter web i18n:check` | Passed | en / zh-CN / zh-TW keys synchronized |
| 2026-08-18 | `pnpm lint:code` | Passed | |
| 2026-08-18 | `pnpm --filter web build` | Passed | Existing large-chunk warning only |
| 2026-08-18 | Isolated control-plane API CRUD | Passed | Bootstrap, login, catalog, list/create/update/delete, secret omit/clear and stale ETag `412` verified against port 8081 and an isolated Mongo database |
| 2026-08-18 | Local browser read smoke | Passed | Authenticated browser reached `/sources`, rendered the empty state and create dialog, loaded the live connector catalog, and rendered the MySQL Formily fields including the secret control |
| 2026-08-19 | Browser mutation / responsive smoke | Pending | The previously isolated Mongo, control-plane, and dev servers are no longer running; restart them before the final browser create/edit/delete and 375px pass |
| 2026-08-19 | P1 regression tests | Passed | detail child outlet, secret keep/replace, empty SRS omission, and literal/regex selector options |
| 2026-08-19 | `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web test` | Passed | 9 files / 24 tests |
| 2026-08-19 | `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web typecheck` | Passed | |
| 2026-08-19 | `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web i18n:check` | Passed | en / zh-CN / zh-TW keys synchronized |
| 2026-08-19 | `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web build` | Passed | Existing large-chunk warning only |
| 2026-08-19 | package format check | Partial | Changed files pass targeted `oxfmt --check`; the package-wide command is blocked by 30 pre-existing unformatted files |

## 9. Finish Notes

- 交付摘要：Source CRUD uses artifact-backed API projections. Connector forms are bridged through Formily schemas and write only structured Source config state back to the page.
- 最终进度：97%。
- 最终步骤：验证与分支交付。
- 剩余风险：connector catalog 字段扩展、恢复隔离环境后的浏览器 live CRUD 与窄屏检查。
- Follow-up：Pipeline UI/runtime observation。
