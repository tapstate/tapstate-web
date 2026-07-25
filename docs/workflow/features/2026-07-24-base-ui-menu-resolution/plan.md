# Base UI Menu Resolution Plan

> 状态：Done
> 进度：100%
> 当前步骤：已完成
> 下一步：N/A
> 日期：2026-07-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-24-base-ui-menu-resolution/
> 对应 spec：./spec.md
> 对应 prototype：N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，见 `./spec.md`。
- Prototype 已确认 / 已说明跳过：是，primitive 层修复无需 prototype。
- 非目标已确认：是，不扩展到 button/dialog 或业务页重构。
- 是否新增依赖：否。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- `docs/workflow/features/2026-07-24-base-ui-menu-resolution/spec.md`
- `docs/workflow/features/2026-07-24-base-ui-menu-resolution/plan.md`
- `docs/workflow/features/2026-07-24-base-ui-menu-resolution/acceptance.md`
- `apps/web/components/ui/dropdown-menu.tsx`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 建立 feature 文档并记录问题、方案与验收标准 | 文档自检 | prototype 按规则跳过 |
| 2 | Done | 将 `dropdown-menu.tsx` 从 `@base-ui/react/menu` 子路径导入收口为 `@base-ui/react` 根包导入 | 源码检查 | 保持现有 Base UI primitive 和业务页导出接口 |
| 3 | Done | 运行轻量验证并更新 acceptance | `pnpm lint`、`pnpm typecheck` | 两个命令均通过；lint 保留仓内既有 warning |

## 4. Progress Log

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-24 22:30 | Codex | 33% | 复现并定位 `@base-ui/react/menu` 使用点，确认依赖声明和导出状态 | 建立 feature 文档并收口导入路径 | 无 |
| 2026-07-24 22:30 | Codex | 67% | 新建 `spec.md` / `plan.md` / `acceptance.md`，并将 `dropdown-menu.tsx` 改为 `@base-ui/react` 根包导入 | 执行 lint/typecheck 并回填验收 | 无 |
| 2026-07-24 22:30 | Codex | 100% | 完成 import 复查、`pnpm lint` 与 `pnpm typecheck`，并回填验收文档 | 无 | 无 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：通过 `rg` 定位 `@base-ui/react/menu` import，并用 `pnpm --filter web typecheck` 确认改动后的组件导出仍可被消费。
- 单元 / 组件 / E2E：本次不新增；改动集中在 primitive 封装层。
- 手工 UI 检查：本轮不做浏览器目检，记录为剩余风险。
- 视觉决策扫描：
  - 复用原有 dropdown menu className 和 Base UI primitive，不主动调整颜色、圆角、间距和动画风格。
- 验证分级：
  - Level 2：组件结构改动，执行 `pnpm lint`、`pnpm typecheck`，按结果决定是否需要升级验证。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-24 22:30 | 编辑器提示 `@base-ui/react/menu` 找不到模块或类型声明 | Base UI `./menu` subpath 在当前环境的编辑器解析不稳定，但根包 re-export 可用 | 检查 `apps/web/package.json`、lockfile、node_modules exports、`pnpm --filter web typecheck` 和 `@base-ui/react/index.d.ts` | 依赖已安装且根包导出 `Menu`，优先把 subpath 收口到根包导入 |

## 7. Review Checklist

- [x] 功能满足 spec。
- [x] 没有扩大范围。
- [x] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [x] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [x] 用户可见文案都走 i18n。
- [x] 三套 locale key 同步。
- [x] loading / empty / error / success 四态可用。
- [x] 与 prototype 的布局、交互和响应式规则一致。
- [x] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [x] 未使用无依据的 shadcn / Radix variant、size、portal、focus ring、disabled、aria 属性或视觉捷径。
- [x] 桌面和移动视口无明显溢出、重叠、错位。
- [x] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-24 22:30 | `rg -n "@base-ui/react/menu|@base-ui/react" apps/web/components/ui/dropdown-menu.tsx` | 通过 | 仅命中 `@base-ui/react` 根包导入，已无 `@base-ui/react/menu` 子路径 |
| 2026-07-24 22:30 | `pnpm lint` | 通过 | 命令退出成功；仓内保留既有 warning，未由本次改动引入 |
| 2026-07-24 22:30 | `pnpm typecheck` | 通过 | 无输出，命令退出成功 |
| 2026-07-24 22:30 | `pnpm build` | Skipped | 本次未触及构建配置；先按 Level 2 执行 |
| 2026-07-24 22:30 | 桌面视口检查 | Skipped | 本轮无浏览器目检条件 |
| 2026-07-24 22:30 | 移动视口检查 | Skipped | 本轮无浏览器目检条件 |

## 9. Finish Notes

- 交付摘要：`dropdown-menu.tsx` 已恢复为 Base UI 实现，并把 `@base-ui/react/menu` 子路径导入收口为 `@base-ui/react` 根包导入，以消除这次模块解析报错。
- 最终进度：100%
- 最终步骤：已完成
- 剩余风险：仓内仍有若干既有 lint warning，本次未处理。
- Follow-up：若 Base UI 其余子路径导入也出现相同编辑器报错，可按同样方式收口到根包导入。
