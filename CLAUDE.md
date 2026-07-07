@AGENTS.md

## Claude Code Notes

- 这个仓库的共享规则以 `AGENTS.md` 为准，Claude Code 通过本文件导入，避免 Codex / Claude Code 两套规则漂移。
- 按项目 agent 流程工作：intake → decompose/spec → prototype → plan → TDD / implement → review → acceptance。
- 较大的 UI、IA、路由、数据流改动先进入 plan mode：先建立 `docs/workflow/features/YYYY-MM-DD-slug/`，补齐 `spec.md`，按需补 `prototype.md`，再写 `plan.md`，最后记录 `acceptance.md`。
- 如果产品意图不清楚，先产出可评审的 spec 草案；不要直接把模糊想法实现成页面。
- Claude Code 必须按本仓库 `docs/workflow/` 流程执行，不把计划、验收和调试结论只留在聊天记录里。
