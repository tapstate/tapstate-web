# Cyntex Login And Authentication

> 状态：Approved for implementation
> 日期：2026-07-14
> Owner：
> Feature folder：docs/workflow/features/2026-07-14-login-auth/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/src/router`、`apps/web/src/i18n`、`apps/web/src/stores`、new login view

## 1. Intake

### 用户原始输入

> [$ui] cyntex-web Add a login page with a strong emphasis on aesthetics and craftsmanship. It should avoid looking like a generic AI-generated template or a standard, interchangeable design.
>
> The login experience should feel clean, refined, and thoughtfully designed — something that conveys taste and attention to detail. Users should feel a sense of comfort and enjoyment when interacting with it, rather than simply viewing it as a functional entry point.
>
> 然后 [$think] 开始对接cyntex 的鉴权

### 背景与上下文

`cyntex-web` 当前默认直接进入工作台，没有登录 route 或 session store。Cyntex Java control plane 已提供 `POST /auth/login`，请求体为 `{ username, password }`，成功响应为 `{ token }`；`/api/**` 通过 `Authorization: Bearer <token>` 保护。零用户时存在仅 loopback 可用的 `POST /auth/bootstrap`，它不是普通注册入口。

产品定位是面向海外的数据实时同步产品，为 AI 提供实时上下文，同时提供 CLI 和 Web 两个入口。登录是控制面入口，不是营销站注册页。

### 假设

- 登录页面面向 Cyntex 数据平台的操作员和分析工程师，而不是营销站访客。
- 前端与后端默认同源部署；开发环境通过 Vite proxy 指向 `http://localhost:8080`。
- 因后端当前只返回短期 bearer token，没有 HttpOnly refresh cookie，token 使用 `sessionStorage` 按 tab 隔离，拒绝 `localStorage` 的跨会话持久化；不把密码写入日志或持久化存储。
- 视觉方向先沿用现有工作台的语义 token 和 i18n 体系，但登录页可以拥有独立的首屏构图。

### 未决问题

- 字体不做强约束，先使用系统字体栈，避免为单个页面增加字体资产和网络依赖。

## 2. Decomposition

### 目标

- 增加可直接访问的 `/login` route，并阻止未认证用户进入工作台 route。
- 做一个有明确视觉观点的登录首屏，支持桌面和 375px 移动宽度。
- 接通真实 `POST /auth/login`，存储 token，给后续 `/api/**` 请求注入 bearer header。
- 覆盖 loading、validation、auth error、network error、success redirect 和 logout 清理。
- 所有用户可见文案同步 `en`、`zh-CN`、`zh-TW`。

### 非目标

- 不新增后端登录、OAuth、SSO、MFA 或密码重置协议。
- 不把 `/auth/bootstrap` 暴露成普通注册或“创建账号”按钮。
- 不在本 feature 内实现完整用户管理、租户切换或权限编辑。
- 不引入新的重型 UI、状态管理或网络客户端依赖。

### 用户路径

1. 用户访问工作台 route，前端发现没有有效 session，重定向到 `/login`。
2. 用户填写 username 和 password，看到稳定的 submitting 状态，表单不会跳动。
3. 登录成功后保存 token，进入 `/sources`；失败时在表单上下文显示不枚举用户的错误信息。
4. API 返回 401 时清理 session，并回到登录页，保留一次性 return target。

### 影响面

- IA / 路由：新增 `/login`，增加 authenticated route guard。
- 状态管理：新增 Pinia auth/session store，封装 token、principal 状态和 logout。
- 数据 / API：新增轻量 `authClient`，调用 `/auth/login`；统一 bearer 注入策略。
- 权限：只在前端做 session gate，后端仍是最终权限判断。
- i18n：新增登录、校验、提交、错误和辅助链接 key 到三套 locale。
- 错误处理：映射 `control.auth-failed`、`control.malformed-request`、网络不可达和过期 token。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 独立登录 route + Pinia session store + 原生 fetch | 与当前 Vue/Vite 栈一致，依赖最少，易测试 | 需自己处理 401 和 redirect | 推荐 |
| 在 `DefaultLayout` 内嵌登录抽屉 | 改动看似小 | 未认证页面仍加载工作台，视觉和路由边界混乱 | 拒绝 |
| 引入第三方 auth SDK | 可能快速接 OAuth | 与当前自有 token 契约冲突，增加供应商和 bundle 负担 | 拒绝 |

## 3. Prototype Gate

- [x] 需要 prototype，见：`./prototype.md`
- [ ] 不需要 prototype，原因：

## 4. UI / IA Sketch

```text
Desktop
┌─────────────────────────────────────────────────────────┐
│ Cyntex mark                         build / locale       │
│                                                         │
│  SIGNAL / CONTROL                  ┌─────────────────┐  │
│  Quiet data movement               │ Welcome back    │  │
│  enters here.                      │ username        │  │
│                                    │ password        │  │
│  small system note                 │ Sign in         │  │
│                                    └─────────────────┘  │
└─────────────────────────────────────────────────────────┘

Mobile
┌───────────────────────────────┐
│ Cyntex                  locale │
│ signal note                    │
│ Welcome back                   │
│ username                       │
│ password                       │
│ Sign in                        │
│ privacy / support              │
└───────────────────────────────┘
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 首屏骨架或静态内容，提交按钮显示进度但尺寸不变 | 等待或返回 | `auth.login.loading` |
| Empty | 初始空表单，不显示错误 | 输入凭据 | `auth.login.title` |
| Error | 字段旁校验，表单级 coded auth/network 错误 | 修正后重试 | `auth.login.errors.*` |
| Success | 短暂保持提交完成态后进入目标 route | 使用工作台 | `auth.login.success` |

## 6. i18n 范围

新增或变更的 locale key：

- `auth.login.*`
- `auth.validation.*`
- `auth.session.*`

必须同步：

- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
- `apps/web/src/i18n/locales/zh-TW.json`

## 7. 数据与接口

- 是否需要新接口：不需要，消费已有 `POST /auth/login`。
- 是否使用 mock：组件测试可以 mock `authClient`，生产路径不使用 mock。
- 错误码 / 错误文案：保留后端 `code`，前端只做安全的本地化映射，不显示用户名存在性。

## 8. 验收标准

- [ ] 未认证访问受保护 route 会进入 `/login`，登录成功进入 `/sources`。
- [ ] 正确凭据调用真实 `/auth/login`，后续 `/api/**` 请求带 bearer token。
- [ ] 错误、提交、过期 session 和网络不可达状态均可恢复，且不泄露用户名是否存在。
- [ ] 首屏在桌面和 375px 移动宽度无溢出、重叠或布局跳动。
- [ ] 三套 locale key 完整，`pnpm lint`、`pnpm typecheck`、`pnpm build` 通过。

## 9. 风险

- 后端 token 当前 TTL 为 15 分钟且只返回 token，不返回 expiry；前端只能依赖 401 做失效处理。
- 后端 token 当前 TTL 为 15 分钟且只返回 token，不返回 expiry；前端只能依赖 401 做失效处理。后续若增加 HttpOnly refresh cookie，应把前端 token 持久化降级为纯内存。
