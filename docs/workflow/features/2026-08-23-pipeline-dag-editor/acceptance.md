# Pipeline DAG editor acceptance

> 日期：2026-08-23
> Feature folder：docs/workflow/features/2026-08-23-pipeline-dag-editor/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Pending

> 2026-08-24 update: The acceptance table below records the prior local-DAG prototype. The current implementation has passed 10 focused tests for typed Pipeline list, semantic DAG, independent layout, graph conversion and editor entry. Pipeline semantic create and replace remain blocked on the backend command and ETag contract; authenticated desktop and mobile visual review are also pending.

## 1. 验收结论

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                              | 结果    | 备注                                                                                                                         |
| ------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Structured DSL to DagGraph conversion | Passed  | converter tests cover source outputs, transforms, alias fan-in, view, serve and unresolved references                        |
| React Flow canvas and inspector       | Passed  | controlled canvas uses custom nodes, edges, controls, minimap and local drag positions                                       |
| Standalone editor layout              | Passed  | `/pipelines/new/edit` is a full-bleed canvas with a left-corner back action, floating palette and selection-driven inspector |
| Source targets                        | Passed  | serve sync/push Source references render as database-icon target nodes with Bezier delivery edges                            |
| No hidden unresolved references       | Passed  | unresolved inputs retain their downstream node and produce an explicit diagnostic                                            |
| Stored Pipeline list                  | Passed  | real artifact list validates the Pipeline-only contract and covers list, empty and retry states                              |
| i18n and verified visual states       | Partial | locale and automated states passed; authenticated browser visual review remains blocked                                      |

## 3. 源稿 / 设计保真对照

| 对照项                                     | 结果    | 备注                                                                                                                       |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Canvas interaction                         | Partial | Dify-inspired full-bleed canvas and floating panels are implemented; authenticated browser review remains pending          |
| Tapstate app-shell hierarchy               | Passed  | keeps the list inside the application shell and intentionally presents the editor outside it                               |
| Node density and selection states          | Partial | implementation complete, visual review pending                                                                             |
| No source-product brand or mock runtime UI | Passed  | keeps the existing Explorer and creation choices, while the new DAG mode adds no copied product branding or runtime claims |

## 4. 验证结果

| 命令 / 检查                    | 结果    | 备注                                                         |
| ------------------------------ | ------- | ------------------------------------------------------------ |
| `pnpm --filter web test`       | Passed  | 19 files / 82 tests                                          |
| `pnpm --filter web typecheck`  | Passed  |                                                              |
| `pnpm --filter web i18n:check` | Passed  |                                                              |
| `pnpm build`                   | Passed  | existing large-chunk warning only                            |
| `pnpm --filter web lint`       | Blocked | formatter reports 20 pre-existing files outside this feature |
| Desktop viewport               | Blocked | local `/pipelines` redirects to the user login page          |
| 375px viewport                 | Blocked | local `/pipelines` redirects to the user login page          |

## 5. UI 状态覆盖

| 状态                 | 结果   | 备注                                                                        |
| -------------------- | ------ | --------------------------------------------------------------------------- |
| Loading              | Passed | stored Pipeline list and Source-backed draft selector render loading states |
| Empty                | Passed | stored Pipeline list and graph draft provide clear empty states             |
| Error                | Passed | stored Pipeline list and source query errors have retry actions             |
| Success              | Passed | stored artifacts render in Explorer/table; structured draft renders graph   |
| Unresolved reference | Passed | diagnostic retains the affected node and identifies the unresolved input    |

## 6. 剩余风险

- Pipeline typed HTTP contract, persistence and ETag mutation remain separate backend-dependent work.
- `tapstate` currently has another workstream's uncommitted changes on `ws/cli-context-session-cache`; implement `PipelineView` only after a dedicated worktree is available.
- Complete the desktop and 375px visual review after the user logs into the local app.
