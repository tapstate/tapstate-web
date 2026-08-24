# Source test, edit, and schema discovery acceptance

> 日期：2026-08-21
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

结论：Source 的创建、编辑、列表 / 详情连接测试，以及 Schema 刷新和表字段详情均已实现并通过 focused tests。物理 375px 浏览器视口仍需补充目检，不阻塞当前桌面交付。

## 2. 验收标准对照

| 验收标准                                      | 结果   | 备注                                           |
| --------------------------------------------- | ------ | ---------------------------------------------- |
| Edit 获取最新 Source 与 ETag 后打开编辑器     | Passed | 既有 Source page integration coverage 保持有效 |
| 保存同步 list、detail cache 与当前选择        | Passed | 既有 cache update coverage 保持有效            |
| Source 列表行可测试已保存配置                 | Passed | 请求使用 source.id、connector 和 source.config |
| Source 详情 header 可测试已保存配置           | Passed | 请求使用 source.id、connector 和 source.config |
| Create 可在不创建 Source 的情况下测试草稿     | Passed | 测试复用 draft validation 与 settings 生成     |
| Edit 可在不保存 Source 的情况下测试草稿       | Passed | keep 复用、replace 覆盖、clear 移除 secret     |
| PASSED 与 FAILED report 被正确区分            | Passed | FAILED 是报告，不是 transport exception        |
| request / protocol / network failure 安全反馈 | Passed | 只显示通用错误，不输出 payload                 |
| write-only secret 不被 UI 读取或泄露          | Passed | 测试 settings 在内存中合并，不展示原值         |
| Refresh schema 调用 discover-schema           | Passed | 成功结果写入 React Query schema cache          |
| Schema 404 / 失败有明确状态和 retry           | Passed | 未发现、通用错误和刷新错误均有覆盖             |
| 表详情展示 fields schema                      | Passed | Columns tab 显示字段名、类型、主键和索引       |
| testing 时阻止改变草稿                        | Passed | close、form 和 footer action 均被禁用          |
| 三语文案一致                                  | Passed | i18n check 通过                                |

## 3. 源稿 / 设计保真对照

| 对照项                                              | 结果      | 备注                                                                                 |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| 大型 Source 配置弹窗的 header / split body / footer | Passed    | 测试 action 仅插入既有 footer，不重排主体                                            |
| 测试结果的信息层级                                  | Passed    | 结果为独立紧凑 dialog，不在大表单内堆叠状态卡                                        |
| Create 连接器选择区                                 | Passed    | 保留固定搜索、响应式多列、局部 `bg-gray-50/40`、无边框卡片和无装饰图标               |
| Source 列表 / 详情工作台                            | Passed    | 测试、刷新 Schema、表选择和 Columns fields 层级稳定                                  |
| 动作密度与可读性                                    | Passed    | pending 保持固定操作尺寸，测试结果不显示 secret 或 settings                          |
| 桌面视口                                            | Passed    | 认证会话验证 parent dialog 约 1100px × 648px，result dialog 约 560px × 200px，无溢出 |
| 375px 物理视口                                      | Follow-up | 当前浏览器绑定不能变更 viewport，现有 responsive class 已通过源码与构建验证          |

## 4. 验证结果

| 命令 / 检查                                                                                                                      | 结果             | 备注                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `pnpm --filter web test -- source-client.test.ts source-create-dialog.test.tsx source-edit-dialog.test.ts sources-page.test.tsx` | Passed           | 14 个 test files，66 tests passed                                           |
| `pnpm --filter web i18n:check`                                                                                                   | Passed           | locale key 一致                                                             |
| `pnpm typecheck`                                                                                                                 | Passed           | TypeScript 通过                                                             |
| `pnpm build`                                                                                                                     | Passed           | Vite build 通过                                                             |
| scoped `oxfmt --check`                                                                                                           | Passed           | 本 feature 变更格式正确                                                     |
| `git diff --check`                                                                                                               | Passed           | 无 whitespace error                                                         |
| `pnpm lint:code`                                                                                                                 | Passed           | oxlint diagnostics 通过                                                     |
| `pnpm lint`                                                                                                                      | Baseline blocked | 全仓 formatter 仅命中未触及的既有文件和用户 worktree 文件，未修改它们       |
| 认证桌面 UI 检查                                                                                                                 | Passed           | 已验证 Create / Edit 测试结果、Source 列表 / 详情测试入口和 Schema 字段展示 |

## 5. UI 状态覆盖

| 状态                                     | 结果   | 备注                                                    |
| ---------------------------------------- | ------ | ------------------------------------------------------- |
| Loading                                  | Passed | Edit 的 detail loading 保持 action slot 稳定            |
| Empty                                    | N/A    | 未选 Source 时没有 detail action                        |
| Validation                               | Passed | 测试与保存共用字段校验                                  |
| Testing                                  | Passed | 表单和操作禁用，避免报告与草稿错位                      |
| PASSED                                   | Passed | 独立 result dialog 可关闭                               |
| FAILED / WARNING                         | Passed | 结构化检查状态可见                                      |
| Request error                            | Passed | 安全通用错误可见                                        |
| Secret merge                             | Passed | keep / replace / clear settings 行为可用                |
| Schema loading / empty / error / success | Passed | loading、404、失败 retry、discover 成功和字段展示均覆盖 |
| Submitting / Conflict                    | Passed | 保留既有编辑保存语义                                    |

## 6. 剩余风险与后续

- 在可调整视口的浏览器或实际移动设备中完成 375px UI 复核。
- 若后端未来扩展连接检查或 Schema payload，更新 source client 的 runtime guard 与结果 UI 映射。
- 未提交、未推送任何改动。
