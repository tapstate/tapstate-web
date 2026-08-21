# UI Design Guidelines Governance Acceptance

> 日期：2026-08-20
> Feature folder：docs/workflow/features/2026-08-20-ui-design-guidelines/
> Spec：./spec.md
> Prototype：N/A（文档治理变更）
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [x] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                                                                                               | 结果 | 备注                                                                |
| ------------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------- |
| 根目录存在 UI_DESIGN_GUIDELINES.md，包含用户提供的 Anti-Slop、布局、排版、颜色、交互和表单规则         | 通过 | 已新增并保留 5 个规范章节，补充生成与审查门禁                       |
| AGENTS.md 在 Read Order 中要求生成或审查 UI 前阅读该文件                                               | 通过 | 已新增规则入口，并添加强制执行说明                                  |
| AGENTS.md 明确该规范是强制门禁，并要求发现违规时拒绝或重新生成低质量 UI                                | 通过 | 已更新 Read Order、Frontend Rules 和 Required Workflow              |
| AGENTS.md、docs/workflow/README.md 和 repo skill 对 feature scope 做了分级，微小任务不再强制建 feature | 通过 | 已明确默认不建 feature、必须建 feature 的边界和范围扩大时的升级规则 |
| 文档链接、Markdown 结构和 git diff 检查通过                                                            | 通过 | 已执行静态检查，详见验证结果                                        |

## 3. 源稿 / 设计保真对照

N/A。本次不涉及页面迁移、还原或复刻。

## 4. 验证结果

| 命令 / 检查                    | 结果    | 备注                                                                  |
| ------------------------------ | ------- | --------------------------------------------------------------------- |
| git diff --check               | 通过    | 无 whitespace error                                                   |
| 关键章节与 AGENTS 引用静态检查 | 通过    | 规范文件、规则入口和强制执行措辞均存在                                |
| 定向 oxfmt --check             | 通过    | 本次修改的文档文件格式通过                                            |
| pnpm lint                      | 失败    | 全量格式检查还报告既有应用文件和 .playwright-cli 文件；未做无关格式化 |
| pnpm typecheck                 | 通过    | packages/formily 和 apps/web 均通过                                   |
| pnpm build                     | Skipped | 未触及构建、路由、依赖或样式入口                                      |
| 桌面视口检查                   | Skipped | 未修改 UI                                                             |
| 移动视口检查                   | Skipped | 未修改 UI                                                             |

验证方式说明：本次变更是仓库文档和 agent 规则治理，源码静态检查足以覆盖风险；真实 UI feature 仍需执行本规范以及 AGENTS.md 要求的视觉检查。

## 5. UI 状态覆盖

| 状态    | 结果 | 备注                        |
| ------- | ---- | --------------------------- |
| Loading | N/A  | 不涉及页面                  |
| Empty   | N/A  | 不涉及页面                  |
| Error   | N/A  | 不涉及页面                  |
| Success | 通过 | 文档规范与 agent 引用已落地 |

## 6. 剩余风险

- 后续真实 UI 任务必须在其自身 feature 文档中记录规范扫描结果和必要例外。
- 既有页面不会因本次文档变更自动重构；需要在后续 UI 任务中逐步治理。
- 后续任务先按 feature scope gate 分类；微小任务直接处理，不再为了形式补建 feature。
