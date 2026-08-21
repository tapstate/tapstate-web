# Formily Ant Design v6 Renderer Migration Plan

> 状态：In Progress
> 进度：98%
> 当前步骤：等待可访问 Source 路由的已登录本地会话，完成 desktop / mobile 目检
> 下一步：在已登录会话中检查 create / edit dialog，再完成 acceptance
> 日期：2026-08-20
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-20-formily-antd-v6/
> 对应 spec：[./spec.md](./spec.md)
> 对应 prototype：[./prototype.md](./prototype.md)
> 验收记录：[./acceptance.md](./acceptance.md)

## 1. Scope Check

- Spec 已确认：是。
- Prototype 已确认 / 已说明跳过：是，见 `prototype.md`。
- 非目标已确认：不迁移 shadcn shell 或全应用 UI。
- 是否新增依赖：是，`antd` 与 `@potop/formily-antd-v6`。
- 是否影响 IA / 权限 / 数据契约：否。

## 2. 受影响文件

- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `packages/formily/package.json`
- `pnpm-lock.yaml`
- `apps/web/features/sources/connector-formily.tsx`
- `apps/web/features/sources/connector-formily-renderer.test.tsx`
- 视检查结果可能新增：source form 局部样式 / 测试
- `docs/workflow/features/2026-08-20-formily-antd-v6/{spec,prototype,plan,acceptance}.md`

## 3. Implementation Steps

状态枚举：`Todo` / `In Progress` / `Blocked` / `Done` / `Skipped`

| Step | 状态        | 改动                                                                                             | 验证                          | 备注                                                                |
| ---- | ----------- | ------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------- |
| 1    | Done        | 核验 package、React 19 / AntD v6 peer dependencies 与 adapter API                                | npm registry + published d.ts | `@potop/formily-antd-v6@2.0.2`                                      |
| 2    | Done        | 安装 AntD 6 与 adapter                                                                           | pnpm lockfile peer resolution | 仅 web package                                                      |
| 3    | Done        | 将 standard Formily adapters 替换为 AntD v6 adapters，保留业务专用字段                           | renderer tests                | create / edit 共用                                                  |
| 4    | Done        | 加入局部 ConfigProvider、Formily runtime dedupe、完整 schema 组件注册与回归断言                  | component tests               | 禁止 AntD reset；避免 workspace 与 adapter 出现重复 Formily context |
| 5    | In Progress | 运行 build / typecheck / tests、做 desktop / mobile 目检、完成 acceptance                        | Level 3 commands              | 本地 Vite 已可启动，Source 路由需要已登录会话                       |
| 6    | Done        | 提取项目级 Formily AntD provider，改用通用 namespace 与 shadcn semantic tokens                   | renderer tests + typecheck    | `tap-formily` 可供全部 Formily renderer 复用；不引入 AntD reset     |
| 7    | Done        | 将 Formily `Radio.Group` 覆盖为 shadcn segmented button-group renderer                           | renderer tests + typecheck    | 复用 button-group token，不显示 AntD radio-button                   |
| 8    | Done        | 移除 connector spec parser 对 `detail.config` / `adaptNode` 的依赖；保留 renderer 层 secret 覆盖 | parser + renderer tests       | parser 返回原始 `x-component`，动态组件 registry 负责渲染适配       |

| 9 | Done | 标准字段改用 adapter 原生 `Input` / `NumberPicker` / `Switch` / `Password`；仅 configured secret 与 JSON array 保留业务 renderer | Source tests、typecheck、oxlint、oxfmt、diff check | create 与 raw spec secret 均走 `AntdFormily.Password`；edit configured secret 保留 keep / replace / clear |
| 10 | Done | 按当前 i18next locale 解析 spec `messages` 中的 `title` / `tooltip` / `description` 模板，不恢复组件映射 | schema tests、Source tests、typecheck、oxfmt、diff check | `zh-CN → zh_CN`、`zh-TW → zh_TW`、`en → en_US`；未知模板保留原值，`x-component` 等字段不变 |
| 11 | Done | 自动展开 adapter 中可作为 `x-component` 的组件，并补 `InputNumber → NumberPicker` 后端 schema 兼容别名 | renderer tests、typecheck、oxlint、oxfmt、diff check | 排除 factory、hooks、contexts、internal implementation；`Radio.Group` 继续使用 shadcn 风格分段器 |

| 12 | Done | 移除配置表单顶部重复说明，并将 create / edit 的用户可见 `Source ID` 改为 `Name` | Source dialog tests、i18n check、typecheck、oxlint、oxfmt、diff check | 内部 `sourceId`、API `id` 与 validation key 保持不变 |

## 4. Progress Log

| 时间                 | Actor | 进度 | 已完成                                                                                                                                                                                                               | 下一步                                       | 阻塞                                           |
| -------------------- | ----- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| 2026-08-20 15:20 CST | Codex | 15%  | 读取工程约束、核验发布包 metadata / d.ts、完成 spec / prototype / plan                                                                                                                                               | 安装依赖                                     | 无                                             |
| 2026-08-20 15:55 CST | Codex | 90%  | 安装 `antd@6.6.1` / adapter，迁移标准字段与专用输入，恢复 label / a11y，组件测试、typecheck、build 通过                                                                                                              | 运行中的本地页面做 desktop / mobile 目检     | 受限环境的 Vite 监听权限被自动审批服务拒绝     |
| 2026-08-20 16:16 CST | Codex | 95%  | 统一 Formily runtime、修复数组初始值回填；Source tests 41 项、Formily package tests、typecheck、build、i18n 均通过                                                                                                   | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Vite 已启动，但未经认证会被重定向至登录页 |
| 2026-08-20 16:22 CST | Codex | 95%  | 对移除 `any` 的 control bridge 再跑 Source tests、Formily tests、typecheck、生产构建、局部 lint / format 与 diff 检查，均通过                                                                                        | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |
| 2026-08-20 16:55 CST | Codex | 95%  | 注册 adapter 全部公开、可作为 `x-component` 渲染的组件；以原先未映射的 `Password` 作回归测试，Source tests 42 项、Formily tests、typecheck 与局部静态检查均通过                                                      | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |
| 2026-08-20 17:00 CST | Codex | 95%  | 以 `FormLayout layout="vertical"` 明确设置适配器全局布局，并加入实际生成 vertical class 的断言                                                                                                                       | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |
| 2026-08-20 17:10 CST | Codex | 95%  | 记录将 Source 专属 `source-form` prefix 提取为项目级 Formily provider，并让局部 AntD token 对齐 shadcn 的颜色与 10px 圆角                                                                                            | 更新 renderer、跑回归与静态检查              | 无                                             |
| 2026-08-20 17:20 CST | Codex | 95%  | 新增共享 `FormilyAntdProvider`：`tap-formily` namespace、shadcn 语义颜色、10px 圆角与 ring 对齐；Source tests 43 项、typecheck、局部静态检查通过                                                                     | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |
| 2026-08-20 18:05 CST | Codex | 95%  | 新增共享 `FormilySegmentedRadioGroup`，将 `Radio.Group` 改为 shadcn button-group 视觉；TDD 回归用例、Source tests 44 项与 typecheck 通过                                                                             | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |
| 2026-08-20 22:35 CST | Codex | 95%  | 简化 connector spec parser：`connectorSpecConnectionSchema(text)` 只负责解析 spec；secret 语义移回 `ConnectorFormily`，新增 raw spec secret renderer 回归；45 项 Source 测试、typecheck、lint、format、diff 检查通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |

| 2026-08-20 23:40 CST | Codex | 95% | 移除普通字段与密码的业务别名映射；schema 直接使用 AntD adapter 原生组件名，普通 / raw spec secret 使用 `Password`，configured secret 继续使用专用草稿控件；45 项 Source 测试、typecheck、局部 lint / format 与 diff 检查通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话 |
| 2026-08-21 00:05 CST | Codex | 96% | 将 spec messages 解析改为随当前 i18next locale 选择语言：`zh-CN → zh_CN`、`zh-TW → zh_TW`、`en → en_US`；新增 dialog 级语言切换回归，未知 key 保留原值；Source 相关测试 49 项通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话 |
| 2026-08-21 09:09 CST | Codex | 97% | 复核 spec messages 不固定为 `zh_CN`：dialog 使用 `i18n.resolvedLanguage ?? i18n.language` 传给纯 schema parser；49 项 Source 相关测试、全仓 typecheck、局部 lint / format / diff 检查通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话 |
| 2026-08-21 09:23 CST | Codex | 98% | dynamic schema registry 改为自动展开全部适用 adapter 导出，补 `InputNumber → NumberPicker`；排除 factory / hooks / context / internal，并保留 `Radio.Group` 的 shadcn 分段器覆写；49 项 Source 相关测试、typecheck、局部 lint / format / diff 检查通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话 |

| 2026-08-21 09:47 CST | Codex | 98% | 移除配置表单顶部 `Connection configuration` 说明区；create / edit 用户可见标签统一为 `Name`，重复名称错误文案同步更新；49 项 Source 测试、i18n、typecheck、局部静态检查通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |

| 2026-08-21 09:51 CST | Codex | 98% | 移除创建成功后的 `Source … created` 页面提示块；保留创建后的 query cache 更新与选中逻辑；49 项测试、i18n、typecheck、局部静态检查通过 | 在已登录 Source 路由做 desktop / mobile 目检 | 本地 Source 路由仍需要已登录会话               |

## 5. TDD / Verification Strategy

- 先失败的用例或检查：调整 renderer tests，使其断言 AntD Formily renderer 的输入、选择、布尔字段和 Formily value propagation。
- 单元 / 组件 / E2E：运行 source Formily renderer tests、source dialog tests、相关 Formily package tests。
- 手工 UI 检查：创建 / 编辑 dialog 的 desktop 与 mobile 表单、select dropdown、focus、submitting。
- 视觉决策扫描：
  - AntD 仅用于 scoped form renderer，默认保持 13px / 36px / 10px 密度；无需 shadcn reset。
  - 检查 no reset、no extra page-level AntD UI、无 dropdown clipping；Radio.Group 使用项目 button-group 样式。
- 验证分级：Level 3（新增运行时依赖与打包边界）。

## 6. Debug Log

| 时间                 | 现象                                                                  | 假设                                                                | 实验                                                                                           | 结论                                                                                                                                |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-20 15:18 CST | sandbox 无法解析 registry.npmjs.org                                   | 需要受控的本地网络权限                                              | 在批准后读取 registry metadata                                                                 | adapter 包存在且 peer constraints 如 spec 所述                                                                                      |
| 2026-08-20 15:50 CST | AntD FormItem 未渲染 schema field label                               | adapter 初始装配未能从 bridge field 读取 title                      | 显式把 `property.title` / catalog label 传入 decorator props                                   | label、必填标识和 feedback 已恢复；为控件补同名 `aria-label`                                                                        |
| 2026-08-20 15:54 CST | Vite 无法在 sandbox 监听 `127.0.0.1:5173`                             | 本地预览需要受控权限                                                | 请求只允许启动 `pnpm --filter web dev` 的权限                                                  | 审批服务因过载拒绝；不绕过，浏览器目检待后续执行                                                                                    |
| 2026-08-20 16:10 CST | ArrayInput 初始值为空，且自定义 Formily control 首次接收 `null` field | workspace bridge 与 adapter 使用了不同的 `@formily/react` peer 实例 | 对比 pnpm peer resolution，发现 bridge 解析到 `react-is@17`，而 web adapter 使用 `react-is@19` | 将 `react-dom` / `react-is` 显式列为 bridge peer，web 显式锁定 `react-is@19`，并在 Vite 中 dedupe Formily runtime；数组回填断言通过 |

## 7. Review Checklist

- [ ] 功能满足 spec。
- [ ] 没有扩大范围。
- [ ] 迁移 / 复刻类需求已对照源稿保真，未引入源稿外产品 UI。
- [ ] QA / debug / preview control 未暴露给最终用户，或已按 spec 隔离。
- [ ] 用户可见文案都走 i18n。
- [ ] 三套 locale key 同步。
- [ ] loading / empty / error / success 四态可用。
- [ ] 与 prototype 的布局、交互和响应式规则一致。
- [ ] 新增或修改的视觉 props / utility 均有设计系统、既有局部模式或 prototype 依据。
- [ ] 未使用无依据的 shadcn / Radix variant、size、portal、focus ring、disabled、aria 属性或视觉捷径。
- [ ] 桌面和移动视口无明显溢出、重叠、错位。
- [ ] TypeScript、lint 和按风险选择的 build 结果记录清楚。

## 8. Verification Record

| 时间       | 命令 / 检查                                                                                   | 结果                  | 备注                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 2026-08-20 | package metadata / d.ts inspection                                                            | Passed                | React 19 is inside declared >=18 range; `antd@^6` required                                                           |
| 2026-08-20 | `pnpm --filter web test -- connector-formily-renderer.test.tsx source-create-dialog.test.tsx` | Passed                | 14 files, 45 tests; includes reusable provider token and Radio.Group button-group regression coverage                |
| 2026-08-20 | `pnpm --filter @tapstate-web/formily test`                                                    | Passed                | 1 file, 2 tests                                                                                                      |
| 2026-08-20 | `pnpm typecheck`                                                                              | Passed                | workspace packages passed                                                                                            |
| 2026-08-20 | `pnpm build`                                                                                  | Passed                | build complete; pre-existing large-chunk warning remains                                                             |
| 2026-08-20 | `pnpm --filter web i18n:check`                                                                | Passed                | no locale change; all locale keys match                                                                              |
| 2026-08-20 | `pnpm peers check`                                                                            | Passed with follow-up | `@formily/grid@2.3.7` declares TypeScript 4 / 5 range; workspace uses TypeScript 6.0.3, but typecheck and build pass |
| 2026-08-20 | scoped `oxlint` / `oxfmt --check` / `git diff --check`                                        | Passed                | migration files are linted, formatted, and patch-safe                                                                |
| Pending    | 桌面视口检查                                                                                  | Blocked               | local Source route redirects to login without a session                                                              |
| Pending    | 移动视口检查                                                                                  | Blocked               | local Source route redirects to login without a session                                                              |

## 9. Finish Notes

- 交付摘要：AntD v6 adapter 已局部替换 connector 动态字段 renderer，shadcn shell 未迁移。
- 最终进度：95%，等待 UI 目检。
- 最终步骤：在已登录会话完成浏览器目检。
- 剩余风险：AntD bundle size、dropdown layer、第三方 adapter 更新节奏、待目检的局部视觉差异。
- Follow-up：若 AntD 的局部 bundle 影响首屏预算，改为懒加载 Formily renderer chunk。
