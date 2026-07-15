# Cyntex To Tapstate Rename Acceptance

> 日期：2026-07-15
> Feature folder：docs/workflow/features/2026-07-15-cyntex-to-tapstate/
> Spec：./spec.md
> Prototype：N/A
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| 当前运行时代码与稳定项目文档不再出现 `Cyntex` / `cyntex`，历史 feature 记录除外 | Pass | `rg -n "Cyntex\|cyntex\|AskCyntex\|isAskCyntexOpen\|cyntex-workflow" . --glob '!docs/workflow/features/**'` 无命中 |
| Web 应用 title、品牌文案、Ask 入口和三套 locale 均显示 Tapstate | Pass | 更新 `index.html`、`en`、`zh-CN`、`zh-TW` |
| `AskCyntex` 组件与 `isAskCyntexOpen` 状态命名更新为 Tapstate | Pass | 组件文件为 `AskTapstate.vue`，状态为 `isAskTapstateOpen` |
| `pnpm lint` 和 `pnpm typecheck` 通过，或失败原因与本次改动无关并记录清楚 | Pass with follow-up | `pnpm typecheck` 通过；全仓 `pnpm lint` 失败于既有 2026-07-08 历史 markdown 表格列数；本次改动文件定向 lint 无 error |
| pnpm 验证生成的本地 store 不作为未跟踪文件出现在交付 diff 中 | Pass | `.gitignore` 新增 `.pnpm-store/` |

## 3. 源稿 / 设计保真对照

N/A。本次不是迁移、还原、复刻或按设计稿实现。

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `rg -n "Cyntex\|cyntex\|AskCyntex\|isAskCyntexOpen\|cyntex-workflow" . --glob '!docs/workflow/features/**'` | Pass | 非历史文件无旧品牌残留 |
| `pnpm lint` | Failed unrelated | 失败于既有历史 feature markdown 表格列数，不是本次改名引入 |
| `CI=true pnpm exec eslint <changed files>` | Pass with warnings | 本次改动文件无 error；部分 ignored/no config warning 可接受 |
| `pnpm typecheck` | Pass | `vue-tsc --noEmit` 通过 |
| `pnpm build` | Skipped | Level 1，未触及构建配置、依赖、路由懒加载或打包边界 |
| 桌面视口检查 | Skipped | 无布局改动 |
| 移动视口检查 | Skipped | 无布局改动 |

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Unchanged | 未修改状态流 |
| Empty | Pass | 空态文案中的品牌名已更新 |
| Error | Unchanged | 未修改错误处理 |
| Success | Pass | 品牌、Ask、登录页成功路径文案已更新 |

## 6. 剩余风险

- `api.tapstate.dev`、`tapstate/v1`、`.tap.yml` 和 `tapstate` CLI 是否已经在后端 / CLI / DNS 侧同步，需要跨仓确认。
- 历史 feature 文档仍保留旧品牌名，这是为了不篡改原始需求、历史验证记录和旧命令输出。
- session storage key 从 `cyntex.auth.token` 改为 `tapstate.auth.token` 后，旧浏览器会话需要重新登录。
