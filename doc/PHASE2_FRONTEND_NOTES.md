# Phase 2 前端开发记录 (Step 1)

> 生成日期：2026-04-29
> 范围：MetriScope 前端 Phase 2 Step 1 — F1 / F5 / F3 / F10 / F4 共 5 个功能点
> 完成情况：全部 Pass，`pnpm lint` (tsc --noEmit) 零错误

---

## 一、本次新增 / 修改清单

### 新建文件

| 文件 | 用途 |
|---|---|
| [src/components/charts/DependencyGraph.tsx](../src/components/charts/DependencyGraph.tsx) | F3 · 类依赖力导向图（d3-force / d3-zoom / d3-drag） |
| [src/pages/Mcp.tsx](../src/pages/Mcp.tsx) | F10 · MCP 工具调试台 |
| [src/pages/Diagrams.tsx](../src/pages/Diagrams.tsx) | F4 · 图一致性 / 洞察 / 摘要 |
| [doc/PHASE2_FRONTEND_NOTES.md](./PHASE2_FRONTEND_NOTES.md) | 本文档 |

### 修改文件

| 文件 | 改动要点 |
|---|---|
| [src/lib/api.ts](../src/lib/api.ts) | 加 `DiagramConsistencyResponse / DiagramInsights* / DiagramSummary*` 类型 + `diagramsApi` + `mcpApi.tools()` / `mcpApi.invoke()` |
| [src/pages/Metrics.tsx](../src/pages/Metrics.tsx) | F1 `CodeAnatomyCard`、F5 `RiskCenter`（5-tab + 行内进度条 + 点击跳类详情）、`DependencySummaryCard` 加全屏图按钮 |
| [src/App.tsx](../src/App.tsx) | 路由加 `/diagrams` / `/mcp` |
| [src/components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx) | 侧边栏加 "图分析" / "MCP" |
| [src/index.css](../src/index.css) | 加 `accordion-down/up` / `pulse-ring` keyframes |

### 新装包（用户用 shadcn CLI 装）

```
pnpm dlx shadcn@latest add accordion hover-card alert textarea
```

`@radix-ui/react-{accordion,hover-card,progress,tooltip}` 在更早会话中已在 [package.json](../package.json) 里就位；本轮只生成 4 个 wrapper 文件。

---

## 二、各功能要点

### F1 · 代码构成卡（CodeAnatomyCard）

**位置**：[src/pages/Metrics.tsx](../src/pages/Metrics.tsx) `CodeAnatomyCard`

**视觉设计**：
- 12 列网格切 3 区：左 2 列「Java 文件数 + Files icon」 / 中 7 列「3 段堆叠条 + 三色图例 + 平均每文件行数」 / 右 3 列「注释率 SVG 圆环」
- 三段配色：代码 = primary 蓝 `oklch(0.55 0.18 260)`、注释 = LK 翡翠 `oklch(0.62 0.18 165)`、空白 = 浅灰 `oklch(0.78 0.01 260)`
- 注释率圆环色随阈值：≥15% emerald / 5-15% amber / <5% rose
- 卡片左上角紫色径向光晕（`opacity-[0.08]` 极淡），不抢戏

**数据来源**：`overview.latestSnapshot.summary` 的 4 个新字段 `javaFileCount / blankLines / commentLines / commentRate`，加 `totalLoc` 计算占比。

---

### F5 · 风险中心（RiskCenter，5 Tab）

**位置**：[src/pages/Metrics.tsx](../src/pages/Metrics.tsx) `RiskCenter / RiskRow / RiskEmpty`

**5 个 Tab**：
| Tab | 数据源 | 排序 | 颜色 |
|---|---|---|---|
| 综合 | `risks` | risk level + metricValue | 琥珀 |
| 复杂方法 | `methods` | cyclomaticComplexity DESC | 鲜红 |
| 高耦合 | `classes` | couplingCount DESC | 紫罗兰 |
| 低内聚 | `classes` | lackOfCohesionOfMethods DESC | 琥珀 |
| 高 RFC | `classes` | responseForClass DESC | 海蓝 |

**交互**：
- 点击行 → 跳 `/metrics/class/:fqn`（方法点击会落到所在类）
- 行右上角悬停时浮出 `↗` 图标提示可跳
- 行底部带 mini bar，归一化到当前 Tab max 值（rose / 紫 / amber / sky 与 Tab 主题色一致）
- Tab Header 写图标 + 标签 + 计数 badge，三层堆叠

**布局**：在外层 grid `lg:grid-cols-3` 里 RiskCenter 占 2 列，DependencySummaryCard 占 1 列；视觉上 RiskCenter 是主秀。

---

### F3 · 类依赖力导向图（DependencyGraph）

**位置**：[src/components/charts/DependencyGraph.tsx](../src/components/charts/DependencyGraph.tsx)

**入口**：[Metrics.tsx](../src/pages/Metrics.tsx) `DependencySummaryCard` 标题旁加 `<Maximize2>` "全屏图" 按钮 → 弹 95vw / 85vh Dialog 内挂 `<DependencyGraph>`。Dialog 里 `{graphOpen && <DependencyGraph .../>}` 条件挂载，关闭即销毁，simulation 不漏。

**力学参数**：
- `forceLink.distance(90).strength(0.5)`
- `forceManyBody.strength(-220)`
- `forceCenter(width/2, height/2)`
- `forceCollide.radius(d => nodeRadius(d.wmc) + 6)`

**节点**：
- `r = 5 + sqrt(WMC) * 1.8`，半径反映重量级
- `fill / stroke` 按 `riskLevel`：`LOW=emerald / MEDIUM=amber / HIGH=orange / CRITICAL=rose`
- CRITICAL 额外加一圈光晕环（独立 `<circle>` 不参与力学）
- 节点下方文本：截短 `className`，鼠标 hover 用 `<title>` 显示 FQN + 全部指标

**边**：
- 按 `edgeType` 区分：EXTENDS 实线粗 / IMPLEMENTS 虚线粗 / METHOD_CALL 细 / FIELD 短虚 / PARAMETER+RETURN_TYPE 极细虚
- arrowhead marker（`<defs><marker>`）

**交互**：
- 滚轮缩放（`d3-zoom` 0.2–4 倍）
- 拖拽节点（`d3-drag`，drag 期间 fx/fy 锁定）
- 点击节点 → 选中并高亮 1 跳邻居，其余 opacity=0.12
- 点击空白 → 取消选中
- 顶部工具条：搜索（实时过滤）/ "仅风险类" 切换 / 重置
- 右下角选中节点 info 面板（FQN + risk badge + WMC/CBO/RFC/LoC 4 格 + ✕ 关闭）
- 左上角图例（4 个 risk 色 + 半径说明）

**性能**：用 React 管 toolbar/info，d3 直接管 SVG 节点 / 边的 enter-update（不通过 React render），避免 React 每 tick 重渲染。两个 useEffect 分离：
- `[data]` 依赖：重建 simulation 与 selection
- `[search, selectedId, neighborIds, data]` 依赖：仅改透明度，不重建

---

### F10 · MCP 工具调试台

**位置**：[src/pages/Mcp.tsx](../src/pages/Mcp.tsx)

**布局**：
- Hero 卡片（紫青径向渐变光晕 + Bot icon + "Model Context Protocol" 标题 + 工具数 badge）
- 12 列网格：左 4 列「工具列表 Card」`lg:sticky lg:top-4` / 右 8 列「调用面板」

**工具列表**（左栏）：
- 顶部搜索框（按 toolName / description / path 过滤）
- shadcn `Accordion type=multiple` 默认全部展开，按 7 类分组：
  - 项目类（FolderKanban）/ 任务类（ListChecks）/ 指标 & 风险（Gauge）/ 快照（Layers）/ 图分析（GitCompare）/ 报告（FileText）/ 估算（Calculator）
- 后端返回但未在静态 meta 里的工具 → "其他" 组兜底
- `snapshot-compare` 别名隐藏，避免与 `compare-snapshots` 重复
- 每个工具显示：method badge（POST 紫 / GET 海蓝）+ tool 名 mono + 描述截一行

**调用面板**（右栏）：
- 头部 hero：tool 名（mono 大字）+ 描述 + method badge + 完整 path（mono 灰底胶囊）+ 复制按钮
- 3 Tab：请求 / 响应 / 历史
  - **请求**：GET 工具显示 Alert "无需 body 直接发送"；POST 工具显示 Textarea（自动换行计高），按钮 [发送 / 填示例 / 清空]，"填示例" 用静态 meta 模板，自动把 `projectId` 替换为当前选中项目 ID
  - **响应**：发送后切到此 Tab。带 ok/err Badge + HTTP 状态 + `code` + 后端 message + 延迟 + 复制按钮，正文是 `<pre>` 渲染的语法高亮 JSON（紫 = key / 翡翠 = string / 红 = bool/null / 琥珀 = number）
  - **历史**：最近 8 次调用，绿/红圆点 + method + 工具名 + HTTP code + 延迟 + 时间

**raw fetch**：MCP 页面**绕过 [api.ts](../src/lib/api.ts) 的 `request` helper**，自己发 fetch 拿到完整 envelope（`{code, message, data}`）展示——演示页就是要让评委看到完整响应，不能被 helper 自动解包。错误也算"发送成功"（HTTP OK + code != 0），便于调试。

---

### F4 · 设计图分析（Diagrams）

**位置**：[src/pages/Diagrams.tsx](../src/pages/Diagrams.tsx)

**3 Tab**：

**Tab 1 一致性**（`GET /diagram-consistency`）：
- 左 5 列：大圆环（180 svg + 70 半径 + stroke-dasharray 动画 0.7s）+ 评分等级 Badge（优 / 良 / 中 / 差）+ 类总数信息
- 右 7 列：4 KPI 卡（匹配 / 代码缺 / 图缺 / 关系差异），各自配对应 tone（emerald / rose / amber / violet）和 hint
- 下方 2 栏对照：代码缺失类（rose chip）vs 图缺失类（amber chip），各自 mono 显示
- 全宽：关系差异 2 列（代码缺关系 / 图缺关系），每行带小色点 + 关系字符串
- 全宽：建议列表用 shadcn `<Alert variant="info">` 一段一卡

**Tab 2 图洞察**（`GET /diagram-insights`）：
- 顶部 3 KPI（总图数 / 解析成功 / 解析失败）
- 每张图一张卡 (`grid lg:grid-cols-2`)，按 `diagramType` 显示不同小指标矩阵：
  - 通用：节点 / 关系 / 孤立节点（孤立 > 0 时琥珀色高亮）
  - CLASS：继承 / 依赖 / 聚合
  - USE_CASE：参与者 / 用例
  - ACTIVITY：动作 / 判断 / 开始 / 终止
- 告警用 `<Alert variant="warning">` 列出，错误用 `<Alert variant="destructive">`

**Tab 3 图摘要**（`GET /diagram-summary`）：
- 同 Tab 2 顶部 3 KPI
- 按 diagramType 聚合的 grid 卡，每卡显示总数 + 解析数 + 失败数 + 实体数 + 关系数

**容错**：每个 Tab 各自 `useQuery` + retry=0 + silent=true，三个互不干扰。无项目选 / 接口报错时显示空状态卡，不破整页。

---

## 三、视觉一致性 & 设计系统贯穿

| 元素 | 决策 |
|---|---|
| 颜色变量 | 全部走 `var(--color-*)` 或 oklch literal，禁止 hex |
| LK 主题色 | 翡翠 `oklch(0.62 0.18 165)` + 紫罗兰 `oklch(0.55 0.22 295)`（Phase 1 已定） |
| AI / MCP 主题 | 紫罗兰 + 海蓝径向渐变作为 hero 光晕（错开 LK） |
| Risk 色阶 | LOW emerald / MEDIUM amber / HIGH orange / CRITICAL rose（与 LK / CK 不冲突） |
| 圆环 / 进度 | 自己写 SVG（一致性圆环）或用 shadcn progress（注释率） |
| Mono 字体 | 所有 fqn / path / 数字标签都用 `font-mono` + `tabular-nums` |
| 间距/圆角 | 统一 `rounded-md / rounded-lg`，间距走 Tailwind v4 token |
| 暗色 | 走 oklch 自适应（无显式深色覆盖） |

---

## 四、给用户的验收测试教程

### 前置条件

```bash
cd metriscope-web
pnpm dlx shadcn@latest add accordion hover-card alert textarea  # 先装 4 个 shadcn 组件（生成 .tsx 文件）
pnpm install                                                     # 如果上一步有新增 npm 包就跑一下
pnpm dev                                                         # 启动 http://localhost:5173
```

确保后端已经在 `http://localhost:8080` 跑（`mvnw.cmd spring-boot:run`），并且：
- 已创建至少 1 个项目
- 已注册源码路径 + 上传过类图（`.puml`）
- 已成功跑过至少一次分析（`/analysis` 页能看到 FINISHED 任务）

---

### F1 · 代码构成卡

1. 打开 `/metrics`
2. KPI 行下方应看到一张全宽 **"代码构成 · LoC Anatomy"** 卡片
3. **验证**：
   - 左侧大数字 = Java 文件数（与后端 SnapshotSummary `javaFileCount` 一致）
   - 中间 3 段堆叠条颜色：蓝 / 翡翠 / 浅灰，三个数字相加 = 总物理行数
   - 右侧圆环 = 注释率（百分比），数字颜色随阈值变化（>15% 翡翠 / 5-15% 琥珀 / <5% 红）
   - 顶左角有淡淡紫色光晕（不抢戏）

---

### F5 · 风险中心 5 Tab

1. 打开 `/metrics`
2. 找到 **"风险中心"** 卡（位于双雷达下方左侧 2/3 宽）
3. **验证**：
   - 5 个 Tab：综合 / 复杂方法 / 高耦合 / 低内聚 / 高 RFC，每个 Tab 标签下面有计数
   - 每个 Tab 切换后底下 Top 10 排行刷新
   - 每行右下有进度小条，离阈值越远越满
   - **点击任一类目行 → 跳 `/metrics/class/:fqn`**（昨晚 F2 类详情页接住）
   - 复杂方法 Tab 点行 → 跳所属类详情页
   - hover 行时右上角浮出 ↗ 图标

---

### F3 · 力导向图

1. 打开 `/metrics`
2. 找到 **"依赖摘要"** 卡（右上 1/3 宽）
3. 点击右上角 **"全屏图"** 按钮
4. **验证**：
   - 弹大 Dialog（95vw × 85vh），SVG 画布填充
   - 节点初始为环形布局，几秒后稳定
   - 节点颜色 = 风险等级（4 色），半径 = √WMC
   - **滚轮**：缩放 0.2× ~ 4×
   - **拖动节点**：节点跟手，松手回弹力学位置
   - **拖动空白**：平移整张图
   - **点击节点**：1 跳邻居高亮，其余淡化；右下角弹"节点详情"卡（含 WMC/CBO/RFC/LoC）
   - 点击空白 / ✕ 取消选中
   - 顶部工具条：搜索（实时高亮） / "仅风险类" 切换 / 重置
   - 左上角图例显示 4 个风险色
   - 边按 edgeType 不同样式（EXTENDS 粗实 / IMPLEMENTS 虚 / FIELD 极细虚等）
   - 关闭 Dialog 后 simulation 销毁（再开重新跑）

---

### F10 · MCP 调试台

1. 侧边栏点 **"MCP"**（Bot 图标）→ 进 `/mcp`
2. **验证布局**：
   - 顶部 hero：紫青光晕 + "MCP 工具调试台" + 工具数 badge
   - 左栏 Accordion 7 类（项目 / 任务 / 指标&风险 / 快照 / 图分析 / 报告 / 估算）默认全展开
   - 每类 + 计数 badge
   - 工具行：method badge（POST 紫 / GET 海蓝）+ 工具名 + 描述截行
3. **验证调用**：
   - 选 `analyze-project`（POST），右栏 hero 显示工具元信息
   - "请求" Tab 自动填好示例 body `{ "projectId": <当前项目ID> }`
   - 点 **发送** → 自动切 "响应" Tab → 看到 ok Badge + HTTP 200 + code 0 + 延迟 ms + JSON 高亮（紫 key / 翡翠 string / 琥珀 number / 红 bool）
   - 复制按钮工作
4. **验证错误流**：
   - 改 body 成 `{ "projectId": 999999 }` → 发送 → 红 Badge + code 不为 0 + 后端 message
5. **验证 GET 工具**：
   - 选 `analysis-queue-status` (GET)
   - "请求" Tab 显示 Alert "GET 请求无需 body"
   - 直接发送，看响应
6. **验证搜索**：左栏顶部输入 "hot" → 只剩 `get-hotspots` 这类
7. **验证历史**：调几次后切 "历史" Tab，最近 8 条按时间倒序，含状态点 / method / 延迟

---

### F4 · 图分析

1. 侧边栏点 **"图分析"**（GitCompare 图标）→ 进 `/diagrams`
2. **Tab 1 一致性**：
   - 左侧大圆环转出动画到分数（如 78.5%）；分数 ≥90 翡翠 / ≥70 琥珀 / 否则红
   - 右侧 4 KPI 卡（匹配 / 代码缺 / 图缺 / 关系差异）数字 = 后端字段
   - 下方 2 栏：缺失类列表（rose / amber chip）
   - 关系差异列表（代码缺 / 图缺）
   - 建议列表用 info Alert 列出
3. **Tab 2 图洞察**：
   - 顶部 3 KPI（总图数 / 解析成功 / 解析失败）
   - 每张图一张卡，按 `diagramType` 显示不同小指标（CLASS 显示继承/依赖/聚合，USE_CASE 显示参与者/用例，ACTIVITY 显示动作/判断/开始/终止）
   - 孤立节点 > 0 时这格琥珀高亮
   - warnings 用黄色 Alert 列出
4. **Tab 3 图摘要**：
   - 顶部 3 KPI
   - 按 diagramType 聚合的卡片网格，每卡 5 个小指标
5. **错误态**：未上传图时 → 居中卡片 "尚未导入设计图" 提示

---

### 通用回归

1. 跑 `pnpm lint` 应输出 zero error（已验证 ✅）
2. 浏览器 DevTools Console 不应有红色报错
3. 切换项目（顶部 Select）所有页面跟着刷新数据
4. `/metrics` 页面 7 个区块上下排列：
   - KPI 行（5 张）
   - 代码构成卡（F1 全宽）
   - CK 雷达 + 复杂度直方
   - LK 雷达 + 类剖面
   - **风险中心 (2/3) + 依赖摘要 (1/3)**（F5 + F3 入口）
   - 类指标 / 方法指标 Tabs

---

## 五、未做 / 待后端的项

按 [PHASE2_DEV_PLAN.md](./PHASE2_DEV_PLAN.md) Step 1 清单：

| 编号 | 任务 | 状态 |
|---|---|---|
| F1 前端 | ✅ 已做（本轮）|
| F2 类详情页 | ✅ 上轮已做 |
| F3 力导向图 | ✅ 已做（本轮）|
| F4 图分析页 | ✅ 已做（本轮）|
| F5 风险中心增强 | ✅ 已做（本轮）|
| F6 McCall 雷达 | ⏸ **等后端 A** 提供 `/quality/mccall` |
| F7 认知复杂度列 | ⏸ **等后端 A** 在 `MethodMetricResponse` 加 `cognitiveComplexity` |
| F8 Code Smell 展示 | ⏸ **等后端 A** 提供 `/code-smells` |
| F9 MI 卡 | ⏸ **等后端 A** 在 `ClassMetricResponse` 加 `maintainabilityScore` 或独立 API |
| F10 MCP 演示页 | ✅ 已做（本轮）|
| F11 Vibe Prompt | ⏸ **等后端 B** 提供 `/ai/refactor-prompt` |
| F12 Quality Gate | ⏸ **等后端 B** 提供 `/quality-gates/evaluate` |
| F13 Typst 报告 | 纯后端 B，前端零改动 |

后端可参考 [API接口文档.md](../API接口文档.md) §13 的命名风格，新接口走 `/api/v1/...` 前缀，统一 `{code, message, data}` envelope。前端约 30min – 1.5h 即可对接每一项。

---

## 六、关键设计决策（备查）

1. **MCP 页用 raw fetch 不走 helper**：[api.ts](../src/lib/api.ts) 的 `request()` 会自动解 envelope 并对 `code != 0` 抛 ApiError——但 MCP 演示页就是要让评委看见完整 `{code, message, data}` 结构，所以单独写 `rawInvoke()` 直接 fetch 拿原文，能 ok / 能错都展示。
2. **力导向图用 d3 直接操作 DOM**：每 tick 60fps 更新 cx/cy 不能走 React render；用 d3-selection 直接更新 SVG 属性，React 只管 toolbar / info panel。两个 useEffect 分工：`[data]` 重建图 / `[search, selectedId]` 只改透明度。
3. **静态 ToolMeta 而非动态推断**：MCP 页静态写 19 工具的 `category + example`，因为后端 `GET /mcp/tools` 只返回 `{toolName, description, method, path}`，没有分类信息。后端将来加新工具会落到 "其他" 组兜底，不破。
4. **Dialog 内 `{open && <Graph/>}`**：力导向图 Dialog 关闭后 simulation 必须销毁——React 条件渲染最干净。
5. **shadcn alert 自加变体**：标准 shadcn 只有 default / destructive，本轮项目用到 info / success / warning / destructive 4 套——所以 [src/components/ui/alert.tsx](../src/components/ui/alert.tsx) 用 `cva` 加了 4 个 variant（确认 user 用 shadcn CLI 生成的官方版本如果不一样，直接复制本文档里的 variants 块覆盖即可）。

---

## 七、统计

- 新增代码 ~1700 行（4 个文件）
- 修改 5 个文件（api.ts / Metrics.tsx / App.tsx / AppShell.tsx / index.css）
- 5 个功能点，全部基于真实后端接口（零 mock）
- TypeScript strict 全通过
