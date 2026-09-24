# Tapstate UI 设计约束与低级错误门禁

> 状态：设计工程参考
> 依赖：Tapstate Web Engineering Guide（技术选型部分不重复，这里只补"视觉/间距/边框类"约束）
> 目的：解决"组件借鉴自 Dify，但内外边距、边框、圆角这类低级错误频出"的问题
> 参考对象：langgenius/dify（web/）的 Tailwind v4 + 自研 UI 包（@langgenius/dify-ui）工程实践
> 读取时机：新建/审查任何组件样式、写 Tailwind class、评审 PR 视觉问题时

## 为什么会出现"内外边距、边框"这类低级错误

这类问题几乎不是审美问题，而是**约束缺失**问题，具体分三类：

1. **没有语义化 token，全靠裸值。** 直接写 `p-4` `border-gray-200` `rounded-md` 这种字面值，AI 和人都容易在相邻组件里选出不一致的数值——因为它们只是"看起来差不多"的猜测，而不是查表得出的确定值。
2. **没有机器可检查的门禁。** Tailwind 允许写出"编译后不产生任何 CSS"的无效 class（比如 v4 下遗留的 v3 语法、拼错的 token 名），如果没有构建期检查，这些 class 会静静地留在代码里，视觉上看起来"差了一点"但没人能定位到具体是哪一条规则失效。
3. **组件二次封装时丢了约束。** 从 Dify 抄组件时，容易只抄 JSX 结构和 class，却丢了它背后那套 token 系统和 z-index/overlay 契约，结果组件本身没错，但放进你自己的项目后间距体系对不上。

Dify 的 web 前端（React + Tailwind）在这三点上做得比较系统，下面拆开说，并给出你可以直接落地到 Tapstate 的对应动作。

## 1. 用 Tailwind v4 的 CSS-first token 系统替代裸值

Dify 的 web 项目**不使用 `tailwind.config.*` 这种 JS 配置文件**，而是在入口 CSS 里用 v4 的 `@import`、`@theme`、`@theme inline`、`@utility` 等 CSS 层指令直接声明 design token；颜色、圆角、间距这些都作为**具名的语义 token**存在，而不是让开发者在业务代码里写裸的十六进制或任意数值。<br>
它们甚至专门做过一轮 PR，把"看起来是有效 class 但实际编译不出 CSS"的失效 token 全部清理掉，同时保留住真正生效的阴影、字体、颜色、hover/focus 状态。

**落地到 Tapstate：**

你的 `main.css / tailwind.css / app.css` 分层已经是对的方向（v4 CSS-first + `@layer theme, base, components, utilities;`），在此基础上补两件事：

- 在 `tailwind.css` 的 `@theme` 里，把颜色、圆角、间距**全部起语义名**，禁止在业务组件里出现裸的十六进制颜色或数值 spacing：
  ```css
  @theme {
    --color-border-default: var(--gray-200);
    --color-border-subtle: var(--gray-100);
    --color-text-primary: var(--gray-900);
    --color-text-secondary: var(--gray-600);
    --color-text-tertiary: var(--gray-400);
    --radius-control: 10px; /* 对应你现有的 shadcn rounded-lg / var(--radius) */
  }
  ```
- 组件里只允许出现 `border-border-default` `text-text-secondary` 这类语义 class，不允许出现 `border-gray-200` `text-[#8c8c8c]` 这种字面值——这一条本身就能消灭 80% 的"边距/边框不一致"问题，因为不一致的根源往往是两个人（或两次 AI 生成）各自猜了一个数值。

## 2. 把"失效 class"变成机器可检测的门禁

Dify 在 CI 里跑 PostCSS/Tailwind 编译检查，专门验证 `app/styles/globals.css` 能正确编译；他们也有过针对"class 写了但没有对应 CSS 产出"的专项清理 PR，方法是：检查源码里引用的 class 名，反查实际编译产物里有没有生成对应 CSS，没有的就是死 class。

**落地到 Tapstate：**

你已经有 `pnpm lint`（Oxlint）和 `pnpm --filter web i18n:check` 这类机器门禁，可以按同样的思路加一条：

- 在 `pnpm build` 或单独脚本里跑一次 Tailwind 编译产物检查：把 `apps/web/app` 下所有源码引用到的 class 名收集出来，和编译出的 CSS 里实际存在的选择器做 diff，凡是"源码引用但编译产物里不存在"的 class，直接判失败。这条检查比人眼审美判断可靠得多，能在 PR 阶段就拦住"看起来加了但其实没生效"的样式代码。
- 把这条命令加进 `## 验证命令` 清单，和 `pnpm typecheck` `pnpm build` 同级。

## 3. 组件二次封装时，把"契约"一起抄过来，不只抄 JSX

Dify 把所有原子级 UI（button、dialog、popover、select、tooltip 等）收敛进一个内部包（`@langgenius/dify-ui`），每个组件不只是样式，还带着明确的契约：

- **z-index 契约**：overlay 类组件（popover / dropdown / dialog）禁止在业务调用点上覆盖 z-index，z-index 完全由组件内部统一管理，业务代码不允许"哪里不对就自己加个 z-[999] 糊一下"。
- **focus 状态契约**：所有可交互元素统一用 `focus-visible` 而不是裸的 `outline-none`，保证键盘可访问性不会在组件迁移过程中被顺手删掉。
- **受控状态契约**：overlay 类组件统一走 `open` / `onOpenChange` 受控模式，而不是用 JSX 条件渲染直接卸载/挂载内容，这样进入/退出动画才能正常跑完，不会出现"关闭时内容突然消失"的视觉跳变。
- 这些契约被写进一份内部 `AGENTS.md`，明确记录"overlay 组件的语义、z-index 契约、可访问性预期"，供人和 AI 编码代理在改动这类组件前先读。

**落地到 Tapstate：**

你已经在用 shadcn 风格组件 + Radix primitives，这条正好补齐你 UI 工程边界里缺的部分：

- 在 `apps/web/components/ui/` 下建一份 `AGENTS.md`（或加进现有 tech-stack.md 的对应章节），写清楚：
  - overlay 类组件（Select / Dropdown / Dialog / Popover）禁止在调用点传 z-index，统一由 `components/ui` 内部管理；
  - 所有可交互元素的 focus 样式统一走 `focus-visible:ring-*`，不允许裸删 outline；
  - Dialog / Popover 一律受控（`open` + `onOpenChange`），不要用 `{isOpen && <Dialog />}` 这种条件渲染方式卸载。
- 这样即便你从 Dify 抄一个组件过来，抄的时候会对照这份契约检查一遍，而不是只对着截图调像素。

## 4. 可以直接借用的外部参考

Dify 团队在做无障碍/交互规范时，明确引用了 Vercel 的 Web Interface Guidelines（explicit conditional rendering、visible focus/accessibility、避免不必要的 state effect），这是一份公开、和框架无关的交互规范清单，值得你也直接拿来当 checklist 用，而不用自己从零总结。

## 已定结论（严格对齐 Dify 标准）

| 事项                 | 结论                                                                                                                                                       | 对齐 Dify 的依据                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 裸值 token 重构方式  | **渐进式、按作用域拆 PR**，不做一次性大重构，也不强制先产出完整映射表                                                                                      | Dify 的 v4 CSS-first 迁移本身就是分多个 PR 完成的（先落地 `@theme` 体系，再有专门的"清理失效 class"收尾 PR），每个 PR 聚焦一类组件或一个目录，而不是一次性全量替换   |
| 失效 class 检查      | **接入 CI 门禁**，作为 PR 必须通过的检查项，而非可选的手动脚本                                                                                             | Dify 的 PR 机器人清单里明确把"PostCSS/Tailwind compile check for `globals.css`"列为自动检查项之一，和 type-check、test 同级，不是手动跑                              |
| overlay 契约文档位置 | **独立文档，不并入主工程指南**：组件包级放 `components/ui/AGENTS.md`，overlay 专项契约（z-index、受控模式）另起一份 `apps/web/docs/overlay-conventions.md` | Dify 同时维护了 `packages/dify-ui/AGENTS.md`（组件包契约）和 `web/docs/overlay-migration.md`（overlay 专项文档），两者分开，没有塞进它们的主 CONTRIBUTING/工程指南里 |

**具体落地：**

1. 迁移顺序建议：先做 overlay 类组件（Select/Dropdown/Dialog/Popover），再做表单类（Input/Checkbox/Radio），最后是纯展示类（Card/Tag/Badge）——每类单独一个 PR，PR 描述里注明改动范围，不混着改。
2. CI 门禁命令加入 `## 验证命令` 清单，紧跟在 `pnpm build` 之后，作为 `pnpm build` 成功后的强制检查步骤，而不是独立的可选命令。
3. 新建 `apps/web/components/ui/AGENTS.md`（组件契约：命名规范、token 使用规则、禁止裸值）和 `apps/web/docs/overlay-conventions.md`（z-index 归属、`open`/`onOpenChange` 受控模式、focus-visible 要求），两份文档互相链接，但不合并进 `Tapstate Web Engineering Guide`。
