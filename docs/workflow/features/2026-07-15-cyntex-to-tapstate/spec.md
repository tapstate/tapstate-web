# Cyntex To Tapstate Rename

> 状态：Draft
> 日期：2026-07-15
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-15-cyntex-to-tapstate/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：App shell、login、Ask panel、i18n、稳定项目文档

## 1. Intake

### 用户原始输入

> **Cyntex 改名为 Tapstate**

### 背景与上下文

产品名从 Cyntex 更名为 Tapstate。当前仓库中存在用户可见品牌文案、HTML title、CLI 示例、Ask 面板文案、session storage key、示例 API 域名、package name 以及长期文档标题仍使用 Cyntex，需要统一到 Tapstate，避免交付物继续暴露旧品牌。

### 假设

- `Cyntex` 和小写命令 / 标识 `cyntex` 分别替换为 `Tapstate` / `tapstate`。
- 当前仓库目录名 `cyntex-web` 暂不在本次自动改名范围内，因为目录路径受外部工作区和工具配置影响。
- 历史 feature 文档中保存的用户原始输入、旧验收记录、旧截图路径和旧 PR 记录不作为本次强制改写对象；本次只更新当前稳定入口与运行时代码。
- `api.cyntex.dev` 示例域名按品牌改为 `api.tapstate.dev`，实际后端域名如未同步需要后续配置化。

### 未决问题

- 是否需要同步更名后端协议里的 `cyntex/v1`、`.cyn.yml` 文件扩展名和 CLI 真实二进制名称。
- 是否需要后续重命名仓库目录、远端仓库名、skill 名称和 agent 配置文件名。

## 2. Decomposition

### 目标

- 将当前用户可见品牌文案从 Cyntex 改为 Tapstate。
- 将 i18n 三套 locale 中的品牌、Ask 面板、登录页 CLI 示例同步更新。
- 将运行时代码中的 `AskCyntex` 命名改为 `AskTapstate`，降低旧品牌继续扩散的概率。
- 将稳定文档入口、package name、示例包 scope 更新为 Tapstate。
- 忽略 pnpm 验证时生成的本地 `.pnpm-store/`，避免缓存目录进入 Git 视野。
- 保留历史 feature 事实记录，不重写旧需求原文。

### 非目标

- 不重命名仓库物理目录。
- 不修改后端接口契约或真实部署域名。
- 不新增 logo、视觉资产、主题重设计或 IA 调整。
- 不清理历史 feature 文档中的旧品牌事实记录。

### 用户路径

1. 用户打开 Web 应用，浏览器 title、侧栏品牌、登录页与 Ask 入口显示 Tapstate。
2. 用户切换 en / zh-CN / zh-TW，三套语言中的品牌名一致为 Tapstate。
3. 开发者阅读 README、工程文档和 workflow 文档，看到当前产品名为 Tapstate。

### 影响面

- IA / 路由：不改变路由或导航结构。
- 状态管理：Ask 面板布尔状态从 `isAskCyntexOpen` 改为 `isAskTapstateOpen`。
- 数据 / API：仅修改示例 API endpoint 常量；不新增接口。
- 权限：session storage token key 改为 `tapstate.auth.token`，旧 tab 内登录态可能需要重新登录。
- i18n：更新 `en`、`zh-CN`、`zh-TW` 中旧品牌文案。
- 错误处理：不变。

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 只改用户可见 i18n 文案 | 改动小 | 代码和文档继续扩散旧品牌 | 不采用 |
| 更新当前运行时代码与稳定文档，保留历史 feature 记录 | 覆盖当前体验，同时不篡改历史上下文 | `rg Cyntex` 仍会在旧 feature 记录中命中 | 采用 |
| 全仓机械替换所有 Cyntex/cyntex | 旧品牌残留最少 | 会改写用户原始输入、历史命令输出和验收事实 | 不采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：本次是品牌命名与文案替换，不新增布局、路由、视觉资产或复杂交互。

## 4. UI / IA Sketch

N/A。现有布局不变，仅替换品牌文字。

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | 保持现有 loading 表现 | 等待数据或操作完成 | 现有 key，不新增 |
| Empty | 保持现有空态表现，品牌名为 Tapstate | 按页面引导创建资源 | `sources.empty.body`、`ask.empty.*` |
| Error | 保持现有错误态表现 | 重试或检查后端连接 | 现有 key，不新增 |
| Success | 页面和 Ask 面板显示 Tapstate 品牌 | 正常使用工作台 | `app.brand`、`ask.*`、`auth.login.*` |

## 6. i18n 范围

变更现有 locale key 的值，不新增 key：

- `app.brand`
- `auth.login.signalBody`
- `auth.login.versionLine`
- `auth.login.terminal.previewLabel`
- `auth.login.terminal.*Command`
- `sources.empty.body`
- `pipelines.empty.answerIntro`
- `ask.launch`
- `ask.panelLabel`
- `ask.composer.placeholder`
- `ask.empty.body`
- `ask.empty.title`

必须同步：

- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
- `apps/web/src/i18n/locales/zh-TW.json`

## 7. 数据与接口

- 是否需要新接口：否。
- 是否使用 mock：否。
- 错误码 / 错误文案：不变。

## 8. 验收标准

- [ ] 当前运行时代码与稳定项目文档不再出现 `Cyntex` / `cyntex`，历史 feature 记录除外。
- [ ] Web 应用 title、品牌文案、Ask 入口和三套 locale 均显示 Tapstate。
- [ ] `AskCyntex` 组件与 `isAskCyntexOpen` 状态命名更新为 Tapstate。
- [ ] `pnpm lint` 和 `pnpm typecheck` 通过，或失败原因与本次改动无关并记录清楚。
- [ ] pnpm 验证生成的本地 store 不作为未跟踪文件出现在交付 diff 中。

## 9. 风险

- session storage key 改名会让当前浏览器 tab 的旧 token 不再被读取，用户需要重新登录。
- 示例域名改为 `api.tapstate.dev` 后，如果后端域名尚未迁移，需要后续配置化或回退。
- 历史 feature 文档仍包含旧品牌名，`rg Cyntex` 全仓扫描会继续命中历史记录。
