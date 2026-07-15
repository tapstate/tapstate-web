# tapstate-web Agent Instructions

## Goal

把这个仓库当作企业级前端产品来研发。Agent 的首要目标不是“尽快写出页面”，而是把需求输入、需求拆解、原型、实现计划、实现、审查和验收串成一条可追踪闭环。

## Read Order

每次开始需求前，先按需阅读这些文件：

1. `README.md`：仓库结构、启动与门禁命令。
2. `docs/README.md`：文档地图和放置规则。
3. `docs/workflow/README.md`：项目研发流程和阶段门禁。
4. 当前任务的 `docs/workflow/features/<date>-<slug>/`。没有时先创建。
5. `docs/product/information-architecture.md`：仅当需求触及 IA、一级导航、路由分组或产品对象边界时阅读。
6. `docs/engineering/tech-stack.md`：仅当需求触及依赖、构建、i18n、测试策略或工程约束时阅读。

无论使用 Codex、Claude Code 还是其他 agent，都必须按本仓库的 `docs/workflow/` 流程执行。

## Required Workflow

1. Intake：建立或定位 `docs/workflow/features/<date>-<slug>/`，把用户原始需求、上下文、假设和未决问题写进 `spec.md`；不要只留在聊天里。
2. Decompose：把需求拆成目标、非目标、用户路径、状态、数据、i18n、验收标准和风险。
3. Prototype：UI / IA / 路由 / 复杂交互改动必须先有同一 feature 文件夹下的 `prototype.md` 或原型链接；纯逻辑小改可在 `spec.md` 中说明跳过原因。
4. Plan：开始写代码前必须有同一 feature 文件夹下的 `plan.md`，使用 `docs/workflow/templates/plan.md`。
5. Implement：按 plan 小步推进，完成一步就更新 step 状态、文件头进度和 Progress Log；不要把未计划的大重构混进去。
6. TDD / tests：涉及业务逻辑、状态流、工具函数或可测试交互时，先定义失败用例或验收检查，再实现。
7. Debug：遇到失败时走系统化调试：复现、定位、提出假设、做最小实验、记录结论。
8. Review：完成后做代码审查姿态的自检，优先找 bug、回归风险、缺失测试和 UI 状态遗漏。
9. Accept：把验证命令、UI 检查、验收结论、剩余风险写回同一 feature 文件夹下的 `acceptance.md`，交付时引用 feature 文件夹、spec、plan 和 acceptance。

## Frontend Rules

- 使用 Vue 3 Composition API。
- 遵循 strict TypeScript；避免 `any`，除非需求文档解释原因。
- Element Plus 是默认组件库；不要为了单个页面引入新的重型 UI 依赖。
- 样式入口必须分层：`main.css` 只汇总 import，Tailwind 放 `tailwind.css`，Element Plus 覆盖放 `element-plus.css`，应用语义样式放 `app.css`。
- Tailwind v4 显式使用 `@layer theme, base, components, utilities;`；自定义默认样式放 `@layer base`，应用语义 class 放 `@layer components`，确保 utilities 能覆盖默认样式。
- Element Plus 覆盖优先用官方 CSS 变量和组件级 CSS 变量；只有变量无法表达时才写具体 `.el-*` class。
- UI 风格按 `docs/engineering/design-system.md` 的 shadcn / Linear 产品工作台规范收敛：语义 token 优先、Element Plus 变量优先、状态完整、信息密度清晰；`--radius` 为 `0.625rem`，Tailwind `rounded-lg` 映射到 `var(--radius)`，表单控件 / 按钮 / Select trigger 等默认控件圆角按 `rounded-lg` / `var(--radius)` 即 `10px` 落地。
- 图标优先用现有图标库或 Element Plus 图标，不手写一次性复杂 SVG。
- 页面应该是企业产品工作台气质：信息密度清晰、布局稳定、操作路径短，不做营销式 hero。
- 固定格式区域要有稳定尺寸约束，例如表格、工具栏、侧栏、状态卡、画布容器。
- 避免裸字符串、单语言文案、临时 mock 文案进主干。
- 不做无关重构；发现坏味道可记录到需求文档的 follow-up。

## Product Gates

- Spec 必须写清楚原始输入、目标、非目标、用户路径、状态矩阵、i18n 范围和验收标准。
- Prototype 必须写清楚布局、交互、响应式、四态和评审结论；UI / IA / 复杂交互改动不能跳过。
- Plan 必须写清楚受影响文件、执行步骤、验证命令、风险、回滚/降级策略、进度字段和 Progress Log。
- UI 页面必须考虑 loading、empty、error、success 四态；表单还要考虑 disabled、validation、submitting。
- 用户可见文案必须走 `vue-i18n`，同步更新 `en`、`zh-CN`、`zh-TW` 三套 locale key。
- 涉及视觉布局时，启动本地页面并做桌面 / 移动视口检查；检查文字不溢出、元素不重叠、空态和错误态可用。

## Verification Policy

验证按风险分级选择，不要求每次小改都跑完整构建。

### Level 1：轻量改动

适用：单点 UI 微调、图标 / 按钮入口替换、局部 class、默认文案、少量 i18n key、无数据流和构建链路变化。

建议验证：

```sh
pnpm lint
pnpm typecheck
```

可按需补充 `rg` 残留检查或源码对照。通常不跑 `pnpm build`。

### Level 2：中等改动

适用：组件结构变化、多个文件联动、表单交互、状态切换、i18n 与 Element Plus locale 联动、需要实际页面确认的 UI 行为。

建议验证：

```sh
pnpm lint
pnpm typecheck
pnpm dev
```

做必要的桌面 / 移动目检。只有改动触及构建产物、路由懒加载、依赖、Vite 配置或打包边界时才跑 `pnpm build`。

### Level 3：高风险改动

适用：新增页面 / 路由、依赖或构建配置变化、样式入口变化、跨模块重构、数据契约 / 权限 / 业务流程变化。

建议验证：

```sh
pnpm lint
pnpm typecheck
pnpm build
```

必要时再补浏览器自动化或截图检查。

若命令失败，先判断是否由本次改动导致；不要回滚用户已有改动。把失败原因和下一步写清楚。

## Handoff

交付时说明：

- Feature 文件夹路径，以及 spec、prototype、plan、acceptance 状态。
- Plan 的状态、进度、当前步骤和下一步。
- 改了哪些核心文件。
- 跑了哪些验证命令，结果如何。
- 还剩哪些风险或后续项。
