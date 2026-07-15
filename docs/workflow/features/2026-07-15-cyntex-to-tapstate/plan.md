# Cyntex To Tapstate Rename Plan

> 状态：In Progress
> 进度：100%
> 当前步骤：完成
> 下一步：交付
> 日期：2026-07-15
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-15-cyntex-to-tapstate/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：已按用户原始输入建立。
- Prototype 已确认 / 已说明跳过：已在 spec 说明跳过。
- 非目标已确认：不重命名物理目录、不改后端真实契约、不改历史 feature 事实记录。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：不影响 IA；session storage key 改名会影响旧本地登录态；不改真实数据契约。

## 2. 受影响文件

- `package.json`
- `.gitignore`
- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/workflow/README.md`
- `docs/product/information-architecture.md`
- `docs/engineering/design-system.md`
- `docs/engineering/tech-stack.md`
- `packages/README.md`
- `apps/web/index.html`
- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
- `apps/web/src/i18n/locales/zh-TW.json`
- `apps/web/src/stores/uiState.ts`
- `apps/web/src/stores/authSession.ts`
- `apps/web/src/layouts/DefaultLayout.vue`
- `apps/web/src/components/AppHeader.vue`
- `apps/web/src/components/AskTapstate.vue`
- `apps/web/src/components/PipelinesPage.vue`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 建立 spec 和 plan，确认 prototype 跳过 | 文档存在 | 保留用户原始输入 |
| 2 | Done | 更新运行时代码、locale、HTML title 与示例域名 | `rg` 检查当前代码旧品牌残留通过 | 包含 Ask 组件重命名 |
| 3 | Done | 更新稳定项目文档和 package 标识 | `rg` 检查稳定文档旧品牌残留通过 | 历史 feature 记录不改；repo skill 同步为 `tapstate-workflow` |
| 4 | Done | 运行 lint/typecheck 并记录结果 | `pnpm lint`、`pnpm typecheck` | 全仓 lint 被既有历史 markdown 表格错误阻塞；定向 lint 无 error；typecheck 通过 |
| 5 | Done | 自检并写 acceptance | acceptance 对照验收标准 | 交付 |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-15 00:00 CST | Codex | 10% | 完成 README、workflow、tech-stack、模板读取；完成旧品牌扫描；创建 spec/plan | 更新代码与稳定文档 | 无 |
| 2026-07-15 00:20 CST | Codex | 65% | 更新运行时代码、三套 locale、稳定文档、package 标识、repo skill；确认非历史文件无旧品牌残留 | 运行 lint/typecheck 并写 acceptance | 无 |
| 2026-07-15 00:45 CST | Codex | 100% | 完成验证、自检、`.pnpm-store/` 忽略规则和 acceptance | 交付 | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：`rg -n "Cyntex|cyntex"` 会在当前运行时代码和稳定文档中命中旧品牌。
- 单元 / 组件 / E2E：不新增业务逻辑，不新增测试。
- 手工 UI 检查：本次无布局改动，源码和 i18n 静态检查即可；如 lint/typecheck 暴露模板引用问题则修复。
- 视觉决策扫描：无新增视觉 props 或布局样式。
- 验证分级：
  - Level 1：品牌文案、命名、文档轻量改动，运行 `pnpm lint`、`pnpm typecheck`；通常不跑 `pnpm build`。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
|  |  |  |  |  |

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
| 2026-07-15 00:35 CST | `pnpm lint` | Failed | 依赖恢复后命令真正执行；失败于既有历史 feature markdown 表格列数：`2026-07-08-shadcn-design-tokens/plan.md`、`2026-07-08-worktree-isolation-flow/acceptance.md`、`2026-07-08-worktree-isolation-flow/plan.md` |
| 2026-07-15 00:40 CST | `CI=true pnpm exec eslint <changed files>` | Pass with warnings | 本次改动文件无 error；`.claude/rules/workflow.md`、`.gitignore`、`apps/web/index.html` 仅提示未纳入/被忽略 |
| 2026-07-15 00:42 CST | `pnpm typecheck` | Pass | `vue-tsc --noEmit` 通过 |
|  | `pnpm build` | Skipped | Level 1，未触及构建配置、依赖或路由懒加载 |
|  | 桌面视口检查 | Skipped | 无布局改动 |
|  | 移动视口检查 | Skipped | 无布局改动 |

## 9. Finish Notes

- 交付摘要：完成 Tapstate 品牌改名，覆盖运行时代码、i18n、稳定文档、repo skill 与本地 pnpm store 忽略规则。
- 最终进度：100%
- 最终步骤：Done
- 剩余风险：`api.tapstate.dev`、`tapstate/v1`、`.tap.yml`、`tapstate` CLI 是否已在后端/CLI 真实实现中同步，需跨仓确认。
- Follow-up：历史 feature 文档仍保留旧品牌事实记录；后续若要全局品牌考古清理，需要单独迁移历史文档策略。
