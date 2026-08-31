# Tapstate Shadcn-Aligned Design System

> 状态：长期设计规范
> 日期：2026-07-24
> 范围：Tapstate Web 的视觉 token、Tailwind 使用、shadcn-compatible 组件、前端架构边界、组件拆分、组件状态和 UI 质量门禁

## 1. 目标

Tapstate Web 的 UI 以 shadcn 的语义 token、Radix 可达性交互和 Tailwind CSS v4 为基础，呈现企业产品工作台气质：安静、紧凑、清晰、可扫描。

这份规范解决三个问题：

- 让颜色、圆角、边框、focus、hover、selected、disabled、invalid 等状态有统一语义来源。
- 让 Tailwind utility、组件 variants 和应用语义 class 不各自发明视觉规则。
- 让新页面保持工作台密度，避免营销页、装饰性卡片堆叠和临时视觉捷径。

## 2. 设计气质

- 产品工作台优先：默认界面用于高频操作、扫描、比较和编辑。
- 低噪声、高密度：文字、表格、表单、列表和工具栏紧凑但可读。
- 语义驱动：颜色和状态优先来自 `--background`、`--foreground`、`--accent`、`--destructive` 等 token。
- 稳定布局：表格、侧栏、工具栏、浮层、表单控件、状态卡等固定格式区域必须有稳定尺寸约束。
- 克制圆角和阴影：控件默认使用 shadcn `rounded-lg` / `var(--radius)`；阴影只用于浮层、popover、dialog 或需要层级表达的 surface。

## 3. Token Contract

`apps/web/styles/tailwind.css` 是 shadcn token 的源头，必须维护这些语义组：

| 组         | Token                                        | 用途                                          |
| ---------- | -------------------------------------------- | --------------------------------------------- |
| 页面       | `--background` / `--foreground`              | app 背景和主文本                              |
| 容器       | `--card` / `--card-foreground`               | cards、panels、table 容器                     |
| 浮层       | `--popover` / `--popover-foreground`         | dropdown、select、tooltip、popover            |
| 主操作     | `--primary` / `--primary-foreground`         | primary button、selected check、关键强调      |
| 次级区域   | `--secondary` / `--secondary-foreground`     | secondary button、轻量背景                    |
| 弱化信息   | `--muted` / `--muted-foreground`             | placeholder、辅助文本、弱背景                 |
| 交互 hover | `--accent` / `--accent-foreground`           | menu/list/select/tree item hover、ghost hover |
| 破坏性     | `--destructive` / `--destructive-foreground` | danger button、错误、invalid                  |
| 线框       | `--border` / `--input` / `--ring`            | border、form border、focus ring               |
| 侧栏       | `--sidebar-*`                                | app sidebar 和 sidebar item 状态              |

新增颜色时先判断是否能归入上表语义。不能归入时，先在 PR 或变更说明中记录原因，再新增 token。

## 4. 圆角与密度

- `--radius: 0.625rem`。
- Form controls / Button / Input / Select trigger 默认 `rounded-lg` / `var(--radius)` / 10px。
- Menu / Select / Dropdown item 可使用 `--radius-sm` 到 `--radius`。
- Dialog / Drawer / Card / Popover 使用 `--radius` 到 `--radius-xl`。
- 工作台正文和控件以 13px / 14px 为主；紧凑元信息可用 11px / 12px。
- 间距优先使用 4px grid。

## 5. 组件规范

### Button

- 默认高度跟随 shadcn 紧凑工作台节奏，优先 32px 左右。
- Primary 使用 `--primary` / `--primary-foreground`。
- Outline / ghost hover 使用 muted 或 accent 语义。
- Icon-only button 要有稳定正方形尺寸和可达 `aria-label`。

### Form Controls

- Input、Textarea、Select trigger 默认圆角为 `var(--radius)`。
- Border 使用 `--input` 或 `--border`。
- Placeholder 使用 `--muted-foreground`。
- Focus 使用 `--ring`，invalid 使用 `--destructive`。
- Disabled 保持可辨认，不因为透明度过低导致文本不可读。

### Dropdown / Select / Popover

- Floating surface 使用 `--popover` / `--popover-foreground`。
- Item hover 使用 `--accent` / `--accent-foreground`。
- Popper border 使用 `--border`，shadow 用于浮层层级。

### Table / List / Tree

- 默认强调信息密度和扫描效率。
- Row hover 使用 accent 语义。
- Border 和 divider 使用 `--border`。
- 表格内部允许横向滚动，但页面级不得出现横向溢出。

### Dialog / Drawer

- Surface 使用 card 或 popover 语义。
- Header、footer、body 间距稳定；loading/submitting 不能造成按钮跳动。
- 关闭、提交、取消等控件必须有 disabled/submitting 状态。

### 5.1 资源生命周期动作与 mutation 反馈

资源列表是高密度操作台，不是营销页面。生命周期交互遵循以下规则：

| 场景          | 规则                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| 高频主操作    | 与状态 badge 保持同一操作槽，但收进稳定尺寸的 overflow menu；菜单项保留明确图标、文字和键盘导航。               |
| 低频扩展动作  | 继续进入同一 overflow menu，例如复制、删除或更多上下文操作；不要额外撑宽表格列。                                |
| 状态几何      | 状态和动作槽保持固定高度与最小宽度；pending 只替换图标，不改变行高。                                               |
| 中断性操作    | Stop 等会中断运行的动作必须通过 Alert Dialog 二次确认。                                                            |
| mutation 失败 | 使用脱离表格文档流的 transient feedback surface，带 live region 与明确关闭动作；禁止把错误文案塞进 `td` 或按钮旁。 |
| 成功反馈      | 以服务端 projection 的精确刷新为准，不额外堆叠成功 toast。                                                         |
| 视觉层级      | 列表只保留一层克制 elevation；禁止渐变、玻璃效果和泛滥阴影。                                                       |

生命周期菜单的颜色表达动作语义，而不是结果预判：Start 使用默认操作语义，Stop 使用低饱和 destructive variant。触发器只保留一个稳定的更多按钮尺寸，pending 时仅替换图标，不改变表格几何。操作失败不通过改变按钮颜色或撑高表格行来解释，而由独立反馈面承载。

### 5.2 现代工作台视觉质量基线

工作台的高级感来自秩序、节制和响应速度，而不是视觉特效。列表、资源浏览器和运行态页面必须遵守以下基线：

| 维度 | 必须遵守的规则 |
| --- | --- |
| 信息层级 | 用字重、留白、divider 和语义色区分主次；不要用装饰卡片、渐变或多层背景制造层级。 |
| 表格几何 | 列宽、行高和状态/操作槽必须稳定。资源名称截断并提供完整 `title`，不能挤压状态或更多操作。 |
| 操作层级 | 每行只暴露资源名称这一主入口；运行、停止、重试等上下文动作收进固定尺寸的 icon-only overflow trigger。 |
| 表面深度 | 页面和表格使用一层可辨认的 border；shadow 只用于 dropdown、dialog、toast 等真实浮层。 |
| 颜色系统 | 业务页面只消费 semantic token 或 feature-scoped token；禁止在 JSX 里散落灰阶、品牌蓝、状态发光和 `#...` 背景色。 |
| 反馈模型 | 列表 mutation 反馈脱离行布局，success 依赖服务端刷新，error 使用带关闭动作的 transient surface。 |
| 可达性 | 所有 icon-only trigger 提供 `aria-label` 和 keyboard-visible focus；hover 不是唯一的信息载体。 |
| 窄屏行为 | 列内次要信息可隐藏，表格容器可以局部横向滚动；页面本身不得因长资源名或操作菜单产生横向溢出。 |

实现顺序应先确定内容优先级和固定布局槽，再补齐 hover、focus、loading 和 error 状态。不得以玻璃、泛滥阴影或复杂动画替代这些基础规则。

### 5.3 外部设计系统基线

本规范吸收成熟产品和开源设计系统中可验证、可复用的基础约束；外部实现只作为基线，不直接复制其品牌视觉：

| 来源 | 采用的基线 | 在 Tapstate Web 的落地 |
| --- | --- | --- |
| [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) | content-first、键盘可达、明确的 focus-visible、稳定的交互反馈 | 页面先服务资源定位和操作；所有 icon-only 控件有标签和可见焦点；loading 不改变几何尺寸 |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | semantic token、可组合 primitive、低噪声 surface | 颜色、边框、背景和 ring 通过语义 token；feature 只增加局部语义变量 |
| [Radix Themes](https://github.com/radix-ui/themes) | 可达性、密度、状态和层级的组合约束 | Dropdown、Dialog、Tooltip 使用成熟 primitive；hover 不是唯一状态表达 |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | 层级克制、直接操作、反馈及时、动效服务于状态变化 | 普通 surface 不使用装饰阴影；浮层才表达 elevation；过渡只描述状态变化 |

由此得到四条工程化结论：

1. 先建立内容层级和布局槽，再添加颜色、阴影和动效。
2. 普通页面、表格、explorer 和 header 通过背景差异与 divider 建立层级；shadow 只属于真实浮层。
3. 交互状态必须有稳定的尺寸合同：pending、disabled、error 和 success 不得推动相邻内容。
4. 每条视觉规则都必须能映射到 semantic token、组件状态或可测试的响应式约束。

## 6. 状态规范

| 状态                    | 规范                                                   |
| ----------------------- | ------------------------------------------------------ |
| Default                 | 背景、文字、边框来自对应语义 token                     |
| Hover                   | 菜单、列表、树、select、dropdown item 使用 accent 语义 |
| Active / Selected       | 保留明确选中语义                                       |
| Focus visible           | 使用 `--ring`，focus ring 必须可见                     |
| Disabled                | 禁用态不得响应 hover                                   |
| Invalid / Error         | 使用 `--destructive`                                   |
| Loading / Submitting    | 控件尺寸稳定，loading icon 不改变布局宽高              |
| Empty / Error / Success | 页面级四态必须有可读文本和稳定容器                     |

## 7. 验收检查

- 是否使用 shadcn 语义 token，而不是新增硬编码色值。
- 新增或修改的 variant、颜色、圆角、高度、padding、图标是否有设计系统或既有局部模式依据。
- Button / form control / select trigger 是否保持 `var(--radius)` 默认圆角。
- Dropdown / select / list / tree item hover 是否使用 `--accent`。
- Focus visible、disabled、invalid、loading、empty、error、success 是否都有可用表现。
- 桌面和移动视口是否无页面级横向溢出、文字溢出和元素重叠。
- `pnpm lint`、`pnpm typecheck`、`pnpm build` 是否按风险等级执行。

## 8. 前端工程架构

本节是实现规范，不是建议清单。新页面、新组件和重构必须遵循这些边界；如果需求确实需要突破，必须在 PR 或变更说明中写明理由、影响面和回滚方式。

### 8.1 规范优先级

发生冲突时按以下顺序判断：

1. 后端 API / 数据模型合同和产品交互决策。
2. 本 Design System 的 token、架构和可达性规则。
3. 已确认的产品 / 设计决策与 PR 变更说明。
4. 局部实现偏好。

局部实现不能通过复制一套颜色、间距、状态或组件变体来绕过上层规范。

### 8.2 依赖方向

页面按单向依赖组织。数据流和视觉依赖是两条同向但独立的路径：

```text
route composition
        ↓
feature page / feature state ───────→ shared composition → UI primitives
        ↓
domain adapters / query definitions
        ↓
service clients (HTTP contract)
```

实际规则如下：

| 层                   | 可以依赖                                    | 不得依赖                                   |
| -------------------- | ------------------------------------------- | ------------------------------------------ |
| `app/routes`         | feature page、router、loader、search params | 直接请求 API、解析 DSL、承载复杂状态机     |
| `features/<feature>` | service、query、adapter、shared components  | 其他 feature 的内部文件、全局 DOM 查询     |
| `service`            | fetch/auth boundary、API contract types     | React、路由、Zustand、视觉组件             |
| `components`         | `components/ui`、token、无业务工具          | 某个 route、某个 feature 的 query 或 API   |
| `components/ui`      | Base UI/Radix、语义 token                   | 业务名词、服务端请求、feature 状态         |
| `stores`             | session 和跨页面 UI 状态                    | server resource 的第二份缓存、DSL 解析结果 |

禁止循环依赖。共享层不能反向导入 feature；需要提升共享能力时，先提取稳定的无业务组件或纯函数，再迁移调用方。

### 8.3 目录职责

`apps/web` 默认采用以下目录契约：

```text
apps/web/
├── app/
│   ├── router.tsx                 # router instance
│   └── routes/                    # thin file routes and page composition
├── components/
│   ├── ui/                        # primitive controls and shadcn-compatible parts
│   └── <shared>.tsx               # cross-feature composed components
├── features/
│   └── <feature>/
│       ├── components/            # feature-owned visual parts
│       ├── <feature>-page.tsx     # feature orchestration
│       ├── *-queries.ts           # TanStack Query definitions
│       ├── *-adapter.ts           # API DTO → view model
│       ├── types.ts               # feature contracts
│       └── *.test.tsx             # feature behavior tests
├── service/                       # typed HTTP clients and transport errors
├── stores/                        # Zustand session / cross-route UI state
├── i18n/                          # locale resources and setup
├── lib/                           # framework-neutral utilities
└── styles/                        # main.css, tailwind.css, app.css, token layers
```

目录规则：

- 路由文件保持薄，只做参数读取、loader、权限边界和 feature page 组合。
- 业务组件、业务类型、query 和 adapter 默认放在同一 feature 下，避免把领域代码散落到 `components/`。
- `components/ui` 只放可复用的交互原语；有业务含义的组件不得放入该目录。
- `service` 只描述 HTTP 合同和传输错误，不导出 React hook；hook 放在 feature 的 query 文件。
- `lib` 只能放框架无关、可独立测试的工具，不能成为未分类业务代码的收容目录。
- 新增目录前先确认它对应稳定的职责边界；不能为了缩短单个文件而创建一层没有语义的目录。

### 8.4 组件分类与拆分

组件分为四类，分类决定它可以知道什么：

| 类型            | 位置                         | 责任                                                          |
| --------------- | ---------------------------- | ------------------------------------------------------------- |
| Primitive       | `components/ui`              | focus、键盘、尺寸、基础状态和可组合 API                       |
| Shared composed | `components`                 | 多个 feature 共用的业务中立组合，如资源表格、状态徽标、面板壳 |
| Feature         | `features/<feature>`         | 领域展示、领域交互、query 结果适配和 feature 状态             |
| Route/page      | `app/routes` 或 feature page | 页面编排、路由参数、页面级状态组合                            |

拆分依据是职责和状态边界，不是机械按 JSX 行数切片。出现以下任一信号时，应拆出子组件或纯函数：

- 同一组件同时负责布局、API 请求、领域转换和表单提交。
- 存在两个互不相关的异步边界，或两个独立的状态机。
- 同一组件同时处理画布渲染、节点配置面板和节点库面板。
- 一个 props 通过多个布尔值组合出大量互斥变体；优先改成明确的 variant 或子组件。
- 组件需要被另一个 route 使用，却仍依赖当前 route 的隐式上下文。

组件拆分的最低要求：

- 页面组件负责编排，叶子组件尽量接收显式 props，不在渲染函数内读取全局单例。
- API 解析、DSL 转换、排序和派生状态放在 adapter / selector / 纯函数中，不写进 JSX。
- 复杂交互优先通过 `children`、slot 或组合组件表达，不扩张一个“万能组件”的 prop 矩阵。
- 不建立无意义的 `index.ts` 聚合出口来隐藏依赖；跨层引用使用稳定的公开文件，避免 barrel 导致的循环依赖。
- 组件超过约 250 行时必须在 review 中说明为何仍保持单文件；这是一条审查信号，不是机械门槛。

### 8.5 页面、状态和数据边界

| 状态类型              | 默认归属                    | 规则                                                          |
| --------------------- | --------------------------- | ------------------------------------------------------------- |
| Server state          | TanStack Query              | list/detail/mutation/status/metrics/logs 等服务端事实只存这里 |
| 短暂交互状态          | React local state           | 打开面板、当前 tab、输入草稿、hover、临时选择优先局部化       |
| 跨 route/session 状态 | Zustand                     | auth session、全局 UI 偏好、跨页面 drawer/dialog 等稳定状态   |
| 可分享/可恢复状态     | URL search params           | 筛选、排序、分页、选中资源和可分享视图参数优先放 URL          |
| 派生状态              | selector / memoized adapter | 从 query 或表单状态计算，不再写入第二个 store                 |

硬约束：

- 不把 TanStack Query 的资源副本同步到 Zustand。
- 不在组件之间通过 `window`、DOM 属性或隐式模块变量传递业务状态。
- mutation 成功后在 query 边界做精确 invalidation；组件不得各自维护“看起来更新了”的本地副本。
- loading、empty、error、success 是页面状态；disabled、validation、submitting 是表单状态，必须在设计和测试中分别覆盖。
- 静态 artifact view 与运行时 observation 必须分开建模。以 Pipeline 为例，`PipelineView` 负责可编辑结构，状态、指标和日志通过独立 query 获取；不能把轮询结果写回静态 artifact。

画布编辑器另有一条边界：节点的 `position`、节点/边的业务数据属于可保存的编辑模型；平移、缩放、选区和面板开合属于临时 UI 状态。若布局需要持久化，必须进入后端明确的 Pipeline/DAG 合同，不能只藏在浏览器 store 中。

### 8.6 API、模型与适配器

- `service` 层只负责请求、响应类型、ETag / `If-Match`、鉴权 fetch boundary 和 coded error；不负责把数据变成 UI 文案。
- feature adapter 将 API DTO 映射成页面所需的 view model；JSX 不直接依赖后端原始 DTO。
- 后端投影是结构化数据的唯一事实来源。前端不解析或生成用户可见 YAML，不在浏览器复制 DSL 语义校验。
- Pipeline 编辑消费结构化 `dag: { nodes, edges }`。节点坐标、节点类型和连接关系的命名必须遵守 API 合同；不要在不同组件中分别推断同一字段。
- API 错误保留稳定的 code、参数和可恢复性信息；禁止通过匹配错误字符串来决定 UI 分支。
- secret、token 和内部 canonical 内容不进入 view model、日志、URL 或可见 DOM。

### 8.7 CSS 与主题工程

样式按以下层次演进：

```text
semantic tokens → base/reset → UI primitives → shared composition → feature composition
```

文件职责：

| 文件                  | 允许内容                                               |
| --------------------- | ------------------------------------------------------ |
| `styles/tailwind.css` | Tailwind theme、语义 token、`@layer base` 默认值       |
| `styles/app.css`      | 应用壳、跨页面语义 class、`@layer components` 组合样式 |
| `styles/main.css`     | 仅按顺序汇总入口                                       |
| feature 样式文件      | 仅当前 feature 的组合样式，必须有 feature root scope   |
| 组件样式              | 组件自身的结构、状态和内部定位                         |

必须遵守：

- 共享组件的基础样式只能由共享组件自己维护；feature 不得重定义共享组件的内部 selector。
- feature selector 必须从 feature root 开始，例如 `.pipeline-canvas .pipeline-node`；禁止未作用域的 `.connector-icon__*`、`.pipeline-*` 等全局选择器。
- 同一个 selector 只能有一个权威定义；需要覆盖时使用明确的 variant、data attribute 或 CSS variable，不在文件末尾追加“修补段”。
- `position: absolute` 只用于拥有明确定位上下文的组件内部元素；图标、handle、端口的定位必须相对于自己的组件盒子，不能依赖其他 feature 的全局 class。
- Tailwind utility 用于局部布局和一次性组合；重复出现的组件状态、复杂伪元素、渐变、滤镜和连接线样式进入有作用域的 CSS。
- JSX 中不得散落业务色值、阴影和圆角。例外是来自 connector catalog 的品牌色，但也必须经过明确的 token / 映射函数。
- 深色模式只切换 semantic tokens 和少量明确的组件变量；feature 不得复制一套 dark selector 或硬编码颜色。
- 复杂视觉效果（如节点图标双层 image、blur、玻璃质感）必须封装在图标/节点组件内部，并有默认、选中、禁用和窄屏表现；不能通过全局 `img` 或 icon class 影响 DataSource 列表。

### 8.8 React Flow / DAG 画布规范

React Flow 只作为画布基础设施，业务语义由 Pipeline feature 定义：

- 画布容器、节点 renderer、edge renderer、handle、控制栏和 minimap 分成独立组件；`pipeline-canvas.tsx` 只负责组装和事件编排。
- `nodeTypes`、`edgeTypes` 和连接规则在 feature 内集中定义，避免每个节点组件各自注册或推断。
- 自定义 node / edge / handle 的样式必须在 `.pipeline-canvas` scope 下；不得覆盖全局 `.react-flow__*`，除非该覆盖明确位于画布 root scope 内。
- 节点 renderer 只负责显示已适配的 view model 和发出交互事件；节点配置表单、节点库和保存逻辑属于独立 feature 子组件。
- handle 的位置由节点盒子的固定布局决定，并通过明确的 `source` / `target`、`Position` 和尺寸 token 计算；禁止使用依赖文字长度或偶然 margin 的端口定位。
- edge 默认使用无标签的贝塞尔曲线；只有 API 合同或产品需求定义了边语义时才渲染 label。
- React Flow 的 viewport、选中态、拖拽态和临时连接态属于 UI state；保存时只提交结构化 DAG 和约定的布局字段。
- 画布背景、节点 surface、边颜色和 handle 对比度全部使用语义变量，确保未来可以切换主题而不改 renderer。

### 8.9 可达性、响应式与交互质量

- icon-only 控件必须有 `aria-label`；可见文本和 tooltip 不能互相矛盾。
- 所有可交互元素支持键盘 focus，使用 `:focus-visible`；浮层、配置面板和 Dialog 必须有正确的 focus 进入、退出和关闭行为。
- 不能只用颜色表达状态；状态徽标、节点错误和运行状态同时提供文本、图标或可访问名称。
- 侧栏、画布、列表和配置面板在窄视口下必须有明确的收缩、滚动或堆叠策略；页面级不能出现横向溢出。
- 文本、图标、handle 和边在默认主题下满足可读和可辨识要求；禁用态仍可辨认。
- 需要浮动 panel 时，panel 的层级、遮挡关系、点击外部关闭和移动端行为必须在 PR 或变更说明中明确。

### 8.10 测试与质量门禁

测试按职责分层，不以一套端到端测试替代单元测试：

| 层级                  | 必须验证                                                         |
| --------------------- | ---------------------------------------------------------------- |
| Pure model / adapter  | DTO 映射、排序、DAG 转换、错误归类、不可变性                     |
| Component interaction | 选中、拖拽、面板开合、表单校验、键盘操作、提交状态               |
| Route/page            | loader/search params、权限边界、loading/empty/error/success 组合 |
| API contract          | 字段、ETag、coded errors、secret 边界和 query invalidation       |
| Visual regression     | 画布节点、handle/edge、侧栏、列表密度、主题和窄屏关键截图        |

每个新页面至少覆盖 loading、empty、error、success；有表单时再覆盖 disabled、validation、submitting 和冲突恢复。涉及画布时，测试至少包含：

- 节点类型和图标映射稳定。
- source / target handle 位置稳定，拖动或文本变化不会漂移。
- edge 不因无关 CSS 或 label 变更而改变连接关系。
- 节点移动后保存并重新加载仍保留约定的坐标。
- 侧栏、节点库和配置面板不会泄漏到其他 feature 的 DOM 或样式。

验证命令按风险等级执行，至少遵守 `tech-stack.md` 和 `tapstate-web/AGENTS.md` 的 Level 1/2/3 规则。

### 8.11 Definition of Done

一个 UI 变更只有在以下条件都满足时才算完成：

- 路由、feature、service、store 和 shared component 的依赖方向符合本规范。
- API 原始数据已通过 adapter 进入 view model；没有在 JSX 中解析 DSL、拼装错误或复制 server state。
- 新样式使用语义 token，selector 有明确 owner 和 scope，没有重复的全局修补规则。
- loading、empty、error、success 以及适用的表单和冲突状态可操作且已测试。
- i18n、键盘可达性、窄屏布局和文本溢出已检查。
- 按风险等级运行 lint、typecheck、test、build 和必要的视觉回归；失败项已记录原因。
- diff 不包含未授权的依赖、无关重构、第二份数据缓存或临时 mock 持久化。

## 9. Review Checklist

提交 review 前，作者应能回答：

- 这个组件属于哪一层，为什么不应放在更低或更高一层？
- 哪个对象是 server truth，哪些只是临时 UI state？
- 这个 selector 的 owner、scope 和主题变量在哪里？是否存在同名规则？
- 组件在 loading、empty、error、success、disabled、validation、submitting 下如何表现？
- 失败请求、ETag 冲突、权限错误和键盘操作是否都有明确路径？
- 如果这是画布变更，节点坐标、handle、edge 和 viewport 哪些会保存，哪些不会？
- 本次改动是否引入了新的 token、依赖、全局样式或跨 feature 耦合？如果有，PR 或变更说明是否记录了原因和回滚方式？
