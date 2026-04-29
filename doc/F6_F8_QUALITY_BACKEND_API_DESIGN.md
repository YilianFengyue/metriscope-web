# F6-F8 质量模型、认知复杂度与 Code Smell 后端设计

> 模块范围：F6 McCall 质量模型、F7 认知复杂度、F8 Code Smell 检测  
> SQL 文件：`sql/f6_f8_quality_metrics.sql`  
> 目标：把已有 CK/LK/LoC/圈复杂度/风险数据升级成“指标 -> 坏味道 -> 质量模型”的完整质量分析链路。

## 1. 本次完成内容

### F7 认知复杂度

在原有方法级圈复杂度之外，新增 `cognitiveComplexity` 字段，用于衡量方法阅读和理解难度。

已接入链路：

- JavaParser AST 解析阶段计算认知复杂度。
- `MethodModel` 增加 `cognitiveComplexity`。
- `MethodMetric` / `MethodMetricResponse` 增加 `cognitiveComplexity`。
- `MethodMetricEntity` 增加 `cognitive_complexity`。
- `ClassMetric` / `ClassMetricResponse` 增加：
  - `averageCognitiveComplexity`
  - `maxCognitiveComplexity`
- `ClassMetricEntity` 增加：
  - `average_cognitive_complexity`
  - `max_cognitive_complexity`
- 快照保存、MySQL 读取、内存测试链路均已打通。

认知复杂度简化规则：

- `if / for / foreach / while / do / switch / catch / 三元表达式`：`+ 1 + nestingLevel`
- 嵌套层级越深，分数越高。
- 条件中的 `&&` / `||`：额外 `+1`
- 方法递归调用自身：额外 `+1`

### F8 Code Smell 检测

新增实时坏味道检测接口，不额外建表，基于最新快照计算。

已支持规则：

| smellType | 中文 | 规则 |
| --- | --- | --- |
| LONG_METHOD | 方法过长 | `method.loc > 50` |
| COMPLEX_METHOD | 圈复杂度过高 | `method.cyclomaticComplexity > 10` |
| HIGH_COGNITIVE_COMPLEXITY | 认知复杂度过高 | `method.cognitiveComplexity > 15` |
| LONG_PARAMETER_LIST | 参数过多 | `method.parameterCount > 5` |
| LARGE_CLASS | 类过大 | `class.loc > 300` |
| GOD_CLASS | 上帝类 | `class.wmc > 40 && class.couplingCount > 8` |
| HIGH_COUPLING | 高耦合 | `class.couplingCount > 8` |
| LOW_COHESION | 低内聚 | `class.lcom > 0.7` |
| DEEP_INHERITANCE | 继承层次过深 | `class.dit > 4` |
| LARGE_RESPONSE_SET | 响应集合过大 | `class.rfc > 20` |

每个 smell 返回：

- smell 类型和中文名。
- 目标类型和目标名称。
- 触发指标、触发值、阈值。
- 严重程度：`MEDIUM` / `HIGH`。
- 技术债分钟数。
- 重构建议。

### F6 McCall 质量模型

新增 McCall 质量模型接口，基于最新快照和 Code Smell 结果实时计算。

返回 6 个质量因子：

| factor | 中文 |
| --- | --- |
| MAINTAINABILITY | 可维护性 |
| RELIABILITY | 可靠性 |
| TESTABILITY | 可测试性 |
| EFFICIENCY | 效率 |
| REUSABILITY | 可复用性 |
| FLEXIBILITY | 灵活性 |

每个因子包含：

- 因子分数。
- 准则列表。
- 每个准则下的原始指标、归一化分数和权重。

前端可以直接用 `factors[].score` 画 McCall 雷达图。

## 2. 数据库变更

执行：

```powershell
mysql -u root -p < sql/f6_f8_quality_metrics.sql
```

或复制 `sql/f6_f8_quality_metrics.sql` 到 MySQL 客户端执行。

新增字段：

```sql
ALTER TABLE mf_method_metrics
  ADD COLUMN cognitive_complexity INT NOT NULL DEFAULT 0;

ALTER TABLE mf_class_metrics
  ADD COLUMN average_cognitive_complexity DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE mf_class_metrics
  ADD COLUMN max_cognitive_complexity INT NOT NULL DEFAULT 0;
```

实际 SQL 使用 `add_column_if_missing`，重复执行安全。

## 3. 接口契约

### 3.1 方法指标接口新增字段

```http
GET /api/v1/projects/{projectId}/methods
```

新增字段：

```json
{
  "classQualifiedName": "com.demo.OrderService",
  "methodName": "checkout",
  "loc": 64,
  "cyclomaticComplexity": 12,
  "cognitiveComplexity": 18,
  "riskLevel": "HIGH"
}
```

前端用途：

- 方法表新增“认知复杂度”列。
- 类详情页做“圈复杂度 vs 认知复杂度”对比图。
- 风险中心新增高认知复杂度 Top N。

### 3.2 类指标接口新增字段

```http
GET /api/v1/projects/{projectId}/classes
```

新增字段：

```json
{
  "qualifiedName": "com.demo.OrderService",
  "averageComplexity": 8.2,
  "maxComplexity": 16,
  "averageCognitiveComplexity": 10.4,
  "maxCognitiveComplexity": 22
}
```

前端用途：

- 类详情页展示类级认知复杂度摘要。
- 风险中心按 `maxCognitiveComplexity` 排序。
- McCall / Code Smell 页面可复用。

### 3.3 Code Smell 检测接口

```http
GET /api/v1/projects/{projectId}/code-smells
```

响应示例：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "snapshotId": 10,
    "totalSmellCount": 4,
    "totalDebtHours": 3.25,
    "smellsByType": {
      "LONG_METHOD": 1,
      "HIGH_COUPLING": 2,
      "LOW_COHESION": 1
    },
    "items": [
      {
        "smellType": "LONG_METHOD",
        "smellName": "方法过长",
        "targetType": "METHOD",
        "targetName": "com.demo.OrderService#checkout",
        "severity": "HIGH",
        "triggerMetric": "loc",
        "triggerValue": 82,
        "threshold": 50,
        "debtMinutes": 30,
        "suggestion": "建议按校验、计算、持久化、通知等职责拆分为多个小方法。"
      }
    ]
  }
}
```

前端用途：

- Code Smell 独立页面。
- 风险中心增加“坏味道”Tab。
- 类详情页按 `targetName` 过滤展示本类 smell。
- AI 重构 Prompt 可以直接复用 `items[].suggestion`。

### 3.4 McCall 质量模型接口

```http
GET /api/v1/projects/{projectId}/quality/mccall
```

响应示例：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "snapshotId": 10,
    "overallScore": 78.42,
    "grade": "B",
    "factors": [
      {
        "factor": "MAINTAINABILITY",
        "factorName": "可维护性",
        "score": 74.25,
        "criteria": [
          {
            "criteria": "SIMPLICITY",
            "criteriaName": "简洁性",
            "score": 70.31,
            "metrics": [
              {
                "metricName": "averageComplexity",
                "metricLabel": "平均圈复杂度",
                "rawValue": 5.4,
                "normalizedScore": 80.0,
                "weight": 0.45
              }
            ]
          }
        ]
      }
    ]
  }
}
```

前端用途：

- 总览页 McCall 6 维雷达图：`factors[].factorName` + `factors[].score`
- 综合评分卡：`overallScore` + `grade`
- 因子详情弹窗：`criteria[].metrics`

## 4. McCall 指标映射

### 可维护性

来源：

- 平均圈复杂度
- 平均认知复杂度
- Code Smell 数量
- 平均 CBO
- 平均 LCOM
- 注释率

### 可靠性

来源：

- 高风险项数量
- 最大圈复杂度
- 风险类占比

### 可测试性

来源：

- 平均圈复杂度
- 平均 CBO
- 平均 RFC

### 效率

来源：

- 平均方法 LOC
- 最大认知复杂度

### 可复用性

来源：

- 平均 CBO
- 平均 LCOM
- 平均 DIT

### 灵活性

来源：

- 平均 CBO
- 平均 RFC
- 平均 NOC

## 5. 前端开发建议

### 总览页

建议新增：

- McCall 雷达图。
- 综合分数和等级。
- 最弱质量因子提示。

调用：

```http
GET /api/v1/projects/{projectId}/quality/mccall
```

### 风险中心

建议新增两个 Tab：

- 风险项：继续用 `/risks`
- Code Smell：用 `/code-smells`

Code Smell 表格列：

- smellName
- targetType
- targetName
- severity
- triggerMetric
- triggerValue / threshold
- debtMinutes
- suggestion

### 方法表

新增列：

- `cognitiveComplexity`

可按该字段降序，形成“认知复杂度 Top 10”。

### 类详情页

新增：

- `averageCognitiveComplexity`
- `maxCognitiveComplexity`
- 方法级双柱图：圈复杂度 vs 认知复杂度
- 本类 Code Smell 列表

## 6. 答辩讲法

可以这样讲：

> 原来的系统已经能计算 CK/LK、LoC 和圈复杂度。F6-F8 这次扩展后，我们进一步把底层指标升级为质量分析链：先用认知复杂度解释代码理解难度，再用 Code Smell 把指标翻译成开发者能理解的问题，最后用 McCall 模型把这些问题映射为可维护性、可靠性、可测试性等质量因子。

推荐展示顺序：

1. 打开方法指标表，展示 `cyclomaticComplexity` 和 `cognitiveComplexity` 的差异。
2. 打开 Code Smell 页面，展示“方法过长、高耦合、低内聚”等坏味道。
3. 打开 McCall 雷达图，展示 6 个质量因子的综合评分。
4. 说明 McCall 分数不是拍脑袋，而是来自 CK/LK/复杂度/认知复杂度/坏味道等已有度量。

## 7. 验证

已加入后端全链路测试：

- `/methods` 返回 `cognitiveComplexity`
- `/code-smells` 可基于最新快照返回结果
- `/quality/mccall` 返回 6 个质量因子

验证命令：

```powershell
.\mvnw.cmd test
```

当前结果：

```text
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```
