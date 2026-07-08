# Worktree Isolation Flow Acceptance

> 日期：2026-07-08
> Feature folder：docs/workflow/features/2026-07-08-worktree-isolation-flow/
> Spec：./spec.md
> Prototype：N/A
> Plan：./plan.md
> Reviewer：Codex self-review

## 1. 验收结论

- [x] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| `branch-pr-flow.md` 说明社区主流 Git 交互模型是短生命周期分支 + PR / CI / review | Pass | 标准路径后新增社区主流模型说明 |
| `branch-pr-flow.md` 明确 branch 与 worktree 的职责边界 | Pass | 明确 Branch 是协作单位，Worktree 是本地隔离单位 |
| `branch-pr-flow.md` 增加 worktree 使用判断规则和示例命令 | Pass | 新增 isolation mode 表格、worktree 命令、slug 对齐示例 |
| `.gitignore` 忽略 `.worktrees/` | Pass | `git check-ignore .worktrees/` 和 `.worktrees/example` 均通过 |
| 本次改动不触及应用代码、UI、路由、依赖或 i18n | Pass | `git status --short` 显示仅文档和 `.gitignore` 变更 |

## 3. 源稿 / 设计保真对照

N/A。本次不是迁移、还原、复刻或按设计稿实现类需求。

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `git check-ignore .worktrees/` | Pass | 输出 `.worktrees/` |
| `git check-ignore .worktrees/example` | Pass | 输出 `.worktrees/example` |
| `rg "worktree|Isolation|short-lived|短生命周期|\\.worktrees|隔离判断|短分支" docs/workflow/branch-pr-flow.md .gitignore docs/workflow/features/2026-07-08-worktree-isolation-flow` | Pass | 关键规则和 feature 文档均可检索 |
| `git diff --check` | Pass | 无空白错误 |
| `git status --short` | Pass | 改动范围符合预期 |
| `pnpm lint` | Skipped | 纯文档 / `.gitignore` 改动，未触及应用代码 |
| `pnpm typecheck` | Skipped | 纯文档 / `.gitignore` 改动，未触及 TypeScript |
| `pnpm build` | Skipped | 未触及构建产物、依赖、路由懒加载、Vite 配置或样式入口 |
| 桌面视口检查 | Skipped | 无 UI 改动 |
| 移动视口检查 | Skipped | 无 UI 改动 |

验证方式说明：

- 本次为 Level 1 文档治理变更。
- `git check-ignore .worktrees` 曾返回 1；根因是 `.worktrees/` 是目录规则，正确检查对象应为 `.worktrees/` 或其子路径。
- 不升级到前端构建或浏览器检查。

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | N/A | 无 UI 改动 |
| Empty | N/A | 无 UI 改动 |
| Error | N/A | 无 UI 改动 |
| Success | N/A | 无 UI 改动 |

## 6. 剩余风险

- Worktree 清理策略尚未文档化；后续如团队频繁使用，可补充 `git worktree remove` / `git worktree prune` 的清理章节或脚本。
- 本次未改 PR 模板；如果之后需要让 PR 强制填写 isolation mode，可单独开需求。
