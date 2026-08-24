# Source test, edit, and schema discovery plan

> 状态：Done
> 进度：100%
> 当前步骤：完成最终验收并记录非阻塞 follow-up
> 下一步：在可调整 viewport 的浏览器中补做 375px 物理视口检查
> 日期：2026-08-21
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec / Prototype：已更新为已确认的 `POST /api/connections:test` 合同。
- 新增依赖：无。
- IA / 路由：无新增路由。
- 数据契约：新增 source client 测试接口及严格的 response guard。
- 安全约束：write-only secret 不被读取、记录或展示；keep 复用已有 config，replace 覆盖，clear 移除。

## 2. 受影响文件

- `apps/web/service/source-client.ts`
- `apps/web/service/source-client.test.ts`
- `apps/web/features/sources/connection-test-result.tsx`
- `apps/web/features/sources/source-create-dialog.tsx`
- `apps/web/features/sources/source-create-dialog.test.tsx`
- `apps/web/features/sources/source-edit-dialog.tsx`
- `apps/web/features/sources/source-edit-dialog.test.ts`
- `apps/web/features/sources/sources-page.tsx`
- `apps/web/features/sources/sources-page.test.tsx`
- `apps/web/i18n/locales/en.json`
- `apps/web/i18n/locales/zh-CN.json`
- `apps/web/i18n/locales/zh-TW.json`
- `docs/workflow/features/2026-08-21-source-test-edit/*`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动                                                                    | 验证                        |
| ---- | ---- | ----------------------------------------------------------------------- | --------------------------- |
| 1    | Done | 确认测试 endpoint、request 与 report 合同                               | source client tests         |
| 2    | Done | 实现 response guard，区分 FAILED report 与 request / protocol exception | source-client focused tests |
| 3    | Done | 创建独立紧凑结果 dialog，不渲染 settings / secret                       | source review               |
| 4    | Done | 在 Create footer 接入测试，复用 draft 校验与 settings 生成              | create dialog tests         |
| 5    | Done | 在 Edit footer 接入测试，keep / replace / clear 合并测试 settings       | edit dialog tests           |
| 6    | Done | 在 Source 列表行和详情 header 接入已保存 config 测试                    | sources-page tests          |
| 7    | Done | 实现 discover-schema、schema cache、404 / error / retry 状态            | source-client + page tests  |
| 8    | Done | 表详情默认进入 Columns，展示 fields、类型、主键和索引                   | sources-page tests          |
| 9    | Done | 同步三语文案、feature 文档并完成全量风险门禁                            | verification record         |

## 4. Progress Log

| 时间       | Actor | 进度 | 已完成                                                                                                                      | 下一步                     | 阻塞             |
| ---------- | ----- | ---- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------- |
| 2026-08-21 | Codex | 90%  | Edit action、ETag、Source ID、创建连接器选择与表单布局已完成                                                                | 接入测试合同               | 无               |
| 2026-08-21 | Codex | 96%  | 实现 `/api/connections:test` client guard、Create/Edit test action、独立 result dialog 与 secret guard                      | 运行全量风险门禁           | 无               |
| 2026-08-21 | Codex | 99%  | 实现 `/api/connections:test`、Create/Edit 测试和独立结果 dialog；完成认证桌面目检                                           | 接入 detail test 与 schema | 无               |
| 2026-08-21 | Codex | 100% | 接入列表 / 详情测试、discover-schema、Schema 读取与表字段详情；66 个测试、typecheck、build、lint:code 和 scoped format 通过 | 375px 物理视口复核         | 非阻塞 follow-up |

## 5. TDD / Verification Strategy

- client tests 覆盖成功、FAILED report、无效 report、request error 和 schema response guard。
- create dialog tests 覆盖草稿 payload、测试时 action lock 和结果展示。
- edit dialog tests 覆盖 keep / replace / clear secret settings 合并。
- sources page tests 覆盖列表 / 详情测试、pending disabled、schema 404、discover success / failure、字段详情和异步表选择稳定性。
- 所有新可见文案在三套 locale 中保持 key 一致。
- 认证 UI 检查使用无效但非空的临时测试凭据，只验证请求失败反馈，未保存新的 Source。

## 6. Debug Log

| 时间       | 现象                                   | 假设                                     | 实验                                    | 结论                                                  |
| ---------- | -------------------------------------- | ---------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| 2026-08-21 | 旧 feature 文档称 test contract 未定义 | 当前实现可能仍在猜测 API                 | 对照已接入 client、tests 与本地接口行为 | 合同已确认且实现，文档需要更新                        |
| 2026-08-21 | Edit 中保留的 password 没有原值        | 直接测试会提交不完整配置或泄露 secret    | 检查 secret draft 模型并构造 settings   | keep 复用当前 Source config，replace 覆盖，clear 移除 |
| 2026-08-21 | Schema 加载期间点击配置表后详情消失    | discovered table id 与配置 table id 不同 | 让 schema query 在点击后完成并复查状态  | 按表名回退映射 selected table，保持详情稳定           |

## 7. Review Checklist

- [x] 功能满足 spec，Create / Edit 都测试当前草稿。
- [x] 列表行与 detail header 都有 test action，使用已保存 config。
- [x] discover-schema 与 schema detail 不新增路由。
- [x] 用户可见文案都走 i18n。
- [x] 三套 locale key 同步。
- [x] validation、testing、PASSED、FAILED、request error、secret merge 与 schema 四态可用。
- [x] 结果 dialog 不暴露 settings 或 secret。
- [x] 桌面认证会话无 overflow、重叠或错位。
- [ ] 物理 375px 窄屏浏览器检查，作为 follow-up。
- [x] TypeScript、build、focused tests、scoped format 与 diff 结果已记录。

## 8. Verification Record

| 时间       | 命令 / 检查                                                                                                                      | 结果             | 备注                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| 2026-08-21 | `pnpm --filter web test -- source-client.test.ts source-create-dialog.test.tsx source-edit-dialog.test.ts sources-page.test.tsx` | Passed           | 14 个 test files，66 tests passed                                                        |
| 2026-08-21 | `pnpm --filter web i18n:check`                                                                                                   | Passed           | en、zh-CN、zh-TW key 一致                                                                |
| 2026-08-21 | `pnpm typecheck`                                                                                                                 | Passed           | TypeScript 无错误                                                                        |
| 2026-08-21 | `pnpm build`                                                                                                                     | Passed           | Vite build 成功                                                                          |
| 2026-08-21 | scoped `oxfmt --check`                                                                                                           | Passed           | 本 feature 改动格式正确                                                                  |
| 2026-08-21 | `git diff --check`                                                                                                               | Passed           | 无 whitespace error                                                                      |
| 2026-08-21 | `pnpm lint:code`                                                                                                                 | Passed           | oxlint diagnostics 通过                                                                  |
| 2026-08-21 | `pnpm lint`                                                                                                                      | Baseline blocked | repo-wide formatter 仅报告未触及的既有文件，包括 `.playwright-cli/` 与其他 worktree 改动 |
| 2026-08-21 | Authenticated desktop UI inspection                                                                                              | Passed           | Create / Edit 测试结果、Source 列表 / 详情测试入口和 Schema 详情已完成源码与测试复核     |
| 2026-08-21 | Physical 375px UI inspection                                                                                                     | Pending          | 当前浏览器绑定不支持调整 viewport                                                        |

## 9. Finish Notes

- 交付摘要：Create / Edit、Source 列表 / 详情的 connection test，以及 discover-schema 和表字段详情已完成。
- 最终进度：100%，375px 物理视口复核作为非阻塞 follow-up。
- Follow-up：实际设备或可调整 viewport 的浏览器中复核 375px。
