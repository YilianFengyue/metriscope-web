# MetriScope 后端 API 接口文档

版本：v1  
后端地址：`http://localhost:8080`  
推荐前缀：`/api/v1`  
请求格式：`Content-Type: application/json`  
时间格式：ISO-8601，例如 `2026-04-26T09:03:57.813639700Z`

## 1. 公共约定

所有接口统一返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {}
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | string | `"0"` 表示成功；非 `"0"` 表示业务错误或系统错误 |
| `message` | string | 成功时为 `OK`，失败时为错误说明 |
| `data` | any | 具体业务数据；失败时通常为 `null` |

常见错误返回：

```json
{
  "code": "PROJECT_SOURCE_NOT_CONFIGURED",
  "message": "Project sourcePath is empty. Upload source first.",
  "data": null
}
```

常见错误码：

| 错误码 | 含义 |
| --- | --- |
| `PROJECT_NOT_FOUND` | 项目不存在 |
| `PROJECT_ID_INVALID` | 项目 ID 为空或不是正数 |
| `PROJECT_NAME_REQUIRED` | 项目名称为空 |
| `PROJECT_SOURCE_NOT_CONFIGURED` | 项目未配置源码路径 |
| `PROJECT_NOT_ANALYZED` | 项目还没有分析快照 |
| `SOURCE_PATH_INVALID` | 源码路径不存在或不是目录 |
| `JAVA_SOURCE_NOT_FOUND` | 源码目录中没有 `.java` 文件 |
| `ZIP_PATH_INVALID` | zip 文件路径不存在 |
| `DIAGRAM_NOT_FOUND` | 图文件不存在 |
| `DIAGRAM_TYPE_UNSUPPORTED` | 图类型不支持 |
| `SNAPSHOT_NOT_FOUND` | 快照不存在 |
| `SNAPSHOT_PROJECT_MISMATCH` | 两个快照不属于同一项目 |
| `ANALYSIS_QUEUE_FULL` | 异步分析队列已满 |
| `ANALYSIS_TASK_NOT_FOUND` | 分析任务不存在 |
| `ESTIMATE_MODEL_UNSUPPORTED` | 估算模型不支持 |
| `INTERNAL_ERROR` | 未捕获系统异常 |

## 2. 推荐测试流程

前端联调建议按这个顺序：

1. `GET /api/v1/system/ping`
2. `POST /api/v1/projects`
3. `POST /api/v1/projects/{projectId}/upload-source`
4. `POST /api/v1/projects/{projectId}/upload-diagram`
5. `POST /api/v1/projects/{projectId}/analyze`
6. `GET /api/v1/projects/{projectId}/overview`
7. `GET /api/v1/projects/{projectId}/classes`
8. `GET /api/v1/projects/{projectId}/risks`
9. `GET /api/v1/projects/{projectId}/snapshots`
10. `POST /api/v1/snapshots/{snapshotId}/export/html`

本项目自带测试源码：

```text
F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/src/main/java
```

本项目自带测试图：

```text
F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/class-diagram.puml
F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/use-case-diagram.puml
F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/activity-diagram.puml
```

## 3. 数据结构

### 3.1 ProjectResponse

```json
{
  "id": 1,
  "name": "backend-test-demo",
  "description": "后端接口测试项目",
  "sourcePath": "",
  "language": "Java",
  "createdAt": "2026-04-26T09:03:57.813639700Z",
  "updatedAt": "2026-04-26T09:03:57.813639700Z"
}
```

### 3.2 AnalysisTaskResponse

```json
{
  "id": 1,
  "projectId": 1,
  "status": "FINISHED",
  "startedAt": "2026-04-26T09:10:00Z",
  "finishedAt": "2026-04-26T09:10:02Z",
  "errorCount": 0,
  "snapshotId": 1
}
```

`status` 可能值：

| 值 | 说明 |
| --- | --- |
| `RUNNING` | 正在执行 |
| `FINISHED` | 已完成 |
| `FAILED` | 执行失败 |
| `CANCELED` | 已取消 |
| `TIMEOUT` | 执行超时 |

### 3.3 SnapshotSummary

```json
{
  "totalLoc": 1000,
  "classCount": 20,
  "methodCount": 80,
  "averageComplexity": 3.45,
  "highRiskCount": 4
}
```

### 3.4 SnapshotResponse

```json
{
  "id": 1,
  "projectId": 1,
  "versionTag": "auto-1777194600000",
  "createdAt": "2026-04-26T09:10:02Z",
  "summary": {
    "totalLoc": 1000,
    "classCount": 20,
    "methodCount": 80,
    "averageComplexity": 3.45,
    "highRiskCount": 4
  }
}
```

### 3.5 ClassMetricResponse

```json
{
  "packageName": "com.demo",
  "className": "OrderService",
  "qualifiedName": "com.demo.OrderService",
  "loc": 120,
  "fieldCount": 4,
  "methodCount": 10,
  "averageComplexity": 4.2,
  "maxComplexity": 12,
  "couplingCount": 6,
  "weightedMethodsPerClass": 42,
  "depthOfInheritanceTree": 1,
  "numberOfChildren": 0,
  "responseForClass": 16,
  "lackOfCohesionOfMethods": 0.5,
  "classSize": 14,
  "numberOfOperations": 10,
  "numberOfAttributes": 4,
  "specializationIndex": 0.2,
  "riskLevel": "MEDIUM"
}
```

### 3.6 MethodMetricResponse

```json
{
  "classQualifiedName": "com.demo.OrderService",
  "methodName": "createOrder",
  "returnType": "Order",
  "parameterCount": 2,
  "loc": 35,
  "cyclomaticComplexity": 8,
  "riskLevel": "LOW",
  "startLine": 20,
  "endLine": 54
}
```

### 3.7 RiskItemResponse

```json
{
  "targetType": "CLASS",
  "targetName": "com.demo.OrderService",
  "metricName": "WMC",
  "metricValue": 42,
  "thresholdValue": 20,
  "riskLevel": "HIGH",
  "message": "Class weighted methods per class exceeds threshold."
}
```

### 3.8 DependencyEdgeResponse

```json
{
  "fromClass": "com.demo.OrderService",
  "toClass": "PaymentGateway",
  "edgeType": "FIELD_TYPE"
}
```

## 4. System 接口

### 4.1 健康检查

```http
GET /api/v1/system/ping
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "appName": "metricforge-back",
    "status": "UP",
    "serverTime": "2026-04-26T09:00:00Z"
  }
}
```

## 5. Project 项目接口

### 5.1 创建项目

```http
POST /api/v1/projects
Content-Type: application/json
```

请求体：

```json
{
  "name": "backend-test-demo",
  "description": "后端接口测试项目",
  "sourcePath": "",
  "language": "Java"
}
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "id": 1,
    "name": "backend-test-demo",
    "description": "后端接口测试项目",
    "sourcePath": "",
    "language": "Java",
    "createdAt": "2026-04-26T09:03:57.813639700Z",
    "updatedAt": "2026-04-26T09:03:57.813639700Z"
  }
}
```

数据库表：`mf_projects`

### 5.2 查询项目列表

```http
GET /api/v1/projects
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "backend-test-demo",
      "description": "后端接口测试项目",
      "sourcePath": "",
      "language": "Java",
      "createdAt": "2026-04-26T09:03:57.813639700Z",
      "updatedAt": "2026-04-26T09:03:57.813639700Z"
    }
  ]
}
```

### 5.3 查询项目详情

```http
GET /api/v1/projects/{projectId}
```

路径参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `projectId` | number | 项目 ID |

成功返回：`data` 为 `ProjectResponse`。

### 5.4 更新项目

```http
PUT /api/v1/projects/{projectId}
Content-Type: application/json
```

请求体：

```json
{
  "name": "backend-test-demo-renamed",
  "description": "更新后的描述",
  "sourcePath": "F:/some/source/path",
  "language": "Java"
}
```

说明：字段可以部分传；未传字段保持原值。

成功返回：`data` 为更新后的 `ProjectResponse`。

### 5.5 上传源码

```http
POST /api/v1/projects/{projectId}/upload-source
Content-Type: application/json
```

请求体：

```json
{
  "sourcePath": "F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/src/main/java",
  "zipFileName": ""
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sourcePath` | string | 二选一 | 已存在源码目录 |
| `zipFileName` | string | 二选一 | 已存在 zip 文件路径；后端会解压到工作目录 |

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "id": 1,
    "projectId": 1,
    "importType": "SOURCE",
    "reference": "F:/.../src/main/java -> F:/.../src/main/java (18 java files)",
    "status": "RECEIVED",
    "createdAt": "2026-04-26T09:05:00Z"
  }
}
```

影响：

- 写入 `mf_import_records`
- 更新 `mf_projects.source_path`
- 后端会校验目录中是否存在 `.java` 文件

### 5.6 上传设计图

```http
POST /api/v1/projects/{projectId}/upload-diagram
Content-Type: application/json
```

请求体：

```json
{
  "diagramPath": "F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/class-diagram.puml",
  "diagramType": "CLASS"
}
```

`diagramType` 支持：

| 值 | 说明 |
| --- | --- |
| `CLASS` | 类图 |
| `USE_CASE` | 用例图 |
| `ACTIVITY` | 活动图 |
| `PUML` / `PLANTUML` | PlantUML |
| `MERMAID` / `MMD` | Mermaid 类图 |
| `POWERDESIGNER` / `OOM` | PowerDesigner XML |

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "id": 2,
    "projectId": 1,
    "importType": "DIAGRAM",
    "reference": "F:/.../class-diagram.puml#CLASS",
    "status": "PARSED",
    "createdAt": "2026-04-26T09:06:00Z"
  }
}
```

### 5.7 查询导入记录

```http
GET /api/v1/projects/{projectId}/imports
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "importType": "SOURCE",
      "reference": "F:/.../src/main/java -> F:/.../src/main/java (18 java files)",
      "status": "RECEIVED",
      "createdAt": "2026-04-26T09:05:00Z"
    }
  ]
}
```

数据库表：`mf_import_records`

## 6. Analysis 分析任务接口

### 6.1 同步分析

```http
POST /api/v1/projects/{projectId}/analyze
```

说明：立即执行分析，请求会等待分析结束。分析成功后生成快照。

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "id": 1,
    "projectId": 1,
    "status": "FINISHED",
    "startedAt": "2026-04-26T09:10:00Z",
    "finishedAt": "2026-04-26T09:10:02Z",
    "errorCount": 0,
    "snapshotId": 1
  }
}
```

涉及表：

- `mf_analysis_tasks`
- `mf_analysis_audit_logs`
- `mf_snapshots`
- `mf_class_metrics`
- `mf_method_metrics`
- `mf_dependency_edges`
- `mf_risk_items`

### 6.2 异步分析

```http
POST /api/v1/projects/{projectId}/analyze-async
```

说明：立即返回 `RUNNING` 任务，前端轮询任务详情。

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "id": 2,
    "projectId": 1,
    "status": "RUNNING",
    "startedAt": "2026-04-26T09:12:00Z",
    "finishedAt": null,
    "errorCount": 0,
    "snapshotId": null
  }
}
```

### 6.3 查询项目分析任务列表

```http
GET /api/v1/projects/{projectId}/tasks
```

成功返回：`data` 为 `AnalysisTaskResponse[]`。

### 6.4 查询单个分析任务

```http
GET /api/v1/projects/{projectId}/tasks/{taskId}
```

成功返回：`data` 为 `AnalysisTaskResponse`。

### 6.5 取消分析任务

```http
POST /api/v1/projects/{projectId}/tasks/{taskId}/cancel
```

说明：只有 `RUNNING` 任务会被取消；如果任务已经结束，会直接返回当前任务。

成功返回：`data` 为 `AnalysisTaskResponse`。

### 6.6 重试分析任务

```http
POST /api/v1/projects/{projectId}/tasks/{taskId}/retry
```

说明：`RUNNING` 任务不能重试；其他状态会创建一个新的异步任务。

成功返回：`data` 为新任务的 `AnalysisTaskResponse`。

### 6.7 查询项目审计日志

```http
GET /api/v1/projects/{projectId}/analysis-audits
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "taskId": 1,
      "eventType": "TASK_FINISHED",
      "triggerSource": "SYNC_API",
      "status": "FINISHED",
      "startedAt": "2026-04-26T09:10:00Z",
      "finishedAt": "2026-04-26T09:10:02Z",
      "durationMs": 2000,
      "errorSummary": null,
      "message": "Analysis execution finished and snapshot generated: 1",
      "createdAt": "2026-04-26T09:10:02Z"
    }
  ]
}
```

### 6.8 查询任务审计日志

```http
GET /api/v1/projects/{projectId}/tasks/{taskId}/audits
```

成功返回：`data` 为 `AnalysisAuditLogResponse[]`。

### 6.9 查询异步队列状态

```http
GET /api/v1/projects/analysis-queue
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "corePoolSize": 2,
    "maxPoolSize": 2,
    "activeCount": 0,
    "queueSize": 0,
    "remainingQueueCapacity": 50,
    "totalTaskCount": 3,
    "completedTaskCount": 3,
    "timeoutSeconds": 180
  }
}
```

## 7. Overview 总览接口

### 7.1 项目质量总览

```http
GET /api/v1/projects/{projectId}/overview
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "projectName": "backend-test-demo",
    "language": "Java",
    "analysisCount": 2,
    "latestAnalysisStatus": "FINISHED",
    "latestAnalysisStartedAt": "2026-04-26T09:10:00Z",
    "highRiskCount": 4,
    "qualityGrade": "B"
  }
}
```

## 8. Snapshot 与指标接口

### 8.1 查询项目快照列表

```http
GET /api/v1/projects/{projectId}/snapshots
```

成功返回：`data` 为 `SnapshotResponse[]`。

### 8.2 查询快照详情

```http
GET /api/v1/snapshots/{snapshotId}
```

成功返回：`data` 为 `SnapshotResponse`。

### 8.3 查询最新类指标

```http
GET /api/v1/projects/{projectId}/classes
```

成功返回：`data` 为 `ClassMetricResponse[]`。

### 8.4 查询最新方法指标

```http
GET /api/v1/projects/{projectId}/methods
```

成功返回：`data` 为 `MethodMetricResponse[]`。

### 8.5 查询最新风险项

```http
GET /api/v1/projects/{projectId}/risks
```

成功返回：`data` 为 `RiskItemResponse[]`。

### 8.6 查询最新依赖边

```http
GET /api/v1/projects/{projectId}/dependencies
```

成功返回：`data` 为 `DependencyEdgeResponse[]`。

### 8.7 对比两个快照

```http
GET /api/v1/snapshots/compare?from={fromSnapshotId}&to={toSnapshotId}
```

查询参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `from` | number | 起始快照 ID |
| `to` | number | 目标快照 ID |

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "fromSnapshotId": 1,
    "toSnapshotId": 2,
    "projectId": 1,
    "diff": {
      "totalLocDelta": 12,
      "classCountDelta": 0,
      "methodCountDelta": 1,
      "averageComplexityDelta": 0.2,
      "highRiskCountDelta": -1
    }
  }
}
```

### 8.8 查询质量趋势

```http
GET /api/v1/projects/{projectId}/trend
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "snapshotCount": 2,
    "totalLocDelta": 12,
    "classCountDelta": 0,
    "methodCountDelta": 1,
    "averageComplexityDelta": 0.2,
    "highRiskCountDelta": -1,
    "points": [
      {
        "snapshotId": 1,
        "createdAt": "2026-04-26T09:10:02Z",
        "totalLoc": 1000,
        "classCount": 20,
        "methodCount": 80,
        "averageComplexity": 3.45,
        "highRiskCount": 4
      }
    ]
  }
}
```

## 9. Diagram 图分析接口

### 9.1 类图与代码一致性检查

```http
GET /api/v1/projects/{projectId}/diagram-consistency
```

说明：需要先上传源码和类图。

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "diagramPath": "F:/.../class-diagram.puml",
    "diagramType": "PLANTUML_CLASS",
    "diagramClassCount": 10,
    "codeClassCount": 12,
    "matchedClassCount": 9,
    "missingInCodeClassCount": 1,
    "missingInDiagramClassCount": 3,
    "missingRelationsInCodeCount": 2,
    "missingRelationsInDiagramCount": 4,
    "consistencyScore": 78.57,
    "missingInCodeClasses": ["LegacyOrder"],
    "missingInDiagramClasses": ["com.demo.NewOrderService"],
    "missingRelationsInCode": ["OrderService -> PaymentGateway"],
    "missingRelationsInDiagram": ["OrderController -> OrderService"],
    "suggestions": ["..."]
  }
}
```

### 9.2 图语义洞察

```http
GET /api/v1/projects/{projectId}/diagram-insights
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "totalDiagrams": 3,
    "parsedDiagrams": 3,
    "failedDiagrams": 0,
    "items": [
      {
        "importId": 2,
        "diagramPath": "F:/.../class-diagram.puml",
        "diagramType": "CLASS",
        "status": "PARSED",
        "nodeCount": 10,
        "relationCount": 8,
        "isolatedNodeCount": 1,
        "inheritanceCount": 2,
        "dependencyCount": 3,
        "aggregationCount": 1,
        "flowCount": 0,
        "actorCount": 0,
        "useCaseCount": 0,
        "actionCount": 0,
        "decisionCount": 0,
        "startCount": 0,
        "stopCount": 0,
        "warnings": ["Class diagram contains isolated nodes."],
        "errorMessage": null
      }
    ],
    "generatedAt": "2026-04-26T09:20:00Z"
  }
}
```

### 9.3 图摘要

```http
GET /api/v1/projects/{projectId}/diagram-summary
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "totalDiagrams": 3,
    "parsedDiagrams": 3,
    "failedDiagrams": 0,
    "items": [
      {
        "diagramType": "CLASS",
        "totalCount": 1,
        "parsedCount": 1,
        "failedCount": 0,
        "entityCount": 10,
        "relationCount": 8
      }
    ],
    "generatedAt": "2026-04-26T09:20:00Z"
  }
}
```

## 10. Report 报告接口

### 10.1 普通报告草稿

```http
GET /api/v1/projects/{projectId}/report-draft
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "snapshotId": 1,
    "generatedAt": "2026-04-26T09:30:00Z",
    "title": "backend-test-demo Quality Report Draft",
    "executiveSummary": "Latest snapshot includes ...",
    "keyFindings": ["Snapshot baseline: ..."],
    "recommendations": ["Prioritize refactoring top risk targets ..."],
    "markdown": "# backend-test-demo - Quality Report Draft\n\n..."
  }
}
```

### 10.2 AI 风格报告草稿

```http
GET /api/v1/projects/{projectId}/report-draft-ai
```

说明：当前是后端本地启发式生成，不调用外部大模型。

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "snapshotId": 1,
    "generatedAt": "2026-04-26T09:30:00Z",
    "title": "backend-test-demo AI Quality Report Draft",
    "provider": "LOCAL_HEURISTIC",
    "model": "metricforge-local-v1",
    "fallbackUsed": false,
    "executiveSummary": "Project backend-test-demo currently shows ...",
    "keyFindings": ["Risk pressure profile: ..."],
    "recommendations": ["Run re-analysis after each refactor batch ..."],
    "markdown": "# backend-test-demo - AI Quality Report Draft\n\n..."
  }
}
```

## 11. Export 导出接口

### 11.1 导出 JSON

```http
POST /api/v1/snapshots/{snapshotId}/export/json
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "snapshotId": 1,
    "exportType": "JSON",
    "filePath": "F:/.../output/exports/backend-test-demo-snapshot-1-1777194600000.json",
    "createdAt": "2026-04-26T09:40:00Z"
  }
}
```

### 11.2 导出 CSV

```http
POST /api/v1/snapshots/{snapshotId}/export/csv
```

成功返回：`data` 为 `ExportResponse`，`exportType` 为 `CSV`。

### 11.3 导出 HTML

```http
POST /api/v1/snapshots/{snapshotId}/export/html
```

成功返回：`data` 为 `ExportResponse`，`exportType` 为 `HTML`。

### 11.4 导出 PDF

```http
POST /api/v1/snapshots/{snapshotId}/export/pdf
```

成功返回：`data` 为 `ExportResponse`，`exportType` 为 `PDF`。

### 11.5 导出 Typst PDF

```http
POST /api/v1/snapshots/{snapshotId}/export/pdf-typst
```

说明：后端会尝试调用本机 `typst compile`。如果 Typst 不可用，默认回退为 HTML-PDF。

成功返回：`data` 为 `ExportResponse`，`exportType` 可能为：

| 值 | 说明 |
| --- | --- |
| `PDF_TYPST` | Typst 编译成功 |
| `PDF_TYPST_FALLBACK` | Typst 失败，回退到 HTML-PDF |

### 11.6 查询快照导出记录

```http
GET /api/v1/snapshots/{snapshotId}/exports
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "id": 1,
      "snapshotId": 1,
      "projectId": 1,
      "exportType": "HTML",
      "filePath": "F:/.../output/exports/backend-test-demo-snapshot-1-1777194600000.html",
      "createdAt": "2026-04-26T09:40:00Z"
    }
  ]
}
```

### 11.7 查询项目导出记录

```http
GET /api/v1/projects/{projectId}/exports
```

成功返回：`data` 为 `ExportRecordResponse[]`。

## 12. Estimate 项目估算接口

### 12.1 项目估算

```http
POST /api/v1/projects/{projectId}/estimate
Content-Type: application/json
```

支持模型：

| `model` | 说明 |
| --- | --- |
| `COCOMO` | 基于 KLOC 的 COCOMO 估算 |
| `UCP` | 用例点估算 |
| `FP` | 功能点估算 |
| `FEATURE_POINT` / `FEP` | 扩展功能点估算 |

#### COCOMO 请求

```json
{
  "model": "COCOMO",
  "kLoc": 12.5,
  "cocomoMode": "ORGANIC",
  "personMonthCost": 12000
}
```

说明：`kLoc` 可不传；如果项目已有快照，会用最新快照的 `totalLoc / 1000` 推导。

`cocomoMode` 支持：

| 值 | 说明 |
| --- | --- |
| `ORGANIC` | 有机型 |
| `SEMI_DETACHED` | 半独立型 |
| `EMBEDDED` | 嵌入型 |

#### UCP 请求

```json
{
  "model": "UCP",
  "actorSimpleCount": 2,
  "actorAverageCount": 1,
  "actorComplexCount": 1,
  "useCaseSimpleCount": 2,
  "useCaseAverageCount": 2,
  "useCaseComplexCount": 1,
  "technicalComplexityFactor": 1.05,
  "environmentalComplexityFactor": 0.95,
  "personMonthCost": 12000
}
```

#### FP 请求

```json
{
  "model": "FP",
  "externalInputCount": 8,
  "externalOutputCount": 6,
  "externalInquiryCount": 3,
  "internalLogicalFileCount": 4,
  "externalInterfaceFileCount": 2,
  "valueAdjustmentSum": 35,
  "personMonthCost": 12000
}
```

#### FEATURE_POINT 请求

```json
{
  "model": "FEATURE_POINT",
  "externalInputCount": 8,
  "externalOutputCount": 6,
  "externalInquiryCount": 3,
  "internalLogicalFileCount": 4,
  "externalInterfaceFileCount": 2,
  "valueAdjustmentSum": 35,
  "algorithmComplexityCount": 3,
  "algorithmWeight": 3.2,
  "reuseAdjustmentFactor": 0.9,
  "personMonthCost": 12000
}
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "model": "COCOMO",
    "estimatedSize": 12.5,
    "sizeUnit": "KLOC",
    "estimatedEffortPersonMonths": 34.12,
    "estimatedScheduleMonths": 8.59,
    "estimatedCost": 409440,
    "details": {
      "kLoc": 12.5,
      "a": 2.4,
      "b": 1.05,
      "c": 2.5,
      "d": 0.38
    },
    "assumptions": "Basic COCOMO model; schedule formula: c * effort^d."
  }
}
```

## 13. MCP 工具接口

MCP 接口是为 AI/Agent 集成准备的封装层，底层调用普通项目、快照、估算接口。

### 13.1 查询工具列表

```http
GET /api/v1/mcp/tools
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "toolName": "analyze_project",
      "description": "Start a project analysis and generate a new snapshot.",
      "method": "POST",
      "path": "/api/v1/mcp/tools/analyze-project"
    }
  ]
}
```

### 13.2 项目类工具

#### 同步分析项目

```http
POST /api/v1/mcp/tools/analyze-project
Content-Type: application/json
```

```json
{
  "projectId": 1
}
```

返回：`data` 为 `AnalysisTaskResponse`。

#### 异步分析项目

```http
POST /api/v1/mcp/tools/analyze-project-async
Content-Type: application/json
```

```json
{
  "projectId": 1
}
```

返回：`data` 为 `AnalysisTaskResponse`。

#### 生成项目报告上下文

```http
POST /api/v1/mcp/tools/generate-report-context
Content-Type: application/json
```

```json
{
  "projectId": 1
}
```

成功返回：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "projectName": "backend-test-demo",
    "language": "Java",
    "analysisCount": 2,
    "latestAnalysisStatus": "FINISHED",
    "qualityGrade": "B",
    "latestSummary": {
      "totalLoc": 1000,
      "classCount": 20,
      "methodCount": 80,
      "averageComplexity": 3.45,
      "highRiskCount": 4
    },
    "topRisks": []
  }
}
```

### 13.3 任务类工具

#### 查询任务

```http
POST /api/v1/mcp/tools/get-analysis-task
Content-Type: application/json
```

```json
{
  "projectId": 1,
  "taskId": 2
}
```

返回：`data` 为 `AnalysisTaskResponse`。

#### 取消任务

```http
POST /api/v1/mcp/tools/cancel-analysis-task
Content-Type: application/json
```

```json
{
  "projectId": 1,
  "taskId": 2
}
```

返回：`data` 为 `AnalysisTaskResponse`。

#### 重试任务

```http
POST /api/v1/mcp/tools/retry-analysis-task
Content-Type: application/json
```

```json
{
  "projectId": 1,
  "taskId": 2
}
```

返回：`data` 为新任务的 `AnalysisTaskResponse`。

#### 查询任务队列

```http
GET /api/v1/mcp/tools/analysis-queue-status
```

返回：`data` 为 `AnalysisQueueStatusResponse`。

#### 查询审计日志

```http
POST /api/v1/mcp/tools/analysis-audits
Content-Type: application/json
```

按项目查：

```json
{
  "projectId": 1
}
```

按任务查：

```json
{
  "projectId": 1,
  "taskId": 2
}
```

返回：`data` 为 `AnalysisAuditLogResponse[]`。

### 13.4 指标与风险工具

#### 查询类指标

```http
POST /api/v1/mcp/tools/get-class-metrics
Content-Type: application/json
```

```json
{
  "projectId": 1
}
```

返回：`data` 为 `ClassMetricResponse[]`。

#### 查询风险热点

```http
POST /api/v1/mcp/tools/get-hotspots
Content-Type: application/json
```

```json
{
  "projectId": 1,
  "limit": 5
}
```

返回：`data` 为按风险优先级排序后的 `RiskItemResponse[]`。

#### 推荐重构目标

```http
POST /api/v1/mcp/tools/suggest-refactor-targets
Content-Type: application/json
```

```json
{
  "projectId": 1,
  "limit": 5
}
```

返回：同 `get-hotspots`。

### 13.5 快照工具

#### 对比快照

```http
POST /api/v1/mcp/tools/compare-snapshots
Content-Type: application/json
```

```json
{
  "fromSnapshotId": 1,
  "toSnapshotId": 2
}
```

返回：`data` 为 `SnapshotCompareResponse`。

兼容别名：

```http
POST /api/v1/mcp/tools/snapshot-compare
```

#### 查询质量趋势

```http
POST /api/v1/mcp/tools/quality-trend
Content-Type: application/json
```

```json
{
  "projectId": 1
}
```

返回：`data` 为 `ProjectTrendResponse`。

### 13.6 图分析工具

```http
POST /api/v1/mcp/tools/diagram-consistency
POST /api/v1/mcp/tools/diagram-insights
POST /api/v1/mcp/tools/diagram-summary
Content-Type: application/json
```

请求体：

```json
{
  "projectId": 1
}
```

返回分别对应：

| 接口 | 返回 data |
| --- | --- |
| `/diagram-consistency` | `DiagramConsistencyResponse` |
| `/diagram-insights` | `DiagramInsightsResponse` |
| `/diagram-summary` | `DiagramSummaryResponse` |

### 13.7 报告工具

```http
POST /api/v1/mcp/tools/report-draft
POST /api/v1/mcp/tools/report-draft-ai
Content-Type: application/json
```

请求体：

```json
{
  "projectId": 1
}
```

返回分别对应：

| 接口 | 返回 data |
| --- | --- |
| `/report-draft` | `ReportDraftResponse` |
| `/report-draft-ai` | `AiReportDraftResponse` |

### 13.8 估算工具

```http
POST /api/v1/mcp/tools/estimate-project
Content-Type: application/json
```

请求体：

```json
{
  "projectId": 1,
  "estimateRequest": {
    "model": "FP",
    "externalInputCount": 8,
    "externalOutputCount": 6,
    "externalInquiryCount": 3,
    "internalLogicalFileCount": 4,
    "externalInterfaceFileCount": 2,
    "valueAdjustmentSum": 35,
    "personMonthCost": 12000
  }
}
```

返回：`data` 为 `EstimateResponse`。

## 14. 前端页面建议与接口映射

| 页面 | 推荐接口 |
| --- | --- |
| 项目列表 | `GET /api/v1/projects` |
| 创建项目弹窗 | `POST /api/v1/projects` |
| 项目设置 | `GET /api/v1/projects/{id}`、`PUT /api/v1/projects/{id}` |
| 导入页面 | `POST /upload-source`、`POST /upload-diagram`、`GET /imports` |
| 分析任务页 | `POST /analyze-async`、`GET /tasks`、`GET /tasks/{taskId}`、`POST /cancel`、`POST /retry` |
| 仪表盘总览 | `GET /overview`、`GET /trend`、`GET /risks` |
| 类指标表格 | `GET /classes` |
| 方法指标表格 | `GET /methods` |
| 依赖关系图 | `GET /dependencies` |
| 快照管理 | `GET /snapshots`、`GET /snapshots/{snapshotId}`、`GET /snapshots/compare` |
| 图一致性 | `GET /diagram-consistency`、`GET /diagram-insights`、`GET /diagram-summary` |
| 报告中心 | `GET /report-draft`、`GET /report-draft-ai`、`POST /export/*`、`GET /exports` |
| 项目估算 | `POST /estimate` |

## 15. 前端联调注意事项

1. 前端必须先判断 `code === "0"`，再读取 `data`。
2. 分析类接口依赖 `sourcePath`，必须先调用上传源码接口。
3. `diagram-consistency` 依赖类图，必须先上传类图。
4. `classes`、`methods`、`risks`、`trend` 都依赖至少一次成功分析。
5. 异步分析建议每 1-2 秒轮询一次任务详情。
6. 导出接口返回的是后端本地文件路径，不是文件流。
7. Windows 路径在 JSON 中推荐写成 `/`，例如 `F:/xxx/src/main/java`。
8. `pdf-typst` 如果本机没有 Typst，会尝试回退到普通 PDF。
9. 快照对比要求两个快照属于同一个项目。
10. MCP 接口前端一般不用直接接，除非要做 AI 助手或工具面板。

