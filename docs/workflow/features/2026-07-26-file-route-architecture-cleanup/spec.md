# TanStack File Route Architecture Cleanup

> 状态：Approved
> 日期：2026-07-26
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-26-file-route-architecture-cleanup/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/app/router.tsx`, `apps/web/app/routes/`, `apps/web/vite.config.ts`, active architecture docs

## 1. Intake

### 用户原始输入

> 把历史文件去掉，路由按照 File Route 来做。另外旧的文档清洗掉。现在技术架构完全重构了

### 背景与上下文

当前仓库已经迁移到 React 19 + Vite + TanStack Router，但路由仍处于过渡态：route 源文件放在 `apps/web/app/routes/`，实际 `routeTree` 由 `apps/web/app/route-tree.tsx` 手写生成。用户明确要求按照 TanStack File Route 落地，并清理旧架构文档残留，避免 Vue / Element Plus / Pinia / vinext / 手写 route tree 等历史叙述继续误导当前架构。

### 假设

- 保持现有 URL 行为不变：`/` redirect 到 `/sources`，`/login` 为公开页，`/sources` / `/pipelines` / `/explorations` 仍在 authenticated layout 下。
- “历史文件”优先指当前 active code 中的手写 route-tree 过渡文件，以及会误导当前架构判断的旧文档残留。
- 本次只迁移路由架构和文档事实，不重新设计 IA、导航、页面视觉或数据契约。

### 未决问题

- 无阻塞问题；按当前需求直接执行。

## 2. Decomposition

### 目标

- 使用 TanStack Router 官方 File Route API 和生成 route tree。
- 删除手写 `apps/web/app/route-tree.tsx` 过渡文件。
- 将 route 文件改为 `createFileRoute()` / `createRootRoute()` 形态。
- 在 Vite 配置中启用 TanStack Router plugin，使 `routeTree.gen.ts` 成为生成产物。
- 清理 active docs / repo skill 中旧栈或过渡态表述。

### 非目标

- 不改 URL、权限语义、页面内容、i18n 文案或后端 API。
- 不引入 Next / vinext / React Router。
- 不重写历史业务需求的产品结论，除非它们作为 active workflow 事实会误导当前架构。

### 用户路径

1. 用户访问 `/`，仍被重定向到 `/sources`。
2. 未登录用户访问 authenticated 页面，仍跳到 `/login`。
3. 已登录用户访问 `/sources`、`/pipelines`、`/explorations`，看到原页面内容和 shell。
4. 开发者新增页面时，直接在 `apps/web/app/routes/` 增加 File Route 文件，由插件生成 route tree。

### 影响面

- IA / 路由：路由实现从手写 route tree 切换为 TanStack File Route 生成链路；URL 保持不变。
- 状态管理：无变更，继续使用 Zustand。
- 数据 / API：无变更。
- 权限：无变更，仍由 authenticated layout 读取 auth store。
- i18n：无新增用户可见 key；文档清理不涉及 locale。
- 错误处理：not found 仍通过 root route 的 notFoundComponent 展示。

### 备选方案

| 方案                                         | 优点                                                                       | 风险                                   | 结论   |
| -------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | ------ |
| TanStack Router plugin + `createFileRoute()` | 符合用户指定的 File Route；新增路由无需维护手写 route tree；类型链路更标准 | 需要新增 devDependency 并更新 lockfile | 采用   |
| 继续 file-based 目录 + 手写 route tree       | 改动最小                                                                   | 与用户要求冲突，继续留下过渡债         | 不采用 |
| 改用其他路由库                               | 无                                                                         | 违背架构选型                           | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：N/A

## 4. UI / IA Sketch

```text
/
└─ __root.tsx
   ├─ index.tsx                 -> redirect /sources
   ├─ login.tsx                 -> public login page
   └─ _authenticated.tsx        -> auth guard + AppShell
      ├─ _authenticated.sources.tsx
      ├─ _authenticated.pipelines.tsx
      └─ _authenticated.explorations.tsx
```

## 5. 状态矩阵

| 状态    | 页面表现                              | 用户可做什么     | 文案 key |
| ------- | ------------------------------------- | ---------------- | -------- |
| Loading | 保持各页面现有 loading 表现           | 等待数据加载     | 现有 key |
| Empty   | 保持各页面现有 empty 表现             | 根据页面入口操作 | 现有 key |
| Error   | 保持各页面现有 error / not-found 表现 | 重试或导航       | 现有 key |
| Success | 现有页面成功态不变                    | 正常使用工作台   | 现有 key |

## 6. i18n 范围

新增或变更的 locale key：

- 无。

必须同步：

- N/A

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：无变更。

## 8. 验收标准

- [ ] `apps/web/app/router.tsx` 引入生成的 `routeTree.gen`，不再引入手写 `route-tree`。
- [ ] route 文件使用 TanStack File Route API，active app code 不再使用手写 `createRoute()` route tree。
- [ ] `apps/web/vite.config.ts` 启用 TanStack Router plugin。
- [ ] 手写 `apps/web/app/route-tree.tsx` 被移除。
- [ ] active docs 和 repo-scoped skill 不再宣称当前为手写 route tree / router-plugin blocked，也不保留 Vue / Element Plus / Pinia / vinext 作为当前架构约束。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过，或失败原因被确认不是本次改动导致。

## 9. 风险

- TanStack Router plugin 引入会修改 lockfile；需要确认 pnpm trust gate 不阻塞。
- File Route 命名与 pathless layout 语义需要谨慎处理，避免 authenticated layout URL 改变。
- 生成文件可能需要纳入版本控制，否则类型检查无法在 fresh checkout 中稳定通过。
