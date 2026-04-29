# F-AI 轻量 Agent 后端接口与设计说明

本文档记录 MetriScope 新增 AI 分析/对话能力的后端设计、配置、接口契约和前端对接方式。

## 1. 设计目标

本次新增能力不是引入 LangChain，也不是让大模型替代度量规则，而是在 Java Spring Boot 后端内实现一个轻量 AI Agent：

```text
后端确定性度量工具聚合
-> 构造项目质量上下文
-> 调用 OpenAI-compatible LLM
-> 输出中文分析、改进建议、答辩话术
```

核心原则：

- API Key 只放后端，前端不直接调用 DeepSeek/OpenAI。
- LLM 只做解释、总结、建议，不做核心质量判定。
- 没有 API Key 或 LLM 调用失败时，后端返回本地 fallback 文本，保证答辩现场可用。
- AI Chat 必须能获得后端绝大多数度量上下文。

## 2. 新增配置

文件：`src/main/resources/application.properties`

```properties
metricforge.ai.enabled=true
metricforge.ai.base-url=https://api.deepseek.com
metricforge.ai.api-key=${DEEPSEEK_API_KEY:}
metricforge.ai.model=deepseek-chat
metricforge.ai.timeout-seconds=60
```

说明：

| 配置 | 说明 |
|---|---|
| `metricforge.ai.enabled` | 是否启用真实 LLM 调用 |
| `metricforge.ai.base-url` | OpenAI-compatible base URL，例如 DeepSeek |
| `metricforge.ai.api-key` | API Key，默认从环境变量 `DEEPSEEK_API_KEY` 读取 |
| `metricforge.ai.model` | 模型名，默认 `deepseek-chat` |
| `metricforge.ai.timeout-seconds` | 请求超时时间 |

如果 `api-key` 为空，接口仍正常返回，`provider` 为 `LOCAL_FALLBACK`。

## 3. Agent 可使用的后端度量上下文

`MetricToolContextBuilder` 会聚合以下数据：

| usedTools | 数据来源 | 内容 |
|---|---|---|
| `latest_snapshot` | `SnapshotRepository` | 快照摘要、LOC、类/方法数量、平均复杂度、高风险数、注释率 |
| `risk_hotspots` | `SnapshotService#latestRisks` | Top 风险项 |
| `class_metrics` | `SnapshotService#latestClassMetrics` | CK/LK/复杂度/认知复杂度/LCOM/RFC/WMC 等类指标 |
| `method_metrics` | `SnapshotService#latestMethodMetrics` | 高复杂度方法、参数数、认知复杂度、行号 |
| `dependencies` | `SnapshotService#latestDependencies` | 依赖边样本 |
| `quality_trend` | `SnapshotService#projectTrend` | 多快照趋势 delta |
| `code_smells` | `CodeSmellService#detect` | Code Smell 总数、技术债、坏味道列表 |
| `mccall_quality` | `McCallQualityService#evaluate` | McCall 总分、等级、质量因子 |
| `ifpug_function_point` | `FpAssessmentRepository` | 最新 IFPUG 功能点评估 |
| `quality_gate` | `ProjectService#evaluateQualityGate` | 可选，传入 `fromSnapshotId` 和 `toSnapshotId` 时启用 |

注意：`quality_gate` 是可选上下文。前端如果只传 `snapshotId`，AI 仍可分析项目；如果要分析 AI 改动前后质量，则同时传 `fromSnapshotId` 和 `toSnapshotId`。

## 4. 接口 1：AI 项目质量分析

### 4.1 请求

```http
POST /api/v1/projects/{projectId}/ai/analyze
Content-Type: application/json
```

Request:

```json
{
  "snapshotId": 2,
  "mode": "QUALITY_REVIEW",
  "fromSnapshotId": 1,
  "toSnapshotId": 2
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `snapshotId` | number | 否 | 指定分析快照；为空时使用项目最新快照 |
| `mode` | string | 否 | `QUALITY_REVIEW`、`REFACTOR_ADVICE`、`DEFENSE_SCRIPT` |
| `fromSnapshotId` | number | 否 | 质量门禁起点快照 |
| `toSnapshotId` | number | 否 | 质量门禁终点快照 |

### 4.2 响应

Response `data`:

```json
{
  "projectId": 1,
  "snapshotId": 2,
  "mode": "QUALITY_REVIEW",
  "provider": "LOCAL_FALLBACK",
  "model": "rule-based",
  "summary": "已基于项目 `Stage1 Demo` 的快照 2 聚合 9 类后端度量上下文，生成质量分析。",
  "markdown": "## AI 项目质量分析\n\n...",
  "suggestions": [
    "优先处理风险热点和高复杂度方法，降低平均圈复杂度与认知复杂度。",
    "结合 Code Smell 结果清理长方法、复杂方法、大类和高耦合类。"
  ],
  "usedTools": [
    "latest_snapshot",
    "risk_hotspots",
    "class_metrics",
    "method_metrics",
    "dependencies",
    "quality_trend",
    "code_smells",
    "mccall_quality",
    "quality_gate"
  ],
  "generatedAt": "2026-04-29T11:05:00Z"
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `provider` | `DEEPSEEK_COMPATIBLE` 或 `LOCAL_FALLBACK` |
| `model` | 实际模型名；fallback 时为 `rule-based` |
| `summary` | 一句话摘要 |
| `markdown` | 适合前端 Markdown 渲染和报告章节复用的正文 |
| `suggestions` | 可执行改进建议 |
| `usedTools` | 本次 AI 上下文使用了哪些后端度量工具 |

## 5. 接口 2：AI 项目对话

### 5.1 请求

```http
POST /api/v1/projects/{projectId}/ai/chat
Content-Type: application/json
```

Request:

```json
{
  "snapshotId": 2,
  "message": "这个项目最大的问题是什么？",
  "includeTools": true,
  "fromSnapshotId": 1,
  "toSnapshotId": 2
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `snapshotId` | number | 否 | 指定对话使用的快照；为空时使用最新快照 |
| `message` | string | 是 | 用户问题 |
| `includeTools` | boolean | 否 | 是否返回 usedTools；默认返回 |
| `fromSnapshotId` | number | 否 | 可选质量门禁起点快照 |
| `toSnapshotId` | number | 否 | 可选质量门禁终点快照 |

### 5.2 响应

Response `data`:

```json
{
  "projectId": 1,
  "snapshotId": 2,
  "answer": "根据当前后端聚合的度量上下文，项目质量应重点关注复杂度、高风险项、Code Smell、McCall 质量因子和趋势变化。",
  "provider": "LOCAL_FALLBACK",
  "model": "rule-based",
  "usedTools": [
    "latest_snapshot",
    "risk_hotspots",
    "class_metrics",
    "method_metrics",
    "code_smells",
    "mccall_quality"
  ],
  "generatedAt": "2026-04-29T11:06:00Z"
}
```

错误码：

| code | 场景 |
|---|---|
| `PROJECT_ID_INVALID` | projectId 非法 |
| `PROJECT_NOT_FOUND` | 项目不存在 |
| `PROJECT_NOT_ANALYZED` | 项目还没有任何快照 |
| `SNAPSHOT_NOT_FOUND` | 指定快照不存在 |
| `SNAPSHOT_PROJECT_MISMATCH` | 快照不属于当前项目 |
| `AI_CHAT_MESSAGE_REQUIRED` | chat 请求缺少 message |

## 6. 前端对接建议

新增 AI Analysis 页面或在 MCP 页面旁新增 Tab：

```text
AI Analysis
- projectId
- snapshotId
- mode selector
- fromSnapshotId / toSnapshotId 可选
- 生成 AI 分析按钮
- summary
- markdown preview
- suggestions
- usedTools tags

AI Chat
- projectId
- snapshotId
- input message
- send button
- answer list
- usedTools tags
```

前端注意：

- 不要直接调用 DeepSeek/OpenAI。
- 所有 AI 请求都走后端 `/api/v1/projects/{projectId}/ai/**`。
- `markdown` 可能较长，应使用可滚动区域。
- `usedTools` 是答辩亮点，建议以标签形式展示。
- `provider=LOCAL_FALLBACK` 不是错误，表示后端未配置 API Key 或 LLM 不可用，但接口可用。

## 7. 答辩表述

可以这样讲：

> 我们没有让大模型直接替代软件度量规则，而是先由后端通过 JavaParser、风险规则、Code Smell、McCall、IFPUG 和 Quality Gate 生成确定性的质量上下文，再由 OpenAI-compatible LLM 生成中文分析、改进建议和答辩话术。这样既保证了度量结果可解释、可复现，也让 AI 能围绕真实指标辅助重构和质量验收。

## 8. 验证

已加入后端自动化测试：

- `POST /api/v1/projects/{projectId}/ai/analyze`
- `POST /api/v1/projects/{projectId}/ai/chat`

测试不依赖真实 DeepSeek API Key，默认走 fallback。

