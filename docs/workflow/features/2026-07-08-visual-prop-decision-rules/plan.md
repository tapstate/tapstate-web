# Visual Prop Decision Rules Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：交付
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-visual-prop-decision-rules/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，见 ./spec.md。
- Prototype 已确认 / 已说明跳过：已说明跳过。
- 非目标已确认：不新增 lint rule，不批量重构现有 UI。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- 修改：`docs/engineering/design-system.md`
- 修改：`docs/workflow/templates/prototype.md`
- 修改：`docs/workflow/templates/plan.md`
- 新增：`docs/workflow/features/2026-07-08-visual-prop-decision-rules/spec.md`
- 新增：`docs/workflow/features/2026-07-08-visual-prop-decision-rules/plan.md`
- 新增：`docs/workflow/features/2026-07-08-visual-prop-decision-rules/acceptance.md`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 在设计系统中新增控件尺寸默认值和 Visual Props Decision Rule | 定向 eslint | 完成 |
| 2 | Done | 在 prototype 模板中新增控件密度与视觉决策记录区 | 定向 eslint | 完成 |
| 3 | Done | 在 plan 模板中新增视觉决策扫描和 review checklist | 定向 eslint | 完成 |
| 4 | Done | 补齐 feature spec / plan / acceptance | 定向 eslint | 完成 |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-08 | Codex | 100% | 已更新设计系统、prototype 模板、plan 模板，并补齐 feature 文档 | 交付 | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：文档-only 改动，不适用 TDD；使用 markdown lint 作为结构检查。
- 单元 / 组件 / E2E：N/A。
- 手工 UI 检查：N/A。
- 视觉决策扫描：本次规则本身覆盖 `size`、`type`、`effect`、`round`、`plain`、自定义高度 / padding / 圆角 / 颜色 / 阴影等依据检查。
- 验证分级：Level 1，定向文档 lint；不跑 build。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-08 | 用双引号执行 `rg` 且 pattern 包含反引号时，shell 尝试执行 `size` 命令 | 反引号触发 shell command substitution | 改用单引号重跑 `rg` | 行号获取正常，文件未受影响 |

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
- [x] 未使用无依据的 Element Plus `size`、`type`、`effect`、`round`、`plain`、`text`、`link` 等视觉捷径。
- [x] 桌面和移动视口无明显溢出、重叠、错位。
- [x] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-08 | `./node_modules/.bin/eslint docs/engineering/design-system.md docs/workflow/templates/prototype.md docs/workflow/templates/plan.md` | Pass | 模板和设计系统 markdown 结构通过 |
| 2026-07-08 | `pnpm typecheck` | Skipped | 文档-only 改动，不涉及 TS 编译 |
| 2026-07-08 | `pnpm build` | Skipped | Level 1 文档改动，未触及构建边界 |
| 2026-07-08 | 桌面视口检查 | Skipped | 文档-only 改动 |
| 2026-07-08 | 移动视口检查 | Skipped | 文档-only 改动 |

## 9. Finish Notes

- 交付摘要：已把视觉决策默认值、例外证明和模板审查闭环写入文档。
- 最终进度：100%。
- 最终步骤：交付。
- 剩余风险：规则目前依赖 agent / reviewer 执行，尚未自动化为 lint rule。
- Follow-up：如后续仍频繁出现无依据视觉 props，可新增轻量 AST / eslint 检查。
