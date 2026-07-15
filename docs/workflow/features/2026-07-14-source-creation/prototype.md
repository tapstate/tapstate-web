# Source Creation Prototype

> 状态：Approved
> 日期：2026-07-14
> Owner：xufei@tapdata.io
> Feature folder：docs/workflow/features/2026-07-14-source-creation/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

恢复企业工作台壳层，并把 Source 创建做成紧凑、可扫描、由 connector schema 驱动的真实工作流。

## 2. 页面 / 交互范围

覆盖 route layout、Source 真实列表、创建 dialog、connector selector、动态 config form、提交与状态反馈。不覆盖测试连接、schema discovery、编辑和删除。

## 3. 布局线框

```text
Login:                         Protected routes:
┌──────────────────────┐      ┌──────────┬───────────────────────────┐
│ LoginView only       │      │ Sidebar  │ Header                    │
│ no app navigation    │      │          ├───────────────────────────┤
└──────────────────────┘      │          │ Sources page              │
                              │          │  toolbar + create          │
                              │          │  list / empty / error      │
                              └──────────┴───────────────────────────┘

Create source dialog:
┌─────────────────────────────────────────────┐
│ Create source                          [x]  │
│ Source ID        [____________________]     │
│ Connector        [PostgreSQL          v]   │
│ Mode             [snapshot            v]   │
│ Connection configuration                    │
│ Host             [____________________]     │
│ Port             [5432________________]     │
│ Password         [••••••••____________]     │
│                       [Cancel] [Create]      │
└─────────────────────────────────────────────┘
```

## 4. 关键交互

| 触发 | 页面反馈 | 结果 |
|---|---|---|
| 打开受保护 route | layout 常驻，内层 RouterView 切页 | 菜单/header 不丢失 |
| 打开创建 dialog | 加载 connector summaries | 可选 connector |
| 切换 connector | 清理旧 config，加载 detail，应用默认值 | 动态字段稳定替换 |
| 控制字段变化 | 根据 `visibleWhen.equalsAnyOf` 显隐 | 隐藏字段不提交 |
| 提交 | 主按钮固定尺寸并进入 loading | 成功刷新，失败保留输入 |

## 5. 状态覆盖

| 状态 | 表现 | 操作 | 文案 key |
|---|---|---|---|
| Loading | table skeleton / dialog spinner | 等待 | `sources.states.loading` |
| Empty | 单一空态 + Create source | 创建 | `sources.states.empty` |
| Error | alert + Retry | 重试 | `sources.errors.load` |
| Success | 真实 Source rows | 选择、创建 | `sources.create.success` |

## 6. 响应式规则

- Desktop：dialog 640px 内，字段单列，列表保持现有工作台密度。
- Tablet：dialog 宽度 `calc(100vw - 32px)`，layout 保持现有 sidebar 行为。
- Mobile：字段、footer actions 满宽可换行，表格横向滚动，不压缩输入控件。

## 7. 控件密度与视觉决策

| 控件 / 区域 | 默认规则 | 本次选择 | 依据 | 是否例外 |
|---|---|---|---|---|
| Create dialog | Element Plus dialog | 640px、10px radius、单层 | 配置字段可扫描，不做 nested cards | 否 |
| Dynamic fields | Element Plus form controls | 单列、稳定 label、secret reveal | 企业配置工作流 | 否 |
| Connector choice | Select | icon/name/group 可扫描 | 77+ connector 不适合卡片墙 | 否 |
| Primary action | icon + text button | Create source | 明确命令 | 否 |

## 8. 评审记录

| 时间 | Reviewer | 结论 | 备注 |
|---|---|---|---|
| 2026-07-14 | PO | Approved and instructed implementation | 路由承载 layout；Source config 需基于 PDK connection property 机制重新设计。 |
