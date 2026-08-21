# UI Design Guidelines Governance

> 状态：Ready for implementation
> 日期：2026-08-20
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-20-ui-design-guidelines/
> 对应 prototype：N/A（文档治理变更，不产出页面或交互原型）
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：仓库级 UI 代码生成与审查规则

## 1. Intake

### 用户原始输入

> 把 下面这份 设计规范 放到 UI_DESIGN_GUIDELINES.md 然后 结合 AGENTS.md 引用确保生成 ui 的时候按照这个规范来
>
> [用户随后提供了 UI Design & Code Generation Guidelines，包含 Anti-Slop、布局间距、排版密度、颜色对比、微交互和表单规则。]

### 背景与上下文

仓库已有企业级 UI、shadcn / Linear 工作台和 Tailwind 约束，但 AI 生成 UI 时还缺少一份集中、可引用的反低质生成规范。需要把用户提供的设计规范沉淀为仓库根目录的长期规则，并在 AGENTS.md 中建立强制引用，使后续生成和审查 UI 时都能发现并拒绝常见的 AI Slop 模式。

### 假设

- UI_DESIGN_GUIDELINES.md 放在仓库根目录，作为 UI 生成规则的单一入口。
- 规范适用于新增 UI、修改 UI、代码审查和原型转实现；与更具体的产品需求或既有设计系统冲突时，agent 必须显式记录冲突并采用已确认的产品 / 设计决策。
- 本次只做文档与 agent 规则治理，不修改应用代码、依赖、locale 或构建配置。

### 未决问题

- 无。

## 2. Decomposition

### 目标

- 新增完整的 UI_DESIGN_GUIDELINES.md。
- 在 AGENTS.md 的 Read Order 和 UI / Product Gates 中显式引用并强制执行该规范。
- 明确生成 UI 前的检查、生成后的反模式扫描和冲突处理方式。
- 通过文档检查确认链接、章节和工作流记录完整。

### 非目标

- 不重构现有组件或页面。
- 不新增 Tailwind、UI 组件或其他生产依赖。
- 不改动 docs/engineering/design-system.md 的既有 token 定义。
- 不新增 i18n key，不启动本地页面，不做视觉回归。

### 用户路径

1. Agent 接收 UI 生成或修改需求。
2. Agent 按 AGENTS.md Read Order 阅读根目录 UI_DESIGN_GUIDELINES.md。
3. Agent 在设计、实现和审查阶段执行 Anti-Slop、间距、排版、颜色、交互状态和移动触控检查。
4. 若发现禁用模式或无法证明的视觉决策，agent 重新设计或在交付记录中说明例外与依据。

### 影响面

- IA / 路由：无。
- 状态管理：无。
- 数据 / API：无。
- 权限：无。
- i18n：无新增 key。
- 错误处理：无。
- Agent 规则：更新 AGENTS.md。
- 长期规范：新增根目录 UI_DESIGN_GUIDELINES.md。

### 备选方案

| 方案                              | 优点                   | 风险                             | 结论   |
| --------------------------------- | ---------------------- | -------------------------------- | ------ |
| 只把规范放入 AGENTS.md            | 查找路径短             | 规则与项目总说明混杂，后续难维护 | 不采用 |
| 只新增 UI_DESIGN_GUIDELINES.md    | 文档独立清晰           | agent 可能不会主动读取           | 不采用 |
| 独立规范文件 + AGENTS.md 强制引用 | 可维护、可发现、可执行 | 多一个文档入口，需要保持链接稳定 | 采用   |

## 3. Prototype Gate

- [ ] 需要 prototype，见：N/A
- [x] 不需要 prototype，原因：本次只新增文本规范和 agent 规则，不改变页面布局、IA、路由或交互。

## 4. UI / IA Sketch

N/A。此 feature 不产出用户界面。

## 5. 状态矩阵

| 状态    | 页面表现                            | 用户可做什么                     | 文案 key |
| ------- | ----------------------------------- | -------------------------------- | -------- |
| Loading | N/A                                 | N/A                              | N/A      |
| Empty   | N/A                                 | N/A                              | N/A      |
| Error   | N/A                                 | N/A                              | N/A      |
| Success | 文档和 AGENTS.md 引用存在且内容一致 | 后续 agent 可按规范生成和审查 UI | N/A      |

## 6. i18n 范围

无新增或变更的 locale key。本次为开发者 / agent 文档，不属于应用用户可见文案。

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：N/A。

## 8. 验收标准

- [ ] 根目录存在 UI_DESIGN_GUIDELINES.md，并包含用户提供的 Anti-Slop、布局、排版、颜色、交互和表单规则。
- [ ] AGENTS.md 在 Read Order 中要求生成或审查 UI 前阅读该文件。
- [ ] AGENTS.md 明确该规范是强制门禁，并要求发现违规时拒绝或重新生成低质量 UI。
- [ ] 文档链接、Markdown 结构和 git diff 检查通过。

## 9. 风险

- 规则与后续更具体的产品设计稿可能产生局部冲突；通过在 AGENTS.md 中要求显式记录例外来控制风险。
- 文字规范无法完全替代视觉验收；后续真实 UI feature 仍需按仓库要求做桌面 / 移动视口检查。
