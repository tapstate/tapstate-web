---
paths:
  - 'apps/web/app/**/*.tsx'
  - 'apps/web/components/**/*.tsx'
  - 'apps/web/features/**/*.tsx'
  - 'apps/web/**/*.ts'
  - 'apps/web/styles/**/*.css'
  - 'apps/web/i18n/locales/*.json'
  - 'apps/cloud/app/**/*.tsx'
  - 'apps/cloud/app/**/*.ts'
  - 'apps/cloud/app/styles/**/*.css'
---

# Frontend UI rules

Read root `AGENTS.md` and `docs/engineering/DESIGN.md` for the shared contract. The detailed source study is routed by `docs/engineering/ui/README.md`; component behavior comes from the actual shipped `packages/ui` public subpaths.

- Follow the matching scene and closest source-page pattern before composing UI. Record source revision, API compatibility, adaptations and rendered evidence through `ui/authoring-review.md`.
- Use available semantic tokens and the actual component geometry. There is no global radius, row-height, icon-size or alternate visual framework default.
- Keep app-owned shell, logo, navigation, accent and approved glass, plus the local overlay and assistant adaptations in `ui/product-contracts.md`.
- Keep copy in i18next and maintain en/zh-CN/zh-TW. Keep state and persistence with the existing application/feature owners.
- Use the same documentation gate and page/interaction review as every other agent. A source scan, build or component import does not establish visual acceptance.
