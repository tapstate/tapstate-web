# Visual Prop Decision Rules

> 状态：Accepted
> 日期：2026-07-08
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-08-visual-prop-decision-rules/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`docs/engineering/design-system.md`、`docs/workflow/templates/prototype.md`、`docs/workflow/templates/plan.md`

## 1. Intake

### 用户原始输入

> 像这种问题，如何通过文档准确约束？不仅是这个 size
>
> 可以先按这个方案来

### 背景与上下文

数据源连接状态筛选实现中曾为 Element Plus Select 添加 `size="small"`，但该选择没有来自用户需求、设计系统默认值、既有局部模式或 prototype 的明确依据。问题不只限于 `size`，也包括 `type`、颜色、圆角、高度、padding、图标等视觉 props / utility 的随手选择。

### 假设

- 长期默认规则应写入 `docs/engineering/design-system.md`。
- 每个 UI feature 的偏离默认依据应写入 `prototype.md`。
- 执行与 review 阶段应在 `plan.md` 模板中检查视觉 props 是否有依据。

### 未决问题

- 是否把视觉 props 扫描做成正式 lint rule：本次只记录为 review/checklist 约束，后续可评估自动化。

## 2. Decomposition

### 目标

- 明确 Element Plus 控件默认尺寸与 `small` / `large` 的允许场景。
- 建立视觉 props / utility 的证明责任：默认规则、既有模式或 prototype 依据。
- 在 prototype 模板中加入“控件密度与视觉决策”记录区。
- 在 plan 模板中加入视觉决策扫描和 review checklist。

### 非目标

- 不新增 ESLint rule 或自定义脚本。
- 不批量重构现有页面视觉实现。
- 不修改当前未关联 feature 的既有文档 lint 问题。

### 用户路径

1. Agent 接到 UI 需求时读取设计系统。
2. 若新增或修改视觉 props / utility，在 prototype 中记录默认规则、本次选择和依据。
3. 实现阶段按 plan 扫描 `size`、`type`、颜色、圆角、高度等高风险视觉捷径。
4. Review 阶段检查视觉选择是否有依据。

### 影响面

- IA / 路由：无。
- 状态管理：无。
- 数据 / API：无。
- 权限：无。
- i18n：无。
- 错误处理：无。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 只在设计系统写规则 | 长期规则清晰 | feature 执行时容易漏看 | 不单独采用 |
| 只在模板里加 checklist | 每次需求会看到 | 缺少长期默认值来源 | 不单独采用 |
| 设计系统 + prototype 记录 + plan review | 默认值、例外依据、执行检查形成闭环 | 文档稍多 | 采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：本次是文档流程与规范更新，不涉及产品 UI 布局、路由或交互原型。

## 4. UI / IA Sketch

N/A。

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | N/A | N/A | N/A |
| Empty | N/A | N/A | N/A |
| Error | N/A | N/A | N/A |
| Success | 文档规则和模板更新可被后续 feature 使用 | 在 prototype / plan 中记录视觉决策依据 | N/A |

## 6. i18n 范围

无新增 locale key。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：否。

## 8. 验收标准

- [x] 设计系统明确 Element Plus 默认控件尺寸为 32px，并说明 `small` / `large` 允许场景。
- [x] 设计系统明确视觉 props / utility 的依据来源和默认回退规则。
- [x] prototype 模板新增控件密度与视觉决策记录区。
- [x] plan 模板新增视觉决策扫描和 review checklist。
- [x] 本次修改的文档通过定向 markdown lint。

## 9. 风险

- 目前只靠文档和 review 执行；若后续仍高频出现无依据视觉 props，可追加 lint / AST 检查。
