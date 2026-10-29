# Tapstate Web Docs

> 作用：给人和 agent 一个稳定的产品与工程文档地图。

## 目录约定

```text
docs/
├── README.md
├── product/
│   └── information-architecture.md
└── engineering/
│   ├── DESIGN.md                    normative visual specification
│   ├── design-system.md             tokens and shared component contract
│   ├── overlay-conventions.md       overlay behavior and focus rules
│   ├── tech-stack.md                technical choices and engineering gates
│   ├── local-cloud-preview.md       local frontend proxy to explicit Cloud and Cluster origins
│   └── ui/                          source atlas, foundations, page/component/token catalogs and review procedure
```

## 放置规则

- 一级导航、产品对象边界、菜单 IA、稳定的产品决策：放在 `docs/product/`。
- 技术栈、依赖策略、i18n、测试、构建、工程约束和长期设计系统规范：放在 `docs/engineering/`。
- 具体需求的范围、风险和验证结果保留在 issue、PR 或交付说明中；稳定的长期结论再回写产品 / 工程文档。

UI work reads `engineering/DESIGN.md` first, then `engineering/design-system.md`;
overlay and engineering procedures are maintained in their linked documents.

Detailed source evidence and reading routes are indexed in [the UI handbook](engineering/ui/README.md). Reference study and shipped component revisions are explicitly separate.
