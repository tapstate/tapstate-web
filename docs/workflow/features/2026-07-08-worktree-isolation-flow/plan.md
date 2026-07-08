# Worktree Isolation Flow Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：等待用户 review；如需要，可后续补 worktree 清理策略
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-worktree-isolation-flow/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，用户已确认“开始吧”。
- Prototype 已确认 / 已说明跳过：是，纯流程文档和 gitignore 更新，不涉及产品 UI。
- 非目标已确认：不改应用代码、CI、PR 模板或新增脚本。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- `.gitignore`
- `docs/workflow/branch-pr-flow.md`
- `docs/workflow/features/2026-07-08-worktree-isolation-flow/spec.md`
- `docs/workflow/features/2026-07-08-worktree-isolation-flow/plan.md`
- `docs/workflow/features/2026-07-08-worktree-isolation-flow/acceptance.md`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 创建 feature spec / plan | 检查文档覆盖原始输入、目标、非目标和验收标准 | 纯文档变更 |
| 2 | Done | 将 `.worktrees/` 加入 `.gitignore` | `git check-ignore .worktrees/` | 避免误提交本地 worktree |
| 3 | Done | 更新 `branch-pr-flow.md` 的标准路径、启动流程和 worktree 判断规则 | `rg` 检查关键规则 | 不改变现有 feature docs 闭环 |
| 4 | Done | 补 acceptance 并做最终检查 | `git status`, `rg` | 不跑前端构建 |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-08 | Codex | 0% | 初始化 feature spec / plan | 更新 workflow 文档 | 无 |
| 2026-07-08 | Codex | 70% | 更新 `.gitignore` 和 `branch-pr-flow.md` | 执行静态检查并补 acceptance | 无 |
| 2026-07-08 | Codex | 100% | 补 acceptance，记录验证和剩余风险 | 等待用户 review | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：`git check-ignore .worktrees` 在更新 `.gitignore` 前不通过；根因是 `.worktrees/` 是目录规则，正确验收命令应检查 `git check-ignore .worktrees/` 或 `.worktrees/example`。
- 单元 / 组件 / E2E：N/A，纯文档与 gitignore 变更。
- 手工 UI 检查：N/A。
- 验证分级：
  - Level 1：轻量流程文档变更，使用 `git check-ignore`、`rg`、`git status` 做静态检查。
  - 不跑 `pnpm lint` / `pnpm typecheck`：未改应用代码、TS、Vue、CSS 或 i18n。
  - 不跑 `pnpm build`：未触及构建产物、依赖、路由懒加载、Vite 配置或样式入口。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-08 | N/A | N/A | N/A | 暂无调试事项 |

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
| 2026-07-08 | `git check-ignore .worktrees/` | Pass | 输出 `.worktrees/` |
| 2026-07-08 | `git check-ignore .worktrees/example` | Pass | 输出 `.worktrees/example` |
| 2026-07-08 | `rg "worktree|Isolation|short-lived|短生命周期|\\.worktrees|隔离判断|短分支" docs/workflow/branch-pr-flow.md .gitignore docs/workflow/features/2026-07-08-worktree-isolation-flow` | Pass | 检查关键规则落地 |
| 2026-07-08 | `git diff --check` | Pass | 无空白错误 |
| 2026-07-08 | `git status --short` | Pass | 仅 `.gitignore`、workflow 文档和 feature 文档变更 |
| 2026-07-08 | `pnpm lint` | Skipped | 纯文档 / gitignore 改动 |
| 2026-07-08 | `pnpm typecheck` | Skipped | 纯文档 / gitignore 改动 |
| 2026-07-08 | `pnpm build` | Skipped | 未触及构建边界 |
| 2026-07-08 | 桌面视口检查 | Skipped | 无 UI 改动 |
| 2026-07-08 | 移动视口检查 | Skipped | 无 UI 改动 |

## 9. Finish Notes

- 交付摘要：接入短生命周期分支 + PR / CI / review 主线，并加入 worktree isolation decision、`.worktrees/` 忽略规则和示例命令。
- 最终进度：100%。
- 最终步骤：已完成。
- 剩余风险：尚未文档化 worktree 清理策略。
- Follow-up：可后续补充 `git worktree remove` / `git worktree prune` 清理章节或 PR 模板字段。
