# Tapstate Web Workflow

> 状态：项目级工作流
> 作用：把“需求输入 -> 需求拆解 -> 原型 -> 计划 -> 实现 -> 审查 -> 验收”落到一个可追踪 feature 闭环。

## 1. 设计原则

本仓库采用 feature-centric 文档结构：一个需求一个 feature 文件夹，需求意图、原型、执行计划、验收记录放在一起。这样比按 `specs/`、`plans/`、`acceptance/` 分散存放更接近现代前端项目与 AI 研发流程的主流做法，也更方便 Codex、Claude Code、reviewer 和后续维护者追踪上下文。

本流程参考但不绑定任何插件：

- [GitHub Spec Kit](https://github.com/github/spec-kit)：specify -> plan -> tasks -> implement，强调 spec 先于代码。
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD)：按需求复杂度引入 PM、架构、开发、QA 等结构化角色与门禁。
- [Superpowers](https://github.com/obra/superpowers)：强调技能化、计划执行、TDD、系统化调试、代码审查与完成验证。

Tapstate Web 的固定主线是：

```text
intake -> spec -> prototype -> plan -> implement -> review -> acceptance
```

其中 `plan.md` 同时承担执行进度账本，不再单独维护一份 plan progress 文件。

## 2. 文件落点

```text
docs/workflow/
├── README.md
├── templates/
│   ├── spec.md
│   ├── prototype.md
│   ├── plan.md
│   └── acceptance.md
└── features/
    └── YYYY-MM-DD-kebab-name/
        ├── spec.md              # 需求输入与拆解
        ├── prototype.md         # UI / IA / 复杂交互原型，可按规则跳过
        ├── plan.md              # 实现计划、执行进度、调试与验证记录
        ├── acceptance.md        # 验收结论
        └── assets/              # 可选：草图、截图、HTML 原型、录屏
```

命名要求：

- feature 文件夹使用 `YYYY-MM-DD-kebab-name`。
- 同一个需求的所有文档都放在同一个 feature 文件夹。
- feature 内部互链优先用 `./spec.md`、`./prototype.md`、`./plan.md`、`./acceptance.md`。
- 小修可以只补 `spec.md` + `plan.md` + `acceptance.md`；UI、IA、路由、复杂交互必须有 `prototype.md` 或在 `spec.md` 写明跳过原因。

## 3. 文档边界

常读入口：

- `README.md`：仓库结构、启动命令、质量门禁。
- `docs/README.md`：文档地图。
- `docs/workflow/README.md`：本流程与阶段门禁。
- `docs/workflow/features/<date>-<slug>/`：当前需求的事实来源。

按需读取：

- `docs/product/information-architecture.md`：只有触及一级导航、路由分组、产品对象边界、菜单 IA 时读取或更新。
- `docs/engineering/tech-stack.md`：只有触及依赖、构建、i18n、测试策略、工程约束或架构选型时读取或更新。

不要把每个需求的细节写进 `docs/product/` 或 `docs/engineering/`。feature 里的结论稳定后，才把长期有效的产品或工程决策沉淀过去。

## 4. 阶段门禁



### G0 Intake

- 保留用户原始输入，不能只写 agent 总结。
- 记录上下文、假设、未决问题。
- 建立或定位 `docs/workflow/features/<date>-<slug>/spec.md`。



### G1 Decompose

- 拆出目标、非目标、用户路径、影响面、状态矩阵、i18n 范围、验收标准和风险。
- 至少列出一种备选方案，或说明为什么只有一个合理方案。
- 明确非目标，避免自动扩范围。



### G2 Prototype

- UI、IA、路由、复杂交互必须有 `prototype.md`。
- Prototype 覆盖布局、关键交互、四态、响应式、评审记录和原型资产。
- 迁移、还原、复刻类需求必须写清源稿 / 设计稿 / 导出代码的保真边界：哪些区域必须逐项一致，哪些调整是为了适配当前工程，哪些新增 UI 明确禁止。
- 四态覆盖是产品质量要求，不等于允许把 QA / debug / preview control 放进用户可见界面；任何验收辅助控件必须标明承载方式和隔离策略。
- 纯逻辑小改可以跳过，但必须在 `spec.md` 的 Prototype Gate 说明原因。



### G3 Plan

- 开始写代码前必须有 `plan.md`。
- 文件头包含 `状态`、`进度`、`当前步骤`、`下一步`。
- `Implementation Steps` 使用固定状态：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`。
- `Progress Log` 至少有初始化记录，后续每次执行都更新。
- 写清受影响文件、是否新增依赖、验证等级、验证命令、UI 检查、风险和回滚策略。
- 验证按风险选择：轻量改动通常只需源码检查、`pnpm lint`、`pnpm typecheck`；只有触及构建产物、依赖、路由懒加载、Vite 配置、样式入口或跨模块高风险改动时才要求 `pnpm build`。



### G4 Implement

- 按 plan 小步推进。
- 每完成一步，更新 step 状态、文件头进度和 `Progress Log`。
- 不混入无关重构、依赖升级、全仓格式化 churn。
- 涉及业务逻辑、状态流、工具函数或可测试交互时，先定义失败用例或验收检查，再实现。



### G5 Debug

失败时先记录：

1. 复现方式。
2. 观察到的现象。
3. 最小假设。
4. 最小实验。
5. 结论与下一步。

调试结论写进 `plan.md` 的 Debug Log，不只留在聊天记录。

### G6 Review

复查顺序：

1. 功能正确性。
2. 对照用户原始输入、设计稿、导出代码或既有页面，检查迁移 / 复刻保真度。
3. 检查需求范围是否被扩大，尤其是验收辅助、debug 控件、临时 preview control 是否误入产品 UI。
4. i18n 和 locale key 完整性。
5. loading / empty / error / success 四态。
6. 表单 disabled / validation / submitting。
7. 响应式、文字溢出、元素重叠、交互可达性。
8. 类型安全、lint，以及按风险决定是否 build。



### G7 Accept

- 建立或更新 `acceptance.md`。
- 逐条对照 `spec.md` 的验收标准。
- 迁移 / 复刻类需求必须记录源稿保真对照结论，不能只记录“页面能打开”。
- 记录验证命令、UI 检查、通过 / 带 follow-up 通过 / 退回修改的结论。
- 验证方式按风险分级：源码静态检查和本地命令能证明的，不升级到浏览器自动化；目检能证明的 UI 小差异，不强行使用 GUI / Chrome / Playwright。
- `pnpm build` 是高风险或构建相关改动的验证项，不是每个小改的默认必跑项；跳过时说明本次风险等级和理由。
- 写清剩余风险和 follow-up。



## 5. 与工具的关系

- Codex：读取 `AGENTS.md`，并使用 `.agents/skills/tapstate-workflow` 作为 repo skill。
- Claude Code：读取 `CLAUDE.md` 和 `.claude/rules/`。
- Superpowers：可以作为个人插件增强执行纪律；仓库流程本身不依赖它安装。

本仓库的事实来源永远是 `docs/workflow/`。插件只增强 agent 的行为，不替代仓库文档。

## 6. Branch And PR Flow

开发者认领 feature 后，从同步主干、开分支、补齐 feature 文档、实现、验证到提交 PR 的日常流程见 `./branch-pr-flow.md`。

这个流程是本文件阶段门禁的 GitHub 落地方式：

```text
issue/request -> branch -> feature docs -> implementation -> acceptance -> PR -> CI/review -> merge
```
