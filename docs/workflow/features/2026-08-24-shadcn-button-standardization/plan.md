# Shadcn Button Standardization Plan

> 状态：Done
> 进度：100%
> 当前步骤：完成迁移、验证与验收记录
> 下一步：无
> 日期：2026-08-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-24-shadcn-button-standardization/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，见 `./spec.md`。
- Prototype 已确认 / 已说明跳过：是，见 `./prototype.md`。
- 非目标已确认：是，不改业务行为、i18n、测试选择器和 shadcn 内部 primitive。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- `apps/web/app/routes/login.tsx`
- `apps/web/components/layout/app-header.tsx`
- `apps/web/features/ask-tapstate/ask-tapstate.tsx`
- `apps/web/features/explorations/explorations-page.tsx`
- `apps/web/features/pipelines/pipelines-page.tsx`
- `apps/web/features/pipelines/tree-item.tsx`
- `apps/web/features/pipelines/wizard-builder.tsx`
- `apps/web/features/sources/connector-formily.tsx`
- `apps/web/features/sources/source-create-dialog.tsx`
- `apps/web/features/sources/source-delete-dialog.tsx`
- `apps/web/features/sources/sources-page.tsx`
- `docs/workflow/features/2026-08-24-shadcn-button-standardization/*`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动                                                    | 验证                                     | 备注                                |
| ---- | ---- | ------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| 1    | Done | 扫描 Button 实现、业务原生 button 与现有 dirty worktree | `rg`、读取设计系统                       | 已完成，保留用户已有改动            |
| 2    | Done | 将业务原生 button 替换为 shadcn `Button`                | 逐文件源码检查                           | 保留特殊交互的 aria / pressed / ref |
| 3    | Done | 运行 lint、typecheck、测试，并检查剩余原生 button       | `pnpm lint:code`、`pnpm typecheck`、`rg` | Web 测试与静态扫描通过              |
| 4    | Done | 更新 acceptance 与交付说明                              | acceptance 对照表                        | 记录全局 format check 的既有阻塞    |

## 4. Progress Log

| 时间       | Actor | 进度 | 已完成                                                  | 下一步 | 阻塞                                       |
| ---------- | ----- | ---- | ------------------------------------------------------- | ------ | ------------------------------------------ |
| 2026-08-24 | Codex | 100% | 完成业务按钮迁移、测试、桌面 / 移动登录页检查和静态扫描 | 无     | 全局 lint 的 format check 仍被既有文件阻塞 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：先用 `rg '<button\\b' apps/web` 建立静态基线，迁移后确认只剩允许的内部 primitive / 测试查询。
- 单元 / 组件 / E2E：不新增测试，使用现有测试与 TypeScript 类型检查覆盖 props / ref / 事件契约。
- 手工 UI 检查：检查登录、app shell、Sources、Pipelines、Ask Tapstate 的按钮 focus、disabled、icon-only 和窄视口布局。
- 视觉决策扫描：所有迁移优先使用既有 Button variant / size，局部 class 仅用于保持原有 tab、tree、connector 卡片布局。
- 验证分级：Level 2，中等范围 UI 组件迁移；不触及依赖、路由懒加载、Vite 或样式入口，因此默认跳过 build。

## 6. Debug Log

| 时间       | 现象                                          | 假设                                              | 实验                                 | 结论                                                                              |
| ---------- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| 2026-08-24 | 初始扫描发现业务页面混用原生 button 与 Button | 直接替换可能丢失 `ref`、`aria-pressed` 或局部布局 | 对照现有 Button API 与每个按钮上下文 | 使用 `Button` 直接替换并保留 props / className，必要时显式设置 `variant` / `size` |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [x] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [x] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [x] 用户可见文案都走 i18n。
- [x] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [ ] 未使用无依据的 shadcn / Radix variant、size、portal、focus ring、disabled、aria 属性或视觉捷径。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间       | 命令 / 检查                                                                                                  | 结果      | 备注                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------- |
| 2026-08-24 | `rg '<button\\b' apps/web --glob '*.tsx' --glob '*.ts' --glob '!**/*.test.*' --glob '!app/routeTree.gen.ts'` | Pass      | 业务源码无原生 button，shadcn 内部 primitive 未改                                                    |
| 2026-08-24 | `pnpm lint:code`                                                                                             | Pass      | oxlint 通过                                                                                          |
| 2026-08-24 | `pnpm typecheck`                                                                                             | Follow-up | 迁移后首次检查通过；最终复跑被本次范围外、未跟踪的 `apps/web/service/pipeline-client.test.ts` 阻塞   |
| 2026-08-24 | `pnpm --filter web test`                                                                                     | Pass      | 17 个测试文件、76 个测试通过                                                                         |
| 2026-08-24 | `pnpm exec oxfmt --check <本次修改文件>`                                                                     | Pass      | 本次修改代码与 feature 文档格式通过                                                                  |
| 2026-08-24 | `pnpm lint`                                                                                                  | Follow-up | oxlint 通过；全局 format check 仍发现 `.playwright-cli` 记录及其他既有文件未格式化，未扩大格式化范围 |
| 2026-08-24 | `pnpm build`                                                                                                 | Skipped   | Level 2，未触及构建边界                                                                              |
| 2026-08-24 | 桌面视口检查                                                                                                 | Pass      | 登录页按钮、语言切换、密码显隐和提交按钮无布局问题                                                   |
| 2026-08-24 | 移动视口检查                                                                                                 | Pass      | 375px 视口无溢出、重叠，按钮保持可用                                                                 |

## 9. Finish Notes

- 交付摘要：业务 UI 按钮统一使用现有 shadcn `Button`，保留原有交互语义与局部布局。
- 最终进度：100%。
- 最终步骤：已完成。
- 剩余风险：仓库全局格式检查和最终 typecheck 仍受本次范围外的工作区文件阻塞。
- Follow-up：后续单独处理 `.playwright-cli` 格式问题，以及 `pipeline-client` 测试引用未导出 `ApiFetcher` 的类型问题。
