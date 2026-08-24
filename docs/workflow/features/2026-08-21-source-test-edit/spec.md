# Source test, edit, and schema discovery

> 状态：Implemented
> 日期：2026-08-21
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> 对应 prototype：./prototype.md
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：`apps/web/features/sources/`, `apps/web/service/source-client.ts`

## 1. Intake

### 用户原始输入

> Source 的创建有了，还要测试/编辑

> 添加 source 的测试功能

补充的既有产品决定：

- Source 的后端 `id` 是全局唯一标识符，UI 使用“Source ID”，创建后不可修改。
- 创建连接器使用固定搜索区与多列选择卡片；局部使用用户指定的 `bg-gray-50/40` 浅底色、无边框白色卡片、弱弥散阴影和 1px hover 上移。
- `ConnectorIcon` 不添加背景、边框或装饰容器。

### 背景与上下文

Source create 与 edit 都是大型配置弹窗，用户在保存前需要验证当前草稿能否连接。后端已提供同步测试合同：`POST /api/connections:test`，输入为 `{ id, connectorId, settings }`，返回结构化的连接检查报告。`FAILED` 是业务测试结果，不应当被当成请求异常。

编辑态的已配置 secret 是 write-only。编辑表单不能读取密码原值，但 Source 列表 / 详情可以使用后端已经保存的 `config` 发起测试；编辑草稿测试时，未修改的 secret 复用当前 Source config，用户新输入的 secret 覆盖旧值，明确清空的 secret 从测试 settings 中移除。

## 2. Decomposition

### 目标

- 在创建与编辑配置弹窗的 footer 提供“Test connection”。
- 在 Source 列表行和 Source 详情提供“Test connection”，使用已保存的 Source config。
- 测试和保存共享同一份草稿校验与 settings 生成逻辑。
- 将结构化 PASSED / FAILED 检查结果展示在独立、紧凑的结果 dialog 中，不改变大型配置弹窗的布局。
- 对网络、协议或控制面请求错误提供不泄露配置的通用错误反馈。
- 提供 `discover-schema` 操作，刷新 Source schema，并在表详情的 Columns tab 展示 fields、类型、主键和索引。

### 非目标

- 不创建或修改 Source 作为测试的副作用。
- 不展示 settings、password 或其他 secret。
- 不新增路由、依赖、同步、预览或运行时观测能力；schema 读取复用现有 Source workbench。

### 用户路径

1. 用户打开 Create source，选择连接器并填写 Source ID 与配置。
2. 用户点击 Test connection，复用创建校验后向测试接口提交草稿，不创建 Source。
3. 用户在独立结果 dialog 中查看通过、失败检查，或请求层错误，然后回到仍保留的配置草稿继续修改。
4. 用户在 Source 列表或详情点击测试时，使用已保存 config；用户编辑 Source 时，未修改密码沿用已有 config，修改密码使用新值覆盖后测试。
5. 用户在详情点击 Refresh schema，成功后选择表即可查看 fields schema；未发现、加载失败和刷新失败均有明确反馈与重试入口。

### 备选方案

| 方案                            | 优点                                   | 风险                          | 结论   |
| ------------------------------- | -------------------------------------- | ----------------------------- | ------ |
| Create / Edit footer 中测试草稿 | 验证结果对应即将保存的配置，用户路径短 | 需处理 write-only secret      | 采用   |
| Source detail 上测试已保存配置  | 不用打开编辑器                         | 依赖后端返回的完整测试 config | 采用   |
| 在大型配置 dialog 内嵌结果卡    | 少一层 dialog                          | 挤占表单且干扰继续编辑        | 不采用 |

## 3. Prototype Gate

- [x] 需要 prototype，见：./prototype.md

## 4. 状态矩阵

| 状态                               | 页面表现                                                    | 用户可做什么               |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------- |
| Validation rejection               | 保留字段级错误，不发送测试请求                              | 修正字段后重试             |
| Testing                            | footer 固定操作位显示 pending，关闭、返回、字段和操作均禁用 | 等待                       |
| PASSED                             | 独立结果 dialog 显示通过结果                                | 关闭结果并继续编辑或保存   |
| FAILED                             | 独立结果 dialog 列出失败或 warning 检查                     | 关闭结果并修正配置         |
| Request / protocol / network error | 独立结果 dialog 显示安全的通用错误                          | 关闭结果并重试             |
| Saved / retained secret            | 复用已保存 config，不在 UI 暴露原值；新输入值覆盖旧值       | 继续测试或修改配置         |
| Schema unavailable / failure       | 显示未发现或通用错误，并提供 retry / Refresh schema         | 重试发现或继续查看已配置表 |

## 5. i18n 范围

新增的测试操作、pending、报告标题、检查状态、请求错误、Schema 状态、字段和索引文案均通过 i18next 提供，并同步 `en`、`zh-CN`、`zh-TW`。

## 6. 数据与接口

```ts
POST /api/connections:test

{ id, connectorId, settings }

{
  connectionId: string
  connectorId: string
  outcome: 'PASSED' | 'FAILED'
  checks: Array<{
    name: string
    status: 'PASSED' | 'WARNING' | 'FAILED'
    message?: string | null
    reason?: string | null
    solution?: string | null
    connectorErrorCode?: string | null
  }>
  testedAt: number
}
```

返回 report 的 connectorId 或 connectionId 不符合请求、或 report 结构不合法时，client 以 `SourceClientError('protocol')` 处理。

## 7. 验收标准

- [x] Create 和 Edit 均能在不保存的情况下测试当前草稿。
- [x] Source 列表行和 Source 详情均能用已保存 config 测试连接。
- [x] 测试复用与保存一致的字段校验和配置转换。
- [x] 结构化通过、失败和请求错误均有可关闭的结果反馈，且不暴露配置或 secret。
- [x] 编辑中未修改的 password 复用已有 config，修改值覆盖已有 config，清空值不会残留到测试 settings。
- [x] Refresh schema 调用 `POST /api/connections:discover-schema`，并将成功结果用于表详情 fields 展示。
- [x] Schema 未发现、请求失败和刷新失败均可理解并可重试。
- [x] 表详情默认进入 Columns tab，并展示字段名、类型、主键和索引信息。
- [x] 测试期间弹窗中的可变操作均禁用，防止草稿和返回报告不一致。
- [x] `en`、`zh-CN`、`zh-TW` key 一致，focused tests、typecheck、build、scoped format 与 diff 检查通过。

## 8. 风险与后续

- 物理 375px 浏览器视口尚未在当前自动化绑定中完成复核，作为 UI follow-up；桌面认证会话已验证。
- 测试报告字段按现有 API 合同验证；后端扩大报告模型时需同步扩展 client guard 和结果 UI。
