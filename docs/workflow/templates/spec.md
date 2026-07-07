# <Spec Name>

> 状态：Draft
> 日期：YYYY-MM-DD
> Owner：
> Feature folder：docs/workflow/features/YYYY-MM-DD-kebab-name/
> 对应 prototype：./prototype.md 或 N/A
> 对应 plan：./plan.md
> 对应 acceptance：./acceptance.md
> 相关页面 / 模块：

## 1. Intake

### 用户原始输入

> 在这里保留用户原话，不要只写 agent 总结。

### 背景与上下文

为什么要做？现在的问题是什么？

### 假设

- 

### 未决问题

- 

## 2. Decomposition

### 目标

- 

### 非目标

- 

### 用户路径

1. 
2. 
3. 

### 影响面

- IA / 路由：
- 状态管理：
- 数据 / API：
- 权限：
- i18n：
- 错误处理：

### 备选方案

| 方案 | 优点 | 风险 | 结论 |
|---|---|---|---|
|  |  |  |  |

## 3. Prototype Gate

- [ ] 需要 prototype，见：
- [ ] 不需要 prototype，原因：

## 4. UI / IA Sketch

```text
┌──────────────────────────────────────────────┐
│ Top context                                  │
├──────────────┬───────────────────────────────┤
│ Navigation   │ Main work area                │
│              │                               │
│              │                               │
└──────────────┴───────────────────────────────┘
```

## 5. 状态矩阵

| 状态 | 页面表现 | 用户可做什么 | 文案 key |
|---|---|---|---|
| Loading |  |  |  |
| Empty |  |  |  |
| Error |  |  |  |
| Success |  |  |  |

## 6. i18n 范围

新增或变更的 locale key：

- `feature.scope.key`

必须同步：

- `apps/web/src/i18n/locales/en.json`
- `apps/web/src/i18n/locales/zh-CN.json`
- `apps/web/src/i18n/locales/zh-TW.json`

## 7. 数据与接口

- 是否需要新接口：
- 是否使用 mock：
- 错误码 / 错误文案：

## 8. 验收标准

- [ ] 
- [ ] 
- [ ] 

## 9. 风险

- 
