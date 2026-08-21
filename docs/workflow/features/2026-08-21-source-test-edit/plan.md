# Source edit and connection test plan

> 状态：In Progress
> 进度：98%
> 当前步骤：完成创建连接器多列浮层卡片与标题语义的本地页面目检
> 下一步：在经确认的本地认证会话中完成桌面和窄屏检查
> 日期：2026-08-21
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，connection test contract 缺口已记录。
- Prototype 已确认 / 已说明跳过：是，见 `prototype.md`。
- 非目标已确认：不猜测 test endpoint，不变更 create 和 Formily runtime。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：不新增 IA 或权限。编辑消费现有 get/update。测试需要后端新合同。

## 2. 受影响文件

- `apps/web/features/sources/sources-page.tsx`
- `apps/web/features/sources/sources-page.test.tsx`
- `apps/web/features/sources/source-edit-dialog.tsx`，如需把未接入的旧布局收敛至当前 Formily 规范。
- `apps/web/features/sources/source-edit-dialog.test.ts`
- `docs/workflow/features/2026-08-21-source-test-edit/*`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态        | 改动                                                                     | 验证                                       | 备注                                                 |
| ---- | ----------- | ------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------- |
| 1    | Done        | 检索现有 API、Source page、edit dialog 和测试合同                        | `rg`, source client tests                  | 未发现 connection test endpoint                      |
| 2    | Done        | Source page Edit loading, success, error 用例                            | Focused Vitest                             | 不依赖未确认测试 API                                 |
| 3    | Done        | 接入 getSource detail query、Edit action、cache update、retry            | Focused Vitest + typecheck                 | ETag 来自 detail GET                                 |
| 4    | Done        | 复核 Edit dialog 外层布局、单列字段和 token 使用                         | Source review + focused tests              | 不暴露旧双列 grid                                    |
| 5    | Blocked     | 实现 Test connection client 与 UI                                        | backend contract                           | 需要 endpoint 语义和 error contract                  |
| 6    | In Progress | 完成 tests、i18n、typecheck、format、diff 与 authenticated UI inspection | Level 2                                    | 新增 Source ID 语义校验，仍剩本地登录后的 UI 目检    |
| 7    | Done        | 将创建连接器选择改为多列无边框浮层卡片                                   | Focused Vitest + typecheck + format + diff | 选择区按产品决定使用 `bg-gray-50/40`；页面目检待认证 |

## 4. Progress Log

| 时间       | Actor | 进度 | 已完成                                                                                                                                                          | 下一步                             | 阻塞                                |
| ---------- | ----- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| 2026-08-21 | Codex | 15%  | 读取 workflow、UI 规则、Source API、workbench 与 edit dialog；创建 feature records                                                                              | Source page RED tests              | test endpoint 未定义                |
| 2026-08-21 | Codex | 90%  | Edit action、latest Source + ETag loading、retry、cache 回写与大型单列 edit dialog 已完成；10 个 focused tests、typecheck、i18n、scoped format 和 diff 检查通过 | 在已登录页面验证 desktop 和 mobile | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 95%  | 按产品决定将后端 `id` 更正为 Source ID，创建页增加全局唯一、创建后不可修改说明，编辑页维持只读 Source ID，并同步三语校验和冲突文案                              | 重新运行验证                       | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 96%  | 按最新视觉方向将连接器选择从单列表格改回响应式多列：浅 `bg-gray-50/40` 底色、无边框的 `background` 卡片、低对比弥散阴影和 1px hover 上移                        | 运行 focused test 与页面目检       | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 97%  | 用户认为语义化浅底色不足，按明确要求替换为 `bg-gray-50/40`，记录为局部颜色例外，保持卡片、阴影和 hover 几何不变                                                 | 运行 focused test 与页面目检       | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 97%  | Source create 组件测试 4/4、typecheck、scoped format 与 diff 检查全部通过；选择区实现为响应式 1/2/3 列卡片网格                                                  | 在本地登录后检查桌面与 375px 窄屏  | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 97%  | 连接器卡片动效按最新要求统一为 `transition-all duration-300`，保留 1px hover 上移与弥散阴影反馈                                                                 | 重跑 focused test、format 与 diff  | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 97%  | 移除连接器数量对搜索框显隐和过滤的影响，搜索框成为选择页的固定布局区域                                                                                          | 重跑 focused test、format 与 diff  | connection-test API contract 未定义 |
| 2026-08-21 | Codex | 98%  | 经过术语复核，创建流程首步标题定为“选择连接器 / Choose a connector”，避免与最终产物 Source 混淆，配置步骤继续使用所选连接器名                                   | 重跑 focused test、i18n 与格式检查 | connection-test API contract 未定义 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：点击 Edit 使用 detail GET 的 Source/ETag 打开 dialog；loading 不丢失操作区；detail failure 提供 retry；save 回写 list/detail cache。
- 单元 / 组件 / E2E：`sources-page.test.tsx`，既有 `source-edit-dialog.test.ts` 和 `source-client.test.ts`。
- 手工 UI 检查：桌面 1280px 和 mobile 375px，检查 detail action 换行、dialog 单列、长 locale 字符串。
- 视觉决策扫描：复用 current Source workbench 的静态 Toolbar 与 shadcn token。Edit pending 仅改变 icon，保持 action slot 的字体和高度。
- 验证分级：Level 2，focused tests、i18n check、typecheck、lint/format、可用时 local browser inspection。

## 6. Debug Log

| 时间       | 现象                 | 假设                               | 实验                                 | 结论                                  |
| ---------- | -------------------- | ---------------------------------- | ------------------------------------ | ------------------------------------- |
| 2026-08-21 | Test button disabled | 前端已具备 test client 或 contract | 搜索 source client、docs、repository | 只有 UI placeholder，无 test endpoint |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间       | 命令 / 检查                                 | 结果                | 备注                                                                                                                              |
| ---------- | ------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-21 | Source API / UI contract search             | Passed              | existing update exists, connection-test contract absent                                                                           |
| 2026-08-21 | Focused Vitest                              | Passed              | 3 files, 10 tests, no act warnings                                                                                                |
| 2026-08-21 | `pnpm typecheck`                            | Passed              | packages/formily and apps/web completed                                                                                           |
| 2026-08-21 | `pnpm --filter web i18n:check`              | Passed              | en, zh-CN and zh-TW keys match                                                                                                    |
| 2026-08-21 | scoped `oxfmt --check`                      | Passed              | changed Source files and locale files are formatted                                                                               |
| 2026-08-21 | `git diff --check`                          | Passed              | no whitespace errors                                                                                                              |
| 2026-08-21 | `pnpm lint`                                 | Blocked by baseline | oxlint passed; repo-wide format check reports 45 existing unrelated files, including .playwright-cli and unrelated worktree files |
| 2026-08-21 | Source create focused Vitest                | Passed              | 1 file, 4 tests passed after connector grid refinement                                                                            |
| 2026-08-21 | `pnpm typecheck`                            | Passed              | packages/formily and apps/web completed                                                                                           |
| 2026-08-21 | scoped `oxfmt --check` + `git diff --check` | Passed              | Source create and feature documents are formatted, with no diff whitespace errors                                                 |
| 2026-08-21 | Desktop / mobile inspection                 | Pending             | local login requires password-entry confirmation                                                                                  |

## 9. Finish Notes

- 交付摘要：Pending。
- 最终进度：Pending。
- 最终步骤：Pending。
- 剩余风险：connection-test API contract。
- Follow-up：在 endpoint 确认后实现 pending, success 和 failure feedback。
