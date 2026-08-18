# Source Workbench CRUD

> 状态：Approved
> 日期：2026-08-18
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-18-source-workbench/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/features/sources/`, `apps/web/service/source-client.ts`, `apps/web/app/routes/`

## 1. Intake

### 用户原始输入

> 现在的进展呢？优先完成 Source 模块前后端的实现

### 背景与上下文

Tapstate 后端已经把 Source CRUD 投影到 artifacts 真相源，返回结构化 `SourceView` 和 quoted ETag。Web 端当前只有列表和创建雏形，不能读取详情、编辑、删除，也没有把 secret 和并发控制合同完整传递到 API。

### 假设

- Web 只消费 JSON `SourceView`，不读写 YAML。
- `SourceView` 是投影，不在前端复制一份 store。
- 第一版编辑覆盖 metadata、mode、catalog config、typed table selectors、SRS；`options`、table options、`experimental` 原样保留且不新增编辑控件。
- 创建时 options / experimental 为空。

### 未决问题

- 无阻塞问题；Pipeline UI 和 runtime observation 延后。

## 2. Decomposition

### 目标

- 完成 Source list/detail/create/update/delete 的 JSON client。
- 编辑时使用当前 quoted ETag，通过 `If-Match` 保存。
- secret 只显示 configured 状态；omit 保留，显式 clear 才删除。
- 删除冲突展示后端排序后的 referrer ids，不级联删除 Pipeline。
- 提供 loading、empty、error、success、validation、submitting、disabled 状态，并适配窄屏。

### 非目标

- 不实现 Pipeline CRUD、运行时状态、连接测试、同步、数据预览。
- 不支持修改 Source id 或 connector，不实现跨 connector 迁移。
- 不在表单中编辑 options、table options、experimental。

### 用户路径

1. 在 `/sources` 浏览 Source 列表，创建新的 connector-backed Source。
2. 选择一个 Source 进入详情，在设置入口打开编辑器。
3. 修改允许字段并保存；若 ETag 过期，保留草稿并提示 reload/retry。
4. 打开危险操作确认框删除；若 Source 被 Pipeline 引用，展示 referrer ids 并保持原页面。

### 影响面

- IA / 路由：新增 `/sources/$id` 详情路由，保留 `/sources`。
- 状态管理：TanStack Query 作为服务边界缓存，Zustand 继续提供认证 fetcher。
- 数据 / API：补齐 `/api/sources` GET/POST/PUT/DELETE 和 ETag/If-Match。
- 权限：沿用 `apiFetch` 的认证和 401 跳转。
- i18n：新增文案必须同步三套 locale。
- 错误处理：保留后端 `code`、`params`、`status`，按 Source 错误码映射 UI。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
| ---- | ---- | ---- | ---- |
| 复用 SourceView + typed editor | 与 artifacts 投影合同一致，CLI/Web 共用真相 | 编辑器需要处理 secret 和 selector 类型 | 采用 |
| 前端维护独立 Source store | 交互简单 | 与 artifacts 真相分叉，容易覆盖并发更新 | 不采用 |
| 直接提交 YAML | 可复用 CLI 文本 | Web 合同泄漏存储格式，secret/ETag 难以安全表达 | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md
- [ ] 不需要 prototype，原因：N/A

## 4. UI / IA Sketch

```text
/sources
┌───────────────┬──────────────────────────────────────────────┐
│ source list   │ all sources / empty / loading / error        │
│ search        │                                              │
└───────────────┴──────────────────────────────────────────────┘

/sources/:id
┌──────────────────────────────────────────────────────────────┐
│ back · icon · id · connector · configured secret · actions   │
├──────────────────────────────────────────────────────────────┤
│ tables / configuration / SRS projection                       │
└──────────────────────────────────────────────────────────────┘

edit dialog
┌──────────────────────────────────────────────────────────────┐
│ immutable id + connector                                     │
│ metadata · mode · catalog fields · table selectors · SRS     │
│ secret configured / replace / clear                          │
│ cancel · save (If-Match)                                     │
└──────────────────────────────────────────────────────────────┘
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
| ---- | -------- | ------------ | -------- |
| Loading | skeleton/spinner，动作禁用 | 等待或返回 | `sources.states.loading` |
| Empty | 无 Source 的引导卡 | 创建 Source | `sources.empty.*` |
| Error | API 错误和 Retry | 重试或返回 | `sources.states.error` |
| Success | 投影详情、配置和 selector | 编辑、删除、返回 | `sources.details.*` |
| Validation | 字段级错误 | 修正表单 | `sources.edit.validation.*` |
| Submitting | 保存/删除 spinner，关闭禁用 | 等待请求完成 | `sources.edit.submitting` |
| Conflict | 412 保留草稿并给 reload/retry | 重载或再次保存 | `sources.edit.errors.conflict.*` |
| In use | 409 展示 referrer ids | 关闭对话框 | `sources.delete.errors.inUse` |

## 6. i18n 范围

新增或变更的 locale key：

- `sources.detail.*`
- `sources.edit.*`
- `sources.delete.*`

必须同步：

- `apps/web/i18n/locales/en.json`
- `apps/web/i18n/locales/zh-CN.json`
- `apps/web/i18n/locales/zh-TW.json`

## 7. 数据与接口

- 是否需要新接口：否，使用已落地 SourceController。
- 是否使用 mock：否；Pipeline mock 不在本 feature 范围。
- 错误码 / 错误文案：`source.not-found`、`source.version-conflict`、`source.precondition-required`、`source.in-use`、`source.already-exists`。

## 8. 验收标准

- [ ] Web client 能正确解析 list/detail/create/update/delete，并保留 ETag 与结构化错误。
- [ ] 编辑请求携带 quoted `If-Match`；412 不丢草稿，支持 reload/retry。
- [ ] secret value 不回填；omit 保留，clear 显式删除。
- [ ] 删除前确认；`source.in-use` 展示排序后的 referrer ids，不级联删除。
- [ ] Source 页面覆盖 loading/empty/error/success/validation/submitting/disabled 和 375px 窄屏。
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm i18n:check`、`pnpm build` 通过；完成人工桌面和窄屏检查。

## 9. 风险

- Connector catalog 字段可能比当前基础 schema 更丰富；未知字段必须保持协议兼容而不是静默丢弃。
- 详情页和编辑器共享表单时要避免把配置 secret 写回 payload。
- 远端 ETag 冲突需要保留本地草稿，不能用 query invalidate 直接覆盖。
