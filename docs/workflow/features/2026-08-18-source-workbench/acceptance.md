# Source Workbench Acceptance

> 日期：2026-08-18
> Feature folder：docs/workflow/features/2026-08-18-source-workbench/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Pending

## 1. 验收结论

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                               | 结果    | 备注                                                                                                                                      |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Web client 完成 Source CRUD 和 ETag    | Passed  | client contract and Source pages cover list/get/create/replace/delete and 412 refresh; detail now renders through the nested route outlet |
| 编辑不会回填 secret，支持 omit/clear   | Passed  | configured required secrets can keep their write-only value or submit a replacement; clear remains explicit                               |
| 删除展示 in-use referrer ids，不级联   | Passed  | detail header opens the delete dialog; successful confirmation invalidates Source list/detail/schema cache only after the API succeeds    |
| 页面覆盖状态矩阵和窄屏                 | Partial | source UI states are implemented and desktop browser read paths were observed; the 375px check remains pending                            |
| lint/typecheck/i18n/build + live check | Partial | automated matrix, isolated control-plane CRUD, and browser catalog/Formily rendering passed; browser mutations remain pending             |

## 3. 源稿 / 设计保真对照

| 对照项                  | 结果    | 备注                                                                                   |
| ----------------------- | ------- | -------------------------------------------------------------------------------------- |
| 标题 / toolbar / 主操作 | Passed  | browser read smoke shows the existing Source shell and create entry                    |
| 页面布局与区域层级      | Passed  | browser read smoke shows the list empty state and create dialog                        |
| 交互入口                | Partial | create entry and connector form render in browser; mutation completion remains pending |
| 未引入源稿外产品 UI     | Passed  | Pipeline UI remains outside this Source-only change                                    |

## 4. 验证结果

| 命令 / 检查                                                                            | 结果    | 备注                                                                                                                        |
| -------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web test`       | Passed  | 9 files / 24 tests, including route, secret, SRS, and table selector regressions                                            |
| package format check                                                                   | Partial | changed files pass targeted `oxfmt --check`; package-wide command remains blocked by 30 pre-existing formatting failures    |
| `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web typecheck`  | Passed  |                                                                                                                             |
| `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web i18n:check` | Passed  |                                                                                                                             |
| `pnpm --config.store-dir=/private/tmp/tapstate-web-pnpm-store --filter web build`      | Passed  | existing large-chunk warning only                                                                                           |
| Isolated control-plane API CRUD                                                        | Passed  | bootstrap/login/catalog and Source create/update/delete, secret omission/clear, and stale ETag `412` completed on port 8081 |
| 桌面视口检查                                                                           | Partial | authenticated browser rendered the empty state, create dialog, live connector selector, and MySQL Formily fields            |
| 移动视口检查                                                                           | Pending | restart the isolated control-plane and dev server, then inspect at 375px                                                    |

## 5. UI 状态覆盖

| 状态              | 结果   | 备注                                                             |
| ----------------- | ------ | ---------------------------------------------------------------- |
| Loading           | Passed | page and dialogs render loading states                           |
| Empty             | Passed | Source list renders empty state                                  |
| Error             | Passed | request and field errors are rendered                            |
| Success           | Passed | source list/detail mutation paths update the UI                  |
| Validation        | Passed | config contract has required, number and array checks            |
| Submitting        | Passed | create, update and delete lock controls while pending            |
| Conflict / in-use | Passed | 412 refresh/reload and source.in-use referrer state are rendered |

## 6. 剩余风险

- 在恢复隔离 Mongo、控制面和 dev server 后，完成一次 non-production browser create/edit/delete，并在 375px 视口复查表单和对话框。
