# Source Creation Acceptance

> 日期：2026-07-14
> Feature folder：docs/workflow/features/2026-07-14-source-creation/
> Spec：./spec.md
> Prototype：./prototype.md
> Plan：./plan.md
> Reviewer：

## 1. 验收结论

- [x] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
|---|---|---|
| 路由 layout 恢复 | Pass | login 裸布局；protected routes 共享 sidebar/header/Ask Cyntex |
| connector catalog API | Pass | 既有 list 保持兼容，新增 detail 与 coded 404 |
| Source 真实列表与创建 | Pass | mockSources 已移除；创建后立即排序、选中并显示真实响应 |
| 既有 Sources 布局保持 | Pass | 左侧 Source 树、All Sources 表格、Source 详情、表详情和 tabs 均与接 API 前一致 |
| catalog-driven dynamic config | Pass | default/enum/number/boolean/array/secret/visibleWhen 均由归一化字段驱动 |
| 三套 locale 与质量门禁 | Pass | 本次 scoped lint、build、31-module Maven、桌面/移动验收通过 |

## 3. 验证结果

| 命令 / 检查 | 结果 | 备注 |
|---|---|---|
| changed-file ESLint | Pass | 本次源码、配置和 feature docs 无错误 |
| `vue-tsc -b` | Pass | production build 内执行 |
| Vite build | Pass | 1704 modules |
| Maven focused/full test | Pass | 31 modules，BUILD SUCCESS |
| 桌面视口检查 | Pass | 应用壳、真实详情、动态弹窗与创建成功态无重叠 |
| 移动视口检查 | Pass | 390×844 页面与 dialog 均可用，控件不溢出 |

手工回归路径：登录后进入 `/sources`，确认默认展示 All Sources 表格；点击左侧 Source 后进入原详情结构；点击表名后进入原 tabs 与右侧信息栏；Create source 仅打开 dialog，不改变页面骨架。

## 4. UI 状态覆盖

| 状态 | 结果 | 备注 |
|---|---|---|
| Loading | Pass | 列表与 connector detail 使用稳定 spinner/disabled 状态 |
| Empty | Pass | 无资源时保留唯一创建入口 |
| Error | Pass | network/server/coded error 分类，页面可 retry，弹窗保留输入 |
| Success | Pass | 新 Source 即时进入列表、自动选中，secret 仅显示 configured |

## 5. 剩余风险

- 复杂 Formily reaction 仍是有意的有损归一化；浏览器不执行旧表达式。
- 全仓 `pnpm lint` 仍被 4 个 2026-07-08 旧文档 Markdown 表格错误阻断；本次 scoped lint 全绿。
- 现有 `8080` 开发进程是旧后端构建，需在 PR #15 更新后的后端重启后才能使用 connector detail。
