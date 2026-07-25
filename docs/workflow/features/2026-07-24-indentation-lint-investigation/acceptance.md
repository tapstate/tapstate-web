# Indentation Guardrails Acceptance

> 日期：2026-07-24
> Feature folder：docs/workflow/features/2026-07-24-indentation-lint-investigation/
> Spec：./spec.md
> Prototype：N/A
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [x] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| `pnpm lint` 包含格式检查，缩进问题会报错 | Passed | `apps/web/package.json` 的 `lint` 已串联 `vp format --check .` |
| `pnpm format` 可自动修复 `apps/web` 下的缩进和基础格式问题 | Passed | 已执行一次全量格式化 |
| 工作区补齐 OXC 扩展推荐与保存时格式化设置 | Passed | `.vscode/extensions.json` 与 `.vscode/settings.json` 已更新 |
| `.oxfmtrc.json` 显式要求单引号、无分号 | Passed | 已核对 schema 并写入配置 |
| 记录验证命令、结果与剩余风险 | Passed | 已写入 `plan.md` Verification Record |

## 3. 源稿 / 设计保真对照

适用于迁移、还原、复刻、按设计稿实现类需求；不适用时写 N/A。

| 对照项 | 结果 | 备注 |
|---|---|---|
| 标题 / toolbar / 主操作 | N/A | 无 UI 改动 |
| 页面布局与区域层级 | N/A | 无 UI 改动 |
| 交互入口 | N/A | 无 UI 改动 |
| 未引入源稿外产品 UI | Passed | 本次仅文档与排查 |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| `pnpm format` | Passed | `apps/web` 统一格式化完成，风格已切到单引号、无分号；脚本显式读取 `../../.oxfmtrc.json` |
| `pnpm lint` | Passed with warnings | 格式检查通过；仍有既有语义 warning |
| `pnpm typecheck` | Failed | `features/sources/source-create-dialog.tsx` 既有 `string | null` 类型错误 |
| `pnpm build` | Skipped | Level 1 配置排查 |
| 桌面视口检查 | Skipped | 无 UI 改动 |
| 移动视口检查 | Skipped | 无 UI 改动 |

验证方式说明：

- 源码静态检查和本地命令能证明的，不升级到浏览器自动化。
- 目检能证明的 UI 小差异，不强行使用 GUI / Chrome / Playwright。
- `pnpm build` 仅在高风险或构建相关改动中默认要求；小改可跳过并说明理由。
- 只有交互、布局、真实渲染风险无法通过轻量方式确认时，才启动浏览器自动化。

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | N/A | 无 UI 改动 |
| Empty | N/A | 无 UI 改动 |
| Error | N/A | 无 UI 改动 |
| Success | Passed | 格式问题现在会被 lint 拦住，且可用 `pnpm format` 修复 |

## 6. 剩余风险

- 根目录 docs/config 仍未纳入同一条 formatter 门禁。
- `pnpm typecheck` 仍有与本次无关的既有空值类型问题。
