# Cyntex Login And Authentication Acceptance

> 日期：2026-07-14
> Feature folder：docs/workflow/features/2026-07-14-login-auth/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：

## 1. 验收结论

- [ ] Accepted
- [x] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| 未认证访问受保护 route 会进入 `/login` | Pass | route guard 已实现 |
| 正确凭据调用 `/auth/login` 并注入 bearer token | Partial | wire shape 与 store 完成；无有效账号见证 200 |
| 错误、提交、过期 session 和网络不可达可恢复 | Pass | coded 401、401 clear、network/protocol 分支均实现；2026-07-15 新设计下无效凭据交互复验通过 |
| 桌面和窄屏无溢出、重叠或跳动 | Pass | 1440×900、500px 实拍；2026-07-15 复验 1440×900 与 390px，右上角语言按钮不与 card 重叠 |
| 三套 locale 完整，lint/typecheck/build 通过 | Pass | changed-file lint、vue-tsc、Vite build |

## 3. 源稿 / 设计保真对照

| 对照项 | 结果 | 备注 |
|---|---|---|
| 标题 / 表单 / 主操作 | Pass | 对照用户草图，冷灰表单 + navy CTA |
| 页面布局与区域层级 | Pass | 左登录、右终端，移动端纵向排列 |
| 交互入口 | Pass | 登录、语言、密码可见性、退出登录 |
| 语言切换位置 | Pass | 已移出 card，改为页面右上角 EN/简/繁 分段按钮 |
| 未引入源稿外产品 UI | Pass | 未加入无协议的 OAuth / forgot password |

## 4. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| changed-file local ESLint | Pass | 全部变更源文件通过 |
| `vue-tsc -b` | Pass | 无输出 |
| local Vite build | Pass | 仅既有 warning |
| 桌面视口检查 | Pass | 1440×900，深色背景铺满视口，白色卡片悬浮层级正常 |
| 窄屏检查 | Pass | 500px，控件和命令未溢出 |
| `pnpm --filter web typecheck` | Pass | 2026-07-15 复跑 |
| scoped ESLint | Pass | 2026-07-15 复跑 `LoginView.vue` + auth/router 源文件 |
| `pnpm --filter web build` | Pass | 2026-07-15 复跑，仅既有 Rolldown pure annotation / chunk warning |
| 浏览器表单交互 | Pass | 无效凭据显示安全错误并停留 `/login` |
| 浏览器语言切换 | Pass | EN/简/繁 可切换，`aria-pressed` 正确，中文文案即时生效 |

## 5. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Pass | 按钮固定 48px，文案 / icon 替换 |
| Empty | Pass | 空表单 + 独立终端动画 |
| Error | Pass | inline validation + coded form alert |
| Success | Partial | route transition 已实现，待有效账号实测 |

## 6. 剩余风险

- 后端 token 无 expiry 字段，前端依赖 401 处理过期。
- 无有效测试账号，尚未人工见证成功登录与 `/sources` 跳转。
