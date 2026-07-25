# FormEvent Deprecation Warning Acceptance

> 日期：2026-07-24
> Feature folder：docs/workflow/features/2026-07-24-formevent-deprecation-warning/
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
| `login.tsx` 不再显式使用 deprecated `FormEvent` 类型 | Passed | `rg -n "\\bFormEvent\\b" apps packages` 修复后无命中 |
| 登录表单提交逻辑保持不变 | Passed | 仅替换事件类型为 `SyntheticEvent<HTMLFormElement>`，`preventDefault()`、校验、提交与跳转逻辑未改动 |
| `pnpm lint` 与 `pnpm typecheck` 通过 | Passed with follow-up | 两个命令均退出成功；lint 保留仓内既有 warning，未由本次改动引入 |

## 3. 源稿 / 设计保真对照

适用于迁移、还原、复刻、按设计稿实现类需求；不适用时写 N/A。

| 对照项 | 结果 | 备注 |
|---|---|---|
| 标题 / toolbar / 主操作 | N/A | 本次无 UI 变更 |
| 页面布局与区域层级 | N/A | 本次无 UI 变更 |
| 交互入口 | N/A | 本次无新增或修改交互入口 |
| 未引入源稿外产品 UI | N/A | 本次无 UI 变更 |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `pnpm lint` | Passed with warnings | 命令退出成功；仓内保留既有 warning，包括 `app/routes/login.tsx` 中与本次改动无关的 `no-await-in-loop`、`no-array-index-key` |
| `pnpm typecheck` | Passed | 无输出，命令退出成功 |
| `pnpm build` | Skipped | Level 1 类型维护改动，不触及构建边界 |
| 桌面视口检查 | Skipped | 无 UI 变更 |
| 移动视口检查 | Skipped | 无 UI 变更 |

验证方式说明：

- 源码静态检查和本地命令能证明的，不升级到浏览器自动化。
- 目检能证明的 UI 小差异，不强行使用 GUI / Chrome / Playwright。
- `pnpm build` 仅在高风险或构建相关改动中默认要求；小改可跳过并说明理由。
- 只有交互、布局、真实渲染风险无法通过轻量方式确认时，才启动浏览器自动化。

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Preserved | 无变更，沿用现有登录提交状态 |
| Empty | Preserved | 无变更，沿用现有初始表单状态 |
| Error | Preserved | 无变更，沿用现有错误提示 |
| Success | Preserved | 无变更，沿用现有成功跳转 |

## 6. 剩余风险

- 仓内仍有若干既有 lint warning，本次仅聚焦 React 19 `FormEvent` 弃用提醒，未一并清理。
