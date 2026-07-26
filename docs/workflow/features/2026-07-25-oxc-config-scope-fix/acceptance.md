# OXC Config Scope Fix Acceptance

> 日期：2026-07-25
> Feature folder：docs/workflow/features/2026-07-25-oxc-config-scope-fix/
> Spec：./spec.md
> Prototype：N/A
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                                                         | 结果   | 备注                                                                                                                                     |
| ---------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 根级 `pnpm format` / `pnpm format:check` 不再只委派 `apps/web`   | Passed | root script 已改为 `pnpm exec oxfmt .` / `pnpm exec oxfmt --check .`                                                                     |
| 根级 `pnpm lint` 覆盖 repo root 与 `apps/web`，且包含格式检查    | Passed | `pnpm lint` 先执行 `oxlint .`，再进入 repo-wide `pnpm format:check`；最终失败原因为既有格式债务，而非脚本失配                            |
| `apps/web` 的本地命令保留自动向上配置发现，不需要显式 `--config` | Passed | `pnpm --filter web exec oxlint --print-config service/auth-client.ts` 输出根配置；`pnpm --filter web format:check` 也能直接命中 app 文件 |
| README / tech-stack 与实际脚本一致                               | Passed | 两处文档均已更新为 root 直接覆盖 repo、子包向上发现                                                                                      |
| Cursor 保存 JS / JSX / TS / TSX 文件时使用 OXC formatter          | Passed | `.vscode/settings.json` 已新增语言级 formatter 覆盖，避免用户级 `[typescript]` Prettier 抢占                                              |
| `.oxfmtrc.json` 覆盖 TSX JSX attribute 单引号需求                 | Passed | 已新增 `jsxSingleQuote: true`；普通 `singleQuote` 不覆盖 JSX attribute                                                                    |
| 验证记录清楚说明通过项与既有剩余问题                             | Passed | 已写入 `plan.md` Verification Record                                                                                                     |

## 3. 源稿 / 设计保真对照

适用于迁移、还原、复刻、按设计稿实现类需求；不适用时写 N/A。

| 对照项                  | 结果   | 备注                     |
| ----------------------- | ------ | ------------------------ |
| 标题 / toolbar / 主操作 | N/A    | 无 UI 改动               |
| 页面布局与区域层级      | N/A    | 无 UI 改动               |
| 交互入口                | N/A    | 无 UI 改动               |
| 未引入源稿外产品 UI     | Passed | 本次仅工程脚本与文档修正 |

## 4. 验证结果

| 命令 / 检查                                                                                                                                                                                                                                                                                              | 结果             | 备注                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `pnpm lint`                                                                                                                                                                                                                                                                                              | Failed after fix | `oxlint .` 通过并进入 `pnpm format:check`；最终因 repo 内 81 个既有格式问题失败 |
| `pnpm format:check`                                                                                                                                                                                                                                                                                      | Failed after fix | 现已覆盖 repo root 与 `apps/web`，报出 81 个既有格式问题，证明入口已生效        |
| `pnpm --filter web format:check`                                                                                                                                                                                                                                                                         | Failed after fix | 子包入口无需显式 `--config`，报出 24 个既有 app 文件格式问题                    |
| `pnpm --filter web exec oxlint --print-config service/auth-client.ts`                                                                                                                                                                                                                                    | Passed           | 证明 `apps/web` 子包可自动向上发现根 `.oxlintrc.json`                           |
| `pnpm exec oxfmt --check package.json apps/web/package.json README.md docs/engineering/tech-stack.md docs/workflow/features/2026-07-25-oxc-config-scope-fix/spec.md docs/workflow/features/2026-07-25-oxc-config-scope-fix/plan.md docs/workflow/features/2026-07-25-oxc-config-scope-fix/acceptance.md` | Passed           | 本次 touched 文件均已格式化                                                     |
| `printf 'const x = "a";\n' \| pnpm exec oxfmt --stdin-filepath sample.ts`                                                                                                                                                                                                                             | Passed           | OXC 输出单引号且无分号，证明 CLI 配置读取正常                                  |
| `printf 'const x = "a";\n' \| prettier --parser typescript`                                                                                                                                                                                                                                            | Passed           | Prettier 输出双引号与分号，和 Cursor 保存症状一致                               |
| `printf 'const el = <Comp title="A" className="x">{"b"}</Comp>;\n' \| pnpm exec oxfmt --stdin-filepath sample.tsx`                                                                                                                                                                                   | Passed           | 已验证 TSX JSX attribute 使用单引号                                              |
| `pnpm typecheck`                                                                                                                                                                                                                                                                                         | Skipped          | 按 Level 1 风险分级跳过                                                         |
| `pnpm build`                                                                                                                                                                                                                                                                                             | Skipped          | Level 1 工程脚本修正                                                            |
| 桌面视口检查                                                                                                                                                                                                                                                                                             | Skipped          | 无 UI 改动                                                                      |
| 移动视口检查                                                                                                                                                                                                                                                                                             | Skipped          | 无 UI 改动                                                                      |

验证方式说明：

- 源码静态检查和本地命令能证明的，不升级到浏览器自动化。
- 目检能证明的 UI 小差异，不强行使用 GUI / Chrome / Playwright。
- `pnpm build` 仅在高风险或构建相关改动中默认要求；小改可跳过并说明理由。
- 只有交互、布局、真实渲染风险无法通过轻量方式确认时，才启动浏览器自动化。

## 5. UI 状态覆盖

| 状态    | 结果   | 备注                                                                         |
| ------- | ------ | ---------------------------------------------------------------------------- |
| Loading | N/A    | 无 UI 改动                                                                   |
| Empty   | N/A    | 无 UI 改动                                                                   |
| Error   | Passed | 旧状态已复现为 root 入口不覆盖 repo，且已记录根因                            |
| Success | Passed | root 与 `apps/web` 入口都已命中同一套 OXC 配置；剩余失败仅是既有格式债务暴露 |

## 6. 剩余风险

- repo 目前仍有 81 个既有格式问题，修复后 `pnpm lint` / `pnpm format:check` 才会整体通过。
- 如果 Cursor 打开的 workspace root 是父级 `memory` 而不是 `tapstate-web`，`tapstate-web/.vscode/settings.json` 仍可能不会生效，需要直接打开 `tapstate-web` 或在父级 workspace 加同样的 language override。
- 是否需要继续把 OXC 作为 Markdown / YAML 等文件的长期 formatter，需要单独明确定义。
