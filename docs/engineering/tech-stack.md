# Cyntex Web Engineering Guide

> 状态：工程参考 + 未决雷达
> 范围：前端技术栈、工程门禁、i18n、依赖和构建约束
> 读取时机：需求触及依赖、构建、i18n、测试策略、工程门禁或架构选型时读取或更新
> 与 memory 的关系：全局技术栈见 `memory/tech-stack.md`；本文件只登记前端专属选型，不与 memory 重复。

## How to Use

- 本文记录长期有效的工程约束，不记录每个 feature 的临时实现计划。
- 新需求的执行细节放在 `docs/workflow/features/YYYY-MM-DD-slug/plan.md`。
- 只有当某个 feature 引入新的长期技术决策、依赖策略或门禁规则时，才回写本文。

## 已定选型

| 领域 | 选型 | 状态 | 出处 |
|---|---|---|---|
| 框架 | Vue 3 + Vite | KEEP | §3.9.1 |
| 仓库形态 | pnpm monorepo | KEEP | §3.9.1 |
| 组件库 | Element Plus + `@tap/*` | KEEP | §3.9.2 |
| 状态管理 | Pinia 3(Vuex RETIRE) | KEEP | §3.9.5 / §3.9.6 |
| DAG 画布 | `@tap/dag` | KEEP | §3.9.3 |
| 表单引擎 | Formily | KEEP | §3.9.4 |
| 国际化 | **vue-i18n v9+**(Composition API) | 定(2026-06-29) | §3.9.24 + 用户拍板 |
| 支持语言 | en / zh-CN / zh-TW | KEEP | §3.9.24 |
| 样式基座 | Tailwind CSS + Element Plus 覆盖令牌 | 定(2026-07-07) | 统一产品 UI 约束 |

---

## 国际化(vue-i18n)—— AI 协作硬约束

> 选型已定 vue-i18n。下面是企业级落地 + 防 AI 玩具化的硬纪律,**逐条要有机器门禁或 review 关卡**,不靠 AI 自觉。

1. **禁裸字符串(头号门禁)** —— 用 `intlify/eslint-plugin-vue-i18n` 的 `no-raw-text` 规则:模板 / JSX 里裸字符串直接红灯。"禁硬编码文案"的机器执行。
2. **locale key 完整性 CI** —— en / zh-CN / zh-TW 三套 key 集合必须一致;CI diff,缺 key 红灯。治 AI "加了 en 忘加 zh"。
3. **语言包按 feature 切分 + 懒加载** —— 按模块组织 locale,不堆一个大 JSON;路由级懒加载语言包,别全打进主 bundle。
4. **key 命名规范** —— `feature.scope.key`(如 `task.list.emptyState`);禁 `text1` / `msg` 这类无意义 key。lint 规则或 review 关卡。
5. **Element Plus locale 联动** —— Element Plus 自带 locale(`ElConfigProvider` + `el-en` / `el-zh-cn`)必须和 vue-i18n locale 同步切换,否则日期选择器 / 分页器 / 表格的内置文案不跟语言变。封装统一 locale 切换入口。
6. **用 vue-i18n 内建能力,别手拼** —— 复数走 `pluralization`;日期 / 数字走 `{ n, date }` / `{ n, number }`(Intl + vue-i18n datetime/number formats)。禁 `if (count > 1)` 手写复数、禁手拼日期。
7. **错误文案对接后端错误码 catalog(架构级,重要)** —— 用户可见的错误提示,前端**不要自己翻译一遍**;消费后端 ADR-0024 错误码系统的本地化文案(经契约下发)。否则错误文案两处维护、必然漂移。
8. **版本锁 v9+,用 Composition API(`useI18n`)** —— 禁 legacy API;锁主版本,避免 AI 退化到 v8 写法。

---

## 样式约束

### 文件边界

- `apps/web/src/styles/main.css` 只作为样式入口，负责按顺序 import。
- `apps/web/src/styles/tailwind.css` 只负责 Tailwind theme、Tailwind layer 入口和 `@layer base` 默认样式。
- `apps/web/src/styles/element-plus.css` 只负责 Element Plus 官方变量覆盖；无法通过变量解决时，才写具体 `.el-*` class 覆盖。
- `apps/web/src/styles/app.css` 负责应用壳层和通用语义 class，统一放进 `@layer components`。

### Tailwind CSS

1. **显式声明 layer 顺序** —— Tailwind v4 官方入口本身是 `@layer theme, base, components, utilities;`；项目侧也保持这个顺序。
2. **自定义默认样式必须进 `@layer base`** —— 字体、背景、滚动条、默认元素重置放 base 层，避免普通 CSS 把 utilities 压掉。
3. **Tailwind 优先用于布局和微调** —— 例如间距、栅格、对齐、尺寸、gap、flex 方向、局部 text utility，优先用 utility class 完成。
4. **`text-[13px]` 应该能覆盖 base 默认字号** —— 如果没有生效，先检查该字号是否写在未分层 CSS、Element Plus 内部节点或更具体的选择器里。

### Element Plus

1. **基础圆角默认 10px** —— `--radius`、`--el-border-radius-base` 和 app token 保持一致。
2. **Element Plus 优先用于交互组件** —— `button`、`form`、`table`、`dialog`、`select`、`card` 等先复用现成组件，再统一做外观覆盖。
3. **覆盖优先级：官方变量 > 组件级 CSS 变量 > `.el-*` class** —— 写具体 class 是最后手段，且要控制范围。
4. **不要用页面内硬编码反复压样式** —— 如果同一类视觉在多个页面重复出现，优先沉淀成 token、语义 class 或组件覆盖。
5. **字体尺寸以语义节点为准** —— 表格、按钮、表单标签、页面标题等尽量在语义组件层定义字号，避免把字号散落到每个子节点上。

---

## 未决(雷达)

- 测试:unit / component 框架(vitest?)/ e2e(Playwright?)/ 视觉回归(Chromatic?)
- bundle budget 工具(size-limit / bundlewatch?)
- 前端错误监控 + RUM(Sentry?)
- 从后端 OpenAPI / canonical 生成 client + 类型的工具链
- CSP / 安全头策略
- 浏览器 / 设备支持矩阵
- 主题系统(SCSS 变量 + CSS 自定义属性,§3.9.23 KEEP;是否升级 CSS-in-JS 待定)
