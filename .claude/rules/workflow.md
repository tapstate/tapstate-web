---
paths:
  - "docs/workflow/**/*.md"
  - "AGENTS.md"
  - "CLAUDE.md"
---

# Tapstate Workflow Rules

- 非微小需求先写 spec，再按需写 prototype，再写 plan，再实现，最后写 acceptance。
- 每个需求使用一个 feature 文件夹：`docs/workflow/features/YYYY-MM-DD-slug/`。
- Feature 文件夹内放 `spec.md`、`prototype.md`、`plan.md`、`acceptance.md`，模板来自 `docs/workflow/templates/`。
- Spec 负责原始输入、目标、非目标、需求拆解、状态矩阵和验收标准。
- Prototype 负责布局、交互、响应式、四态和评审结论。
- Plan 负责小步实现、TDD / 验证策略、执行进度、调试记录和 review 记录。
- 执行中每完成一步都要更新 step 状态、文件头进度和 Progress Log。
- 不把计划、验收和调试结论只留在聊天记录里。
