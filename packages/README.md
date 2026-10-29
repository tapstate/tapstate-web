# packages

Workspace 内部共享包。企业级 monorepo 在这里放跨 app 复用的东西:

- `packages/ui` — Web 和 Cloud 共用的组件与 design token package (`@tapstate-web/ui`)
- `packages/shared` — 纯工具 / 公共类型 / 从后端契约生成的 client
- `packages/design-tokens` — 设计 token(色板、间距、字号)单源

按需新建,初期可保持为空。每建一个包:加 `package.json`(name 带 `@tapstate-web/` scope)+ `tsconfig.json` extends 根 `tsconfig.base.json`。
