# OXC Config Scope Fix Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：如需要，可继续清理 repo 现有格式债务或单独澄清 OXC 支持的文件类型边界
> 日期：2026-07-25
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-25-oxc-config-scope-fix/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是
- Prototype 已确认 / 已说明跳过：是
- 非目标已确认：是
- 是否新增依赖：否
- 是否影响 IA / 权限 / 数据契约：否

## 2. 受影响文件

- `package.json`
- `apps/web/package.json`
- `README.md`
- `docs/engineering/tech-stack.md`
- `docs/workflow/features/2026-07-25-oxc-config-scope-fix/spec.md`
- `docs/workflow/features/2026-07-25-oxc-config-scope-fix/plan.md`
- `docs/workflow/features/2026-07-25-oxc-config-scope-fix/acceptance.md`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动                                                         | 验证                                                              | 备注                                        |
| ---- | ---- | ------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------- |
| 1    | Done | 复核 OXC CLI、根脚本和用户反馈，确认问题在 root 覆盖范围     | `pnpm exec oxfmt --help`; `pnpm exec oxlint --help`; 现状命令检查 | `apps/web` 向上发现与 root 脚本覆盖是两件事 |
| 2    | Done | 修正 root / `apps/web` package scripts，统一 repo 与子包入口 | 脚本 diff                                                         | root 直接跑 OXC；子包保留自动向上发现       |
| 3    | Done | 同步 README / tech-stack 描述                                | 文档复核                                                          | 避免继续误导                                |
| 4    | Done | 运行验证并记录剩余风险                                       | 命令记录                                                          | 根级入口已生效，并暴露既有格式债务          |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间       | Actor | 进度 | 已完成                                                                                                                                                                                                                                                                                            | 下一步                                                                        | 阻塞 |
| ---------- | ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---- |
| 2026-07-25 | Codex | 25%  | 已复核 root/package scripts、`oxfmt` / `oxlint` CLI 行为，并确认 root `pnpm format` 目前只委派 `apps/web` 且脚本名失配；`pnpm exec oxfmt --check package.json .oxlintrc.json auth-client.ts` 与 `pnpm --filter web exec oxfmt --check service/auth-client.ts` 证明 root 与子包文件都可被 OXC 命中 | 修改 scripts 与文档，然后做验证                                               | 无   |
| 2026-07-25 | Codex | 100% | 已改 root 与 `apps/web` scripts；root `pnpm format` / `pnpm format:check` 现直接覆盖 repo root；README / tech-stack 已与脚本对齐；本次 touched 文件已用 OXC 格式化                                                                                                                                | 如需继续，可执行 repo-wide `pnpm format` 清理既有债务，或单独定义文件类型策略 | 无   |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：
  - `pnpm format` 现状失败，因为 root 仍委派到不存在的 `web:format` 脚本。
  - `pnpm exec oxfmt --check package.json .oxlintrc.json auth-client.ts` 报出 root 文件格式问题。
- 单元 / 组件 / E2E：不适用。
- 手工 UI 检查：不适用。
- 视觉决策扫描：
  - 不适用。
- 验证分级：
  - Level 1：脚本与工程配置修正，使用命令行静态验证。

## 6. Debug Log

| 时间       | 现象                                         | 假设                                     | 实验                                                                                    | 结论                                           |
| ---------- | -------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 2026-07-25 | `pnpm format` 失败且 root 文件没有格式化效果 | root script 只委派子包，未覆盖 repo root | 检查根 `package.json` scripts，并执行 `pnpm format`                                     | 成立；当前 script scope 错了                   |
| 2026-07-25 | 用户认为显式 `--config` 不是关键             | `apps/web` 默认向上发现应正常可用        | 阅读 OXC CLI 帮助，并执行 `pnpm --filter web exec oxfmt --check service/auth-client.ts` | 成立；子包本身可命中 OXC，问题主要在 root 入口 |

## 7. Review Checklist

- [x] 功能满足 spec。
- [x] 没有扩大范围。
- [ ] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [ ] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [ ] 未使用无依据的 shadcn / Radix variant、size、portal、focus ring、disabled、aria 属性或视觉捷径。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [x] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间       | 命令 / 检查                                                                                                                                                                                                                                                                                              | 结果              | 备注                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| 2026-07-25 | `pnpm exec oxfmt --help`                                                                                                                                                                                                                                                                                 | Passed            | 确认 formatter 支持向上找 config 与 `--config` 覆盖                                     |
| 2026-07-25 | `pnpm exec oxlint --help`                                                                                                                                                                                                                                                                                | Passed            | 确认 lint 支持根配置与 `--print-config`                                                 |
| 2026-07-25 | `pnpm exec oxfmt --check package.json .oxlintrc.json auth-client.ts`                                                                                                                                                                                                                                     | Failed before fix | root 文件会被 OXC 选中，但 root script 当前未覆盖它们                                   |
| 2026-07-25 | `pnpm --filter web exec oxfmt --check service/auth-client.ts`                                                                                                                                                                                                                                            | Failed before fix | 子包文件会被 OXC 选中，符合向上发现预期                                                 |
| 2026-07-25 | `pnpm format`                                                                                                                                                                                                                                                                                            | Failed before fix | root 仍委派到不存在的 `web:format` 脚本                                                 |
| 2026-07-25 | `pnpm format:check`                                                                                                                                                                                                                                                                                      | Failed after fix  | 现已覆盖 repo root 与 `apps/web`，报出 81 个既有格式问题，证明入口生效                  |
| 2026-07-25 | `pnpm lint`                                                                                                                                                                                                                                                                                              | Failed after fix  | `oxlint .` 通过后进入 `pnpm format:check`，说明 lint 入口已生效；最终因既有格式问题失败 |
| 2026-07-25 | `pnpm --filter web format:check`                                                                                                                                                                                                                                                                         | Failed after fix  | 子包入口无需显式 `--config`，可直接发现根配置并报出 24 个既有 app 文件格式问题          |
| 2026-07-25 | `pnpm --filter web exec oxlint --print-config service/auth-client.ts`                                                                                                                                                                                                                                    | Passed            | 输出根 `.oxlintrc.json` 的合成配置，证明子包可向上发现根 lint 配置                      |
| 2026-07-25 | `pnpm exec oxfmt --check package.json apps/web/package.json README.md docs/engineering/tech-stack.md docs/workflow/features/2026-07-25-oxc-config-scope-fix/spec.md docs/workflow/features/2026-07-25-oxc-config-scope-fix/plan.md docs/workflow/features/2026-07-25-oxc-config-scope-fix/acceptance.md` | Passed            | 本次 touched 文件已按 OXC 规则格式化                                                    |
| 2026-07-25 | `pnpm typecheck`                                                                                                                                                                                                                                                                                         | Skipped           | 本次属 Level 1 工程脚本修正，无类型层改动                                               |
| 2026-07-25 | 桌面视口检查                                                                                                                                                                                                                                                                                             | Skipped           | 无 UI 改动                                                                              |
| 2026-07-25 | 移动视口检查                                                                                                                                                                                                                                                                                             | Skipped           | 无 UI 改动                                                                              |

## 9. Finish Notes

- 交付摘要：
- 最终进度：100%
- 最终步骤：完成
- 剩余风险：repo 里仍有 81 个既有格式问题；root 入口接通后会被即时暴露。
- Follow-up：如需真正让 `pnpm lint` / `pnpm format:check` 通过，可再开一条 feature 清理历史格式债务，并明确 OXC 对 Markdown / YAML / JSON 等文件类型的长期覆盖策略。
