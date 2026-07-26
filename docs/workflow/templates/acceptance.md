# <Acceptance Record>

> 日期：YYYY-MM-DD
> Feature folder：docs/workflow/features/YYYY-MM-DD-kebab-name/
> Spec：./spec.md
> Prototype：./prototype.md 或 N/A
> Plan：./plan.md
> Reviewer：

## 1. 验收结论

- [ ] Accepted
- [ ] Accepted with follow-up
- [ ] Rejected / needs changes

## 2. 验收标准对照

| 验收标准 | 结果 | 备注 |
| -------- | ---- | ---- |
|          |      |      |

## 3. 源稿 / 设计保真对照

适用于迁移、还原、复刻、按设计稿实现类需求；不适用时写 N/A。

| 对照项                  | 结果 | 备注 |
| ----------------------- | ---- | ---- |
| 标题 / toolbar / 主操作 |      |      |
| 页面布局与区域层级      |      |      |
| 交互入口                |      |      |
| 未引入源稿外产品 UI     |      |      |

## 4. 验证结果

| 命令 / 检查      | 结果              | 备注                       |
| ---------------- | ----------------- | -------------------------- |
| `pnpm lint`      |                   |                            |
| `pnpm typecheck` |                   |                            |
| `pnpm build`     | Skipped / Pending | 按风险决定；跳过时写明理由 |
| 桌面视口检查     |                   |                            |
| 移动视口检查     |                   |                            |

验证方式说明：

- 源码静态检查和本地命令能证明的，不升级到浏览器自动化。
- 目检能证明的 UI 小差异，不强行使用 GUI / Chrome / Playwright。
- `pnpm build` 仅在高风险或构建相关改动中默认要求；小改可跳过并说明理由。
- 只有交互、布局、真实渲染风险无法通过轻量方式确认时，才启动浏览器自动化。

## 5. UI 状态覆盖

| 状态    | 结果 | 备注 |
| ------- | ---- | ---- |
| Loading |      |      |
| Empty   |      |      |
| Error   |      |      |
| Success |      |      |

## 6. 剩余风险

-
