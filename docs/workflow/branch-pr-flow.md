# Branch And PR Flow

> 状态：项目级流程
> 范围：开发者认领一个 feature 后，从同步代码到提交 PR 的日常路径。

## 1. 适用范围

本流程用于已经明确要进入开发的需求：

- 需求提供者只负责提出需求、背景和验收期望。
- 开发者认领需求后，负责补齐本仓库要求的 spec / plan / acceptance。
- GitHub PR 是代码审查、CI 汇总和合并前验收的入口。

不覆盖完整产品管理、排期、发布管理和跨团队项目治理。

## 2. 标准路径

```text
sync main
  -> choose isolation mode
  -> create short-lived branch, optionally in a worktree
  -> create or locate feature folder
  -> write spec / prototype / plan
  -> implement
  -> verify by risk level
  -> write acceptance
  -> commit
  -> push
  -> open PR
```

本仓库采用社区主流的短生命周期分支 + PR / CI / review 模型：

- `main` 保持可集成，不直接承载需求实现。
- 每组不相关改动使用独立短分支。
- PR 汇总代码、feature 文档、验证结果和剩余风险。
- `worktree` 只解决本地隔离，不替代 branch、PR 或验收。

## 3. 开始 feature：隔离判断

需求开始前先判断 isolation mode。默认按需求风险从轻到重选择：

| 场景 | 推荐做法 | 说明 |
|---|---|---|
| 只读分析、review、调研 | 不建分支，不建 worktree | 不产生文件改动 |
| 极小修正，当前 checkout 已在对应 feature branch 且工作区干净 | 当前 checkout 继续做 | 例如局部文案、注释、轻微文档修正 |
| 普通需求，当前 checkout 干净且不会并行处理别的需求 | 在当前 checkout 新建短分支 | 仍然通过 PR 合并 |
| 非微小需求、AI agent 实现、多文件改动、UI / 路由 / 状态流、当前目录已有上下文、需要并行需求或长时间 `pnpm dev` | 新建 worktree + 新短分支 | 推荐默认选择，保护当前工作区 |

判断原则：

- Branch 是协作单位：表达这组改动是什么、如何 review、如何 merge。
- Worktree 是本地隔离单位：让同一个 repo 同时 checkout 多个 branch，避免需求之间互相污染。
- 不在 `main` 上实现需求；如果当前在 `main`，至少先创建短分支。
- 如果 agent / 人工开发者已经处于隔离 worktree，继续使用当前 worktree，不再嵌套创建。

## 4. 从主干开始

从最新主干开始：

```sh
git fetch origin
git switch main
git pull --ff-only
```

如果选择当前 checkout 开分支：

```sh
git switch -c codex/<issue-number>-<slug>
```

如果选择 worktree + 分支，优先使用项目本地 `.worktrees/`：

```sh
git worktree add .worktrees/<date>-<slug> -b codex/<issue-number>-<slug>
cd .worktrees/<date>-<slug>
pnpm install
```

没有 issue 时：

```sh
git worktree add .worktrees/2026-07-08-source-status-filter -b codex/2026-07-08-source-status-filter
cd .worktrees/2026-07-08-source-status-filter
pnpm install
```

使用项目本地 worktree 前，必须确认 `.worktrees/` 已被 `.gitignore` 忽略：

```sh
git check-ignore .worktrees/
```

如果 worktree 创建受限或失败，记录原因，并回退到当前 checkout 的短分支流程；不要为了创建 worktree 绕过仓库权限或沙箱策略。

分支命名：

- 有 GitHub issue：`codex/<issue-number>-<slug>`，例如 `codex/123-header-language-menu`。
- 没有 issue：`codex/<date>-<slug>`，例如 `codex/2026-07-07-header-language-menu`。
- 人工开发者也可以使用 `feature/<issue-number>-<slug>`；Codex 默认使用 `codex/` 前缀。

建议保持 branch、worktree 和 feature folder 的 slug 对齐：

```text
branch:   codex/2026-07-08-source-status-filter
worktree: .worktrees/2026-07-08-source-status-filter
feature:  docs/workflow/features/2026-07-08-source-status-filter/
```

## 5. Feature 文档

非微小需求创建：

```text
docs/workflow/features/YYYY-MM-DD-<slug>/
├── spec.md
├── prototype.md        # UI / IA / route / complex interaction only
├── plan.md
└── acceptance.md
```

轻量改动可以跳过 feature folder，但 PR 必须说明：

```text
Workflow: lightweight change, feature docs skipped
Reason: local UI/text/style tweak only; no route, data flow, dependency, or build behavior changed
Verification: pnpm lint, pnpm typecheck
```

轻量改动可以不建 feature folder，但仍应在短分支上完成；只有只读分析不需要分支。

## 6. 实现和验证

按 `plan.md` 小步推进，完成一步更新：

- `Implementation Steps` 状态。
- 文件头的进度 / 当前步骤 / 下一步。
- `Progress Log`。

验证按 `AGENTS.md` 的 `Verification Policy` 选择：

- Level 1：`pnpm lint`、`pnpm typecheck`，按需 `rg`。
- Level 2：Level 1 + `pnpm dev` 和必要目检。
- Level 3：Level 1 + `pnpm build`，必要时浏览器自动化。

跳过 `pnpm build` 时，在 `acceptance.md` 和 PR 中写清风险等级和理由。

## 7. 提交和 PR

提交前检查：

```sh
git status
```

提交：

```sh
git add <changed-files>
git commit -m "feat: <short summary>"
git push -u origin <branch>
```

PR 必须包含：

- 关联 issue。
- Feature folder 或轻量跳过说明。
- 核心改动摘要。
- 验证结果。
- 剩余风险。

## 8. 合并前门禁

PR 合并前至少满足：

- CI required checks 通过，或失败原因明确且不是本次改动引入。
- Reviewer 已确认范围、行为和风险。
- `acceptance.md` 已更新，或轻量改动已在 PR 中说明验收结果。
- 没有未解释的无关重构、依赖升级或格式化 churn。
