# FormEvent Deprecation Warning Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：N/A
> 日期：2026-07-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-24-formevent-deprecation-warning/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，见 `./spec.md`。
- Prototype 已确认 / 已说明跳过：是，纯类型维护无需 prototype。
- 非目标已确认：是，不扩展到登录 UI、API 或其他表单重构。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- `docs/workflow/features/2026-07-24-formevent-deprecation-warning/spec.md`
- `docs/workflow/features/2026-07-24-formevent-deprecation-warning/plan.md`
- `docs/workflow/features/2026-07-24-formevent-deprecation-warning/acceptance.md`
- `apps/web/app/routes/login.tsx`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 建立 feature 文档，记录目标、非目标、替代方案和验收标准 | 文档自检 | prototype 按规则跳过 |
| 2 | Done | 将登录页提交处理从 deprecated `FormEvent` 切换为非弃用事件类型 | 源码检查 | 仅类型级修改，行为保持不变 |
| 3 | Done | 运行轻量验证并更新 acceptance | `pnpm lint`、`pnpm typecheck` | `lint` / `typecheck` 均通过；lint 保留仓内既有 warning |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-24 15:49 | Codex | 33% | 阅读仓库流程、定位 `FormEvent` 使用点 | 建立 feature 文档并实施代码修复 | 无 |
| 2026-07-24 15:49 | Codex | 67% | 新建 `spec.md` / `plan.md` / `acceptance.md`，并更新登录页提交事件类型 | 运行 lint/typecheck 并回填验收记录 | 无 |
| 2026-07-24 15:49 | Codex | 100% | 完成 `rg` 复查、`pnpm lint` 与 `pnpm typecheck`，并回填验收文档 | 无 | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：通过源码定位确认仅有一处 `FormEvent` 显式使用，并以 `rg` 复查残留。
- 单元 / 组件 / E2E：本次不新增，改动仅为类型维护且不改变运行时分支。
- 手工 UI 检查：不需要；无视觉和交互变更。
- 视觉决策扫描：
  - 不适用；未调整视觉 props、布局或组件样式。
- 验证分级：
  - Level 1：源码静态检查、`rg`、`pnpm lint`、`pnpm typecheck`；本次不默认跑 `pnpm build`。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-24 15:49 | `login.tsx` 使用 `FormEvent<HTMLFormElement>` 产生 deprecated 提示 | React 19 类型定义已弃用 `FormEvent` 别名 | 检查 `@types/react@19.2.17` 中 `FormEvent` 注释与登录页使用点 | 假设成立，改为非弃用 `SyntheticEvent<HTMLFormElement>` 即可满足当前使用场景 |

## 7. Review Checklist

- [x] 功能满足 spec。
- [x] 没有扩大范围。
- [x] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [x] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [x] 用户可见文案都走 i18n。
- [x] 三套 locale key 同步。
- [x] loading / empty / error / success 四态可用。
- [x] 与 prototype 的布局、交互和响应式规则一致。
- [x] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [x] 未使用无依据的 shadcn / Radix variant、size、portal、focus ring、disabled、aria 属性或视觉捷径。
- [x] 桌面和移动视口无明显溢出、重叠、错位。
- [x] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-24 15:49 | `rg -n "\\bFormEvent\\b" apps packages` | 通过 | 修复后无命中，确认范围内已无显式 `FormEvent` 使用 |
| 2026-07-24 15:49 | `pnpm lint` | 通过 | 命令退出成功；仓内保留既有 warning，包括 `login.tsx` 中与本次改动无关的 `no-await-in-loop` 与 `no-array-index-key` |
| 2026-07-24 15:49 | `pnpm typecheck` | 通过 | 无输出，命令退出成功 |
| 2026-07-24 15:49 | `pnpm build` | Skipped | Level 1 类型维护改动，不触及构建边界 |
| 2026-07-24 15:49 | 桌面视口检查 | Skipped | 无 UI 变更 |
| 2026-07-24 15:49 | 移动视口检查 | Skipped | 无 UI 变更 |

## 9. Finish Notes

- 交付摘要：登录页已改为使用非弃用的 `SyntheticEvent<HTMLFormElement>`，消除了 React 19 `FormEvent` 弃用提醒，且未改变提交行为。
- 最终进度：100%
- 最终步骤：已完成
- 剩余风险：仓内仍有若干既有 lint warning，未在本次小修中处理。
- Follow-up：若仓内其他文件后续出现 React 19 deprecated 事件别名，可单独做一次批量治理。
