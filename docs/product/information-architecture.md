# Tapstate Web Product IA

> 状态：产品参考草案
> 范围：前端产品(tapstate-web)的顶层信息架构(IA)、主菜单结构和产品对象边界
> 读取时机：只有需求触及一级导航、路由分组、菜单 IA、产品对象边界时读取或更新
> 依据：`memory/research/legacy-feature-inventory.md`(9 功能域,§3.1–§3.9)、`memory/reference/canonical-form.md`(声明式资源模型)、Tapdata 旧前端现状(§3.9)

---

## How to Use

- 本文是产品 IA 参考，不是每个 feature 的执行计划。
- 新需求的具体拆解放在 `docs/workflow/features/YYYY-MM-DD-slug/spec.md`。
- 只有当某个 feature 的 IA 结论稳定、会长期影响导航或产品对象边界时，才回写本文。

## 0. 为什么先做 IA

前端代码量大但 Tapdata 旧前端(§3.9)改动局限——真正的难点是**后端重构(三进程合并、Dataflow RETIRE、DuckDB / SQL→DAG / 多租户 / Lineage 新能力)之后,前端的产品骨架该怎么重新搭**。在动 Vue 路由之前先把 IA 定下来,避免"跟着 106 个 controller 长出一堆碎页面"的老路。

本文不写组件、不写路由实现,只回答:**用户在 Tapstate 前端里看到哪些一级区域、每个区域装什么、为什么这么分。**

---

## 1. 决定 IA 的两个事实

### 事实 A:Tapstate 是声明式资源模型

`tapstate/v1` 把所有"东西"都建模成 5 种 `kind` 的资源(`canonical-form.md`):

| kind | 是什么 | 旧系统对应 |
|---|---|---|
| `source` | 数据源(连接器 + config + mode + tables) | Connection / DataSource(§3.1.1) |
| `pipeline` | 流水线 = source + transforms + view + serve + settings | Task / DAG(§3.4 / §3.9.9) |
| `view` | 物化视图,带 storage(hot/warm/cold) | Data Modeling 视图(§3.2) |
| `serve` | 对外发布:同步(sync)/ 查询(query)/ 推送(push) | API Management(§3.5 / §3.9.14) |
| `transform` | 可复用变换器,被 `use:` 引用 | Data Development 自定义处理器(§3.9.12) |

每个资源有 `id`,可序列化成 `.tap.yml`;CLI 已能 `validate / new / explain / ls / desc`。这跟 Tinybird Forward、K8s、Terraform 是同一个范式。

**推论**:资源天生适合"统一列表 + 按 kind 过滤"。kind 是互斥、平行的分类轴,比 Tinybird 那种"endpoint 其实是 pipe 的输出"更干净。

### 事实 B:但它仍是人主导的 authoring 产品

不像 Tinybird 定位"agent 写代码、人只看"。Tapstate 保留着重度创作面:DAG 画布(`@tap/dag`,§3.9.3 KEEP)、SQL→DAG 编辑器(决策 6 / §3.9.19)、试跑(§3.6.6)、字段级 Lineage(决策 3)、集群 HA 运维(§3.3)。

**推论**:不能把所有东西塞进一个 Tinybird 式的 Resources 页。创作 / 运行 / 治理 / 管理是**不同的工作模式**,值得分区。

→ IA 按**两根轴**切:**资源 kind(静态资产)** + **工作模式(创作 / 运行 / 治理 / 管理)**。

---

## 2. 提议的菜单结构

```
顶部 context  ·  Organization / Tenant / Environment        ← 多租户(决策4)+ 环境切换
─────────────────────────────────────────────────────────────
 1  概览  Overview                 工作区健康落地页
 2  资源  Resources                按 kind 过滤的统一资产表
 3  开发  Develop                  DAG 画布 / SQL 编辑器 / 试跑
 4  运行  Operations               任务实例 / 集群 / Share CDC / 缓存
 5  治理  Governance               Lineage / 校验 / 监控 / 审计
 6  服务  Data Services            API 管理 / Token / 调用统计
 7  管理  Admin                    用户·角色 / 租户 / 通知 / 系统设置
```

### 顶部 context:Organization / Tenant / Environment

- **多租户是一等公民**(决策 4 / §3.7.14):Tenant 切换放顶部,不放某个二级菜单。
- **Environment** 预留给将来的"分支/预览"形态(借鉴 Tinybird 的 Cloud / Local / branch 切换);v1 可先只有 prod。
- 这条面包屑取代旧版"切租户要跳到设置页"的绕路。

---

## 3. 每区装什么(映射到 kind 与功能域)

| 菜单 | 看什么 | 对应 kind / 功能域 | 备注 |
|---|---|---|---|
| **Overview** | 任务状态、集群健康、近 7 天错误与吞吐、最近部署 | —(聚合,§3.6 指标) | Tinybird 式落地页,替代旧"一进来就是数据源列表" |
| **Resources** | 全部资产统一表 + lineage 视图 | `source` `pipeline` `view` `serve` `transform` | **核心区**。顶部 kind facet:Sources / Pipelines / Views / Serves / Transforms,可叠加"有错误""延迟 > 阈值" |
| **Develop** | DAG 画布编辑器、SQL→DAG 编辑器、试跑 N 行、schema 预览 | `pipeline` 的编辑态 + 决策 6 | Resources 里点 pipeline 进这里;也可从"New"直接进 SQL 编辑器从零生成 DAG |
| **Operations** | 运行中任务实例、状态机、CDC offset、集群拓扑(Hz 成员 / leader)、Share CDC 挖掘、Shared Cache | §3.3 Runtime + §3.4 + §3.9.15/16/18 | **静态资产 vs 运行实例分开**——Tapstate 比 Tinybird 多出来的一层,因为 HA / CDC / 集群是真运维 |
| **Governance** | 字段级 Lineage 图谱、数据校验、指标 / 告警、审计日志、元数据浏览 | §3.6 + 决策 3 + §3.9.13/21 | Lineage 横跨所有 kind,独立成区比塞进 Resources 合理 |
| **Data Services** | `serve` 发布的 API、调用统计、Token / 鉴权、限流 | `serve` 消费侧 + §3.5 apiserver | Resources 里 serve 是"资产定义",这里看"它怎么被外部消费" |
| **Admin** | 用户 / 角色 / 权限(SPI)、租户管理、通知通道(Notifier SPI)、加密、系统设置 | §3.7 + §3.9.17/20 + 决策 4 | Tenant 在顶部切换、在这里管理 |

---

## 4. 关键取舍(为什么这么分)

### 4.1 Resources 用"统一表 + kind 过滤",而不是 Tapdata 老那种"连接/任务/处理器/API"各一个 tab

Tapstate 的 5 个 kind 是**互斥、平行的资源类型**,各自有独立 `.tap.yml` 与 `id`。kind 是天然、干净的分类轴,做成可组合 facet 比 hard tab 信息密度高得多——排障时一眼按"有错误"跨所有 kind 过滤。Tapdata 旧 UI 的碎(106 controller 长出几十个页面)正是要避开的反例。

### 4.2 Develop 不并进 Resources

Tapstate 跟 Tinybird 的根本差异。Tinybird 能激进统一,是定位"agent 写、人看";Tapstate 的 DAG 画布和 SQL→DAG 是**重度创作工作台**,需要全屏、多面板、undo-redo。

落法:Develop 作为 Resources 里 pipeline 的"展开编辑态"(split-screen,点开不丢上下文)+ 一个独立"New / 进 SQL 编辑器"入口。既不丢 Tinybird 式的点开即编辑,又给创作留足空间。

### 4.3 Operations / Governance 独立,不像 Tinybird 那样尽量并

Tapstate 带着 Tapdata 的运维基因:集群 HA(决策:Hz 默认分布式)、CDC offset 持久化、Share CDC 挖掘、字段级 Lineage。这些是**独立工作模式**(运维 3am 排障 vs 治理查血缘 vs 开发建 pipeline),硬塞一个 Resources 会让运维和治理视角淹没在资产列表里。Tinybird 能合并是因为它运维面薄;Tapstate 运维面厚,值得分开。

---

## 5. 对比:三套 IA 的位置

| | Tapdata 旧 UI | Tinybird 新 UI(2026-03) | **Tapstate 提议** |
|---|---|---|---|
| 资源组织 | 按 controller 碎成几十页 | 统一 Resources + facet | 统一 Resources + kind facet(§4.1) |
| 创作入口 | 散在各页面 | 退化为 pipe 编辑态 | Develop 独立(人主导 authoring)(§4.2) |
| 运行/治理 | 混在功能页里 | 并进 Resources / Overview | Operations / Governance 独立(运维面厚)(§4.3) |
| 多租户 | 设置页深处 | —(单租户 SaaS) | 顶部 context 一等公民 |

Tapstate 的位置:**采用 Tinybird 的资源统一范式,但保留 Tapdata 该有的运维/治理/创作分区。**

---

## 6. 开放问题(待定)

1. **Develop 是否独立成一级菜单**。另一种做法是降级成 Resources 内编辑态(完全学 Tinybird split-screen),菜单压到 6 个。倾向独立,因为 Tapstate 创作重;若 SQL→DAG 成熟后 authoring 也"agent 化",它就该退化进 Resources。
2. **`view` 在菜单里要不要单列**。它既是 pipeline 内组件,也是独立可查询资产(对应 DuckDB 查询层 / §3.2.25)。若 view 主要被 pipeline 复用,可藏在 Resources 过滤器里;若用户会直接对 view 发查询,值得在 Data Services 旁给个"查询/探索"入口。
3. **顶部 context 的 Environment 维度**。v1 是否需要(分支/预览)?还是 GA 后再说。
4. **Data Services 与 Admin 的边界**。Token 既属"服务消费"也属"权限管理",放哪边、要不要两边都露。

---

## 7. 下一步(本文档落地后)

- 把这张 IA 画成低保真线框(至少 Overview / Resources / Develop 三页),对齐视觉再进路由实现。
- 与 `memory/plans/` 里前端相关计划挂钩(若没有,挂一个"前端 IA 重设计"计划)。
- 本文是**思考草稿**;IA 一旦在 memory 侧定案,对应的"为什么"应当沉淀为 memory 的 ADR(前端 IA 决策),本文保留为实现侧的设计展开。
