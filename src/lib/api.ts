import { toast } from "sonner";
import { useApp } from "@/stores/app";

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T | null;
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const PREFIX = "/api/v1";

function getBaseUrl() {
  return useApp.getState().baseUrl.replace(/\/$/, "");
}

export interface RequestOptions {
  silent?: boolean;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  opts: RequestOptions = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  let json: ApiResponse<T>;
  try {
    const resp = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    json = (await resp.json()) as ApiResponse<T>;
  } catch (e) {
    const msg = `网络错误: ${(e as Error).message}`;
    if (!opts.silent) toast.error(msg);
    throw new ApiError("NETWORK_ERROR", msg);
  }
  if (json.code !== "0") {
    if (!opts.silent) toast.error(`${json.code}: ${json.message}`);
    throw new ApiError(json.code, json.message);
  }
  return json.data as T;
}

const get = <T,>(path: string, opts?: RequestOptions) =>
  request<T>(path, undefined, opts);
const post = <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
  request<T>(
    path,
    { method: "POST", body: body == null ? undefined : JSON.stringify(body) },
    opts,
  );
const put = <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
  request<T>(
    path,
    { method: "PUT", body: body == null ? undefined : JSON.stringify(body) },
    opts,
  );
const del = <T,>(path: string, opts?: RequestOptions) =>
  request<T>(path, { method: "DELETE" }, opts);

// ============== Types ==============

export interface SystemPingResponse {
  appName: string;
  status: string;
  serverTime: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description: string;
  sourcePath: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  sourcePath?: string;
  language?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  sourcePath?: string;
  language?: string;
}

export interface UploadSourceRequest {
  sourcePath?: string;
  zipFileName?: string;
}

export type DiagramType =
  | "CLASS"
  | "USE_CASE"
  | "ACTIVITY"
  | "PUML"
  | "PLANTUML"
  | "MERMAID"
  | "MMD"
  | "POWERDESIGNER"
  | "OOM";

export interface UploadDiagramRequest {
  diagramPath: string;
  diagramType: DiagramType;
}

export interface ImportRecordResponse {
  id: number;
  projectId: number;
  importType: "SOURCE" | "DIAGRAM";
  reference: string;
  status: string;
  createdAt: string;
}

export type AnalysisTaskStatus =
  | "RUNNING"
  | "FINISHED"
  | "FAILED"
  | "CANCELED"
  | "TIMEOUT";

export interface AnalysisTaskResponse {
  id: number;
  projectId: number;
  status: AnalysisTaskStatus;
  startedAt: string;
  finishedAt: string | null;
  errorCount: number;
  snapshotId: number | null;
}

export interface AnalysisQueueStatusResponse {
  corePoolSize: number;
  maxPoolSize: number;
  activeCount: number;
  queueSize: number;
  remainingQueueCapacity: number;
  totalTaskCount: number;
  completedTaskCount: number;
  timeoutSeconds: number;
}

export interface OverviewResponse {
  projectId: number;
  projectName: string;
  language: string;
  analysisCount: number;
  latestAnalysisStatus: AnalysisTaskStatus | null;
  latestAnalysisStartedAt: string | null;
  highRiskCount: number;
  qualityGrade: string | null;
  latestSnapshot?: {
    id: number;
    summary: SnapshotSummary;
  };
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ClassMetricResponse {
  packageName: string;
  className: string;
  qualifiedName: string;
  loc: number;
  fieldCount: number;
  methodCount: number;
  averageComplexity: number;
  maxComplexity: number;
  couplingCount: number;
  weightedMethodsPerClass: number;
  depthOfInheritanceTree: number;
  numberOfChildren: number;
  responseForClass: number;
  lackOfCohesionOfMethods: number;
  classSize: number;
  numberOfOperations: number;
  numberOfAttributes: number;
  specializationIndex: number;
  /** F7：类内方法平均认知复杂度 */
  averageCognitiveComplexity: number;
  /** F7：类内方法最大认知复杂度 */
  maxCognitiveComplexity: number;
  riskLevel: RiskLevel;
}

export interface MethodMetricResponse {
  classQualifiedName: string;
  methodName: string;
  returnType: string;
  parameterCount: number;
  loc: number;
  cyclomaticComplexity: number;
  /** F7：方法认知复杂度 */
  cognitiveComplexity: number;
  riskLevel: RiskLevel;
  startLine: number;
  endLine: number;
}

export interface RiskItemResponse {
  targetType: "CLASS" | "METHOD" | "PACKAGE" | "PROJECT";
  targetName: string;
  metricName: string;
  metricValue: number;
  thresholdValue: number;
  riskLevel: RiskLevel;
  message: string;
}

export interface DependencyEdgeResponse {
  fromClass: string;
  toClass: string;
  edgeType: string;
}

export interface SnapshotSummary {
  totalLoc: number;
  classCount: number;
  methodCount: number;
  averageComplexity: number;
  highRiskCount: number;
  javaFileCount: number;
  blankLines: number;
  commentLines: number;
  commentRate: number;
}

export interface SnapshotResponse {
  id: number;
  projectId: number;
  versionTag: string;
  createdAt: string;
  summary: SnapshotSummary;
}

export interface SnapshotCompareResponse {
  fromSnapshotId: number;
  toSnapshotId: number;
  projectId: number;
  diff: {
    totalLocDelta: number;
    classCountDelta: number;
    methodCountDelta: number;
    averageComplexityDelta: number;
    highRiskCountDelta: number;
  };
}

export interface ProjectTrendPoint {
  snapshotId: number;
  createdAt: string;
  totalLoc: number;
  classCount: number;
  methodCount: number;
  averageComplexity: number;
  highRiskCount: number;
}

export interface ProjectTrendResponse {
  projectId: number;
  snapshotCount: number;
  totalLocDelta: number;
  classCountDelta: number;
  methodCountDelta: number;
  averageComplexityDelta: number;
  highRiskCountDelta: number;
  points: ProjectTrendPoint[];
}

export interface ReportDraftResponse {
  projectId: number;
  snapshotId: number;
  generatedAt: string;
  title: string;
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
  markdown: string;
}

export interface AiReportDraftResponse extends ReportDraftResponse {
  provider: string;
  model: string;
  fallbackUsed: boolean;
}

export type ExportType =
  | "JSON"
  | "CSV"
  | "HTML"
  | "PDF"
  | "PDF_TYPST"
  | "PDF_TYPST_FALLBACK";

export interface ExportResponse {
  snapshotId: number;
  exportType: ExportType;
  filePath: string;
  createdAt: string;
}

export interface ExportRecordResponse {
  id: number;
  snapshotId: number;
  projectId: number;
  exportType: ExportType;
  filePath: string;
  createdAt: string;
}

export type EstimateModel = "COCOMO" | "UCP" | "FP" | "FEATURE_POINT" | "FEP";
export type CocomoMode = "ORGANIC" | "SEMI_DETACHED" | "EMBEDDED";

export interface EstimateRequest {
  model: EstimateModel;
  personMonthCost?: number;
  // COCOMO
  kLoc?: number;
  cocomoMode?: CocomoMode;
  // UCP
  actorSimpleCount?: number;
  actorAverageCount?: number;
  actorComplexCount?: number;
  useCaseSimpleCount?: number;
  useCaseAverageCount?: number;
  useCaseComplexCount?: number;
  technicalComplexityFactor?: number;
  environmentalComplexityFactor?: number;
  // FP / FEP
  externalInputCount?: number;
  externalOutputCount?: number;
  externalInquiryCount?: number;
  internalLogicalFileCount?: number;
  externalInterfaceFileCount?: number;
  valueAdjustmentSum?: number;
  // FEP only
  algorithmComplexityCount?: number;
  algorithmWeight?: number;
  reuseAdjustmentFactor?: number;
}

export interface EstimateResponse {
  projectId: number;
  model: EstimateModel;
  estimatedSize: number;
  sizeUnit: string;
  estimatedEffortPersonMonths: number;
  estimatedScheduleMonths: number;
  estimatedCost: number;
  details: Record<string, number | string>;
  assumptions: string;
}

// ============== Diagrams ==============

export interface DiagramConsistencyResponse {
  diagramPath: string;
  diagramType: string;
  diagramClassCount: number;
  codeClassCount: number;
  matchedClassCount: number;
  missingInCodeClassCount: number;
  missingInDiagramClassCount: number;
  missingRelationsInCodeCount: number;
  missingRelationsInDiagramCount: number;
  consistencyScore: number;
  missingInCodeClasses: string[];
  missingInDiagramClasses: string[];
  missingRelationsInCode: string[];
  missingRelationsInDiagram: string[];
  suggestions: string[];
}

export interface DiagramInsightItem {
  importId: number;
  diagramPath: string;
  diagramType: string;
  status: string;
  nodeCount: number;
  relationCount: number;
  isolatedNodeCount: number;
  inheritanceCount: number;
  dependencyCount: number;
  aggregationCount: number;
  flowCount: number;
  actorCount: number;
  useCaseCount: number;
  actionCount: number;
  decisionCount: number;
  startCount: number;
  stopCount: number;
  warnings: string[];
  errorMessage: string | null;
}

export interface DiagramInsightsResponse {
  projectId: number;
  totalDiagrams: number;
  parsedDiagrams: number;
  failedDiagrams: number;
  items: DiagramInsightItem[];
}

export interface DiagramSummaryItem {
  diagramType: string;
  totalCount: number;
  parsedCount: number;
  failedCount: number;
  entityCount: number;
  relationCount: number;
}

export interface DiagramSummaryResponse {
  projectId: number;
  totalDiagrams: number;
  parsedDiagrams: number;
  failedDiagrams: number;
  items: DiagramSummaryItem[];
  generatedAt: string;
}

// ============== MCP ==============

export interface McpToolDescriptor {
  toolName: string;
  description: string;
  method: "GET" | "POST";
  path: string;
}

// ============== F6 · McCall Quality Model ==============

export type McCallFactorCode =
  | "MAINTAINABILITY"
  | "RELIABILITY"
  | "TESTABILITY"
  | "EFFICIENCY"
  | "REUSABILITY"
  | "FLEXIBILITY";

export type QualityGrade = "A" | "B" | "C" | "D";

export interface McCallMetric {
  metricName: string;
  metricLabel: string;
  rawValue: number;
  normalizedScore: number;
  weight: number;
}

export interface McCallCriterion {
  criteria: string;
  criteriaName: string;
  score: number;
  metrics: McCallMetric[];
}

export interface McCallFactor {
  factor: McCallFactorCode;
  factorName: string;
  score: number;
  criteria: McCallCriterion[];
}

export interface McCallResponse {
  projectId: number;
  snapshotId: number;
  overallScore: number;
  grade: QualityGrade;
  factors: McCallFactor[];
}

// ============== F8 · Code Smell ==============

export type CodeSmellType =
  | "LONG_METHOD"
  | "COMPLEX_METHOD"
  | "HIGH_COGNITIVE_COMPLEXITY"
  | "LONG_PARAMETER_LIST"
  | "LARGE_CLASS"
  | "GOD_CLASS"
  | "HIGH_COUPLING"
  | "LOW_COHESION"
  | "DEEP_INHERITANCE"
  | "LARGE_RESPONSE_SET";

export type CodeSmellSeverity = "MEDIUM" | "HIGH";

export interface CodeSmellItem {
  smellType: CodeSmellType;
  smellName: string;
  targetType: "CLASS" | "METHOD";
  targetName: string;
  severity: CodeSmellSeverity;
  triggerMetric: string;
  triggerValue: number;
  threshold: number;
  debtMinutes: number;
  suggestion: string;
}

export interface CodeSmellsResponse {
  projectId: number;
  snapshotId: number;
  totalSmellCount: number;
  totalDebtHours: number;
  smellsByType: Partial<Record<CodeSmellType, number>>;
  items: CodeSmellItem[];
}

// ============== F14 · IFPUG Function Point Assessment ==============

export type FpFunctionType = "EI" | "EO" | "EQ" | "ILF" | "EIF";
export type FpComplexity = "LOW" | "AVERAGE" | "HIGH";
export type GscFactorCode =
  | "DATA_COMMUNICATIONS"
  | "DISTRIBUTED_DATA_PROCESSING"
  | "PERFORMANCE"
  | "HEAVILY_USED_CONFIGURATION"
  | "TRANSACTION_RATE"
  | "ONLINE_DATA_ENTRY"
  | "END_USER_EFFICIENCY"
  | "ONLINE_UPDATE"
  | "COMPLEX_PROCESSING"
  | "REUSABILITY"
  | "INSTALLATION_EASE"
  | "OPERATIONAL_EASE"
  | "MULTIPLE_SITES"
  | "FACILITATE_CHANGE";

export interface FpFunctionItemRequest {
  name: string;
  type: FpFunctionType;
  complexity?: FpComplexity;
  detCount?: number;
  ftrCount?: number;
  retCount?: number;
  description?: string;
}

export interface FpGscRatingRequest {
  factorCode: GscFactorCode;
  rating: number;
}

export interface CreateFpAssessmentRequest {
  name: string;
  description?: string;
  productivityFpPerPersonMonth?: number;
  personMonthCost?: number;
  items: FpFunctionItemRequest[];
  gscRatings?: FpGscRatingRequest[];
}

export interface FpFunctionItemResponse {
  id: number;
  name: string;
  type: FpFunctionType;
  typeLabel: string;
  complexity: FpComplexity;
  detCount: number;
  ftrCount: number;
  retCount: number;
  weight: number;
  description: string;
}

export interface FpGscRatingResponse {
  id: number;
  factorCode: GscFactorCode;
  factorLabel: string;
  rating: number;
}

export interface FpAssessmentResponse {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  ufp: number;
  valueAdjustmentSum: number;
  vaf: number;
  afp: number;
  productivityFpPerPersonMonth: number;
  estimatedEffortPersonMonths: number;
  estimatedScheduleMonths: number;
  estimatedCost: number;
  itemsByType: Partial<Record<FpFunctionType, number>>;
  items: FpFunctionItemResponse[];
  gscRatings: FpGscRatingResponse[];
  createdAt: string;
}

// ============== API Modules ==============

export const systemApi = {
  ping: (opts?: RequestOptions) =>
    get<SystemPingResponse>(`${PREFIX}/system/ping`, { silent: true, ...opts }),
  browse: (path?: string, opts?: RequestOptions) =>
      get<string[]>(`${PREFIX}/system/browse?path=${encodeURIComponent(path || "")}`, opts),
};

export const projectsApi = {
  list: (opts?: RequestOptions) =>
    get<ProjectResponse[]>(`${PREFIX}/projects`, opts),
  detail: (id: number, opts?: RequestOptions) =>
    get<ProjectResponse>(`${PREFIX}/projects/${id}`, opts),
  create: (body: CreateProjectRequest, opts?: RequestOptions) =>
    post<ProjectResponse>(`${PREFIX}/projects`, body, opts),
  update: (id: number, body: UpdateProjectRequest, opts?: RequestOptions) =>
    put<ProjectResponse>(`${PREFIX}/projects/${id}`, body, opts),
  uploadSource: (
    id: number,
    body: UploadSourceRequest,
    opts?: RequestOptions,
  ) =>
    post<ImportRecordResponse>(
      `${PREFIX}/projects/${id}/upload-source`,
      body,
      opts,
    ),
  uploadDiagram: (
    id: number,
    body: UploadDiagramRequest,
    opts?: RequestOptions,
  ) =>
    post<ImportRecordResponse>(
      `${PREFIX}/projects/${id}/upload-diagram`,
      body,
      opts,
    ),
  imports: (id: number, opts?: RequestOptions) =>
    get<ImportRecordResponse[]>(`${PREFIX}/projects/${id}/imports`, opts),
};

export const analysisApi = {
  analyze: (projectId: number, opts?: RequestOptions) =>
    post<AnalysisTaskResponse>(
      `${PREFIX}/projects/${projectId}/analyze`,
      undefined,
      opts,
    ),
  analyzeAsync: (projectId: number, opts?: RequestOptions) =>
    post<AnalysisTaskResponse>(
      `${PREFIX}/projects/${projectId}/analyze-async`,
      undefined,
      opts,
    ),
  tasks: (projectId: number, opts?: RequestOptions) =>
    get<AnalysisTaskResponse[]>(`${PREFIX}/projects/${projectId}/tasks`, opts),
  task: (projectId: number, taskId: number, opts?: RequestOptions) =>
    get<AnalysisTaskResponse>(
      `${PREFIX}/projects/${projectId}/tasks/${taskId}`,
      opts,
    ),
  cancel: (projectId: number, taskId: number, opts?: RequestOptions) =>
    post<AnalysisTaskResponse>(
      `${PREFIX}/projects/${projectId}/tasks/${taskId}/cancel`,
      undefined,
      opts,
    ),
  retry: (projectId: number, taskId: number, opts?: RequestOptions) =>
    post<AnalysisTaskResponse>(
      `${PREFIX}/projects/${projectId}/tasks/${taskId}/retry`,
      undefined,
      opts,
    ),
  queue: (opts?: RequestOptions) =>
    get<AnalysisQueueStatusResponse>(
      `${PREFIX}/projects/analysis-queue`,
      opts,
    ),
};

export interface MaintainabilityResponse {
  averageScore: number;
  level: string;
  color: string;
  goodCount: number;
  moderateCount: number;
  lowCount: number;
  criticalCount: number;
}

export const metricsApi = {
  overview: (projectId: number, opts?: RequestOptions) =>
    get<OverviewResponse>(`${PREFIX}/projects/${projectId}/overview`, opts),
  classes: (projectId: number, opts?: RequestOptions) =>
    get<ClassMetricResponse[]>(
      `${PREFIX}/projects/${projectId}/classes`,
      opts,
    ),
  methods: (projectId: number, opts?: RequestOptions) =>
    get<MethodMetricResponse[]>(
      `${PREFIX}/projects/${projectId}/methods`,
      opts,
    ),
  risks: (projectId: number, opts?: RequestOptions) =>
    get<RiskItemResponse[]>(`${PREFIX}/projects/${projectId}/risks`, opts),
  dependencies: (projectId: number, opts?: RequestOptions) =>
    get<DependencyEdgeResponse[]>(
      `${PREFIX}/projects/${projectId}/dependencies`,
      opts,
    ),
  getMaintainability: (projectId: number) =>
      request<MaintainabilityResponse>(`/api/v1/snapshots/${projectId}/maintainability`, {
        method: 'GET'
      }),
};

export const snapshotsApi = {
  list: (projectId: number, opts?: RequestOptions) =>
    get<SnapshotResponse[]>(
      `${PREFIX}/projects/${projectId}/snapshots`,
      opts,
    ),
  detail: (snapshotId: number, opts?: RequestOptions) =>
    get<SnapshotResponse>(`${PREFIX}/snapshots/${snapshotId}`, opts),
  compare: (fromId: number, toId: number, opts?: RequestOptions) =>
    get<SnapshotCompareResponse>(
      `${PREFIX}/snapshots/compare?from=${fromId}&to=${toId}`,
      opts,
    ),
  trend: (projectId: number, opts?: RequestOptions) =>
    get<ProjectTrendResponse>(`${PREFIX}/projects/${projectId}/trend`, opts),
};

export const reportsApi = {
  draft: (projectId: number, opts?: RequestOptions) =>
    get<ReportDraftResponse>(
      `${PREFIX}/projects/${projectId}/report-draft`,
      opts,
    ),
  draftAi: (projectId: number, opts?: RequestOptions) =>
    get<AiReportDraftResponse>(
      `${PREFIX}/projects/${projectId}/report-draft-ai`,
      opts,
    ),
};

export const exportsApi = {
  exportJson: (snapshotId: number, opts?: RequestOptions) =>
    post<ExportResponse>(
      `${PREFIX}/snapshots/${snapshotId}/export/json`,
      undefined,
      opts,
    ),
  exportCsv: (snapshotId: number, opts?: RequestOptions) =>
    post<ExportResponse>(
      `${PREFIX}/snapshots/${snapshotId}/export/csv`,
      undefined,
      opts,
    ),
  exportHtml: (snapshotId: number, opts?: RequestOptions) =>
    post<ExportResponse>(
      `${PREFIX}/snapshots/${snapshotId}/export/html`,
      undefined,
      opts,
    ),
  exportPdf: (snapshotId: number, opts?: RequestOptions) =>
    post<ExportResponse>(
      `${PREFIX}/snapshots/${snapshotId}/export/pdf`,
      undefined,
      opts,
    ),
  exportPdfTypst: (snapshotId: number, opts?: RequestOptions) =>
    post<ExportResponse>(
      `${PREFIX}/snapshots/${snapshotId}/export/pdf-typst`,
      undefined,
      opts,
    ),
  bySnapshot: (snapshotId: number, opts?: RequestOptions) =>
    get<ExportRecordResponse[]>(
      `${PREFIX}/snapshots/${snapshotId}/exports`,
      opts,
    ),
  byProject: (projectId: number, opts?: RequestOptions) =>
    get<ExportRecordResponse[]>(`${PREFIX}/projects/${projectId}/exports`, opts),
};

export const estimateApi = {
  estimate: (
    projectId: number,
    body: EstimateRequest,
    opts?: RequestOptions,
  ) => post<EstimateResponse>(`${PREFIX}/projects/${projectId}/estimate`, body, opts),
};

export const diagramsApi = {
  consistency: (projectId: number, opts?: RequestOptions) =>
    get<DiagramConsistencyResponse>(
      `${PREFIX}/projects/${projectId}/diagram-consistency`,
      opts,
    ),
  insights: (projectId: number, opts?: RequestOptions) =>
    get<DiagramInsightsResponse>(
      `${PREFIX}/projects/${projectId}/diagram-insights`,
      opts,
    ),
  summary: (projectId: number, opts?: RequestOptions) =>
    get<DiagramSummaryResponse>(
      `${PREFIX}/projects/${projectId}/diagram-summary`,
      opts,
    ),
};

export const qualityApi = {
  mccall: (projectId: number, opts?: RequestOptions) =>
    get<McCallResponse>(
      `${PREFIX}/projects/${projectId}/quality/mccall`,
      opts,
    ),
  codeSmells: (projectId: number, opts?: RequestOptions) =>
    get<CodeSmellsResponse>(
      `${PREFIX}/projects/${projectId}/code-smells`,
      opts,
    ),
};

export const fpAssessmentsApi = {
  list: (projectId: number, opts?: RequestOptions) =>
    get<FpAssessmentResponse[]>(
      `${PREFIX}/projects/${projectId}/fp-assessments`,
      opts,
    ),
  create: (
    projectId: number,
    body: CreateFpAssessmentRequest,
    opts?: RequestOptions,
  ) =>
    post<FpAssessmentResponse>(
      `${PREFIX}/projects/${projectId}/fp-assessments`,
      body,
      opts,
    ),
  detail: (assessmentId: number, opts?: RequestOptions) =>
    get<FpAssessmentResponse>(`${PREFIX}/fp-assessments/${assessmentId}`, opts),
  delete: (assessmentId: number, opts?: RequestOptions) =>
    del<null>(`${PREFIX}/fp-assessments/${assessmentId}`, opts),
};

export const mcpApi = {
  tools: (opts?: RequestOptions) =>
    get<McpToolDescriptor[]>(`${PREFIX}/mcp/tools`, opts),
  /**
   * 通用 MCP 工具调用。GET 工具忽略 body；POST 工具用 body。
   * 后端返回的 path 已经是带 /api/v1 前缀的完整路径，所以这里直接用 path。
   */
  invoke: <T = unknown>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ) => {
    if (method === "GET") return get<T>(path, opts);
    return post<T>(path, body, opts);
  },
};
