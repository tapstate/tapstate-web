# TanStack File Route Architecture Cleanup Prototype

> 状态：Approved
> 日期：2026-07-26
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-26-file-route-architecture-cleanup/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

- 明确 route 文件命名、父子关系、redirect、auth layout 和 not-found 的目标行为。
- 证明本次是路由架构迁移，不是 UI 重设计。

## 2. 页面 / 交互范围

本原型覆盖：

- `/` -> `/sources` redirect。
- `/login` public route。
- `_authenticated` pathless layout。
- `/sources`、`/pipelines`、`/explorations` authenticated child routes。
- root not-found component。

本原型不覆盖：

- 页面视觉、组件布局、表格、表单、数据接口。

## 3. 布局线框

```text
RootRoute
├─ Providers
│  └─ Outlet
│
├─ /login
│  └─ LoginRouteComponent
│
├─ /
│  └─ beforeLoad redirect('/sources')
│
└─ _authenticated layout
   └─ AppShell + Outlet
      ├─ /sources
      ├─ /pipelines
      └─ /explorations
```

## 4. 源稿 / 设计保真边界

- 源稿 / 设计稿 / 导出代码：现有 React 页面实现。
- 必须保持一致的区域：URL、redirect、auth guard、not-found、页面组件入口。
- 允许为适配当前工程调整的区域：route 文件导出方式和 File Route 命名。
- 明确禁止新增到产品 UI 的内容：路由调试面板、测试按钮、preview toggle。
- QA / debug / preview control 的承载方式：命令行验证和源码检查，不进入产品界面。

## 5. 关键交互

| 触发                  | 页面反馈                           | 结果              |
| --------------------- | ---------------------------------- | ----------------- |
| 打开 `/`              | 执行 route beforeLoad redirect     | 进入 `/sources`   |
| 未登录访问 `/sources` | authenticated layout 触发 Navigate | 进入 `/login`     |
| 已登录访问 `/sources` | AppShell 渲染 child outlet         | 显示 Sources 页面 |
| 打开未知路径          | root not-found component           | 显示 404 页面     |

## 6. 状态覆盖

| 状态    | 表现                            | 操作         | 文案 key |
| ------- | ------------------------------- | ------------ | -------- |
| Loading | 保持 child 页面现有 loading     | 等待         | 现有 key |
| Empty   | 保持 child 页面现有 empty       | 页面现有操作 | 现有 key |
| Error   | 保持 child 页面现有 error / 404 | 返回或重试   | 现有 key |
| Success | 页面成功态不变                  | 正常使用     | 现有 key |

## 7. 响应式规则

- Desktop：AppShell 和各页面现有规则不变。
- Tablet：现有规则不变。
- Mobile：现有规则不变。

## 8. 控件密度与视觉决策

| 控件 / 区域 | 默认规则       | 本次选择 | 依据               | 是否例外 |
| ----------- | -------------- | -------- | ------------------ | -------- |
| N/A         | 不新增 UI 控件 | 不改视觉 | 本次为路由架构迁移 | 否       |

## 9. 原型资产

- Markdown wireframe：见本文。
- HTML 原型：N/A。
- 截图：N/A。
- 设计稿链接：N/A。

## 10. 评审记录

| 时间       | Reviewer | 结论                        | 备注                                   |
| ---------- | -------- | --------------------------- | -------------------------------------- |
| 2026-07-26 | Codex    | Approved for implementation | 用户已明确要求 File Route 和旧文档清理 |
