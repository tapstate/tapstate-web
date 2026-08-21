# Formily Ant Design v6 Renderer Migration Acceptance

> 日期：2026-08-20
> Feature folder：docs/workflow/features/2026-08-20-formily-antd-v6/
> Spec：[./spec.md](./spec.md)
> Prototype：[./prototype.md](./prototype.md)
> Plan：[./plan.md](./plan.md)
> Reviewer：Codex

## 1. 验收结论

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

实现和代码级验证完成。本地 Vite 已可用，但 Source 路由在没有已登录会话时会重定向到登录页，desktop / mobile 目检待补。

## 2. 验收标准对照

| 验收标准                                | 结果                  | 备注                                                                                                                                                                                                       |
| --------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adapter 与 AntD v6 peer resolution      | Passed with follow-up | React 19 / AntD 6 peer 满足；显式统一 Formily runtime，避免 workspace bridge 与 adapter 出现重复 context。`@formily/grid@2.3.7` 仅对 TypeScript 6 声明旧 peer range，typecheck / build 都通过              |
| 完整 schema adapter registry            | Passed                | 自动注册全部可作为 `x-component` 渲染的 adapter 导出，并兼容 `InputNumber → NumberPicker`；仅 configured secret 与 JSON array 使用业务 renderer；hooks、contexts 与命令式 dialog/drawer factory 被正确排除 |
| Formily layout                          | Passed                | `FormLayout` 显式使用 `vertical`，保证 form item 采用单列布局                                                                                                                                              |
| create / edit 的业务专用字段无回归      | Passed                | 44 个组件测试覆盖 secret、array 初始值回填、reset、validation、完整 registry 与 dialog paths                                                                                                               |
| Formily namespace 与 shadcn token 对齐  | Passed                | 共享 `FormilyAntdProvider` 使用业务无关的 `tap-formily` namespace；10px 圆角、颜色、边框、focus ring 均映射到既有 shadcn 语义 token                                                                        |
| Formily Radio.Group 与 shadcn 对齐      | Passed                | 共享 `FormilySegmentedRadioGroup` 复用 button-group 的 `bg-muted`、`border-border`、10px 圆角与选中态；不显示 AntD radio-button                                                                            |
| shadcn 未受 AntD 全局 reset 影响        | Passed                | 未引入 reset；AntD `ConfigProvider` 仅包裹动态字段区，dialog shell 和操作继续使用 shadcn                                                                                                                   |
| Connector spec messages 模板解析        | Passed                | parser 按当前 i18next locale 从 `messages` 读取文案，递归解析 `title` / `tooltip` / `description`，支持混合文本；未知 key 和 `x-component` 等非文案字段保持原样                                            |
| 配置表单信息层级与用户命名              | Passed                | 移除重复的 `Connection configuration` / metadata subtitle；create / edit 的 `Source ID` 用户可见标签改为 `Name`，内部 `sourceId` / API `id` 不变                                              |
| 创建成功反馈                          | Passed                | 不再渲染 `Source … created` 页面提示块；创建后的缓存更新、选中资源和关闭弹窗流程保持不变                                                                                       |
| desktop / mobile 无溢出或 layering 问题 | Pending visual check  | 本地 Vite 已启动，但 Source 路由需要已登录会话才能完成实际目检                                                                                                                                             |

## 3. 源稿 / 设计保真对照

| 对照项                  | 结果                    | 备注                            |
| ----------------------- | ----------------------- | ------------------------------- |
| 标题 / toolbar / 主操作 | Passed by source review | 保持 source dialog shadcn shell |
| 页面布局与区域层级      | Passed by source review | 仅替换字段区域                  |
| 交互入口                | Passed by source review | 返回、关闭、提交不改            |
| 未引入源稿外产品 UI     | Passed by source review | 禁止 AntD page-level UI         |

## 4. 验证结果

| 命令 / 检查                                                                                                                                                                                                                       | 结果                               | 备注                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter web test -- features/sources/connector-spec-formily-schema.test.ts features/sources/connector-formily-renderer.test.tsx features/sources/connector-formily.test.ts features/sources/source-create-dialog.test.tsx` | Passed                             | 14 files, 49 tests; includes active i18next locale resolution, localized schema templates, and native Password renderer regression |
| `pnpm --filter @tapstate-web/formily test`                                                                                                                                                                                        | Passed                             | 1 file, 2 tests                                                                                                                    |
| `pnpm typecheck`                                                                                                                                                                                                                  | Passed                             | workspace packages passed                                                                                                          |
| 2026-08-21 scoped locale re-verification                                                                                                                                                                                          | Passed                             | 14 files, 49 tests; `typecheck`、scoped `oxlint` / `oxfmt --check` / `git diff --check` all passed                                 |
| 2026-08-21 source dialog information hierarchy                                                                                                                                                                                    | Passed                             | Removed the redundant connection intro block; user-facing Source ID labels and duplicate-name validation now use Name terminology; internal API fields unchanged                         |
| `pnpm build`                                                                                                                                                                                                                      | Passed                             | new dependency bundles successfully                                                                                                |
| `pnpm --filter web i18n:check`                                                                                                                                                                                                    | Passed                             | locale keys match                                                                                                                  |
| `pnpm peers check`                                                                                                                                                                                                                | Passed with follow-up              | `@formily/grid@2.3.7` TypeScript peer range is stale against installed TypeScript 6.0.3                                            |
| scoped `oxlint` / `oxfmt --check` / `git diff --check`                                                                                                                                                                            | Passed                             | migration files are linted, formatted, and patch-safe                                                                              |
| `pnpm lint`                                                                                                                                                                                                                       | Blocked by pre-existing formatting | root 50 and web 33 pre-existing formatting mismatches, none are migration files                                                    |
| 桌面视口检查                                                                                                                                                                                                                      | Pending visual check               | Source route redirects to login without local session                                                                              |
| 移动视口检查                                                                                                                                                                                                                      | Pending visual check               | Source route redirects to login without local session                                                                              |

## 5. UI 状态覆盖

| 状态    | 结果                                       | 备注                                                         |
| ------- | ------------------------------------------ | ------------------------------------------------------------ |
| Loading | Passed by source and component test review | existing schema loader remains outside Formily boundary      |
| Empty   | Passed by source review                    | fields absence introduces no page-level AntD UI              |
| Error   | Passed by component test review            | FormItem feedback and existing request error remain separate |
| Success | Passed by source review                    | existing submit completion route unchanged                   |

## 6. 剩余风险

- 未完成实际浏览器目检前，不标记 Accepted。
- Formily runtime singleton 依赖 Vite `resolve.dedupe` 与 `react-is@19` peer alignment，后续若新增另一个 Formily UI adapter，必须复用这一约束。
- AntD 增加了生产 chunk 体积，当前构建仍有既有的 500 kB chunk warning；如 Source dialog 成为首屏路径，后续评估懒加载 dynamic form renderer。
