# TanStack File Route Architecture Cleanup Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：处理既有 repo-wide format debt，或按需继续做 route smoke UI 检查
> 日期：2026-07-26
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-26-file-route-architecture-cleanup/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是。
- Prototype 已确认 / 已说明跳过：是，见 `./prototype.md`。
- 非目标已确认：不改 URL、页面视觉、API、权限语义或 i18n 文案。
- 是否新增依赖：是，预期新增 `@tanstack/router-plugin` devDependency。
- 是否影响 IA / 权限 / 数据契约：只影响路由实现；IA、权限和数据契约不变。

## 2. 受影响文件

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `apps/web/vite.config.ts`
- `apps/web/app/router.tsx`
- `apps/web/app/routeTree.gen.ts`
- `apps/web/app/route-tree.tsx`
- `apps/web/app/routes/*.tsx`
- `.agents/skills/tapstate-workflow/SKILL.md`
- `README.md`
- `docs/engineering/tech-stack.md`
- `docs/workflow/features/`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动                                                     | 验证                      | 备注                                                          |
| ---- | ---- | -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| 1    | Done | 建立 feature spec / prototype / plan                     | 文档存在                  | 保留用户原始输入                                              |
| 2    | Done | 确认 File Route API、依赖和现有 route 文件               | `rg` / package inspect    | `createFileRoute()` 已在当前 `@tanstack/react-router` 可用    |
| 3    | Done | 新增 TanStack Router plugin 并更新 Vite 配置             | `pnpm --filter web build` | 用户指定 `pnpm config set trustPolicy off --local` 后安装成功 |
| 4    | Done | route 文件改为 `createFileRoute()` / `createRootRoute()` | `pnpm --filter web build` | URL 语义保持                                                  |
| 5    | Done | 删除手写 route tree 和旧文档残留                         | residual scan             | 清掉误导性历史                                                |
| 6    | Done | 运行验证并写 acceptance                                  | lint / typecheck / build  | Level 3；lint 剩既有 format debt                              |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间                 | Actor | 进度 | 已完成                                                                                                                                                       | 下一步            | 阻塞 |
| -------------------- | ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---- |
| 2026-07-26 17:00 CST | Codex | 10%  | 建立需求文档闭环，确认 scope 和验收标准                                                                                                                      | 迁移路由实现      | 无   |
| 2026-07-26 21:22 CST | Codex | 75%  | 安装 `@tanstack/router-plugin`，Vite 接入 File Route 生成器，route 文件迁移为 `Route = createFileRoute(...)`，删除旧手写 route tree，移除旧 feature 历史目录 | 验证与 acceptance | 无   |
| 2026-07-26 21:40 CST | Codex | 100% | 撤回误加的 `.prettierignore`，改为在 oxfmt scripts 排除 TanStack 生成文件；typecheck/build 通过，lint 剩既有 format debt                                     | 交付              | 无   |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：
  - `rg "from './route-tree'|createRoute\\(|当前手写 route tree|router-plugin.*blocked|Vue 3 Composition API|Element Plus|Pinia|vinext" active targets` 应无当前架构残留。
- 单元 / 组件 / E2E：本次不新增业务逻辑测试；用 TypeScript / build 验证 generated route tree 和 route 类型链路。
- 手工 UI 检查：本次不改 UI；若 dev server 可用，做基础 route smoke check。
- 视觉决策扫描：不新增 UI props / utility。
- 验证分级：Level 3。触及路由生成链路、Vite 配置和依赖。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
| ---- | ---- | ---- | ---- | ---- |
|      |      |      |      |      |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [ ] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [ ] 未使用无依据的 shadcn / Radix variant、size、portal、focus ring、disabled、aria 属性或视觉捷径。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间                 | 命令 / 检查      | 结果                | 备注                                                                       |
| -------------------- | ---------------- | ------------------- | -------------------------------------------------------------------------- |
| 2026-07-26 21:39 CST | `pnpm lint`      | Failed              | `oxlint` 通过；`oxfmt --check` 仍发现 33 个既有非本次架构文件格式问题      |
| 2026-07-26 21:39 CST | `pnpm typecheck` | Passed              | `tsc --noEmit` 通过                                                        |
| 2026-07-26 21:39 CST | `pnpm build`     | Passed with warning | Vite build 通过；保留既有 chunk size warning                               |
| 2026-07-26 21:31 CST | residual scan    | Passed              | active docs/app 中无手写 route tree、Vue/Element/Pinia/vinext 当前约束残留 |

## 9. Finish Notes

- 交付摘要：路由已迁移到 TanStack Router File Routes，Vite plugin 生成 `routeTree.gen.ts`，旧手写 route tree 和历史 feature 文档目录已移除。
- 最终进度：100%。
- 最终步骤：已完成。
- 剩余风险：repo-wide formatter 仍有既有债务；bundle size warning 仍存在。
- Follow-up：单独处理全仓 oxfmt 格式债或引入代码分割策略。
