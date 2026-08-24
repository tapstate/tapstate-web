# Source test, edit, and schema discovery prototype

> 状态：Implemented
> 日期：2026-08-21
> Owner：Codex
> Feature folder：docs/workflow/features/2026-08-21-source-test-edit/
> 对应 spec：./spec.md
> 对应 plan：./plan.md

## 1. 原型目标

让用户在 Source 列表 / 详情测试已保存配置，在 Create / Edit 的当前草稿测试连接，并在 Source 详情刷新 schema、查看表字段；所有路径都不向测试结果暴露敏感配置。

## 2. 视觉方向

沿用当前 Source workbench 的 Linear 式紧凑工作台语汇：大弹窗保持稳定的 header、分栏主体和 footer 操作栏；连接测试只是表单动作。结果使用独立的小 dialog，信息等级低于配置流程。Source 详情保持列表、表详情和 Columns tab 层级，不把 schema 结果堆叠成额外大卡片。

## 3. 布局线框

```text
Create / Edit configuration dialog
┌──────────────────────────────────────────────────────────────┐
│ ← 返回 / connector title                                  × │
├──────────────────────────────────────┬───────────────────────┤
│ vertically stacked configuration form│ setup guide           │
│                                      │                       │
├──────────────────────────────────────┴───────────────────────┤
│                            Cancel  Test connection  Save     │
└──────────────────────────────────────────────────────────────┘

Independent test result dialog
┌────────────────────────────────────────────┐
│ Connection test                         ×  │
├────────────────────────────────────────────┤
│ ✓ Connected, or failed / warning checks    │
└────────────────────────────────────────────┘

Source workbench
┌──────────────────────┬───────────────────────────────────────┐
│ Source list           │ Source detail                          │
│  · Test action        │ Test connection  Refresh schema  Edit  │
│                      │ Tables                                  │
│                      │ └─ table → Columns: fields / indexes   │
└──────────────────────┴───────────────────────────────────────┘
```

## 4. 关键交互

| 触发                          | 页面反馈                                       | 结果                       |
| ----------------------------- | ---------------------------------------------- | -------------------------- |
| 列表行点击 Test connection    | 使用已保存 Source config                       | 发起测试，不打开编辑器     |
| 详情点击 Test connection      | 使用已保存 Source config                       | 发起测试，不修改 Source    |
| Create 中点击 Test connection | 复用创建草稿校验，footer 进入 pending          | 不创建 Source，发起测试    |
| Edit 中点击 Test connection   | keep 复用已有 config，replace 覆盖，clear 移除 | 不保存 Source，发起测试    |
| 测试返回 PASSED               | 保留配置 dialog，打开小结果 dialog             | 用户可继续保存或继续编辑   |
| 测试返回 FAILED               | 保留配置 dialog，打开小结果 dialog             | 用户可依据检查详情修正配置 |
| 请求 / 协议失败               | 打开小结果 dialog，显示通用错误                | 不泄露 settings 或 secret  |
| Refresh schema                | 调用 discover-schema，写入 schema cache        | 表列表和 Columns tab 更新  |
| Schema 404 / request failure  | 显示未发现或通用错误并提供 retry               | 继续查看配置表或重试       |

## 5. 状态覆盖

| 状态             | 表现                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| Validation       | 字段级校验错误保持在表单内，不弹出结果。                                                |
| Testing          | Close、back、表单输入、metadata/table 操作与 footer action 禁用，防止测试中的草稿漂移。 |
| PASSED           | 紧凑 dialog 以成功图标、标题和检查条目反馈。                                            |
| FAILED / WARNING | 紧凑 dialog 用语义状态图标和后端返回的安全说明反馈。                                    |
| Request error    | 紧凑 dialog 使用通用控制面错误文案，不输出请求 payload。                                |
| Saved secret     | 列表 / 详情测试复用后端 config；UI 不显示原值。                                         |
| Edit secret      | keep 复用、replace 覆盖、clear 删除，测试请求只包含最终 settings。                      |
| Schema           | loading、未发现、失败、成功；成功后表详情默认进入 Columns 并展示 fields schema。        |

## 6. 响应式规则

- Desktop：父 dialog 维持 1100px 上限，结果 dialog 保持紧凑，不扩张至父容器。
- Narrow：父 dialog 继续沿用既有单列 / 隐藏帮助区规则，footer button 保持可触达；结果 dialog 由 Dialog primitive 处理窄屏宽度。
- Source workbench：列表和详情操作在窄屏保持可换行，表详情内容允许水平滚动，不压缩字段表格到不可读。
- 已在认证桌面会话验证父 dialog 与结果 dialog 无溢出；当前浏览器绑定不能完成物理 375px viewport 切换，需后续补测。

## 7. 设计约束

- 保留既有 56px header、shadcn token、紧凑按钮比例与无装饰 ConnectorIcon。
- 测试 pending 只改变状态，不改变 action slot 的尺寸或字号。
- 不在结果中显示连接 URI、settings、password、secret key/value。
- Source detail 的测试只使用后端已保存 config；Edit 测试通过纯函数合并 secret，避免把 write-only 原值读回 UI。
- Schema 数据使用严格 client guard，连接器 / Source ID 不匹配时按 protocol error 处理。

## 8. 评审记录

| 时间       | Reviewer | 结论        | 备注                                                                                                  |
| ---------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| 2026-08-21 | Codex    | Implemented | 独立结果 dialog 保持配置向导的空间与状态连续性。Source 列表 / 详情测试、Schema 刷新和字段详情已接入。 |
