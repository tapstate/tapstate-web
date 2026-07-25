# Indentation Guardrails

> 状态：Done
> 日期：2026-07-24
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-24-indentation-lint-investigation/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`.oxfmtrc.json`、`.oxlintrc.json`、`package.json`、`apps/web/package.json`、`.editorconfig`、`.vscode/settings.json`

## 1. Intake

### 用户原始输入

> 这种缩进问题怎么没报错，也没自动修复

### 背景与上下文

用户观察到当前工作区里的缩进问题既没有被 lint 报出来，也没有在保存或执行现有脚本时自动修复。首轮排查已经确认根因；当前要把格式检查和自动修复正式接入工程门禁。

追加要求：格式规则不只包含缩进，还要明确使用单引号、JS/TS 语句末尾不加分号。

### 假设

- 用户说的“缩进问题”指常见的空格层级不一致，而不是语法错误。
- `vp format` 的默认格式与当前 2 空格项目风格兼容，可直接作为自动修复入口。

### 未决问题

- `pnpm typecheck` 当前在 `apps/web/features/sources/source-create-dialog.tsx` 有既有 `string | null` 类型错误，本次不顺带修复。

## 2. Decomposition

### 目标

- 让 `pnpm lint` 对缩进和格式问题报错。
- 提供明确的自动修复命令入口。
- 补齐 VS Code 工作区推荐与保存时格式化链路。
- 对现有 `apps/web` 源码执行一次统一格式化。
- 把单引号与无分号显式固化到 formatter 配置，而不是依赖默认值。

### 非目标

- 不处理当前代码库里其他 oxlint warning。
- 不顺带修复与本次目标无关的既有类型错误。

### 用户路径

1. 运行 `pnpm lint` 时，格式问题会像其他门禁一样被拦住。
2. 运行 `pnpm format` 时，现有缩进和基础风格问题会被自动修复。
3. 在 VS Code 中安装推荐扩展后，保存文件即可自动格式化。
4. JS / TS / JSX / TSX 文件统一使用单引号，末尾不加分号。

### 影响面

- IA / 路由：无
- 状态管理：无
- 数据 / API：无
- 权限：无
- i18n：无
- 错误处理：无

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
| 只解释现状，不改配置 | 最小影响，先给出准确结论 | 缩进问题仍会继续漏过 | 不采用 |
| 直接把格式规则接入门禁 | 能立刻收敛风格问题 | 会带来一次格式化 churn，但范围可控在 `apps/web` | 本次采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：纯工程排查，无 UI / IA / 复杂交互改动。

## 4. UI / IA Sketch

```text
N/A
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading | N/A | N/A | N/A |
| Empty | N/A | N/A | N/A |
| Error | N/A | N/A | N/A |
| Success | `pnpm lint` 报格式错误；`pnpm format` 能修复；工作区保存时自动格式化可用；源码为单引号、无分号 | 运行 lint / format，正常开发 | N/A |

## 6. i18n 范围

新增或变更的 locale key：

- 无

必须同步：

- `apps/web/i18n/locales/en.json`
- `apps/web/i18n/locales/zh-CN.json`
- `apps/web/i18n/locales/zh-TW.json`

## 7. 数据与接口

- 是否需要新接口：否
- 是否使用 mock：否
- 错误码 / 错误文案：N/A

## 8. 验收标准

- [x] `pnpm lint` 包含格式检查，缩进问题会报错。
- [x] `pnpm format` 可自动修复 `apps/web` 下的缩进和基础格式问题。
- [x] 工作区补齐 OXC 扩展推荐与保存时格式化设置。
- [x] `.oxfmtrc.json` 显式要求单引号、无分号。
- [x] 记录验证命令、结果与剩余风险。

## 9. 风险

- 根目录其它文档 / 配置文件尚未纳入 `vp format --check` 门禁，本次范围先收敛在 `apps/web`。
- `pnpm typecheck` 仍受既有 `source-create-dialog.tsx` 类型错误影响，需单独 feature 处理。
