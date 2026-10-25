# UI design entrypoint

Read [DESIGN.md](docs/engineering/DESIGN.md), the single page-composition and review authority, before UI work. [The handbook](docs/engineering/ui/README.md) routes the complete latest-source page/component/token study; [design-system.md](docs/engineering/design-system.md) records the APIs actually shipped here.

Select the closest task/page pattern, inspect the actual component and semantic roles, check local availability and [product differences](docs/engineering/ui/product-contracts.md), then supply the [source mapping and rendered review](docs/engineering/ui/authoring-review.md). Keep source analysis, runtime compatibility and visual acceptance distinct.

All agents and PRs use this same contract. Retire conflicting style defaults when the system changes. Run `pnpm ui:docs:check` for specification/catalog/export changes; it validates documentation consistency, not aesthetics or browser behavior.
