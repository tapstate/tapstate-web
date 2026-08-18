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

| 验收标准 | 结果 | 备注 |
| -------- | ---- | ---- |
| Web client 完成 Source CRUD 和 ETag | Passed | client contract and Source pages cover list/get/create/replace/delete and 412 refresh |
| 编辑不会回填 secret，支持 omit/clear | Passed | Formily bridge uses configured-secret keep / replace / clear intents |
| 删除展示 in-use referrer ids，不级联 | Passed | source delete dialog renders API referrer ids |
| 页面覆盖状态矩阵和窄屏 | Partial | source UI states are implemented; live responsive check awaits a backend with SourceController |
| lint/typecheck/i18n/build + live check | Partial | automated matrix passed; live CRUD awaits a backend with SourceController |

## 3. 源稿 / 设计保真对照

| 对照项 | 结果 | 备注 |
| ------- | ---- | ---- |
| 标题 / toolbar / 主操作 | Pending | 沿用现有 Source 页面基线 |
| 页面布局与区域层级 | Pending | 列表 + detail projection |
| 交互入口 | Pending | New/Edit/Delete |
| 未引入源稿外产品 UI | Pending | Pipeline UI 不在范围 |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
| ----------- | ---- | ---- |
| `pnpm --filter web test` | Passed | 6 files / 17 tests |
| `pnpm lint:code` | Passed | |
| `pnpm typecheck` | Passed | |
| `pnpm --filter web i18n:check` | Passed | |
| `pnpm --filter web build` | Passed | existing large-chunk warning only |
| 桌面视口检查 | Blocked | local page is connected to a backend without Source connector catalog |
| 移动视口检查 | Blocked | local page is connected to a backend without Source connector catalog |

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
| ---- | ---- | ---- |
| Loading | Passed | page and dialogs render loading states |
| Empty | Passed | Source list renders empty state |
| Error | Passed | request and field errors are rendered |
| Success | Passed | source list/detail mutation paths update the UI |
| Validation | Passed | config contract has required, number and array checks |
| Submitting | Passed | create, update and delete lock controls while pending |
| Conflict / in-use | Passed | 412 refresh/reload and source.in-use referrer state are rendered |

## 6. 剩余风险

- 需要连接到包含新 SourceController 的控制面，并在浏览器完成一次 non-production live CRUD。
