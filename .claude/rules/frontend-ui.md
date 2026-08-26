---
paths:
  - 'apps/web/app/**/*.tsx'
  - 'apps/web/components/**/*.tsx'
  - 'apps/web/features/**/*.tsx'
  - 'apps/web/**/*.ts'
  - 'apps/web/styles/**/*.css'
  - 'apps/web/i18n/locales/*.json'
---

# Frontend UI Rules

- 用户可见文案必须通过 i18next / react-i18next，不在 JSX 里写裸字符串。
- 新增 locale key 时同步 `en`、`zh-CN`、`zh-TW`。
- 页面必须考虑 loading、empty、error、success 四态。
- 较大 UI 变更应先在聊天、issue 或 PR 中明确范围、关键状态和验证方式。
- React 19 + TanStack Router File Routes 是默认页面模型；Vite 负责开发、预览和打包。
- shadcn/ui 风格组件和 Radix primitives 是默认 UI 基座；优先组合现有组件，不新增重型 UI 依赖。
- Select / Dropdown / Menu 使用 `apps/web/components/ui/*` 的 shadcn-compatible primitives，不在业务页使用原生 `<select>` 或手写 floating dropdown。
- 动效使用 Motion，保持克制，优先服务浮层、状态切换和局部反馈。
- 服务端状态用 TanStack Query；客户端 UI/session 状态用 Zustand。
- 样式入口必须分层：`main.css` 只汇总 import，Tailwind 放 `tailwind.css`，应用语义样式放 `app.css`。
- Tailwind v4 显式使用 `@layer theme, base, components, utilities;`；自定义默认样式放 `@layer base`，应用语义 class 放 `@layer components`。
- UI 风格按 shadcn / Linear 产品工作台气质收敛，基础圆角默认 `10px`。
- 表格、工具栏、侧栏、状态区和画布容器要有稳定尺寸约束。
- UI 改动后检查文字溢出、元素重叠、移动端布局和交互可达性。
