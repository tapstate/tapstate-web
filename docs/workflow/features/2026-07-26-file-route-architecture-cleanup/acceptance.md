# TanStack File Route Architecture Cleanup Acceptance

> 日期：2026-07-26
> Feature folder：docs/workflow/features/2026-07-26-file-route-architecture-cleanup/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准                                | 结果                | 备注                                                                    |
| --------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `router.tsx` 引入生成的 `routeTree.gen` | Pass                | `apps/web/app/router.tsx` 仍保留 router instance 和类型注册             |
| route 文件使用 File Route API           | Pass                | routes 导出 `Route = createFileRoute(...)` / `createRootRoute(...)`     |
| Vite 启用 TanStack Router plugin        | Pass                | `apps/web/vite.config.ts` 使用 `tanstackRouter(...)`                    |
| 手写 `route-tree.tsx` 移除              | Pass                | 旧文件已删除                                                            |
| active docs / skill 清理旧架构          | Pass                | React 19 + TanStack File Routes 成为当前事实；旧 feature 历史目录已移除 |
| Level 3 验证                            | Pass with follow-up | typecheck/build 通过；lint 因既有 format debt 未全绿                    |

## 3. 源稿 / 设计保真对照

| 对照项                  | 结果 | 备注                                           |
| ----------------------- | ---- | ---------------------------------------------- |
| 标题 / toolbar / 主操作 | N/A  | 本次不改 UI                                    |
| 页面布局与区域层级      | Pass | URL 和 layout 语义保持                         |
| 交互入口                | Pass | `/`、`/login`、authenticated child routes 保持 |
| 未引入源稿外产品 UI     | Pass | 无新增用户可见 UI                              |

## 4. 验证结果

| 命令 / 检查      | 结果                | 备注                                                                                     |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm lint:code` | Passed              | oxlint diagnostics 通过                                                                  |
| `pnpm lint`      | Failed              | `oxfmt --check` 仍列出 33 个既有格式问题；`routeTree.gen.ts` 已从 formatter scripts 排除 |
| `pnpm typecheck` | Passed              | `tsc --noEmit` 通过                                                                      |
| `pnpm build`     | Passed with warning | Vite build 通过；保留 chunk size warning                                                 |
| residual scan    | Passed              | 无当前架构旧栈残留                                                                       |

## 5. UI 状态覆盖

| 状态    | 结果      | 备注                                     |
| ------- | --------- | ---------------------------------------- |
| Loading | Unchanged | 页面状态逻辑未改                         |
| Empty   | Unchanged | 页面状态逻辑未改                         |
| Error   | Unchanged | not-found component 仍由 root route 引用 |
| Success | Unchanged | 页面成功态未改                           |

## 6. 剩余风险

- `pnpm lint` 仍被既有 repo-wide format debt 阻塞，需要单独格式化或调整格式门禁范围。
- `pnpm build` 保留既有 bundle size warning，可后续通过 route-level code splitting 或 chunk 策略处理。
