# F10-F12 AI MCP 前端交接文档

本文档面向前端开发，说明 Phase2 中 F10、F11、F12 的页面目标、接口契约、展示建议和联调顺序。

当前后端状态：可联调。后端已提供 MCP 工具列表、重构 Prompt 生成、质量门禁评估接口，并已纳入后端自动化测试。

## 1. 功能范围

| 功能 | 页面/模块 | 后端状态 | 前端目标 |
|---|---|---|---|
| F10 MCP 演示页 | `/mcp` 或 AI 工具页 Tab | 已有 MCP REST 工具接口 | 展示工具列表，选择工具，填写 JSON 参数，发送请求，展示响应 |
| F11 Vibe Coding Prompt | MCP 页内 Tab 或项目 AI 页 | 已完成 REST + MCP 工具 | 展示重构 Prompt、目标类列表、复制按钮 |
| F12 AI Quality Gate | 快照对比页/质量门禁卡片 | 已完成 REST 接口 | 对比两个快照，展示 PASS/WARN/BLOCK、分数、指标变化 |

说明：本项目当前的 MCP 是 REST 风格的 MCP-like 工具封装，路径统一在 `/api/v1/mcp/tools` 下；不是标准 stdio/SSE MCP Server。

## 2. 通用响应结构

所有接口外层统一：

```json
{
  "code": "0",
  "message": "OK",
  "data": {}
}
```

前端判断建议：

- `code === "0"`：成功，读取 `data`。
- `code !== "0"`：失败，展示 `message`。
- HTTP 200 不一定代表业务成功，要优先判断 `code`。

## 3. F10 MCP 演示页

### 3.1 页面目标

F10 的核心是答辩展示：后端把软件度量能力封装成工具，AI/前端可以选择工具并传入参数，拿到真实项目度量结果。

建议页面结构：

```text
左侧：MCP 工具列表
  - toolName
  - method
  - path

右侧上方：工具说明
  - description
  - method + path

右侧中部：JSON 请求体编辑区
  - 根据工具填默认模板

右侧下方：响应 JSON 预览
  - loading
  - success
  - error
```

### 3.2 获取工具列表

```http
GET /api/v1/mcp/tools
```

响应字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `toolName` | string | 工具名，例如 `get_hotspots` |
| `description` | string | 工具说明 |
| `method` | string | `GET` 或 `POST` |
| `path` | string | 实际调用路径 |

示例响应：

```json
{
  "code": "0",
  "message": "OK",
  "data": [
    {
      "toolName": "get_hotspots",
      "description": "Get top risky hotspots for refactor prioritization.",
      "method": "POST",
      "path": "/api/v1/mcp/tools/get-hotspots"
    },
    {
      "toolName": "refactor_prompt",
      "description": "Generate structured refactor prompt from latest risks and metrics.",
      "method": "POST",
      "path": "/api/v1/mcp/tools/refactor-prompt"
    }
  ]
}
```

### 3.3 推荐默认请求体模板

前端可以按 `toolName` 自动填默认 JSON，降低演示成本。

| toolName | 默认请求体 |
|---|---|
| `analyze_project` | `{ "projectId": 1 }` |
| `analyze_project_async` | `{ "projectId": 1 }` |
| `get_analysis_task` | `{ "projectId": 1, "taskId": 1 }` |
| `cancel_analysis_task` | `{ "projectId": 1, "taskId": 1 }` |
| `retry_analysis_task` | `{ "projectId": 1, "taskId": 1 }` |
| `analysis_audits` | `{ "projectId": 1 }` |
| `get_class_metrics` | `{ "projectId": 1 }` |
| `get_hotspots` | `{ "projectId": 1, "limit": 5 }` |
| `compare_snapshots` | `{ "fromSnapshotId": 1, "toSnapshotId": 2 }` |
| `generate_report_context` | `{ "projectId": 1 }` |
| `suggest_refactor_targets` | `{ "projectId": 1, "limit": 5 }` |
| `quality_trend` | `{ "projectId": 1 }` |
| `estimate_project` | 见下方估算示例 |
| `diagram_consistency` | `{ "projectId": 1 }` |
| `diagram_insights` | `{ "projectId": 1 }` |
| `diagram_summary` | `{ "projectId": 1 }` |
| `report_draft` | `{ "projectId": 1 }` |
| `report_draft_ai` | `{ "projectId": 1 }` |
| `refactor_prompt` | `{ "projectId": 1 }` |

`estimate_project` 示例：

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

### 3.4 前端状态建议

建议至少实现：

- 工具列表 loading / empty / error
- 请求体 JSON parse error
- 调用中 loading
- 成功响应 JSON 高亮
- 失败响应展示 `message`
- 一键复制响应 JSON

## 4. F11 Vibe Coding Prompt

F11 有两个调用入口：项目 REST 接口和 MCP 工具接口。前端页面展示建议优先用项目 REST 接口；MCP 演示页中选择 `refactor_prompt` 时用 MCP 工具接口。

### 4.1 项目接口

```http
GET /api/v1/projects/{projectId}/ai/refactor-prompt
```

请求参数：

| 参数 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `projectId` | path | number | 是 | 项目 ID |

响应：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "snapshotId": 2,
    "riskCount": 5,
    "prompt": "本次软件度量分析发现以下质量问题，请在不改变外部 API 的前提下进行重构：...",
    "targetClasses": ["com.demo.OrderService"],
    "generatedAt": "2026-04-29T09:30:00Z"
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `projectId` | number | 项目 ID |
| `snapshotId` | number | 使用的最新快照 ID |
| `riskCount` | number | 当前快照风险项总数 |
| `prompt` | string | 可复制给 AI 编码助手的重构指令 |
| `targetClasses` | string[] | 建议优先处理的类 |
| `generatedAt` | string | 生成时间，ISO 格式 |

错误码：

| code | 场景 |
|---|---|
| `PROJECT_NOT_FOUND` | 项目不存在 |
| `PROJECT_NOT_ANALYZED` | 项目还没有分析快照，需要先执行分析 |

### 4.2 MCP 工具接口

```http
POST /api/v1/mcp/tools/refactor-prompt
Content-Type: application/json
```

请求体：

```json
{
  "projectId": 1
}
```

响应 `data` 与项目接口一致。

额外错误码：

| code | 场景 |
|---|---|
| `MCP_PROJECT_ID_REQUIRED` | 请求体缺少 `projectId` |

### 4.3 页面展示建议

建议在页面中展示：

- 顶部摘要：`snapshotId`、`riskCount`、`generatedAt`
- 目标类列表：`targetClasses`
- Prompt 预览：使用 Markdown/纯文本块展示
- 操作按钮：复制 Prompt、重新生成、跳转 MCP 演示页

前端可用的视觉状态：

| 条件 | 展示 |
|---|---|
| `riskCount > 0` | 显示风险数量和“建议重构”状态 |
| `targetClasses.length > 0` | 显示目标类列表 |
| `targetClasses.length === 0` | 显示“暂无明确目标类，可做小步清理” |
| `PROJECT_NOT_ANALYZED` | 引导用户先点击分析项目 |

## 5. F12 AI Quality Gate

F12 用于展示“AI 重构前后质量是否改善”。它需要两个快照 ID：优化前 `fromSnapshotId` 和优化后 `toSnapshotId`。

### 5.1 接口

```http
POST /api/v1/projects/{projectId}/quality-gates/evaluate
Content-Type: application/json
```

请求参数：

| 参数 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `projectId` | path | number | 是 | 项目 ID |
| `fromSnapshotId` | body | number | 是 | 对比起点快照 |
| `toSnapshotId` | body | number | 是 | 对比终点快照 |
| `source` | body | string | 否 | 来源，建议传 `AI_PATCH` |

请求体：

```json
{
  "fromSnapshotId": 1,
  "toSnapshotId": 2,
  "source": "AI_PATCH"
}
```

响应：

```json
{
  "code": "0",
  "message": "OK",
  "data": {
    "projectId": 1,
    "fromSnapshotId": 1,
    "toSnapshotId": 2,
    "source": "AI_PATCH",
    "verdict": "PASS",
    "verdictLabel": "通过",
    "totalScore": 100,
    "checks": [
      {
        "metric": "averageComplexity",
        "metricLabel": "平均圈复杂度",
        "fromValue": 4.1,
        "toValue": 3.9,
        "delta": -0.2,
        "direction": "BETTER",
        "passed": true,
        "message": "复杂度下降 4.88% 。"
      },
      {
        "metric": "highRiskCount",
        "metricLabel": "高风险项数",
        "fromValue": 3,
        "toValue": 2,
        "delta": -1,
        "direction": "BETTER",
        "passed": true,
        "message": "高风险项减少 1 个。"
      }
    ],
    "suggestion": "质量门禁通过，建议合并并继续观察趋势。"
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `verdict` | string | `PASS`、`WARN`、`BLOCK` |
| `verdictLabel` | string | 中文标签：通过、需关注、阻塞 |
| `totalScore` | number | 门禁分数，0-100 |
| `checks` | array | 每个门禁指标的检查结果 |
| `suggestion` | string | 后端生成的合并/继续重构建议 |

`checks` 字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `metric` | string | 指标 key |
| `metricLabel` | string | 指标中文名 |
| `fromValue` | number | 优化前值 |
| `toValue` | number | 优化后值 |
| `delta` | number | 变化量，`toValue - fromValue` |
| `direction` | string | `BETTER`、`SAME`、`WORSE` |
| `passed` | boolean | 此指标是否通过 |
| `message` | string | 中文解释 |

当前后端检查项：

| metric | 含义 | 通过规则 |
|---|---|---|
| `averageComplexity` | 平均圈复杂度 | 下降或不变通过；上升不超过 10% 仍通过；超过 10% 不通过 |
| `highRiskCount` | 高风险项数量 | 下降或不变通过；增加不通过 |

错误码：

| code | 场景 |
|---|---|
| `QUALITY_GATE_REQUEST_INVALID` | 缺少 `fromSnapshotId` 或 `toSnapshotId` |
| `SNAPSHOT_NOT_FOUND` | 快照不存在 |
| `SNAPSHOT_PROJECT_MISMATCH` | 快照不属于当前项目 |

### 5.2 页面展示建议

建议做成一个质量门禁结果卡片：

```text
AI Patch Quality Gate
Verdict: PASS / WARN / BLOCK
Score: 100
Suggestion: ...

指标明细：
平均圈复杂度  4.1 -> 3.9  BETTER  通过
高风险项数    3   -> 2    BETTER  通过
```

视觉映射建议：

| 字段 | 值 | 展示 |
|---|---|---|
| `verdict` | `PASS` | 绿色，通过 |
| `verdict` | `WARN` | 黄色，需关注 |
| `verdict` | `BLOCK` | 红色，阻塞 |
| `direction` | `BETTER` | 向下/改善图标 |
| `direction` | `SAME` | 横线/持平图标 |
| `direction` | `WORSE` | 向上/恶化图标 |
| `passed` | `true` | 通过标记 |
| `passed` | `false` | 未通过标记 |

## 6. 推荐前端开发顺序

1. 先完成 F10 MCP 工具列表：调用 `GET /api/v1/mcp/tools`，能看到工具列表。
2. 给 F10 加通用调用器：根据工具 `method/path` 发送请求，展示响应 JSON。
3. 单独做 F11 Prompt 展示：调用 `GET /api/v1/projects/{projectId}/ai/refactor-prompt`。
4. 在 MCP 页验证 `POST /api/v1/mcp/tools/refactor-prompt`。
5. 做 F12 Quality Gate：选择两个快照，调用质量门禁接口。
6. 最后把 F11/F12 串进答辩路径：分析项目 -> 生成 Prompt -> 重构后再次分析 -> Quality Gate 对比。

## 7. Postman/HTTP 联调顺序

前置条件：项目已有源码并至少分析过一次。F12 需要至少两个快照。

### 7.1 F10 工具列表

```http
GET http://localhost:8080/api/v1/mcp/tools
```

验收点：

- `code` 为 `"0"`
- `data` 是数组
- 数组中包含 `refactor_prompt`

### 7.2 F11 项目 Prompt

```http
GET http://localhost:8080/api/v1/projects/1/ai/refactor-prompt
```

验收点：

- `data.snapshotId` 有值
- `data.prompt` 非空
- `data.targetClasses` 是数组

### 7.3 F11 MCP Prompt

```http
POST http://localhost:8080/api/v1/mcp/tools/refactor-prompt
Content-Type: application/json

{
  "projectId": 1
}
```

验收点：

- `data.prompt` 非空
- 返回结构与项目 Prompt 接口一致

### 7.4 F12 Quality Gate

```http
POST http://localhost:8080/api/v1/projects/1/quality-gates/evaluate
Content-Type: application/json

{
  "fromSnapshotId": 1,
  "toSnapshotId": 2,
  "source": "AI_PATCH"
}
```

验收点：

- `data.verdict` 是 `PASS`、`WARN` 或 `BLOCK`
- `data.totalScore` 是数字
- `data.checks.length` 当前为 2
- 每个 check 有 `metric`、`fromValue`、`toValue`、`delta`、`direction`、`passed`

## 8. 已有辅助文件

可以直接参考这些文件做联调：

- `API_CONTRACT.md`：第 9 节记录 F11/F12/F11 MCP 增量接口。
- `docs/http/phase1-smoke.http`：包含可直接执行的 HTTP 示例。
- `docs/mcp-live-demo-flow.md`：答辩演示流程。
- `docs/scripts/mcp-detailed-test.ps1`：MCP 工具详细测试脚本。
- `docs/scripts/mcp-live-demo-setup.ps1`：生成 MCP 演示 baseline。
- `docs/scripts/mcp-live-demo-verify.ps1`：重构后验证指标改善。

## 9. 前端注意事项

- F11 依赖最新快照，项目未分析时会返回 `PROJECT_NOT_ANALYZED`。
- F12 必须传两个属于同一项目的快照 ID，否则会返回 `SNAPSHOT_PROJECT_MISMATCH`。
- F12 当前只有两个检查项，前端不要写死未来只有两个；建议按 `checks` 数组动态渲染。
- MCP 页应允许用户自由编辑 JSON，因为不同工具请求体不完全相同。
- `generatedAt` 是 ISO 时间，前端可以本地格式化显示。
- Prompt 文本可能较长，建议用可滚动预览区，并提供复制按钮。
- 答辩时建议强调“度量 -> Prompt -> AI 重构 -> 再度量 -> Quality Gate”的闭环。

