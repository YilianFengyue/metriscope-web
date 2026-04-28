# MetriScope Phase 2 扩展迭代开发计划

> 生成日期：2026-04-28  
> 适用范围：MetriScope 软件度量平台 · 第二阶段扩展开发  
> 团队：3 人（后端 A · 后端 B · 前端C）  
> 迭代策略：**两个 Step 渐进交付**，Step 1 为明日 Demo 版，Step 2 为完善版

---

## 目录

- [§0 当前基线总结](#0-当前基线总结)
- [§1 本轮迭代目标与原则](#1-本轮迭代目标与原则)
- [§2 Step 1 — Demo 版（今晚 + 明天）](#2-step-1--demo-版今晚--明天)
  - [牌 1：深度剖析 — 基础度量可视化做深做透](#牌-1深度剖析--基础度量可视化做深做透)
  - [牌 2：质量模型 — 扩展度量让老师满意](#牌-2质量模型--扩展度量让老师满意)
  - [牌 3：AI 亮点 — MCP + AI 闭环震撼展示](#牌-3ai-亮点--mcp--ai-闭环震撼展示)
- [§3 Step 2 — 完善版（Demo 后 2-3 天）](#3-step-2--完善版demo-后-2-3-天)
- [§4 三人分工矩阵](#4-三人分工矩阵)
- [§5 新增 API 契约速查](#5-新增-api-契约速查)
- [§6 开发规约](#6-开发规约)
- [§7 风险与备选方案](#7-风险与备选方案)

---

## §0 当前基线总结

### 已通主链路

```
创建项目 → 导入源码/设计图 → Java AST 解析 → CK/LK/LoC/圈复杂度计算
→ 风险识别 → 快照生成 → 指标查询/趋势/对比 → 报告导出 → 项目估算 → MCP 工具暴露
```

### 29 功能点状态速查

| # | 功能点 | 后端 | 前端 | 结论 |
|---|--------|------|------|------|
| 1 | CK 六项 | ✅ 已完成 | ✅ 雷达图 + 表格 | 已通 |
| 2 | LK 四项 | ✅ 已完成 | ✅ 表格列 | 已通 |
| 3 | 圈复杂度排行 | ✅ 数据齐全 | ✅ 分布图 + 风险榜 | 已通 |
| 4 | LoC 完整度量 | ⚠️ 缺注释行/空白行/注释率 | ⚠️ 只展示 totalLoc | **Step 1 补** |
| 5 | COCOMO 估算 | ✅ 已完成 | ✅ 表单 + 结果 | 已通 |
| 6 | 类详情页 | ⚠️ 无专用接口，数据可拼 | ❌ 无页面 | **Step 1 做** |
| 7 | IFPUG 完整版 | ⚠️ 只有简化 FP | ⚠️ 简化表单 | Step 2 升级 |
| 8 | UCP 估算 | ✅ 已完成 | ✅ 表单 | 已通 |
| 9 | McCall 质量模型 | ❌ 未做 | ❌ 无页面 | **Step 1 做** |
| 10 | 图一致性页 | ✅ 3 个 API 齐全 | ❌ 无页面 | **Step 1 做** |
| 11 | 类依赖关系图 | ✅ 数据接口齐全 | ❌ 无可视化 | **Step 1 做** |
| 12 | 风险中心完善 | ✅ 风险项 + MCP 热点 | ⚠️ 基础版 | **Step 1 增强** |
| 13 | AI Coding 任务记录 | ❌ 未做 | ❌ | Step 2 做 |
| 14 | AI Diff 质量分析 | ❌ 未做（可复用快照对比） | ❌ | **Step 1 简版** |
| 15 | AI Debt Score | ❌ 未做 | ❌ | Step 2 做 |
| 16 | Vibe Prompt 生成 | ❌ 未做（report-draft-ai 可复用） | ❌ | **Step 1 做** |
| 17 | MCP 演示页 | ✅ 接口齐全 | ❌ 无页面 | **Step 1 做** |
| 18 | 对比实验展示 | ⚠️ 快照对比可用 | ⚠️ 可手动选快照 | Step 2 完善 |
| 19 | 认知复杂度 | ❌ 未做 | ❌ | **Step 1 做** |
| 20 | 重复代码检测 | ❌ 未做 | ❌ | Step 2 做 |
| 21 | 可维护性评分 MI | ❌ 未做 | ❌ | **Step 1 做** |
| 22 | Code Smell | ⚠️ 风险规则可复用 | ❌ | **Step 1 做** |
| 23 | ISO 25010 映射 | ❌ 未做 | ❌ | Step 2 做 |
| 24 | 测试覆盖率 | ❌ 未做 | ❌ | Step 2 看时间 |
| 25 | 包级依赖指标 | ❌ 未做 | ❌ | Step 2 做 |
| 26 | 风险热力图 | ❌ 无专用接口（前端可聚合） | ❌ | Step 2 做 |
| 27 | Tauri 打包 | — | ❌ | Step 2 看时间 |
| 28 | 特征点估算 | ✅ 已完成 | ✅ 表单 | 已通 |
| 29 | multipart 上传 | ❌ 路径模式可演示 | — | Step 2 看时间 |

---

## §1 本轮迭代目标与原则

### 目标

**Step 1 明日 Demo**：展示一个"基础扎实、模型专业、AI 闪光"的完整软件度量平台。

**Step 2 完善版**：补齐课程深度内容 + AI 创新闭环完整化。

### 三条开发原则

**原则 1：冻结已有功能，只增不改。**

Phase 1 已通的 8 个页面 + 所有已有 API 不做重构，只在上面叠加新功能。任何已有接口的修改必须保持向后兼容。

**原则 2：两个 Step 渐进交付，Step 1 必须可独立 Demo。**

Step 1 交付后即使 Step 2 全部砍掉，项目也能完整展示和答辩。Step 2 的功能是锦上添花，不是救火。

**原则 3：模块拆解 → AI 委托 → 人工验收。**

每个功能点拆成独立模块，说清输入/输出/API 契约，可以直接丢给 AI Coding 工具生成。完成后由负责人测试验收，写完成记录。

---

## §2 Step 1 — Demo 版（今晚 + 明天）

> **目标：打好三张牌，每张牌对应一个答辩叙事。**

---

### 牌 1：深度剖析 — 基础度量可视化做深做透

> **答辩叙事：我们不是只算数字，而是从项目总览 → 类级诊断 → 方法级定位 → 依赖结构 → 设计一致性，形成完整的质量剖析链路。**

---

#### F1. LoC 规模度量补全

**做什么：** 后端将 parser 已有的注释行/空白行/文件数暴露到 Snapshot API，前端总览页展示完整规模卡片。

**后端任务：**

1. `mf_snapshots` 表新增字段：

```sql
ALTER TABLE mf_snapshots ADD COLUMN java_file_count INT DEFAULT 0;
ALTER TABLE mf_snapshots ADD COLUMN blank_lines INT DEFAULT 0;
ALTER TABLE mf_snapshots ADD COLUMN comment_lines INT DEFAULT 0;
ALTER TABLE mf_snapshots ADD COLUMN comment_rate DECIMAL(5,2) DEFAULT 0;
```

2. `SnapshotSummary` DTO 新增对应字段：

```java
public class SnapshotSummary {
    // ... 已有字段
    private int javaFileCount;
    private int blankLines;
    private int commentLines;
    private double commentRate; // commentLines / (totalLoc + commentLines + blankLines)
}
```

3. 快照生成逻辑中，从 `ProjectModel` 读取 `totalLines`、`blankLines`、`commentLines`、`javaFileCount` 写入快照。

**前端任务：**

总览页 KPI 卡片区扩展，在已有 `totalLoc` 旁边增加：

| 卡片 | 数据源 |
|------|--------|
| Java 文件数 | `summary.javaFileCount` |
| 注释率 | `summary.commentRate` + 百分比展示 |
| 有效代码行 / 注释行 / 空白行 | 堆叠条形图或三个小数字 |

**负责人：** 后端 A（改表 + DTO + 生成逻辑）→ 前端C 前端展示  
**工时：** 后端 1h + 前端 30min  
**验收：** 总览页能看到 `文件数 18 | 注释率 12.3% | 代码行 850 / 注释 120 / 空白 90`

---

#### F2. 类详情页

**做什么：** 点击类列表中的某个类，进入独立详情页，展示该类的全维度诊断。

**后端任务：** 无。前端利用已有 4 个接口在前端按 `qualifiedName` 过滤。

**前端数据来源：**

| 数据 | 接口 | 过滤方式 |
|------|------|----------|
| CK/LK 指标 | `GET /projects/{id}/classes` | `find(c => c.qualifiedName === name)` |
| 方法列表 | `GET /projects/{id}/methods` | `filter(m => m.classQualifiedName === name)` |
| 依赖关系 | `GET /projects/{id}/dependencies` | `filter(d => d.fromClass === name \|\| d.toClass === name)` |
| 风险项 | `GET /projects/{id}/risks` | `filter(r => r.targetName === name)` |

**前端页面布局（建议 3 行 2 列网格）：**

```
┌─────────────────────────────┬─────────────────────────────┐
│  CK 雷达图                   │  LK 指标 4 个卡片            │
│  (WMC/RFC/CBO/LCOM/DIT/NOC) │  (CS / NOO / NOA / SI)      │
├─────────────────────────────┴─────────────────────────────┤
│  方法复杂度柱状图（按 cyclomaticComplexity 排序展示所有方法）│
├─────────────────────────────┬─────────────────────────────┤
│  依赖关系（谁依赖我 / 我依赖谁）│  风险项 + 改进建议          │
└─────────────────────────────┴─────────────────────────────┘
```

**路由：** `/metrics/class/:qualifiedName`（从类表格行点击跳转）

**负责人：** 前端C  
**工时：** 3-4h  
**验收：** 从指标表格点击 `OrderService` → 进入详情页 → 6 维雷达图 + 方法复杂度柱状图 + 依赖列表 + 风险说明全部展示

---

#### F3. 类依赖关系力导向图

**做什么：** 用力导向图展示类间依赖结构，节点颜色表示风险等级。

**后端任务：** 无。`GET /dependencies` + `GET /classes` 数据已齐全。

**前端实现：**

推荐用 **D3 force-directed graph**（项目已有 D3 依赖预留）或 **Recharts 自定义 SVG**。

节点构建：

```typescript
// 从 classes 构建节点
const nodes = classes.map(c => ({
  id: c.qualifiedName,
  label: c.className,
  riskLevel: c.riskLevel, // LOW / MEDIUM / HIGH / CRITICAL
  wmc: c.weightedMethodsPerClass,
}));

// 从 dependencies 构建边
const edges = dependencies.map(d => ({
  source: d.fromClass,
  target: d.toClass,
  type: d.edgeType,
}));
```

节点颜色映射：

| riskLevel | 颜色 |
|-----------|------|
| LOW | `hsl(var(--success))` 绿色 |
| MEDIUM | `hsl(var(--warning))` 黄色 |
| HIGH | `hsl(var(--danger))` 橙红 |
| CRITICAL | `hsl(var(--destructive))` 红色 |

**放置位置：** 在现有图表页（P6）新增一个 Tab "依赖关系图"，或在总览页下方新增区域。

**负责人：** 前端C  
**工时：** 3-4h（D3 力导向图需要调参）  
**验收：** 能看到节点 + 边 + 颜色区分 + 鼠标悬浮显示类名和指标

---

#### F4. 图一致性展示页

**做什么：** 将后端已有的三个图分析 API 结果可视化展示。

**后端任务：** 无。三个 API 已全部就绪。

**前端数据源：**

| Tab | 接口 | 展示内容 |
|-----|------|----------|
| 一致性检查 | `GET /diagram-consistency` | 一致性分数（大数字）+ 匹配/缺失/不匹配列表 + 建议 |
| 图语义洞察 | `GET /diagram-insights` | 每张图的节点数/关系数/孤立节点/告警 |
| 图摘要 | `GET /diagram-summary` | 按图类型汇总统计 |

**页面布局建议：**

```
┌─────────────────────────────────────────────────┐
│  一致性分数大圆环（如 78.57%）                    │
│  + 4 个小卡片：匹配 9 | 代码缺 1 | 图缺 3 | 关系差异 6  │
├────────────────────┬────────────────────────────┤
│  缺失在代码中的类    │  缺失在图中的类             │
│  (红色列表)          │  (橙色列表)                 │
├────────────────────┴────────────────────────────┤
│  建议列表（suggestions）                          │
└─────────────────────────────────────────────────┘
```

**路由：** `/diagrams`（新增侧边栏入口，图标用 `FileCode` 或 `GitCompare`）

**负责人：** 前端C  
**工时：** 2-3h  
**验收：** 上传类图后，页面显示一致性分数 + 缺失项列表 + 改进建议

---

#### F5. 风险中心页增强

**做什么：** 现有风险榜从 Top 10 扩展为多维排行 + 交叉风险表。

**后端任务：** 无。前端直接对 `GET /risks` + `GET /classes` + `GET /methods` 做前端排序聚合。

**前端新增内容：**

1. **分类排行 Tabs**：高复杂度方法 Top 10 / 高耦合类 Top 10 / 低内聚类 Top 10 / 高 RFC 类 Top 10

```typescript
// 高复杂度方法
const complexMethods = methods
  .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
  .slice(0, 10);

// 高耦合类
const coupledClasses = classes
  .sort((a, b) => b.couplingCount - a.couplingCount)
  .slice(0, 10);
```

2. **交叉风险表**（可选，时间够做）：

| 类 | 圈复杂度 | CBO | LCOM | 风险 | 结论 |
|----|---------|-----|------|------|------|
| OrderService | 18 | 10 | 0.82 | HIGH | 多维风险，优先重构 |

**负责人：** 前端C  
**工时：** 1-2h  
**验收：** 4 个分类排行榜都有数据，点击某个类能跳到类详情页

---

### 牌 2：质量模型 — 扩展度量让老师满意

> **答辩叙事：我们不仅实现了 CK/LK 基础度量，还引入了 McCall 质量模型、认知复杂度、Code Smell 检测和可维护性评分，从多维度对软件质量进行系统性评估。**

---

#### F6. McCall 质量模型评估

**做什么：** 将已有度量指标映射到 McCall 质量因子体系，计算各因子评分，前端展示雷达图。

**后端任务（后端 A）：**

1. **不建表**，先用 Java 代码内置配置：

```java
// McCallConfig.java — 枚举定义
public enum QualityFactor {
    MAINTAINABILITY("可维护性"),
    RELIABILITY("可靠性"),
    TESTABILITY("可测试性"),
    EFFICIENCY("效率"),
    REUSABILITY("可复用性"),
    FLEXIBILITY("灵活性");
}
```

2. **映射关系配置**（硬编码即可，后续可数据库化）：

| Factor | Criteria | 映射指标 | 权重 |
|--------|----------|----------|------|
| Maintainability | Simplicity | avgComplexity, avgCognitiveComplexity | 0.35 |
| Maintainability | Modularity | avgCBO, avgLCOM | 0.35 |
| Maintainability | Self-descriptiveness | commentRate | 0.15 |
| Maintainability | Consistency | consistencyScore | 0.15 |
| Reliability | Error Tolerance | highRiskCount (反向) | 0.5 |
| Reliability | Accuracy | testPassRate (暂用 1.0) | 0.5 |
| Testability | Simplicity | avgComplexity | 0.6 |
| Testability | Modularity | avgCBO | 0.4 |
| Efficiency | Conciseness | avgMethodLoc | 0.5 |
| Efficiency | Execution Efficiency | maxComplexity (反向) | 0.5 |
| Reusability | Modularity | avgCBO (反向), avgLCOM (反向) | 0.6 |
| Reusability | Generality | avgDIT | 0.4 |
| Flexibility | Modularity | avgCBO (反向) | 0.5 |
| Flexibility | Expandability | avgNOC, avgDIT | 0.5 |

3. **归一化函数**（将原始指标映射到 0-100 分）：

```java
// 正向指标（越高越好，如注释率）
double normalizePositive(double value, double min, double max) {
    return Math.max(0, Math.min(100, (value - min) / (max - min) * 100));
}

// 反向指标（越低越好，如圈复杂度）
double normalizeNegative(double value, double idealMax, double worstMax) {
    if (value <= idealMax) return 100;
    if (value >= worstMax) return 0;
    return (worstMax - value) / (worstMax - idealMax) * 100;
}
```

阈值参考：

| 指标 | 理想值 (100分) | 最差值 (0分) | 方向 |
|------|---------------|-------------|------|
| avgComplexity | ≤ 3 | ≥ 15 | 反向 |
| avgCBO | ≤ 3 | ≥ 12 | 反向 |
| avgLCOM | ≤ 0.3 | ≥ 0.9 | 反向 |
| commentRate | ≥ 20% | ≤ 2% | 正向 |
| highRiskCount | 0 | ≥ 10 | 反向 |
| avgMethodLoc | ≤ 15 | ≥ 60 | 反向 |

4. **新增 API**：

```
GET /api/v1/projects/{projectId}/quality/mccall
```

**响应体：**

```json
{
  "projectId": 1,
  "snapshotId": 10,
  "overallScore": 82.4,
  "factors": [
    {
      "factor": "MAINTAINABILITY",
      "factorName": "可维护性",
      "score": 78.5,
      "criteria": [
        {
          "criteria": "Simplicity",
          "criteriaName": "简洁性",
          "score": 75.0,
          "metrics": [
            {
              "metricName": "averageComplexity",
              "metricLabel": "平均圈复杂度",
              "rawValue": 4.2,
              "normalizedScore": 80.0,
              "weight": 0.5
            }
          ]
        }
      ]
    }
  ]
}
```

**前端任务（前端C）：**

在总览页新增 McCall 雷达图区域：

- 6 维雷达图（Recharts RadarChart），每个轴是一个 Factor，值为 score
- 雷达图下方展示 `overallScore` 大数字 + 等级（A/B/C/D）
- 可选：点击某个 Factor 弹窗展示 criteria 明细

**负责人：** 后端 A（Service + Controller 约 2h）→ 前端C 前端雷达图（1-2h）  
**工时：** 后端 2h + 前端 1.5h  
**验收：** 总览页出现 6 维 McCall 雷达图 + 综合评分

---

#### F7. 认知复杂度（简化版）

**做什么：** 为每个方法增加 Cognitive Complexity 计算，和圈复杂度对比展示。

**后端任务（后端 A）：**

1. 在 JavaParser AST 遍历中新增认知复杂度计算：

```java
// 简化版规则
int cognitiveComplexity = 0;
int nestingLevel = 0;

// 遍历方法体 AST 节点
visit(IfStmt)      → cognitiveComplexity += 1 + nestingLevel; nestingLevel++;
visit(ForStmt)     → cognitiveComplexity += 1 + nestingLevel; nestingLevel++;
visit(WhileStmt)   → cognitiveComplexity += 1 + nestingLevel; nestingLevel++;
visit(SwitchStmt)  → cognitiveComplexity += 1 + nestingLevel; nestingLevel++;
visit(CatchClause) → cognitiveComplexity += 1 + nestingLevel; nestingLevel++;
visit(ConditionalExpr) → cognitiveComplexity += 1 + nestingLevel; // 三元
// 离开控制流节点 → nestingLevel--;
// 递归调用自身 → cognitiveComplexity += 1;
// && || 在 if 条件中 → cognitiveComplexity += 1;
```

2. `mf_method_metrics` 新增字段：

```sql
ALTER TABLE mf_method_metrics ADD COLUMN cognitive_complexity INT DEFAULT 0;
```

3. `MethodMetricResponse` 新增 `cognitiveComplexity` 字段。

4. `ClassMetricResponse` 新增 `avgCognitiveComplexity` / `maxCognitiveComplexity`。

**前端任务：**

- 方法表格新增 `认知复杂度` 列
- 类详情页新增"圈复杂度 vs 认知复杂度"双柱对比图
- 风险中心可新增一个 Tab：高认知复杂度方法 Top 10

**负责人：** 后端 A  
**工时：** 后端 2-3h + 前端 1h  
**验收：** 方法表格出现认知复杂度列，能找到"圈复杂度不高但认知复杂度很高"的嵌套方法

---

#### F8. Code Smell 检测（规则版）

**做什么：** 基于已有指标数据，用规则检测常见代码坏味道，输出 smell 列表和技术债估算。

**后端任务（后端 A）：**

1. 新增 `CodeSmellDetector` 规则引擎（可扩展风险模块，或独立模块）：

```java
// 规则定义
List<SmellRule> rules = List.of(
    new SmellRule("LONG_METHOD",     "方法过长",     "method", "loc > 50"),
    new SmellRule("LARGE_CLASS",     "类过大",       "class",  "loc > 300"),
    new SmellRule("GOD_CLASS",       "上帝类",       "class",  "wmc > 40 && cbo > 10"),
    new SmellRule("LONG_PARAM_LIST", "参数过多",     "method", "parameterCount > 5"),
    new SmellRule("HIGH_COUPLING",   "高耦合",       "class",  "cbo > 8"),
    new SmellRule("LOW_COHESION",    "低内聚",       "class",  "lcom > 0.8"),
    new SmellRule("DEEP_INHERITANCE","继承过深",     "class",  "dit > 4"),
    new SmellRule("COMPLEX_METHOD",  "复杂方法",     "method", "cyclomaticComplexity > 15"),
    new SmellRule("FEATURE_ENVY",    "依赖外部过多", "class",  "fanOut > fanIn * 3"),
    new SmellRule("EMPTY_CATCH",     "空异常捕获",   "method", "hasEmptyCatch == true")
);
```

2. 技术债估算（简化版）：

```java
// 每种 smell 对应修复时间（分钟）
Map<String, Integer> debtMinutes = Map.of(
    "LONG_METHOD", 30,
    "LARGE_CLASS", 60,
    "GOD_CLASS", 120,
    "HIGH_COUPLING", 45,
    // ...
);
double totalDebtHours = smells.stream()
    .mapToInt(s -> debtMinutes.getOrDefault(s.type, 20))
    .sum() / 60.0;
```

3. **新增 API**：

```
GET /api/v1/projects/{projectId}/code-smells
```

**响应体：**

```json
{
  "projectId": 1,
  "snapshotId": 10,
  "totalSmellCount": 23,
  "totalDebtHours": 11.5,
  "smellsByType": {
    "LONG_METHOD": 8,
    "LARGE_CLASS": 3,
    "HIGH_COUPLING": 5,
    "GOD_CLASS": 1
  },
  "items": [
    {
      "smellType": "LONG_METHOD",
      "smellName": "方法过长",
      "targetType": "METHOD",
      "targetName": "com.demo.OrderService.createOrder",
      "triggerMetric": "loc",
      "triggerValue": 85,
      "threshold": 50,
      "debtMinutes": 30,
      "suggestion": "建议将该方法拆分为多个职责单一的私有方法"
    }
  ]
}
```

**前端任务：**

- 新增 Code Smell 展示区域（可放在风险中心页新 Tab，或独立页）
- 顶部卡片：Smell 总数 + 技术债时间
- 按类型分组的饼图/柱状图
- 明细列表（可点击跳到类详情页）

**负责人：** 后端 A  
**工时：** 后端 2h + 前端 1.5h  
**验收：** 能看到 `Code Smell: 23 个 | 技术债: 11.5 小时 | 主要问题: Long Method × 8`

---

#### F9. 可维护性评分 MI（简化版）

**做什么：** 为每个类计算简化可维护性评分，项目级给出平均 MI。

**后端任务（后端 A）：**

依赖 F1（LoC 补全）完成后再做。

```java
// 简化公式（不用 Halstead，避免被老师追问细节）
// 满分 100，各项扣分
double maintainabilityScore = 100.0;
maintainabilityScore -= complexityPenalty(avgComplexity);    // 复杂度扣分，最多 -30
maintainabilityScore -= sizePenalty(loc);                     // 规模扣分，最多 -25
maintainabilityScore -= couplingPenalty(cbo);                 // 耦合扣分，最多 -25
maintainabilityScore -= cohesionPenalty(lcom);                // 内聚扣分，最多 -20
maintainabilityScore = Math.max(0, maintainabilityScore);
```

等级映射：

| MI 分数 | 等级 | 颜色 |
|---------|------|------|
| 80-100 | Good | 绿色 |
| 60-79 | Moderate | 黄色 |
| 40-59 | Low | 橙色 |
| 0-39 | Critical | 红色 |

两种实现路径（选一种）：

**路径 A（推荐）**：在 `ClassMetricResponse` 中新增 `maintainabilityScore` 字段，随分析一起算好存入 `mf_class_metrics`。

**路径 B**：不改表，新增独立 API 实时计算。

```
GET /api/v1/projects/{projectId}/maintainability
```

**前端任务：**

- 总览页新增"平均可维护性评分"卡片
- 类详情页展示该类的 MI 分数 + 等级 Badge
- 可选：MI 分布直方图

**负责人：** 后端 A  
**工时：** 后端 1h + 前端 30min  
**验收：** 总览页显示 `可维护性 72.3 Moderate`

---

### 牌 3：AI 亮点 — MCP + AI 闭环震撼展示

> **答辩叙事：我们将软件度量结果通过 MCP 协议暴露给 AI 编码助手，实现"度量 → 发现问题 → AI 自动重构 → 再次度量 → 质量提升"的闭环。这不是蹭 AI 热点，而是从软件质量保证角度回答了一个关键问题——AI 写的代码到底好不好？**

---

#### F10. MCP 演示页

**做什么：** 展示 MCP 工具列表 + 选择工具 → 填参数 → 发请求 → 看 JSON 响应的交互演示。

**后端任务：** 无。`GET /mcp/tools` + 各工具调用接口已齐全。

**前端页面布局：**

```
┌───────────────────┬─────────────────────────────────┐
│  工具列表          │  工具详情 + 调用面板              │
│  (左侧列表)        │                                  │
│  ☐ analyze_project │  工具名：get-hotspots             │
│  ☐ get-class-metrics│  描述：查询风险热点               │
│  ☐ get-hotspots    │  方法：POST                       │
│  ☐ compare-snapshots│  路径：/api/v1/mcp/tools/...     │
│  ☐ diagram-consistency│                                │
│  ☐ report-draft-ai │  ┌─ 请求体 (JSON 编辑器) ──────┐ │
│  ☐ estimate-project│  │ { "projectId": 1,            │ │
│  ...               │  │   "limit": 5 }               │ │
│                    │  └──────────────────────────────┘ │
│                    │  [发送请求]                        │
│                    │  ┌─ 响应 (JSON 高亮) ───────────┐ │
│                    │  │ { "code": "0", "data": [...] }│ │
│                    │  └──────────────────────────────┘ │
└───────────────────┴─────────────────────────────────┘
```

**路由：** `/mcp`（新增侧边栏入口，图标 `Bot` 或 `Plug`）

**负责人：** 前端C  
**工时：** 2-3h  
**验收：** 能选择 13 个工具中的任意一个 → 填参数 → 发请求 → 看到真实响应 JSON

---

#### F11. Vibe Coding 反馈 Prompt 生成

**做什么：** 基于度量结果，自动生成面向 AI 编码助手的结构化重构指令。

**后端任务（后端 B）：**

1. 基于已有的 `RiskItem` + `ClassMetric` + `MethodMetric` 生成 Prompt：

```java
public class RefactorPromptGenerator {

    public String generate(List<RiskItem> risks,
                           List<ClassMetric> classes,
                           List<MethodMetric> methods) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("本次软件度量分析发现以下质量问题，请在不改变外部 API 的前提下进行重构：\n\n");

        // 按风险等级排序
        risks.stream()
            .sorted(byRiskLevel)
            .limit(10)
            .forEach(risk -> {
                prompt.append(String.format(
                    "%d. %s 的 %s = %.1f，超过阈值 %.1f。%s\n",
                    index, risk.getTargetName(), risk.getMetricName(),
                    risk.getMetricValue(), risk.getThresholdValue(),
                    risk.getMessage()
                ));
            });

        prompt.append("\n请执行以下优化：\n");
        // 根据 smell 类型生成具体指令
        appendRefactorActions(prompt, risks);
        prompt.append("\n约束：保证 mvn test 全部通过，不修改公共接口签名。");

        return prompt.toString();
    }
}
```

2. **新增 API**：

```
GET /api/v1/projects/{projectId}/ai/refactor-prompt
```

**响应体：**

```json
{
  "projectId": 1,
  "snapshotId": 10,
  "riskCount": 8,
  "prompt": "本次软件度量分析发现以下质量问题...\n\n1. OrderService.createOrder 圈复杂度 = 17，超过阈值 10...\n\n请执行以下优化：\n- 提取订单校验逻辑为独立私有方法...",
  "targetClasses": ["com.demo.OrderService", "com.demo.PaymentValidator"],
  "generatedAt": "2026-04-28T20:00:00Z"
}
```

3. **新增 MCP 工具**（后端 B）：

```
POST /api/v1/mcp/tools/refactor-prompt
```

请求体：`{ "projectId": 1 }`

这样 Claude Code 就可以直接调用这个 MCP 工具获取重构指令。

**前端任务：**

- 在 MCP 演示页或新 Tab 中展示：
  - Prompt 预览（Markdown 渲染，代码块高亮）
  - "复制 Prompt" 按钮
  - 可选：target classes 列表（可点击跳类详情）

**负责人：** 后端 B（生成逻辑 + API + MCP 工具 约 2h）→ 前端C 前端展示（1h）  
**工时：** 后端 2h + 前端 1h  
**验收：** 点击"生成重构 Prompt" → 看到结构化的 AI 可执行指令 → 复制到 Claude Code 能直接用

---

#### F12. AI 质量对比（基于已有快照对比）

**做什么：** 在对比页增加 "AI Patch Quality Gate" 视角——标注哪些指标改善/恶化，给出合并建议。

**后端任务（后端 B）：**

新增 API（基于已有的 `compare` 接口增强）：

```
POST /api/v1/projects/{projectId}/quality-gates/evaluate
```

**请求体：**

```json
{
  "fromSnapshotId": 1,
  "toSnapshotId": 2,
  "source": "AI_PATCH"
}
```

**响应体：**

```json
{
  "projectId": 1,
  "fromSnapshotId": 1,
  "toSnapshotId": 2,
  "source": "AI_PATCH",
  "verdict": "WARN",
  "verdictLabel": "需关注",
  "totalScore": 72,
  "checks": [
    {
      "metric": "averageComplexity",
      "metricLabel": "平均圈复杂度",
      "fromValue": 5.8,
      "toValue": 7.1,
      "delta": 1.3,
      "direction": "WORSE",
      "passed": false,
      "message": "复杂度上升 22%，超过 10% 恶化阈值"
    },
    {
      "metric": "highRiskCount",
      "metricLabel": "高风险项数",
      "fromValue": 3,
      "toValue": 2,
      "delta": -1,
      "direction": "BETTER",
      "passed": true,
      "message": "风险项减少 1 个"
    }
  ],
  "suggestion": "建议关注复杂度上升问题后再合并"
}
```

`verdict` 规则：

| 条件 | verdict |
|------|---------|
| 所有 checks 通过 | PASS |
| 有 WORSE 但无 CRITICAL | WARN |
| 复杂度或风险严重恶化 | BLOCK |

**前端任务：**

- 对比页新增 "Quality Gate" 区域
- verdict 大 Badge（PASS 绿 / WARN 黄 / BLOCK 红）
- checks 列表，每项带箭头（↑ 红 / ↓ 绿 / → 灰）

**负责人：** 后端 B（2h）→ 前端C 前端展示（1.5h）  
**工时：** 后端 2h + 前端 1.5h  
**验收：** 选两个快照 → 点"质量门禁评估" → 看到 verdict + 各指标箭头

---

#### F13. AI 报告 Typst 精美版增强

**做什么：** 让 Typst PDF 导出的报告变得专业美观——封面、目录、图表、页眉页脚、McCall 雷达图。

**后端任务（后端 B）：**

增强现有 Typst 模板（`report-template.typ` 或类似文件）：

```typst
// 封面
#page(margin: 0pt)[
  #align(center + horizon)[
    #text(size: 28pt, weight: "bold")[MetriScope 软件质量报告]
    #v(1em)
    #text(size: 16pt, fill: gray)[#project-name]
    #v(2em)
    #text(size: 12pt)[生成日期：#datetime.today().display()]
  ]
]

// 目录
#outline(title: "目录", indent: auto)

// 正文各章节
= 项目概述
// ... 从 report context 填充

= 质量指标汇总
// 表格展示 CK/LK

= 风险分析
// 高风险项表格

= McCall 质量评估
// 各因子分数表格

= 改进建议
// 建议列表

= 附录
// 类完整指标表
```

关键技巧：后端 B 在调用 `typst compile` 前，把度量数据注入到 `.typ` 文件中（字符串替换或 JSON 数据文件 + Typst `json()` 函数读取）。

**前端任务：** 无额外工作。已有的导出按钮 `POST /export/pdf-typst` 直接用。

**负责人：** 后端 B  
**工时：** 2-3h（主要是 Typst 模板排版调试）  
**验收：** 点击"导出 Typst PDF" → 打开 PDF 有封面 + 目录 + 格式化表格 + 页眉页脚

---

### Step 1 总工时估算

| 角色 | 任务 | 预估总工时 |
|------|------|-----------|
| **后端 A** | F1 LoC 补全 + F6 McCall + F7 认知复杂度 + F8 Code Smell + F9 MI | 8-10h |
| **后端 B** | F11 Vibe Prompt + F12 Quality Gate + F13 Typst 增强 | 6-7h |
| **前端C** | F2 类详情 + F3 依赖图 + F4 图一致性 + F5 风险增强 + F6 雷达图 + F10 MCP 页 + 各处前端对接 | 12-15h |



---

## §3 Step 2 — 完善版（Demo 后 2-3 天）

> Step 2 的目标是把项目从"能 Demo"提升到"答辩满分"。

### 功能列表

| # | 功能点 | 负责人 | 依赖 | 工时 |
|---|--------|--------|------|------|
| F14 | **完整 IFPUG 功能点评估** | 后端 A + 前端C | 新建 3 张表 + 表单页 | 后端 4h + 前端 3h |
| F15 | **ISO 25010 映射展示** | 后端 A + 前端C | 复用 McCall 框架 | 后端 1h + 前端 1h |
| F16 | **包级依赖指标** (Ca/Ce/Instability) | 后端 A + 前端C | 基于已有依赖边聚合 | 后端 3h + 前端 2h |
| F17 | **AI Coding 任务记录 M9-1** | 后端 B + 前端C | 新建表 + CRUD | 后端 3h + 前端 2h |
| F18 | **AI Debt Score M9-3** | 后端 B + 前端C | 基于 Quality Gate 扩展 | 后端 2h + 前端 1h |
| F19 | **重复代码检测** | 后端 A | token hash 方案 | 后端 4h + 前端 2h |
| F20 | **风险热力图** | 前端C | 前端聚合已有数据 | 前端 2h |
| F21 | **对比实验 A/B/C 展示** | 前端C | 手动多快照对比 | 前端 2h |
| F22 | **测试覆盖率** | 后端 A | JaCoCo XML 导入 | 看时间 |
| F23 | **Tauri 打包** | 前端C | 无后端依赖 | 前端 1h |

### Step 2 分工

| 角色 | Step 2 职责 |
|------|------------|
| **后端 A** | F14 IFPUG 完整版 → F15 ISO 25010 → F16 包级指标 → F19 重复代码 |
| **后端 B** | F17 AI Task 记录 → F18 AI Debt Score → 修 bug 兜底 |
| **前端C** | F14-F18 前端页面 → F20 热力图 → F21 对比实验 → F23 Tauri |

---

## §4 三人分工矩阵

### 总览

```
┌──────────────────────────────────────────────────────────┐
│                    前端C（设计统筹）                       │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 全局设计 · API 契约审定 · 前端全部页面 · 验收把关    │ │
│  └─────────────────────────────────────────────────────┘ │
│          ↕ 接口契约                    ↕ 接口契约         │
│  ┌──────────────────┐         ┌──────────────────────┐  │
│  │   后端 A（引擎）   │         │  后端 B（平台/AI）    │  │
│  │                  │         │                      │  │
│  │ 度量计算核心      │         │ AI 相关 + 平台能力    │  │
│  │ LoC / McCall     │         │ Vibe Prompt          │  │
│  │ 认知复杂度        │         │ Quality Gate         │  │
│  │ Code Smell       │         │ Typst 报告增强       │  │
│  │ MI 评分          │         │ AI Task / Debt Score │  │
│  │ IFPUG / 包级指标  │         │                      │  │
│  └──────────────────┘         └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Step 1 详细分工时间线

**后端 A 今晚 + 明天任务队列：**

```
[1] F1 LoC 补全（1h）→ 自测 → 通知 前端C
[2] F6 McCall 质量模型（2h）→ 自测 → 通知 前端C
[3] F7 认知复杂度（2-3h）→ 自测 → 通知 前端C
[4] F8 Code Smell（2h）→ 自测 → 通知 前端C
[5] F9 MI 评分（1h）→ 自测 → 通知 前端C
```

**后端 B 今晚 + 明天任务队列：**

```
[1] F11 Vibe Prompt API + MCP 工具（2h）→ 自测 → 通知 前端C
[2] F12 Quality Gate API（2h）→ 自测 → 通知 前端C
[3] F13 Typst 报告模板增强（2-3h）→ 自测 → 导出 PDF 截图验收
```

**前端C 今晚 + 明天任务队列：**

```
[立刻开始，不依赖后端]
[1] F2 类详情页（3-4h）
[2] F3 类依赖力导向图（3-4h）
[3] F4 图一致性页（2-3h）
[4] F5 风险中心增强（1-2h）
[5] F10 MCP 演示页（2-3h）

[等后端 A 通知后对接]
[6] F1 前端 LoC 卡片（30min）
[7] F6 前端 McCall 雷达图（1.5h）
[8] F7 前端认知复杂度列 + 对比图（1h）
[9] F8 前端 Code Smell 展示（1.5h）
[10] F9 前端 MI 卡片（30min）

[等后端 B 通知后对接]
[11] F11 前端 Prompt 展示 + 复制按钮（1h）
[12] F12 前端 Quality Gate 展示（1.5h）
```

---

## §5 新增 API 契约速查

> 以下是 Step 1 所有新增 API 的快速参考，可直接复制给 AI Coding 工具使用。

### 后端 A 新增 API

| # | 方法 | 路径 | 说明 |
|---|------|------|------|
| A1 | GET | `/api/v1/projects/{projectId}/quality/mccall` | McCall 质量模型评估 |
| A2 | GET | `/api/v1/projects/{projectId}/code-smells` | Code Smell 检测结果 |
| A3 | GET | `/api/v1/projects/{projectId}/maintainability` | 可维护性评分（如果不走字段方案） |

已有 API 字段扩展：

| 接口 | 新增字段 |
|------|----------|
| `SnapshotSummary` | `javaFileCount`, `blankLines`, `commentLines`, `commentRate` |
| `MethodMetricResponse` | `cognitiveComplexity` |
| `ClassMetricResponse` | `avgCognitiveComplexity`, `maxCognitiveComplexity`, `maintainabilityScore`(可选) |

### 后端 B 新增 API

| # | 方法 | 路径 | 说明 |
|---|------|------|------|
| B1 | GET | `/api/v1/projects/{projectId}/ai/refactor-prompt` | Vibe 重构 Prompt |
| B2 | POST | `/api/v1/projects/{projectId}/quality-gates/evaluate` | AI 质量门禁评估 |
| B3 | POST | `/api/v1/mcp/tools/refactor-prompt` | MCP 工具：获取重构 Prompt |

### 响应体快速参考

**McCall 响应（A1）：**

```json
{
  "projectId": 1,
  "snapshotId": 10,
  "overallScore": 82.4,
  "factors": [
    {
      "factor": "MAINTAINABILITY",
      "factorName": "可维护性",
      "score": 78.5,
      "criteria": [
        {
          "criteria": "Simplicity",
          "criteriaName": "简洁性",
          "score": 75.0,
          "metrics": [
            {
              "metricName": "averageComplexity",
              "metricLabel": "平均圈复杂度",
              "rawValue": 4.2,
              "normalizedScore": 80.0,
              "weight": 0.5
            }
          ]
        }
      ]
    }
  ]
}
```

**Code Smell 响应（A2）：**

```json
{
  "projectId": 1,
  "snapshotId": 10,
  "totalSmellCount": 23,
  "totalDebtHours": 11.5,
  "smellsByType": { "LONG_METHOD": 8, "LARGE_CLASS": 3 },
  "items": [
    {
      "smellType": "LONG_METHOD",
      "smellName": "方法过长",
      "targetType": "METHOD",
      "targetName": "com.demo.OrderService.createOrder",
      "triggerMetric": "loc",
      "triggerValue": 85,
      "threshold": 50,
      "debtMinutes": 30,
      "suggestion": "建议拆分为多个职责单一的私有方法"
    }
  ]
}
```

**Refactor Prompt 响应（B1）：**

```json
{
  "projectId": 1,
  "snapshotId": 10,
  "riskCount": 8,
  "prompt": "本次软件度量分析发现以下质量问题...",
  "targetClasses": ["com.demo.OrderService"],
  "generatedAt": "2026-04-28T20:00:00Z"
}
```

**Quality Gate 响应（B2）：**

```json
{
  "projectId": 1,
  "fromSnapshotId": 1,
  "toSnapshotId": 2,
  "source": "AI_PATCH",
  "verdict": "WARN",
  "verdictLabel": "需关注",
  "totalScore": 72,
  "checks": [
    {
      "metric": "averageComplexity",
      "metricLabel": "平均圈复杂度",
      "fromValue": 5.8,
      "toValue": 7.1,
      "delta": 1.3,
      "direction": "WORSE",
      "passed": false,
      "message": "复杂度上升 22%"
    }
  ],
  "suggestion": "建议关注复杂度上升后再合并"
}
```

---

## §6 开发规约

### 规约 1：模块拆解与 AI 委托

每个功能点在委托给 AI Coding 工具（Claude Code / Codex）时，必须包含：

```markdown
## 任务：[功能名称]

### 上下文
- 项目技术栈：Spring Boot + JavaParser / React + shadcn/ui + Recharts
- 已有相关代码：[列出相关文件路径]
- 数据库：MySQL，已有表结构见 database-schema.sql

### 要做什么
[一句话说清楚]

### API 契约
[URL + 请求体 + 响应体]

### 实现要点
[关键逻辑、公式、注意事项]

### 不要做什么
- 不要修改已有接口的返回结构
- 不要引入新的外部依赖（除非必要）
- 不要重构已有代码

### 验收标准
[怎样算做完了]
```

### 规约 2：验收流程

每个功能点完成后，负责人需要：

1. **自测通过**：后端用 curl/Postman 调 API 确认返回正确；前端在浏览器确认页面正常。
2. **截图/录屏**：关键页面截图保存到 `docs/screenshots/`。
3. **更新文档**：在本文件对应功能点后标注 `✅ 已完成 [日期]`。
4. **通知下游**：后端完成后通知 前端C 前端对接；前端完成后通知团队可以验收。

### 规约 3：MVP 冻结原则

- Step 1 完成后冻结，不因 Step 2 开发而破坏 Step 1 功能。
- 新增 API 只增不改，已有 API 字段扩展必须向后兼容（新字段可以 null）。
- 如果后端某个功能来不及，前端用"暂无数据"空状态展示，不用 mock 数据。

### 规约 4：前端新增页面规范

- 路由统一注册在 `App.tsx`。
- 侧边栏入口统一在 `AppShell.tsx` 的 nav items 中添加。
- API 调用统一走 `src/lib/api.ts`，新增对应的 api 模块和类型定义。
- 组件使用已有 `components/ui/*` shadcn 套件，不引入新 UI 库。
- 图表统一用 Recharts。

### 规约 5：后端新增模块规范

- 新增 Controller 放 `controller/` 包下，URL 前缀 `/api/v1`。
- 新增 Service 放 `service/` 包下，接口 + Impl 分离。
- DTO 放 `dto/` 包下，命名 `XxxResponse` / `XxxRequest`。
- 新增表走 Flyway 或手动 SQL 脚本，统一放 `src/main/resources/db/`。
- 异常统一抛 `BusinessException(errorCode, message)`，全局拦截器处理。

---

## §7 风险与备选方案

| 风险 | 概率 | 影响 | 备选方案 |
|------|------|------|----------|
| 后端 A 来不及做 McCall | 中 | 总览页少一个雷达图 | 前端硬编码一组示例数据展示 UI，答辩说"后端计算模块已就绪，前端展示已通" |
| 后端 A 来不及做认知复杂度 | 中 | 方法表少一列 | 前端隐藏该列，不影响其他功能 |
| 后端 B 来不及做 Quality Gate | 低 | 对比页少一个区域 | 前端用已有的 snapshot compare delta 数据，自行标绿标红展示 |
| 后端 B Typst 模板排版困难 | 中 | PDF 不够美观 | 回退到 HTML-PDF，能用就行 |
| D3 力导向图调参耗时 | 中 | 依赖图效果一般 | 退化为简单列表展示（fromClass → toClass 表格） |
| 前端页面太多做不完 | 中 | Demo 展示不完整 | 按优先级砍：F10 MCP 页 > F4 图一致性 > F3 依赖图 > F5 风险增强 |
| 已有接口字段扩展导致前端报错 | 低 | 页面白屏 | 前端所有新字段用 `?.` 可选链，兼容后端未更新的情况 |

### 如果只能完成一半，保底方案

```
保底 Demo 展示顺序（最少 6 个新功能）：

1. F2 类详情页（深度剖析的核心页面）
2. F6 McCall 雷达图（质量模型亮点）
3. F10 MCP 演示页（AI 亮点入口）
4. F11 Vibe Prompt（AI 闭环关键环节）
5. F4 图一致性页（设计与代码一致性）
6. F13 Typst 精美报告（导出物展示）
```

这 6 个加上已有的 8 个页面，共 14 个功能页面，足够支撑一个完整的答辩叙事。

---

## 附录：答辩叙事脚本（3 分钟版）

> 供 Demo 展示参考，按这个顺序讲效果最好。

**开场（30s）：**
"我们做的是 MetriScope——面向 Java 项目的软件度量、质量评估与智能优化平台。它解决四个问题：代码质量不能量化、设计与代码脱节、改进前后无法对比、度量结果不能驱动 AI 优化。"

**主体演示（2min）：**

1. **项目导入 + 分析**（20s）：创建项目 → 上传源码 → 启动分析 → 30秒内看到结果
2. **质量总览**（30s）：5 个 KPI 卡片 + McCall 雷达图 + 复杂度分布 + 风险榜 → "一眼看出这个项目可维护性偏低，主要问题在耦合和复杂度"
3. **深度诊断**（30s）：点击高风险类 → 类详情 CK 雷达图 + 方法复杂度排行 → 依赖关系图 → 一致性检查分数
4. **AI 闭环**（40s）：MCP 工具调用 → AI 生成重构 Prompt → "把这个 Prompt 喂给 Claude Code，它会自动重构" → 重新分析 → 对比页 Quality Gate → "复杂度下降、风险减少、可以合并"

**收尾（30s）：**
"我们的创新点是：将传统的 McCall 质量模型与 CK/LK 度量结合，并通过 MCP 协议实现度量驱动的 AI 辅助重构闭环。不是蹭 AI 热点，而是从软件质量保证角度回答了一个关键问题——AI 写的代码到底好不好。"
