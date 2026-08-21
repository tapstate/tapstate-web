# Source edit and connection test acceptance

> 日期：2026-08-21
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                                               | 结果                                        | 备注                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Edit 获取最新 Source 与 ETag 后打开编辑器              | Passed                                      | Source page integration test covers latest detail and ETag                                                         |
| 保存同步 list、detail cache 与当前选择                 | Passed                                      | Source page integration test covers cache updates                                                                  |
| 编辑 loading/error/validation/submitting/conflict 可用 | Passed by focused tests and source review   | loading, retry, payload validation, submitting guard and conflict recovery are covered by implementation and tests |
| 创建/编辑草稿使用既有测试合同并在 dialog 显示完整报告  | Passed by focused tests                     | client 使用 `POST /api/connections:test`；component test 覆盖当前草稿和 result dialog                              |
| 编辑保持原值的密钥不会作为测试配置发送                 | Passed by helper coverage and source review | browser 不持有 write-only value；提示用户先替换并重新输入                                                          |

## 3. 源稿 / 设计保真对照

| 对照项                  | 结果                                   | 备注                                                                                                                           |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 标题 / toolbar / 主操作 | Pending authenticated inspection       | source review confirms existing shadcn toolbar, dialog footer and nested result dialog vocabulary                              |
| 页面布局与区域层级      | Pending authenticated inspection       | large split dialog, single-column form and responsive help panel are implemented                                               |
| 交互入口                | Passed by Source page integration test | Edit loads latest detail rather than using the list projection                                                                 |
| 未引入源稿外产品 UI     | Passed                                 | 使用实际 report；没有 fake latency、mock result 或持久化 health status                                                         |
| 创建连接器选择卡片      | Pending authenticated inspection       | responsive 1/2/3-column, borderless floating cards, and a catalog-size-independent search field are covered by component tests |

## 4. 验证结果

| 命令 / 检查                    | 结果                | 备注                                                                                             |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------ |
| Focused Vitest                 | Passed              | 3 files, 19 tests passed without act warnings                                                    |
| `pnpm typecheck`               | Passed              | packages/formily and apps/web completed                                                          |
| `pnpm --filter web i18n:check` | Passed              | locale keys match across en, zh-CN and zh-TW                                                     |
| scoped `oxfmt --check`         | Passed              | changed Source and locale files are formatted                                                    |
| `git diff --check`             | Passed              | no whitespace errors                                                                             |
| `pnpm lint`                    | Blocked by baseline | oxlint passed, repo-wide formatting reports 36 pre-existing unrelated files                      |
| Source create focused Vitest   | Passed              | 4 connector selector and schema-flow tests passed, including the 300ms card-transition assertion |
| Source test focused Vitest     | Passed              | client path/body/report、create draft action 和 retained-secret helper 均已覆盖                  |
| `pnpm build`                   | Passed              | Vite production build completed; only existing chunk-size warning remains                        |
| 桌面视口检查                   | Pending             | local login requires password-entry confirmation                                                 |
| 移动视口检查                   | Pending             | local login requires password-entry confirmation                                                 |

## 5. UI 状态覆盖

| 状态                   | 结果                                        | 备注                                                                |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Loading                | Passed by focused tests                     | Edit action retains its action slot while latest detail loads       |
| Empty                  | N/A                                         | selected Source action has no empty state                           |
| Error                  | Passed by focused tests                     | retry is offered and existing detail remains available              |
| Success                | Passed by focused tests                     | updated Source is written to list, detail and selected state        |
| Validation             | Passed by focused tests and helper coverage | schema and metadata payload validation retain field errors          |
| Submitting             | Passed by source review                     | dialog close and fields are disabled while saving                   |
| Conflict               | Passed by source review                     | reload and keep-draft recovery are available after version conflict |
| Test validation        | Passed by focused tests and source review   | 使用与 create/edit 相同的连接字段校验                               |
| Testing                | Passed by source review                     | Test spinner 期间禁用连接字段、footer 动作和 dialog close           |
| Test success / failure | Passed by focused tests                     | result dialog 显示真实 report outcome/check，或安全错误提示         |
| Retained secret        | Passed by helper coverage and source review | keep 状态不发请求，用户须替换并重新输入                             |

## 6. 剩余风险

- Desktop and mobile inspection remain pending until password entry into the local application is confirmed.
