# Indentation Guardrails Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：如用户需要，扩大到根目录文档/配置格式门禁或处理既有 typecheck 问题
> 日期：2026-07-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-24-indentation-lint-investigation/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是
- Prototype 已确认 / 已说明跳过：是
- 非目标已确认：是
- 是否新增依赖：否
- 是否影响 IA / 权限 / 数据契约：否

## 2. 受影响文件

- `.oxfmtrc.json`
- `.oxlintrc.json`
- `.editorconfig`
- `package.json`
- `apps/web/package.json`
- `.vscode/settings.json`
- `.vscode/extensions.json`
- `README.md`
- `docs/engineering/tech-stack.md`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 复核当前 lint / format / VS Code 配置与 `vp format` 能力 | help / sample check | 确认 formatter 默认可收敛缩进 |
| 2 | Done | 接入 `format` / `format:check` 脚本，令 `pnpm lint` 包含格式检查 | `pnpm lint` | 缩进问题会进入门禁 |
| 3 | Done | 补齐 OXC 扩展推荐、保存时格式化配置与 README / tech-stack 文档 | 配置复核 | 编辑器与文档同步 |
| 4 | Done | 新增 `.oxfmtrc.json`，显式要求单引号、无分号和 2 空格缩进 | schema check; `pnpm format` | 默认风格不再靠推断 |
| 5 | Done | 对 `apps/web` 执行一次统一格式化并记录验证结果 | `pnpm format`; `pnpm lint`; `pnpm typecheck` | `typecheck` 暴露既有 null 类型问题 |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-24 | Codex | 100% | 已接入 `pnpm format` / `format:check`，新增 `.oxfmtrc.json` 显式规定单引号、无分号、2 空格；`apps/web/package.json` 的脚本改为显式传入 `--config ../../.oxfmtrc.json`，避免自动发现失效；`apps/web` 全量格式化完成，`pnpm lint` 现已包含格式检查；工作区补充 OXC 扩展推荐与 `formatOnSave` | 如需继续，处理既有 typecheck 或扩大根目录格式门禁 | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：`pnpm --filter web exec vp format --check .` 在改动前报出 51 个文件格式不一致。
- 单元 / 组件 / E2E：不适用。
- 手工 UI 检查：不适用。
- 视觉决策扫描：
  - 不适用。
- 验证分级：
  - Level 1：配置与命令检查。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-24 | 缩进问题没报错 | lint 未接格式检查 | 检查 `.oxlintrc.json`、`pnpm lint` 与 `vp format --check` | 成立；原脚本只跑语义 lint |
| 2026-07-24 | 自动修复不稳定 | 工作区未补齐格式化推荐，CLI 也无统一入口 | 检查 `.vscode/settings.json`、`.vscode/extensions.json` 与 `apps/web/package.json` | 成立；补扩展推荐、`formatOnSave` 与 `pnpm format` 后解决 |
| 2026-07-24 | 默认 formatter 风格不符合团队习惯 | 需要显式配置 `singleQuote` / `jsxSingleQuote` / `semi` | 阅读 `oxfmt/configuration_schema.json` | 成立；`.oxfmtrc.json` 已写死规则 |

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

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-24 | `pnpm --filter web exec vp format --check .` | Failed before fix | 改动前报出 51 个文件格式不一致 |
| 2026-07-24 | `pnpm --filter web exec vp lint --help` | Passed | 确认 lint 支持 `--fix`，但属于 lint rule fix，不等于格式化门禁 |
| 2026-07-24 | `pnpm --filter web exec vp --help` | Passed | 确认独立存在 `vp format` 命令，但未接入 root scripts |
| 2026-07-24 | `oxfmt/configuration_schema.json` 检查 | Passed | 确认支持 `singleQuote`、`jsxSingleQuote`、`semi` |
| 2026-07-24 | `pnpm format` | Passed | `apps/web` 60 个文件已统一格式化；脚本显式读取 `../../.oxfmtrc.json` |
| 2026-07-24 | `pnpm lint` | Passed with warnings | 格式检查通过；`button.tsx` 等源码已切到单引号、无分号；现有 warning 仍在，但不阻塞 |
| 2026-07-24 | `pnpm typecheck` | Failed | 既有 `features/sources/source-create-dialog.tsx` null 类型错误，非本次引入 |
| 2026-07-24 | `pnpm build` | Skipped | 本次属 Level 1-2 工程配置改动，无构建边界变化 |
| 2026-07-24 | 桌面视口检查 | Skipped | 无 UI 改动 |
| 2026-07-24 | 移动视口检查 | Skipped | 无 UI 改动 |

## 9. Finish Notes

- 交付摘要：已把格式检查接入 `pnpm lint`，新增 `pnpm format` / `format:check`，补齐 VS Code OXC 推荐，新增 `.oxfmtrc.json` 显式规定单引号/无分号/2 空格，并统一格式化 `apps/web`。
- 最终进度：100%
- 最终步骤：完成
- 剩余风险：根目录 docs/config 尚未进入同一条格式门禁；`pnpm typecheck` 仍受既有空值类型问题影响。
- Follow-up：如需继续，可把根目录文件纳入 formatter，或单独修复 `source-create-dialog.tsx` 类型错误。
