# Shadcn Button Standardization Acceptance

> 日期：2026-08-24
> Feature folder：docs/workflow/features/2026-08-24-shadcn-button-standardization/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                                            | 结果      | 备注                                                                                                                                               |
| --------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 业务源码按钮统一使用 shadcn `Button`                | Pass      | 业务源码静态扫描无原生 `<button>`                                                                                                                  |
| 点击、提交、选择、disabled、aria 和键盘行为保持不变 | Pass      | Web 全量测试 76/76 通过；迁移后首次 typecheck 通过                                                                                                 |
| lint、typecheck 与静态扫描通过                      | Follow-up | `lint:code`、targeted format、静态扫描通过；最终 typecheck 被本次范围外未跟踪的 `pipeline-client.test.ts` 阻塞，全局 format check 也被既有文件阻塞 |

## 3. 源稿 / 设计保真对照

| 对照项                  | 结果 | 备注                          |
| ----------------------- | ---- | ----------------------------- |
| 标题 / toolbar / 主操作 | Pass | 迁移不改布局与文案            |
| 页面布局与区域层级      | Pass | 登录页桌面 / 移动视口检查通过 |
| 交互入口                | Pass | 迁移不改回调与 aria           |
| 未引入源稿外产品 UI     | Pass | 仅替换按钮实现                |

## 4. 验证结果

| 命令 / 检查              | 结果      | 备注                                                                                                     |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm lint`              | Follow-up | oxlint 通过，全局 format check 被既有 `.playwright-cli` 记录和其他既有文件阻塞                           |
| `pnpm lint:code`         | Pass      | oxlint 通过                                                                                              |
| `pnpm typecheck`         | Follow-up | 迁移后首次运行通过；最终复跑被 `apps/web/service/pipeline-client.test.ts` 引用未导出的 `ApiFetcher` 阻塞 |
| `pnpm --filter web test` | Pass      | 17 个测试文件、76 个测试通过                                                                             |
| targeted `oxfmt --check` | Pass      | 本次修改文件通过                                                                                         |
| `pnpm build`             | Skipped   | Level 2，未触及构建边界                                                                                  |
| 桌面视口检查             | Pass      | 登录页按钮、语言切换、密码显隐和提交按钮正常                                                             |
| 移动视口检查             | Pass      | 375px 视口无溢出或重叠                                                                                   |

## 5. UI 状态覆盖

| 状态    | 结果 | 备注                                   |
| ------- | ---- | -------------------------------------- |
| Loading | Pass | 保留既有 spinner / disabled            |
| Empty   | Pass | 保留既有空态 CTA                       |
| Error   | Pass | 保留既有 retry / destructive action    |
| Success | Pass | 保留既有普通操作、tab、tree 和列表入口 |

## 6. 剩余风险

- 全局 lint 的格式检查和最终 typecheck 仍有本次范围外的工作区文件阻塞，需要单独清理，不影响本次按钮迁移的代码 lint、定向格式检查、测试和静态扫描结果。
