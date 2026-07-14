# Cyntex Login And Authentication Plan

> 状态：In Progress
> 进度：95%
> 当前步骤：用户视觉确认与真实成功凭据验收
> 下一步：用户确认页面方向；获得有效账号后补一次成功登录实测
> 日期：2026-07-14
> Owner：
> Feature folder：docs/workflow/features/2026-07-14-login-auth/
> 对应 spec：./spec.md
> 对应 prototype：./prototype.md
> 验收记录：./acceptance.md

## 1. Scope Check

- Spec 已确认：是，产品语境、成功目标和非目标已确认
- Prototype 已确认 / 已说明跳过：是，首版被拒绝，最终按全屏深色背景 + 悬浮白色表单卡片修订
- 非目标已确认：是，不含 OAuth、SSO、MFA、bootstrap 注册和用户管理
- 是否新增依赖：不新增生产依赖，复用 Vue、Pinia、lucide、Element Plus 和原生 fetch
- 是否影响 IA / 权限 / 数据契约：影响前端路由守卫和 session 状态，不修改后端 wire contract

## 2. 受影响文件

- `apps/web/src/router/index.ts`
- `apps/web/src/stores/auth.ts`
- `apps/web/src/services/authClient.ts`
- `apps/web/src/views/LoginView.vue`
- `apps/web/src/App.vue` 或 layout gate 接缝
- `apps/web/src/i18n/locales/{en,zh-CN,zh-TW}.json`
- `apps/web/src/styles/app.css`，必要时补登录页专属语义 class
- 相关单元 / 组件测试文件

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态 | 改动 | 验证 | 备注 |
|---|---|---|---|---|
| 1 | Done | 冻结使用者、视觉方向、字体、API base URL 和 redirect 规则 | PO 评审 prototype | 海外实时同步与 AI 上下文产品，登录后进入 `/sources` |
| 2 | Done | 先写 auth session 失败测试，再接 `/auth/login` 和 401 清理 | session test、typecheck | token 使用 sessionStorage，不用 localStorage |
| 3 | Done | 新增 `/login` route、route guard 和受保护页面入口 | 路由源码、构建 | 登录成功固定进入 `/sources` |
| 4 | Done | 实现浅色表单 + CLI terminal、动画、三套 locale | changed-file lint、桌面/窄屏截图 | 用户草图为视觉参考 |
| 5 | Done | 串联真实 API proxy、错误状态和 logout | 8080 direct + 5173 proxy 均返回同一 coded 401 | 有效凭据成功态待账号 |
| 6 | In Progress | Review、补 acceptance、等待用户视觉确认 | 全部验证记录 | 未提交 PR |

## 4. Progress Log

| 时间 | Actor | 进度 | 已完成 | 下一步 | 阻塞 |
|---|---|---|---|---|---|
| 2026-07-14 | Codex | 10% | 完成仓库审查、后端契约核对和 feature intake 草案；PO 确认 Graphite Signal、8080 proxy、sessionStorage、`/sources` 入口 | 实现 auth client、session store、route guard | 后端无 expiry 字段，前端依赖 401 失效 |
| 2026-07-14 | Codex | 70% | 完成鉴权、route guard、三套 i18n 和首版 Graphite 页面 | 浏览器评审 | PO 视觉拒绝首版 |
| 2026-07-14 | Codex | 95% | 按用户草图改成浅色表单 + CLI glass terminal，补打字动画、reduced-motion 和 route transition；桌面/窄屏实拍通过 | 用户视觉确认、有效账号成功登录 | 无有效测试账号 |
| 2026-07-14 | Codex | 95% | 将右侧折线光带替换为连续 blurred liquid field，移除同心圆，terminal 增加 pointer tilt + glass shine；复跑 lint/typecheck/build | 用户视觉确认、有效账号成功登录 | 无有效测试账号 |
| 2026-07-14 | Codex | 95% | 根据最终反馈删除液态色场、glass shine、backdrop filter 和 pointer tilt；页面改为全屏深色背景上的悬浮白卡片 | 用户视觉确认、有效账号成功登录 | 无有效测试账号 |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：auth client 成功解析 `{ token }`、401 映射、network failure、route guard redirect、logout 清理。
- 单元 / 组件 / E2E：优先 Vitest 或现有测试工具；若仓库尚无组件测试基础，先用纯函数测试和浏览器手工检查，不引入新测试框架仅为登录页。
- 手工 UI 检查：桌面宽度、375px、键盘 Tab 顺序、password reveal、错误长文案、三套语言。
- 视觉决策扫描：检查输入/按钮例外尺寸、glass 仅限终端工具、无 `transition: all`、所有 icon button 有 accessible label、reduced-motion 可用。
- 验证分级：Level 3，高风险，涉及新 route、权限门和数据流，必须运行 `pnpm lint`、`pnpm typecheck`、`pnpm build`，并启动 `pnpm dev` 做桌面 / 移动检查。

## 6. Debug Log

| 时间 | 现象 | 假设 | 实验 | 结论 |
|---|---|---|---|---|
| 2026-07-14 | 当前访问 `/` 直接进入 `/pipelines` | 尚无前端 session gate | 读取 router 和 App shell | 确认需要新增 route guard |
| 2026-07-14 | 首版颜色与内页品味不一致 | Graphite Signal 把产品误读为运维值班面 | 对照用户草图和现有浅色工作台 | 改为 Light Workspace + CLI Glass Terminal |
| 2026-07-14 | 一次窄屏截图显示拒绝连接 | 中断后 dev server 已退出 | curl 5173 + 重启 Vite | 非页面缺陷，重启后截图通过 |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 表单 disabled / validation / submitting 可用。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] 401 清理 token，且不泄露用户枚举信息。
- [ ] TypeScript、lint、build 和浏览器检查结果已记录。

## 8. Verification Record

| 时间 | 命令 / 检查 | 结果 | 备注 |
|---|---|---|---|
| 2026-07-14 | 仓库 / 后端契约审查 | 通过 | 只读审查 |
| 2026-07-14 | changed-file local ESLint | Pass | `pnpm` Corepack 联网检查不可用，使用已安装 eslint binary |
| 2026-07-14 | `vue-tsc -b` | Pass | strict TypeScript |
| 2026-07-14 | local Vite build | Pass | 仅既有 Rolldown annotation / chunk warning |
| 2026-07-14 | 桌面视口检查 | Pass | 1440×900 实拍 |
| 2026-07-14 | 窄屏检查 | Pass | 500px 实拍，结构为表单后终端 |
| 2026-07-14 | `/auth/login` direct/proxy | Pass | 无效凭据均返回 `401 control.auth-failed` |

## 9. Finish Notes

- 交付摘要：登录页、鉴权 session、route guard、proxy、logout、CLI 动画和视觉修订已完成
- 最终进度：95%
- 最终步骤：等待用户视觉确认和有效凭据成功登录
- 剩余风险：没有有效测试账号，尚未人工见证 200 token 后进入 `/sources`
- Follow-up：真实用户管理 / bootstrap 管理界面另立 feature
