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
  -> create branch
  -> create or locate feature folder
  -> write spec / prototype / plan
  -> implement
  -> verify by risk level
  -> write acceptance
  -> commit
  -> push
  -> open PR
```

## 3. 开始 feature

从最新主干开始：

```sh
git fetch origin
git switch main
git pull --ff-only
```

创建分支：

```sh
git switch -c codex/<issue-number>-<slug>
```

分支命名：

- 有 GitHub issue：`codex/<issue-number>-<slug>`，例如 `codex/123-header-language-menu`。
- 没有 issue：`codex/<date>-<slug>`，例如 `codex/2026-07-07-header-language-menu`。
- 人工开发者也可以使用 `feature/<issue-number>-<slug>`；Codex 默认使用 `codex/` 前缀。

## 4. Feature 文档

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

## 5. 实现和验证

按 `plan.md` 小步推进，完成一步更新：

- `Implementation Steps` 状态。
- 文件头的进度 / 当前步骤 / 下一步。
- `Progress Log`。

验证按 `AGENTS.md` 的 `Verification Policy` 选择：

- Level 1：`pnpm lint`、`pnpm typecheck`，按需 `rg`。
- Level 2：Level 1 + `pnpm dev` 和必要目检。
- Level 3：Level 1 + `pnpm build`，必要时浏览器自动化。

跳过 `pnpm build` 时，在 `acceptance.md` 和 PR 中写清风险等级和理由。

## 6. 提交和 PR

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

## 7. 合并前门禁

PR 合并前至少满足：

- CI required checks 通过，或失败原因明确且不是本次改动引入。
- Reviewer 已确认范围、行为和风险。
- `acceptance.md` 已更新，或轻量改动已在 PR 中说明验收结果。
- 没有未解释的无关重构、依赖升级或格式化 churn。
