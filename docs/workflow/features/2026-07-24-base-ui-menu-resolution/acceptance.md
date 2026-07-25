# Base UI Menu Resolution Acceptance

> 日期：2026-07-24
> Feature folder：docs/workflow/features/2026-07-24-base-ui-menu-resolution/
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
| `dropdown-menu.tsx` 不再导入 `@base-ui/react/menu` 子路径 | Passed | `rg` 仅命中 `@base-ui/react` 根包导入 |
| `DropdownMenu*` 导出仍能被业务页类型检查通过 | Passed | `pnpm typecheck` 通过，调用方未新增类型错误 |
| `pnpm lint` 与 `pnpm typecheck` 通过 | Passed with follow-up | 两个命令均退出成功；lint 保留仓内既有 warning，未由本次改动引入 |

## 3. 源稿 / 设计保真对照

适用于迁移、还原、复刻、按设计稿实现类需求；不适用时写 N/A。

| 对照项 | 结果 | 备注 |
|---|---|---|
| 标题 / toolbar / 主操作 | N/A | 本次不改业务页 UI 文案或主操作 |
| 页面布局与区域层级 | N/A | 本次不改页面布局 |
| 交互入口 | N/A | 本次仅修复 primitive 依赖来源 |
| 未引入源稿外产品 UI | N/A | 本次无新增产品 UI |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `pnpm lint` | Passed with warnings | 命令退出成功；仓内保留既有 warning，如 `i18n/index.ts` 的 import warning 与若干既有 React/a11y warning |
| `pnpm typecheck` | Passed | 无输出，命令退出成功 |
| `pnpm build` | Skipped | 本次先按 Level 2 验证 |
| 桌面视口检查 | Skipped | 本轮无浏览器目检条件 |
| 移动视口检查 | Skipped | 本轮无浏览器目检条件 |

验证方式说明：

- 源码静态检查和本地命令能证明的，不升级到浏览器自动化。
- 目检能证明的 UI 小差异，不强行使用 GUI / Chrome / Playwright。
- `pnpm build` 仅在高风险或构建相关改动中默认要求；小改可跳过并说明理由。
- 只有交互、布局、真实渲染风险无法通过轻量方式确认时，才启动浏览器自动化。

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Preserved | 无有意状态变更 |
| Empty | Preserved | 无有意状态变更 |
| Error | Passed | `dropdown-menu.tsx` 已不再依赖 `@base-ui/react/menu` 子路径 |
| Success | Passed | 类型检查通过，业务页仍可消费 `DropdownMenu*` 导出 |

## 6. 剩余风险

- 仓内仍有若干既有 lint warning，本次仅修复 `@base-ui/react/menu` 子路径解析问题，未一并清理。
