# F14 完整 IFPUG 功能点评估接口与功能设计

> 模块：F14 完整 IFPUG 功能点评估  
> 后端包：`org.csu.metricforge_back.fp`  
> SQL 文件：`sql/f14_ifpug_assessment.sql`  
> 目标：把原有“简化 FP 估算”升级为可保存、可追溯、可展示明细的完整功能点评估模块。

## 1. 功能定位

F14 用于按照 IFPUG 功能点方法，对项目进行功能规模估算。它不只是输入五类功能数量后即时计算，而是保存一次完整评估记录，包括：

- EI / EO / EQ / ILF / EIF 功能项明细。
- 每个功能项的 DET、FTR、RET、复杂度和权重。
- 14 个 GSC 通用系统特征评分。
- UFP、VAF、AFP、工作量、周期、成本。
- 项目维度下的多次评估历史。

现有 `estimate` 模块仍保留为快速估算入口；F14 新增独立 `fp` 模块，负责完整 IFPUG 评估。

## 2. 核心概念

### 2.1 功能项类型

| 类型 | 英文 | 中文含义 | 说明 |
| --- | --- | --- | --- |
| EI | External Input | 外部输入 | 用户或外部系统向系统输入数据并触发处理 |
| EO | External Output | 外部输出 | 系统向外部输出经过计算或处理的数据 |
| EQ | External Inquiry | 外部查询 | 输入查询条件并返回简单查询结果 |
| ILF | Internal Logical File | 内部逻辑文件 | 系统内部维护的一组逻辑数据 |
| EIF | External Interface File | 外部接口文件 | 被本系统引用但由其他系统维护的数据 |

### 2.2 复杂度与权重

| 类型 | LOW | AVERAGE | HIGH |
| --- | ---: | ---: | ---: |
| EI | 3 | 4 | 6 |
| EO | 4 | 5 | 7 |
| EQ | 3 | 4 | 6 |
| ILF | 7 | 10 | 15 |
| EIF | 5 | 7 | 10 |

前端可以显式传入 `complexity`。如果不传，后端会根据 DET / FTR / RET 简化矩阵自动推导复杂度。

### 2.3 GSC 通用系统特征

系统固定保存 14 项 GSC。前端只传用户填写过的项即可，未传项后端默认评分为 0。

| factorCode | 中文 |
| --- | --- |
| DATA_COMMUNICATIONS | 数据通信 |
| DISTRIBUTED_DATA_PROCESSING | 分布式数据处理 |
| PERFORMANCE | 性能 |
| HEAVILY_USED_CONFIGURATION | 高频使用配置 |
| TRANSACTION_RATE | 事务率 |
| ONLINE_DATA_ENTRY | 在线数据输入 |
| END_USER_EFFICIENCY | 最终用户效率 |
| ONLINE_UPDATE | 在线更新 |
| COMPLEX_PROCESSING | 复杂处理 |
| REUSABILITY | 可复用性 |
| INSTALLATION_EASE | 易安装性 |
| OPERATIONAL_EASE | 易操作性 |
| MULTIPLE_SITES | 多站点 |
| FACILITATE_CHANGE | 易变更性 |

评分范围：`0 - 5`。

## 3. 计算规则

```text
UFP = sum(functionItem.weight)
valueAdjustmentSum = sum(14 GSC ratings)
VAF = 0.65 + 0.01 * valueAdjustmentSum
AFP = UFP * VAF
Effort = AFP / productivityFpPerPersonMonth
Schedule = 2.5 * Effort ^ 0.35
Cost = Effort * personMonthCost
```

默认值：

- `productivityFpPerPersonMonth` 不传时默认为 `12`。
- `personMonthCost` 不传时默认为 `0`。
- GSC 未传项评分默认为 `0`。

## 4. 数据库设计

SQL 文件：

```text
sql/f14_ifpug_assessment.sql
```

### 4.1 `mf_fp_assessments`

保存一次功能点评估主记录。

| 字段 | 说明 |
| --- | --- |
| `id` | 评估 ID |
| `project_id` | 所属项目 ID |
| `name` | 评估名称 |
| `description` | 评估说明 |
| `ufp` | 未调整功能点 |
| `value_adjustment_sum` | 14 个 GSC 总分 |
| `vaf` | 价值调整因子 |
| `afp` | 调整后功能点 |
| `productivity_fp_per_person_month` | 每人月可交付功能点 |
| `estimated_effort_person_months` | 估算人月 |
| `estimated_schedule_months` | 估算周期 |
| `estimated_cost` | 估算成本 |
| `created_at` | 创建时间 |

### 4.2 `mf_fp_function_items`

保存功能项明细。

| 字段 | 说明 |
| --- | --- |
| `assessment_id` | 所属评估 ID |
| `name` | 功能项名称 |
| `function_type` | EI / EO / EQ / ILF / EIF |
| `complexity` | LOW / AVERAGE / HIGH |
| `det_count` | DET 数量 |
| `ftr_count` | FTR 数量 |
| `ret_count` | RET 数量 |
| `weight` | 权重 |
| `description` | 功能项说明 |

### 4.3 `mf_fp_gsc_ratings`

保存 14 个 GSC 评分。

| 字段 | 说明 |
| --- | --- |
| `assessment_id` | 所属评估 ID |
| `factor_code` | GSC 编码 |
| `factor_label` | GSC 中文名称 |
| `rating` | 评分，0-5 |

## 5. 接口契约

所有接口同时挂在 `/api` 和 `/api/v1` 前缀下，建议前端统一使用 `/api/v1`。

### 5.1 创建 IFPUG 功能点评估

```http
POST /api/v1/projects/{projectId}/fp-assessments
Content-Type: application/json
```

请求体：

```json
{
  "name": "订单系统 IFPUG 功能点评估",
  "description": "用于 F14 答辩演示的完整功能点记录",
  "productivityFpPerPersonMonth": 12,
  "personMonthCost": 12000,
  "items": [
    {
      "name": "提交订单",
      "type": "EI",
      "detCount": 12,
      "ftrCount": 2,
      "description": "用户提交订单并触发库存、支付和风控校验"
    },
    {
      "name": "生成订单确认单",
      "type": "EO",
      "complexity": "HIGH",
      "detCount": 22,
      "ftrCount": 4
    },
    {
      "name": "订单主文件",
      "type": "ILF",
      "detCount": 18,
      "retCount": 1
    }
  ],
  "gscRatings": [
    { "factorCode": "DATA_COMMUNICATIONS", "rating": 3 },
    { "factorCode": "PERFORMANCE", "rating": 4 },
    { "factorCode": "ONLINE_DATA_ENTRY", "rating": 2 }
  ]
}
```

响应体：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "id": 1,
    "projectId": 1,
    "name": "订单系统 IFPUG 功能点评估",
    "description": "用于 F14 答辩演示的完整功能点记录",
    "ufp": 18,
    "valueAdjustmentSum": 9,
    "vaf": 0.74,
    "afp": 13.32,
    "productivityFpPerPersonMonth": 12.0,
    "estimatedEffortPersonMonths": 1.11,
    "estimatedScheduleMonths": 2.59,
    "estimatedCost": 13320.0,
    "itemsByType": {
      "EI": 1,
      "EO": 1,
      "ILF": 1
    },
    "items": [
      {
        "id": 1,
        "name": "提交订单",
        "type": "EI",
        "typeLabel": "外部输入",
        "complexity": "AVERAGE",
        "detCount": 12,
        "ftrCount": 2,
        "retCount": 0,
        "weight": 4,
        "description": "用户提交订单并触发库存、支付和风控校验"
      }
    ],
    "gscRatings": [
      {
        "id": 1,
        "factorCode": "DATA_COMMUNICATIONS",
        "factorLabel": "数据通信",
        "rating": 3
      }
    ],
    "createdAt": "2026-04-29T15:55:00Z"
  }
}
```

说明：

- `items[].complexity` 可不传，不传时由后端推导。
- `gscRatings` 可只传部分项，响应会返回完整 14 项。
- `items` 至少需要 1 项。

### 5.2 查询项目下所有功能点评估

```http
GET /api/v1/projects/{projectId}/fp-assessments
```

响应：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "name": "订单系统 IFPUG 功能点评估",
      "ufp": 18,
      "vaf": 0.74,
      "afp": 13.32,
      "items": [],
      "gscRatings": []
    }
  ]
}
```

当前 list 接口返回完整对象，前端可以直接复用，也可以只展示摘要字段。

### 5.3 查询单个功能点评估详情

```http
GET /api/v1/fp-assessments/{assessmentId}
```

返回字段同创建接口。

### 5.4 删除功能点评估

```http
DELETE /api/v1/fp-assessments/{assessmentId}
```

响应：

```json
{
  "code": "0",
  "message": "OK",
  "data": null
}
```

删除主记录时，功能项和 GSC 评分会级联删除。

## 6. 校验与错误

| 场景 | 错误码 |
| --- | --- |
| 项目 ID 非法 | `PROJECT_ID_INVALID` |
| 项目不存在 | `PROJECT_NOT_FOUND` |
| 请求体为空 | `FP_ASSESSMENT_REQUEST_EMPTY` |
| 功能项为空 | `FP_FUNCTION_ITEMS_REQUIRED` |
| 功能项名称为空 | `FP_FUNCTION_ITEM_NAME_REQUIRED` |
| 功能项类型为空 | `FP_FUNCTION_TYPE_REQUIRED` |
| 功能项类型不支持 | `FP_FUNCTION_TYPE_UNSUPPORTED` |
| 复杂度不支持 | `FP_COMPLEXITY_UNSUPPORTED` |
| DET/FTR/RET 为负数 | `FP_COUNT_INVALID` |
| GSC 编码为空 | `FP_GSC_FACTOR_REQUIRED` |
| GSC 编码不支持 | `FP_GSC_FACTOR_UNSUPPORTED` |
| GSC 重复 | `FP_GSC_FACTOR_DUPLICATED` |
| GSC 评分不在 0-5 | `FP_GSC_RATING_INVALID` |
| 生产率非法 | `FP_PRODUCTIVITY_INVALID` |
| 人月成本非法 | `FP_COST_INVALID` |
| 评估 ID 非法 | `FP_ASSESSMENT_ID_INVALID` |
| 评估不存在 | `FP_ASSESSMENT_NOT_FOUND` |

## 7. 前端页面建议

建议页面：`/estimates/fp-assessments` 或 `/fp-assessments`

页面结构：

1. 顶部：评估名称、生产率、人月成本、说明。
2. 功能项表格：
   - 名称
   - 类型 EI/EO/EQ/ILF/EIF
   - DET
   - FTR
   - RET
   - 复杂度，可自动/手动
   - 权重
3. GSC 评分表：
   - 14 项固定展示
   - 每项 0-5 分
4. 结果区：
   - UFP
   - VAF
   - AFP
   - 估算人月
   - 估算周期
   - 估算成本
5. 历史记录：
   - 按项目列出过往评估
   - 支持查看详情、删除

## 8. 答辩讲法

可以这样讲：

> 我们没有只做一个简单的功能点总数输入框，而是按照 IFPUG 思路，把功能项明细、复杂度、权重、14 个通用系统特征评分都保存下来。这样每次估算都有来源、有明细、可复查，也可以和 COCOMO、UCP 等估算模型形成对比。

重点展示顺序：

1. 新建一次 IFPUG 评估。
2. 添加 EI / EO / ILF 等功能项。
3. 展示后端自动推导复杂度和权重。
4. 填写若干 GSC 评分。
5. 查看 UFP、VAF、AFP、人月、周期、成本。
6. 回到历史列表，说明评估记录可追溯。

## 9. 测试覆盖

已在 `MetricForgeBackApplicationTests` 中加入接口测试：

```text
ifpugAssessmentShouldCreateListGetAndDelete
```

覆盖内容：

- 创建项目。
- 创建 IFPUG 功能点评估。
- 校验 UFP / VAF / AFP / 人月 / 成本。
- 校验自动复杂度推导。
- 校验响应返回 14 个 GSC。
- 查询项目评估列表。
- 查询评估详情。
- 删除评估。

验证命令：

```powershell
.\mvnw.cmd test
```

当前结果：

```text
Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```
