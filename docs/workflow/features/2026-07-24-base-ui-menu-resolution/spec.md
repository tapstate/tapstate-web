# Base UI Menu Resolution

> 状态：Ready
> 日期：2026-07-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-24-base-ui-menu-resolution/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/components/ui/dropdown-menu.tsx`

## 1. Intake

### 用户原始输入

> 找不到模块“@base-ui/react/menu”或其相应的类型声明

### 背景与上下文

`apps/web/components/ui/dropdown-menu.tsx` 当前依赖 `@base-ui/react/menu`。仓库锁文件和本地安装中虽然存在 `@base-ui/react` 的 `./menu` subpath`，但用户当前遇到的是这条 subpath 的模块/类型声明报错。Base UI 根包本身会 re-export `Menu`，因此可以在不改 primitive 基座的前提下，避开这条更脆弱的子路径导入。

### 假设

- 用户希望消除 `@base-ui/react/menu` 的模块找不到报错。
- 本次修复应尽量保持现有业务页 `DropdownMenu*` 调用方式不变。
- Base UI 根包导出 `Menu` 命名空间，足以覆盖当前 `dropdown-menu.tsx` 的类型和运行时需求。

### 未决问题

- 无。

## 2. Decomposition

### 目标

- 移除 `dropdown-menu.tsx` 对 `@base-ui/react/menu` 子路径的依赖。
- 继续提供当前业务页所需的 `DropdownMenu*` API。
- 保持现有 Base UI primitive 实现不变，仅修正导入路径。

### 非目标

- 不在本次顺手重写 `button.tsx` 或 `dialog.tsx`。
- 不调整业务页菜单文案、信息架构或交互路径。
- 不新增 i18n key、接口或状态流。

### 用户路径

1. 开发者打开 `dropdown-menu.tsx`，不再看到 `@base-ui/react/menu` 的模块/类型报错。
2. 业务页继续通过 `DropdownMenu`、`DropdownMenuTrigger`、`DropdownMenuContent`、`DropdownMenuItem` 等组件渲染菜单。
3. 用户仍可打开菜单并触发既有菜单项操作。

### 影响面

- IA / 路由：无变更。
- 状态管理：无变更。
- 数据 / API：无变更。
- 权限：无变更。
- i18n：无新增或修改 locale key。
- 错误处理：无新增错误分支。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 继续保留 `@base-ui/react/menu` 子路径导入 | 运行时与现状一致 | 继续暴露在当前编辑器解析问题下 | 不采用 |
| 改为从 `@base-ui/react` 根包导入 `Menu` | 保持 Base UI 实现不变，改动最小，避开 subpath 解析 | 依赖根包的 re-export 稳定性 | 采用 |
| 将 `dropdown-menu.tsx` 切换到 `@radix-ui/react-dropdown-menu` | 能完全绕开 Base UI subpath | 超出这次原始诉求，改变 primitive 基座 | 不采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：本次为 primitive 层模块解析修复，不改业务 UI 结构、IA 或路由。

## 4. UI / IA Sketch

```text
N/A - no intentional layout or IA changes
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 无新增变化，沿用现有页面状态 | 打开或等待菜单所在页面 | N/A |
| Empty | 无新增变化 | 继续使用菜单触发器 | N/A |
| Error | 消除编辑器中的模块解析错误 | 继续开发 | N/A |
| Success | 菜单 primitive 可解析且业务页继续使用 | 打开菜单并选择操作 | N/A |

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

- [ ] `apps/web/components/ui/dropdown-menu.tsx` 不再导入 `@base-ui/react/menu` 子路径。
- [ ] 现有 `DropdownMenu*` 导出仍能被业务页类型检查通过。
- [ ] `pnpm lint` 与 `pnpm typecheck` 通过，且无本次改动引入的新问题。

## 9. 风险

- `button.tsx` 与 `dialog.tsx` 仍保留 `@base-ui/react/*` 子路径导入，未来如果编辑器同样报错，可能需要做同类收口。
- 未在浏览器中逐页目检菜单行为，本次主要通过类型和静态检查控制风险。
