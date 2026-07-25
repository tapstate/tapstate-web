# FormEvent Deprecation Warning

> 状态：Ready
> 日期：2026-07-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-24-formevent-deprecation-warning/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/app/routes/login.tsx`

## 1. Intake

### 用户原始输入

> FormEvent 弃用提醒

### 背景与上下文

React 19 类型定义将 `FormEvent` 和 `FormEventHandler` 标记为 deprecated，因为它们不对应真实 DOM 事件。当前登录页的 `submit` 处理函数显式依赖 `FormEvent<HTMLFormElement>`，会在编辑器和类型检查上下文中持续产生弃用提醒。

### 假设

- 用户希望消除 React 19 下的 `FormEvent` 弃用提醒。
- 本次修复不应改变登录页的提交流程、校验或跳转行为。
- 本次改动属于类型级维护，不需要新增依赖或 UI 调整。

### 未决问题

- 无。

## 2. Decomposition

### 目标

- 移除登录页对 deprecated `FormEvent` 类型的显式依赖。
- 保持现有登录提交逻辑和表单状态行为不变。
- 用最小改动方式兼容当前 React 19 类型定义。

### 非目标

- 不重构登录表单结构。
- 不调整验证、鉴权 API 或错误态文案。
- 不处理与 `FormEvent` 无关的其他类型或 UI 问题。

### 用户路径

1. 开发者打开登录页代码，不再看到 `FormEvent` 的 deprecated 提示。
2. 用户在登录页输入凭据并提交表单。
3. 表单继续按现有逻辑执行校验、提交、错误处理和成功跳转。

### 影响面

- IA / 路由：无新增或变更。
- 状态管理：无变更，仍使用现有本地 state 与 auth store。
- 数据 / API：无变更，仍调用 `login()`。
- 权限：无变更。
- i18n：无新增或修改 locale key。
- 错误处理：无行为变更，保留现有 `formError` 处理。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 将提交函数参数改为 `SyntheticEvent<HTMLFormElement>` | 与实际使用一致，只需 `preventDefault()`，改动最小 | 事件语义比 submit 专属类型更宽 | 采用 |
| 显式改为 `SubmitEvent` 相关组合类型 | 更贴近原生 submit 事件 | 需要额外处理 React 合成事件兼容，改动更重 | 不采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：纯类型维护改动，不涉及 UI、IA、路由或复杂交互调整。

## 4. UI / IA Sketch

```text
N/A - no visual or layout changes
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 无新增变化，沿用现有登录提交 loading 态 | 等待提交完成 | N/A |
| Empty | 无新增变化，沿用现有初始表单态 | 输入用户名和密码 | N/A |
| Error | 无新增变化，沿用现有错误提示 | 修改输入并重试 | N/A |
| Success | 无新增变化，沿用现有登录成功跳转 | 进入 `/sources` | N/A |

## 6. i18n 范围

新增或变更的 locale key：

- 无。

必须同步：

- `apps/web/i18n/locales/en.json`
- `apps/web/i18n/locales/zh-CN.json`
- `apps/web/i18n/locales/zh-TW.json`

本次无需修改上述文件。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：无变更。

## 8. 验收标准

- [ ] `apps/web/app/routes/login.tsx` 不再显式使用 deprecated `FormEvent` 类型。
- [ ] 登录表单提交仍保留 `preventDefault()`、校验、提交、错误处理和成功跳转逻辑。
- [ ] `pnpm lint` 与 `pnpm typecheck` 通过，且无本次改动引入的新问题。

## 9. 风险

- React 19 其余 deprecated 表单事件别名未来可能在其他文件再次出现，需要单独治理。
- 若后续将 submit 处理逻辑扩展为依赖原生 submit 事件细节，可能需要进一步收窄事件类型。
