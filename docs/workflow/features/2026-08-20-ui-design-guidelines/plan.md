# UI Design Guidelines Governance Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：后续 UI 任务按新规则判断是否需要 feature
> 日期：2026-08-20
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-20-ui-design-guidelines/
> 对应 spec：./spec.md
> 对应 prototype：N/A（文档治理变更）
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，包含用户原始输入和范围。
- Prototype 已确认 / 已说明跳过：是，纯文档治理，不产出 UI。
- 非目标已确认：是，不修改应用代码、依赖、locale 或构建配置。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- UI_DESIGN_GUIDELINES.md
- AGENTS.md
- docs/workflow/features/2026-08-20-ui-design-guidelines/spec.md
- docs/workflow/features/2026-08-20-ui-design-guidelines/plan.md
- docs/workflow/features/2026-08-20-ui-design-guidelines/acceptance.md
- docs/README.md
- docs/workflow/README.md
- .agents/skills/tapstate-workflow/SKILL.md

## 3. Implementation Steps

状态枚举：Todo / In Progress / Blocked / Done / Skipped

| Step | 状态 | 改动                                                          | 验证                                                              | 备注                                           |
| ---- | ---- | ------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| 1    | Done | 建立 feature spec，保留用户原始输入并拆解范围                 | 检查 spec 必备章节                                                | Prototype 记录为 N/A                           |
| 2    | Done | 新增根目录 UI 设计与代码生成规范                              | 对照用户提供的 5 个章节及执行门禁                                 | 保留原意并补充执行说明                         |
| 3    | Done | 更新 AGENTS.md 的 Read Order、Frontend Rules 和 Product Gates | 检查引用路径和强制措辞                                            | 明确生成前 / 交付前扫描                        |
| 4    | Done | 补齐 acceptance 并运行静态验证                                | git diff --check、Markdown 内容检查、定向格式检查、pnpm typecheck | pnpm lint 受工作区既有格式问题影响，已记录原因 |

## 4. Progress Log

每次执行 plan 时都更新本表。

| 时间       | Actor | 进度 | 已完成                                                                                                          | 下一步                             | 阻塞 |
| ---------- | ----- | ---- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---- |
| 2026-08-20 | Codex | 25%  | 读取仓库流程、模板和既有规则，建立 feature spec                                                                 | 写入规范正文                       | 无   |
| 2026-08-20 | Codex | 75%  | 完成 UI_DESIGN_GUIDELINES.md 和 AGENTS.md 引用                                                                  | 执行静态验证并完成 acceptance      | 无   |
| 2026-08-20 | Codex | 100% | 根据反馈补充 feature scope gate，更新 AGENTS、workflow、docs README 和 repo skill；完成定向格式检查与 typecheck | 后续按任务复杂度决定是否建 feature | 无   |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：不适用；本次无业务逻辑、状态流或可测试交互。先定义文档静态检查：文件存在、关键章节存在、AGENTS 引用存在、diff 无空白错误。
- 单元 / 组件 / E2E：不适用。
- 手工 UI 检查：不适用；本次不修改 UI。
- 视觉决策扫描：检查规范是否覆盖 Anti-Slop、空间数学、排版密度、颜色对比、focus ring、交互状态和触控目标，并检查 AGENTS 是否强制引用。
- 验证分级：Level 1。文档静态检查、git diff --check；不跑 pnpm build。

## 6. Debug Log

| 时间       | 现象                                | 假设                              | 实验                                                                    | 结论                          |
| ---------- | ----------------------------------- | --------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| 2026-08-20 | 初次读取 skill 使用了错误的绝对路径 | skill 实际位于仓库 .agents/skills | 按仓库 skill roots 检查并读取 .agents/skills/tapstate-workflow/SKILL.md | 已恢复，后续按正确 skill 执行 |

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

| 时间       | 命令 / 检查                    | 结果    | 备注                                                                                      |
| ---------- | ------------------------------ | ------- | ----------------------------------------------------------------------------------------- |
| 2026-08-20 | git diff --check               | Passed  | 无 whitespace error                                                                       |
| 2026-08-20 | 关键章节与 AGENTS 引用静态检查 | Passed  | 规范文件、规则入口和 feature scope gate 存在                                              |
| 2026-08-20 | 定向 oxfmt --check             | Passed  | 本次修改的 8 个文档文件格式通过                                                           |
| 2026-08-20 | pnpm lint                      | Failed  | 全量格式检查还报告既有应用文件和 .playwright-cli 文件；非本次代码逻辑问题，未做无关格式化 |
| 2026-08-20 | pnpm typecheck                 | Passed  | packages/formily 和 apps/web 均通过                                                       |
| 2026-08-20 | pnpm build                     | Skipped | 未触及构建、路由、依赖或样式入口                                                          |
| 2026-08-20 | 桌面视口检查                   | Skipped | 未修改 UI                                                                                 |
| 2026-08-20 | 移动视口检查                   | Skipped | 未修改 UI                                                                                 |

## 9. Finish Notes

- 交付摘要：已新增 UI 规范，并按反馈补充 feature scope gate。
- 最终进度：100%。
- 最终步骤：已完成。
- 剩余风险：全量 lint 仍受工作区既有格式问题影响；后续 agent 需要根据 feature scope gate 判断是否创建文档闭环。
- Follow-up：后续真实 UI feature 按本规范完成视觉决策扫描。
