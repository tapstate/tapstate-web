# Worktree Isolation Flow

> 状态：Accepted
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-worktree-isolation-flow/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：docs/workflow/branch-pr-flow.md, .gitignore

## 1. Intake

### 用户原始输入

> 需求开始的时候都是在当前分支，现在流行的工作流是怎样的？新分支？worktree？然后看下怎么接入到当前的工作流内

> 是否要用 worktree 是怎么决定的？git 交互这套流程，现在社区最流行的什么

> 开始吧

### 背景与上下文

当前 `docs/workflow/branch-pr-flow.md` 已经定义了从 `main` 同步、创建分支、补齐 feature 文档、实现、验证、验收和 PR 的路径。但需求启动阶段还没有说明：

- 是否允许在当前分支直接开始。
- 什么时候必须新建短生命周期分支。
- 什么时候在短分支之外再使用独立 `git worktree`。
- 本地 worktree 目录如何避免误提交。

团队希望把社区常见的短分支 PR 流程，与 AI agent / 并行开发更需要的本地隔离方式接到现有 workflow 中。

### 假设

- `main` 不作为需求实现分支使用。
- PR / MR 仍然是协作、review、CI 和合并前验收入口。
- `worktree` 是本地隔离手段，不替代 branch、PR 或 feature 文档。
- 项目本地 worktree 目录使用 `.worktrees/`。

### 未决问题

- 是否后续引入自动脚本封装 worktree 创建与清理；本次只更新文档规则。
- 是否要求所有 agent 强制使用 worktree；本次采用默认推荐 + 轻量例外。

## 2. Decomposition

### 目标

- 在 branch / PR 流程中加入需求启动前的 isolation decision。
- 明确社区主流流程：短生命周期分支、PR / CI / review、合并到 `main`。
- 明确 worktree 使用判断：并行、当前工作区有上下文、非微小需求、AI agent 或需要长时间本地服务时优先使用。
- 将 `.worktrees/` 加入 `.gitignore`，避免本地 worktree 内容误入版本控制。
- 保持现有 spec / prototype / plan / acceptance 的 feature-centric 闭环。

### 非目标

- 不创建真实业务 feature 的 worktree。
- 不改 GitHub 分支保护、CI 配置或 PR 模板。
- 不引入自动化脚本或新的依赖。
- 不改变应用代码、路由、UI 或 i18n。

### 用户路径

1. 开发者或 agent 收到需求，先判断是否只是只读分析、轻量改动、普通实现或需要隔离的非微小需求。
2. 根据判断选择当前 checkout 短分支，或 `.worktrees/<date-slug>` 下的新 worktree + 新分支。
3. 在对应 branch / worktree 中创建或定位 feature folder，继续执行 spec / prototype / plan / implement / acceptance。
4. 通过 PR 汇总 feature 文档、验证结果和剩余风险。

### 影响面

- IA / 路由：无。
- 状态管理：无。
- 数据 / API：无。
- 权限：无。
- i18n：无用户可见 UI 文案。
- 错误处理：流程文档新增 sandbox / worktree 创建失败时的回退说明。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 所有需求都在当前 checkout 开分支 | 最简单，学习成本低 | 并行需求、AI 尝试和长时间 dev server 容易互相污染 | 不采用为默认，仅保留轻量例外 |
| 所有需求强制 worktree | 隔离最强，适合 agent | 对轻量修正显得笨重，目录管理成本高 | 不强制所有场景 |
| 短分支 PR 主线 + 按风险使用 worktree | 符合社区主流，也兼顾本地隔离 | 需要明确判断规则 | 采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：本次为 Git/workflow 文档治理和 `.gitignore` 更新，不涉及产品 UI、IA、路由或复杂交互。

## 4. UI / IA Sketch

N/A。

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | N/A | N/A | N/A |
| Empty | N/A | N/A | N/A |
| Error | N/A | N/A | N/A |
| Success | N/A | N/A | N/A |

## 6. i18n 范围

新增或变更的 locale key：

- N/A

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：N/A。

## 8. 验收标准

- [ ] `branch-pr-flow.md` 说明社区主流 Git 交互模型是短生命周期分支 + PR / CI / review。
- [ ] `branch-pr-flow.md` 明确 branch 与 worktree 的职责边界。
- [ ] `branch-pr-flow.md` 增加 worktree 使用判断规则和示例命令。
- [ ] `.gitignore` 忽略 `.worktrees/`。
- [ ] 本次改动不触及应用代码、UI、路由、依赖或 i18n。

## 9. 风险

- 规则过重会降低轻量修正效率；文档需要保留轻量例外。
- 规则过轻会让 AI agent 或并行需求继续污染当前分支；文档需要给出默认推荐。
- worktree 清理属于后续治理项，本次不处理以避免扩大范围。
