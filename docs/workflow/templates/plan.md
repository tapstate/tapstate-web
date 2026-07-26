# <Plan Name>

> 状态：Draft
> 进度：0%
> 当前步骤：未开始
> 下一步：
> 日期：YYYY-MM-DD
> Owner：
> Feature folder：docs/workflow/features/YYYY-MM-DD-kebab-name/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md 或 N/A
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：
- Prototype 已确认 / 已说明跳过：
- 非目标已确认：
- 是否新增依赖：
- 是否影响 IA / 权限 / 数据契约：

## 2. 受影响文件

-

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| 1    | Todo |      |      |      |
| 2    | Todo |      |      |      |
| 3    | Todo |      |      |      |

## 4. Progress Log

每次执行 plan 时都更新本表。不要只把进度留在聊天记录里。

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
| ---- | ----- | ---- | ------ | ------ | ---- |
|      |       | 0%   |        |        |      |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：
- 单元 / 组件 / E2E：
- 手工 UI 检查：
- 视觉决策扫描：
  - 按需检查 shadcn / Radix 组件 variant、size、asChild、portal、focus ring、disabled、aria 属性，以及自定义高度 / padding / 圆角 / 颜色 / 阴影等是否都有 prototype 或 design-system 依据。
- 验证分级：
  - Level 1：轻量改动，源码静态检查、`rg`、`pnpm lint`、`pnpm typecheck`；通常不跑 `pnpm build`。
  - Level 2：中等交互 / UI 改动，Level 1 + 本地页面手工目检；触及构建边界时才跑 `pnpm build`。
  - Level 3：高风险 / 构建相关改动，Level 1 + `pnpm build`，必要时加浏览器自动化 / screenshot。

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

| 时间 | 命令 / 检查      | 结果              | 备注                       |
| ---- | ---------------- | ----------------- | -------------------------- |
|      | `pnpm lint`      |                   |                            |
|      | `pnpm typecheck` |                   |                            |
|      | `pnpm build`     | Skipped / Pending | 按风险决定；跳过时写明理由 |
|      | 桌面视口检查     |                   |                            |
|      | 移动视口检查     |                   |                            |

## 9. Finish Notes

- 交付摘要：
- 最终进度：
- 最终步骤：
- 剩余风险：
- Follow-up：
