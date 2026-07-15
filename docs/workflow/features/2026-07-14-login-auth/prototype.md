# Cyntex Login Prototype

> 状态：Approved, revised from the first visual pass
> 日期：2026-07-14
> Owner：
> Feature folder：docs/workflow/features/2026-07-14-login-auth/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

让登录页与现有浅色产品工作台属于同一视觉系统，同时明确表达 Cyntex 同时服务 CLI 和 Web 的开发者优先产品形态。登录页不承担营销，不使用通用居中卡片、社交登录占位或无后端能力的忘记密码入口。

## 2. 页面 / 交互范围

本原型覆盖：

- `/login` 首屏、表单校验、提交、错误、语言切换和 password reveal。
- 桌面左右布局：全屏深色背景上悬浮一张白色登录卡片，右侧放置深色 CLI 终端。
- 页面加载后的 CLI 逐字动画，以及登录成功后的短路由过渡。
- 移动端表单优先、终端随后排列。

本原型不覆盖：

- OAuth / SSO / MFA / 密码重置。
- bootstrap 管理员创建流程。
- 已登录工作台的视觉重构。

## 3. 最终视觉方向：Full-bleed Workspace + Floating Form Card

- 视觉 thesis：深色背景直接铺满真实视口，白色表单卡片在背景内部保留 16px 间距形成悬浮层级；参考截图中的灰色外沿不属于页面设计。
- 设计签名：大面积克制深灰、白色圆角卡片、宽留白、46px 输入框、深海军蓝主按钮和等宽 CLI。没有装饰圆圈、流动色场或营销图形。
- 终端材质：右侧是纯色深灰背景，终端使用不透明深色 surface、细边框和真实阴影，不使用 `backdrop-filter`、透色或光泽伪元素。
- 微交互：CLI 命令按 22ms/字符逐字出现，命令完成和结果行之间保留 260-420ms 节奏；光标独立闪烁。页面不响应指针位置，终端不倾斜。
- 动效降级：`prefers-reduced-motion` 下直接显示完整终端并停止光标动画。
- 路由融合：登录页离场和 `/sources` 入场使用 220ms opacity + 3-4px translate，不做 bounce、旋转或大幅缩放。

## 4. 源稿 / 设计保真边界

- 源稿：用户提供的左右双栏登录草图。
- 必须保持一致：悬浮白色表单卡片 / 右 CLI 的结构、全屏深色背景、宽留白、专业输入框、终端自动输出。
- 允许调整：草图中的 Google/GitHub 登录和忘记密码未实现，因为当前后端没有对应协议；终端命令改为 Cyntex 当前产品语义。
- 明确禁止：虚构 OAuth、密码重置、客户 logo、产品指标、debug 控件。
- QA / debug / preview control：只通过浏览器工具和测试，不进入产品 UI。

## 5. 关键交互

| 触发 | 页面反馈 | 结果 |
|---|---|---|
| 页面加载 | CLI 从 `cyntex auth login` 开始逐字执行 | 展示 CLI-first 工作流，不阻塞表单 |
| 提交空表单 | 字段旁显示本地校验，按钮不发请求 | 用户直接修正 |
| 提交凭据 | 按钮文字切到 submitting，尺寸不变 | 成功保存 token，失败恢复可提交 |
| 后端 `control.auth-failed` | 表单级错误，不指出 username/password 哪一项存在 | 防止用户枚举 |
| 点击 password reveal | Eye / EyeOff 切换，输入框不移位 | 保持键盘焦点 |
| 登录成功 | 220ms 路由过渡后进入 `/sources` | 登录与主应用连续 |

## 6. 状态覆盖

| 状态 | 表现 | 操作 | 文案 key |
|---|---|---|---|
| Loading | 主按钮保持 48px，替换文案和图标 | 等待 | `auth.login.submitting` |
| Empty | 初始空表单，CLI 独立运行 | 输入 | `auth.login.title` |
| Error | inline field error 或 form alert，保留输入 | 修正、重试 | `auth.login.errors.*` |
| Success | route transition 进入 `/sources` | 使用工作台 | `auth.login.success` |

## 7. 响应式规则

- Desktop：`min-width: 961px` 为 1:1 双栏，表单最大宽度 446px，终端最大宽度 560px。
- Tablet / Mobile：`max-width: 960px` 改为单列，表单优先、终端随后，避免把登录动作推到首屏之外。
- Narrow：`max-width: 520px` 使用 20px 页面 padding，表单控件保持至少 46px，终端字体降到 11px且长命令可在容器内换行。

## 8. 控件密度与视觉决策

| 控件 / 区域 | 默认规则 | 本次选择 | 依据 | 是否例外 |
|---|---|---|---|---|
| Username / password | 默认 32px | 46px、10px radius | 登录触达面积和草图保真 | 是，已批准 |
| Submit button | 默认约 32px | 48px、10px radius、满宽 | 页面唯一主操作 | 是，已批准 |
| Form surface | 页面 section 不做 card | 深色背景上的大型白色卡片 | 用户参考图明确要求悬浮层级 | 是，已批准 |
| CLI window | 普通不透明工具 surface | 深色 framed tool | 用户要求移除 glass 和 AI 化装饰 | 否 |
| Password toggle | lucide icon button | 40px 命中区 | 可达性和稳定尺寸 | 否 |

## 9. 原型资产

- 用户草图：本次会话附件。
- 桌面验证截图：`/private/tmp/cyntex-login-fullbleed-desktop.png`。
- 窄屏验证截图：`/private/tmp/cyntex-login-fullbleed-mobile.png`。
- 本地页面：`http://127.0.0.1:5173/login`。

## 10. 评审记录

| 时间 | Reviewer | 结论 | 备注 |
|---|---|---|---|
| 2026-07-14 | PO | Rejected | 首版 Graphite Signal 与内页及产品品味不一致。 |
| 2026-07-14 | PO | Approved direction | 采用浅色高留白表单 + 深色 CLI glass terminal 草图方向，要求丝滑动效。 |
| 2026-07-14 | PO | Refined | 移除同心圆装饰，要求真正磨砂的液态色场，并让 terminal 跟随指针倾斜。 |
| 2026-07-14 | PO | Final refinement | 移除液态玻璃和鼠标跟随；截图灰色外沿不属于页面，改为全屏深色背景上的悬浮白卡片。 |
