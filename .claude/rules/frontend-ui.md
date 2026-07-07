---
paths:
  - "apps/web/src/**/*.vue"
  - "apps/web/src/**/*.ts"
  - "apps/web/src/**/*.css"
  - "apps/web/src/i18n/locales/*.json"
---

# Frontend UI Rules

- 用户可见文案必须通过 vue-i18n，不在模板里写裸字符串。
- 新增 locale key 时同步 `en`、`zh-CN`、`zh-TW`。
- 页面必须考虑 loading、empty、error、success 四态。
- 非微小 UI 变更必须先有 feature 文件夹内的 `spec.md` 需求拆解和 `prototype.md` 原型，再按同目录 `plan.md` 实现。
- Element Plus 是默认组件库；优先组合现有组件，不新增重型 UI 依赖。
- 样式入口必须分层：`main.css` 只汇总 import，Tailwind 放 `tailwind.css`，Element Plus 覆盖放 `element-plus.css`，应用语义样式放 `app.css`。
- Tailwind v4 显式使用 `@layer theme, base, components, utilities;`；自定义默认样式放 `@layer base`，应用语义 class 放 `@layer components`。
- Element Plus 覆盖优先用官方 CSS 变量和组件级 CSS 变量；只有变量无法表达时才写具体 `.el-*` class。
- UI 风格按 shadcn / Linear 产品工作台气质收敛，基础圆角默认 `10px`。
- 表格、工具栏、侧栏、状态区和画布容器要有稳定尺寸约束。
- UI 改动后检查文字溢出、元素重叠、移动端布局和交互可达性。
