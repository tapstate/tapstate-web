# Tapstate Web Docs

> 作用：给人和 agent 一个稳定的文档地图。需求细节先进入 feature 文件夹，长期稳定的产品 / 工程结论再沉淀到对应目录。

## 目录约定

```text
docs/
├── README.md
├── product/
│   └── information-architecture.md
├── engineering/
│   ├── design-system.md
│   └── tech-stack.md
└── workflow/
    ├── README.md
    ├── branch-pr-flow.md
    ├── templates/
    └── features/
```

## 放置规则

- 新需求、需求拆解、原型、执行计划、验收记录：放在 `docs/workflow/features/YYYY-MM-DD-slug/`。
- 流程规则、模板、阶段门禁：放在 `docs/workflow/`。
- 从同步主干、开分支到提交 PR 的开发者日常流程：放在 `docs/workflow/branch-pr-flow.md`。
- 一级导航、产品对象边界、菜单 IA、稳定的产品决策：放在 `docs/product/`。
- 技术栈、依赖策略、i18n、测试、构建、工程门禁、长期设计系统规范：放在 `docs/engineering/`。

## 最小闭环

每个非微小需求至少包含：

1. `spec.md`
2. `plan.md`
3. `acceptance.md`

UI、IA、路由或复杂交互需求还必须包含 `prototype.md`，或在 `spec.md` 说明为什么可以跳过。
