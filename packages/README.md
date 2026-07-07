# packages

Workspace 内部共享包(预留)。企业级 monorepo 在这里放跨 app 复用的东西:

- `packages/ui` — 基于 Element Plus 的二次封装组件库(对应 §3.9.2 `@tap/*` 的演进)
- `packages/shared` — 纯工具 / 公共类型 / 从后端契约生成的 client
- `packages/design-tokens` — 设计 token(色板、间距、字号)单源

按需新建,初期可保持为空。每建一个包:加 `package.json`(name 带 `@cyntex-web/` scope)+ `tsconfig.json` extends 根 `tsconfig.base.json`。
