# OXC Config Scope Fix

> 状态：Done
> 日期：2026-07-25
> Owner：Codex
> Feature folder：docs/workflow/features/2026-07-25-oxc-config-scope-fix/
> 对应 prototype：N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`package.json`、`apps/web/package.json`、`README.md`、`docs/engineering/tech-stack.md`

## 1. Intake

### 用户原始输入

> 这两个配置没有起作用

> monorepo apps 里面的包应该自动向上找。跟这个没关系。root 上的文件也没有格式化效果

### 背景与上下文

前一轮排查把重点放在 `apps/web` 显式传 `--config` 上，但当前仓库事实与用户反馈都指向另一个问题：根级 `pnpm lint` / `pnpm format` 没有真正覆盖 repo root，只委派给了 `apps/web`，导致根目录文件看起来没有吃到 `.oxlintrc.json` / `.oxfmtrc.json`。同时，`apps/web` 作为 monorepo 子包，应当依赖 OXC 向上发现根配置，而不是用手工路径兜底。

### 假设

- 用户说的“两个配置”指根目录 `.oxlintrc.json` 与 `.oxfmtrc.json`。
- `oxfmt` / `oxlint` 的向上配置发现机制在 `apps/web` 中可用，问题主要在脚本覆盖范围而不是配置文件路径。
- 本次不扩大到为 Markdown 等 OXC 不支持的文件类型引入新 formatter。

### 未决问题

- 是否需要后续单独补一条文档，明确 OXC 当前覆盖的文件类型边界。

## 2. Decomposition

### 目标

- 让根级 `pnpm format` / `pnpm format:check` 覆盖整个仓库内 OXC 支持的文件，而不是只跑 `apps/web`。
- 让根级 `pnpm lint` 同时覆盖 repo root 与 `apps/web`，并包含格式检查。
- 保持 `apps/web` 内部使用默认的向上配置发现，不依赖显式 `--config`。
- 把 README 和工程文档更新为与实际脚本一致。

### 非目标

- 不新增其他 formatter / linter。
- 不处理当前仓库里所有既有格式问题和 lint warning。
- 不扩展到 OXC 当前不支持的文件类型。

### 用户路径

1. 在仓库根运行 `pnpm format`，根目录与 `apps/web` 的受支持文件都会进入 OXC formatter。
2. 在仓库根运行 `pnpm lint`，根目录与 `apps/web` 的受支持源码都会进入 oxlint，且附带格式检查。
3. 在 `apps/web` 包内直接运行 formatter / lint 命令时，仍然自动向上读取根配置。

### 影响面

- IA / 路由：无
- 状态管理：无
- 数据 / API：无
- 权限：无
- i18n：无
- 错误处理：无

### 备选方案

| 方案                                                                  | 优点                             | 风险                                        | 结论     |
| --------------------------------------------------------------------- | -------------------------------- | ------------------------------------------- | -------- |
| 继续只委派 `apps/web`，保留 root 现状                                 | 改动最少                         | root 文件持续不受门禁覆盖，用户反馈无法解决 | 不采用   |
| 根脚本改为直接在 repo root 运行 OXC，并让 `apps/web` 保持默认向上发现 | 覆盖范围正确，符合 monorepo 直觉 | `pnpm format:check` 会暴露更多既有格式债务  | 本次采用 |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [x] 不需要 prototype，原因：纯工程脚本与文档修正，无 UI / IA / 复杂交互改动。

## 4. UI / IA Sketch

```text
N/A
```

## 5. 状态矩阵

| 状态    | 页面表现                                                       | 用户可做什么                                                        | 文案 key |
| ------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| Loading | N/A                                                            | N/A                                                                 | N/A      |
| Empty   | N/A                                                            | N/A                                                                 | N/A      |
| Error   | 根级脚本未覆盖 repo root，配置看似未生效                       | 只能手动跑子包命令或直接调 OXC CLI                                  | N/A      |
| Success | 根级 lint / format 与 `apps/web` 包命令都能命中 OXC 配置作用域 | 运行 `pnpm lint` / `pnpm format` 或在 `apps/web` 内直接运行对应命令 | N/A      |

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

- [ ] 根级 `pnpm format` / `pnpm format:check` 不再只委派 `apps/web`。
- [ ] 根级 `pnpm lint` 覆盖 repo root 与 `apps/web`，且包含格式检查。
- [ ] `apps/web` 的本地命令保留自动向上配置发现，不需要显式 `--config`。
- [ ] README / tech-stack 与实际脚本一致。
- [ ] 验证记录清楚说明通过项与既有剩余问题。

## 9. 风险

- 根级格式检查接入后，可能立即暴露更多既有未格式化文件。
- OXC 对 Markdown 等文件类型的支持边界仍需单独澄清，避免未来误会。
