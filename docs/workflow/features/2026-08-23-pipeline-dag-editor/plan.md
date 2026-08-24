# Pipeline DAG editor

> 状态：In Progress
> 进度：70%
> 当前步骤：收口服务端 `PipelineView.dag` 与独立 layout store 的前端消费
> 下一步：实现结构化 Pipeline create and replace command，定义 DAG 写回与 ETag 语义后启用节点库的语义编辑
> 日期：2026-08-23
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-23-pipeline-dag-editor/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

> 2026-08-24 update: The earlier local `PipelineDsl` work is superseded by the backend DAG projection and separate layout persistence. This historical task log remains as the visual and interaction record. It must not be read as a local DSL save contract.

## 1. Scope Check

- Spec 已确认：是，用户指定 React Flow 和 Dify 参考。
- Prototype 已确认 / 已说明跳过：是，见 `prototype.md`。
- 非目标已确认：是，不写 YAML、不伪造运行数据、不定义保存合同。
- 是否新增依赖：是，`@xyflow/react`。
- 是否影响 IA / 权限 / 数据契约：列表复用 `/pipelines`，独立 editor 为 `/pipelines/new/edit`；列表消费既有 `GET /api/artifacts?kind=pipeline`，编辑仍等待未来 typed `PipelineView`，本切片不新增 API。

## 2. 受影响文件

- `apps/web/features/pipelines/pipeline-dag.ts` and its test
- `apps/web/features/pipelines/pipeline-canvas.tsx` and its test
- `apps/web/features/pipelines/pipeline-editor-page.tsx` and its test
- `apps/web/features/pipelines/pipelines-page.tsx`
- `apps/web/app/routes/_pipeline-editor*.tsx`
- `apps/web/service/pipeline-client.ts` and its test
- `apps/web/i18n/locales/{en,zh-CN,zh-TW}.json`
- `apps/web/package.json`, `pnpm-lock.yaml`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态        | 改动                                                                                                                                        | 验证                              | 备注                                               |
| ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| 1    | Done        | Red tests: source/transform/view/serve conversion, explicit fan-in and unresolved `from`                                                    | Vitest                            | no UI dependency                                   |
| 2    | Done        | Implement typed Pipeline DSL to `DagGraph` converter                                                                                        | focused Vitest                    | no YAML parser                                     |
| 3    | Done        | Add `@xyflow/react`, custom nodes, controlled canvas and inspector                                                                          | component test + build            | coordinates remain session-only                    |
| 4    | Done        | Keep the Pipeline Explorer and all creation choices; query stored Pipeline artifacts for its list and link DAG creation to a separate route | focused Vitest + i18n + typecheck | no fake lifecycle data or mock persistence         |
| 5    | Done        | Build the standalone three-panel editor with Source inputs, Source targets, transform icons and Bezier edges                                | focused Vitest                    | target Sources project `serve.sync` / `serve.push` |
| 6    | Done        | Replace the editor shell with a full-bleed canvas, floating palette, selection-driven inspector and left-corner back action                 | component test + build            | no persistent header or layout columns             |
| 7    | In Progress | Run visual review at desktop and 375px, record acceptance                                                                                   | build + browser                   | render, not source inspection                      |

## 4. Progress Log

| 时间       | Actor | 进度 | 已完成                                                                                                                                                                                                                                                                                                   | 下一步                                           | 阻塞                                                                                                           |
| ---------- | ----- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 2026-08-23 | Codex | 5%   | Read current Pipeline UI, DSL model, Dify React Flow source and local design rules; Source delete wiring completed separately                                                                                                                                                                            | Red tests for converter                          | Backend `PipelineView` write contract is not yet available, not a blocker for converter                        |
| 2026-08-24 | Codex | 85%  | Added tested `PipelineDsl` to `DagGraph` projection, controlled React Flow canvas and inspector, locale coverage, and real Source-backed draft input; restored the Pipeline Explorer and all creation choices, then connected its list to stored Pipeline artifacts with loading, empty and retry states | Authenticated visual review at desktop and 375px | Browser redirects to the local login page; Pipeline persistence remains outside the server contract            |
| 2026-08-24 | Codex | 90%  | Moved DAG creation into a full-screen route outside AppShell; added source/target Source palettes, node configuration, distinct transform glyphs and Bezier edges                                                                                                                                        | Authenticated visual review at desktop and 375px | Browser redirects to the local login page; stored Pipeline canonical YAML still lacks a typed graph projection |
| 2026-08-24 | Codex | 90%  | User supplied a Dify reference and requested a full-bleed canvas with floating panels and no header; documented the visual replacement and the separate backend `PipelineView` dependency                                                                                                                | Red UI test and floating-canvas implementation   | `tapstate` checkout belongs to `ws/cli-context-session-cache`; projection must use a dedicated worktree        |
| 2026-08-24 | Codex | 95%  | Replaced the header and grid with a full-bleed React Flow canvas, left-corner back action, floating add-node palette, responsive palette launcher, and selection-driven inspector; blank drafts retain canvas pan and zoom                                                                               | Authenticated visual review at desktop and 375px | Browser redirects to the local login page; `PipelineView` remains blocked on a dedicated `tapstate` worktree   |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：one source to view, chained transforms, fan-in, explicit `from`, unresolved source and transform references.
- 单元 / 组件 / E2E：Vitest converter and canvas tests; real API E2E deferred until Pipeline typed endpoint is available.
- 手工 UI 检查：local Vite at 1280px and 375px, select nodes, drag nodes, pan, zoom and fit view.
- 视觉决策扫描：use Tailwind only, semantic token hierarchy, 10px controls, no gradients, no nested cards, visible focus and touch targets.
- 验证分级：Level 3, adds a graph dependency and a new edit mode within an existing feature surface.

## 6. Debug Log

| 时间       | 现象                                         | 假设                             | 实验                      | 结论                     |
| ---------- | -------------------------------------------- | -------------------------------- | ------------------------- | ------------------------ |
| 2026-08-23 | UI skill update check cannot write its cache | sandbox blocks home cache writes | ran official check script | no implementation effect |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] Dify reference was applied to canvas interaction, not copied as product code or brand.
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 节点和边可读，unknown references are never hidden.
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] desktop and mobile render have no overflow, overlap or obstructed controls.
- [ ] TypeScript、lint 和 build 结果记录清楚。

## 8. Verification Record

| 时间       | 命令 / 检查                                      | 结果    | 备注                                                                                              |
| ---------- | ------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| 2026-08-23 | Source deletion focused tests / typecheck / i18n | Passed  | 67 tests; separate existing Source feature                                                        |
| 2026-08-24 | Pipeline converter and canvas tests              | Passed  | 16 files / 72 tests; includes alias fan-in and unresolved references                              |
| 2026-08-24 | `pnpm --filter web typecheck`                    | Passed  |                                                                                                   |
| 2026-08-24 | `pnpm --filter web i18n:check` and `lint:code`   | Passed  |                                                                                                   |
| 2026-08-24 | `pnpm build`                                     | Passed  | existing large-chunk warning only                                                                 |
| 2026-08-24 | Pipeline list client and page-state tests        | Passed  | 18 files / 79 tests; validates artifact filter, list, empty and retry                             |
| 2026-08-24 | Editor layout and target-Source graph tests      | Passed  | 19 files / 81 tests; target Source maps from serve sync/push references                           |
| 2026-08-24 | Full-bleed floating canvas tests                 | Passed  | 19 files / 82 tests; verifies no header, a left-corner back action and selection-driven inspector |
| 2026-08-24 | `pnpm --filter web typecheck` and `i18n:check`   | Passed  |                                                                                                   |
| 2026-08-24 | `pnpm build`                                     | Passed  | existing large-chunk warning only                                                                 |
| 2026-08-24 | `pnpm --filter web lint`                         | Blocked | oxlint completed; formatter reports 20 pre-existing files outside this feature                    |
| 2026-08-24 | Desktop / mobile visual review                   | Blocked | local route redirects to user login                                                               |

## 9. Finish Notes

- 交付摘要：
- 最终进度：
- 最终步骤：
- 剩余风险：typed Pipeline API and save semantics remain separate follow-up.
- Follow-up：connect PipelineView, ETag mutation and lifecycle queries once server contract lands.
