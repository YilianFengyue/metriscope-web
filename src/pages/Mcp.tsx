import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Calculator,
  Copy,
  FileText,
  FolderKanban,
  Gauge,
  GitCompare,
  History,
  Layers,
  ListChecks,
  Loader2,
  Network,
  Play,
  Plug,
  RotateCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { mcpApi, type McpToolDescriptor } from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============== Tool meta ==============

type CategoryKey =
  | "project"
  | "task"
  | "metric"
  | "snapshot"
  | "diagram"
  | "report"
  | "estimate";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: typeof Bot;
  accent: string;
}[] = [
  { key: "project", label: "项目类", icon: FolderKanban, accent: "oklch(0.55 0.18 260)" },
  { key: "task", label: "任务类", icon: ListChecks, accent: "oklch(0.6 0.16 200)" },
  { key: "metric", label: "指标 & 风险", icon: Gauge, accent: "oklch(0.6 0.22 25)" },
  { key: "snapshot", label: "快照", icon: Layers, accent: "oklch(0.65 0.18 295)" },
  { key: "diagram", label: "图分析", icon: GitCompare, accent: "oklch(0.62 0.18 165)" },
  { key: "report", label: "报告", icon: FileText, accent: "oklch(0.55 0.18 260)" },
  { key: "estimate", label: "估算", icon: Calculator, accent: "oklch(0.7 0.17 75)" },
];

interface ToolMeta {
  category: CategoryKey;
  /** 占位用例：projectId 会在运行时替换为当前项目 */
  example?: object;
  alias?: string; // 在工具列表里隐藏，认作主工具的别名
}

const TOOL_META: Record<string, ToolMeta> = {
  // 项目
  "analyze-project": { category: "project", example: { projectId: 1 } },
  "analyze-project-async": { category: "project", example: { projectId: 1 } },
  "generate-report-context": { category: "project", example: { projectId: 1 } },
  // 任务
  "get-analysis-task": {
    category: "task",
    example: { projectId: 1, taskId: 1 },
  },
  "cancel-analysis-task": {
    category: "task",
    example: { projectId: 1, taskId: 1 },
  },
  "retry-analysis-task": {
    category: "task",
    example: { projectId: 1, taskId: 1 },
  },
  "analysis-queue-status": { category: "task" }, // GET, no body
  "analysis-audits": { category: "task", example: { projectId: 1 } },
  // 指标 & 风险
  "get-class-metrics": { category: "metric", example: { projectId: 1 } },
  "get-hotspots": {
    category: "metric",
    example: { projectId: 1, limit: 5 },
  },
  "suggest-refactor-targets": {
    category: "metric",
    example: { projectId: 1, limit: 5 },
  },
  // 快照
  "compare-snapshots": {
    category: "snapshot",
    example: { fromSnapshotId: 1, toSnapshotId: 2 },
  },
  "snapshot-compare": {
    category: "snapshot",
    example: { fromSnapshotId: 1, toSnapshotId: 2 },
    alias: "compare-snapshots",
  },
  "quality-trend": { category: "snapshot", example: { projectId: 1 } },
  // 图分析
  "diagram-consistency": { category: "diagram", example: { projectId: 1 } },
  "diagram-insights": { category: "diagram", example: { projectId: 1 } },
  "diagram-summary": { category: "diagram", example: { projectId: 1 } },
  // 报告
  "report-draft": { category: "report", example: { projectId: 1 } },
  "report-draft-ai": { category: "report", example: { projectId: 1 } },
  // 估算
  "estimate-project": {
    category: "estimate",
    example: {
      projectId: 1,
      estimateRequest: {
        model: "FP",
        externalInputCount: 8,
        externalOutputCount: 6,
        externalInquiryCount: 3,
        internalLogicalFileCount: 4,
        externalInterfaceFileCount: 2,
        valueAdjustmentSum: 35,
        personMonthCost: 12000,
      },
    },
  },
};

function pathSlug(path: string): string {
  // 后端返回 path 形如 /api/v1/mcp/tools/analyze-project
  return path.split("/").pop() ?? path;
}

function fillExample(example: object | undefined, projectId: number | null): string {
  if (!example) return "";
  let body: any = JSON.parse(JSON.stringify(example));
  if (projectId != null && body && typeof body === "object" && "projectId" in body) {
    body.projectId = projectId;
  }
  return JSON.stringify(body, null, 2);
}

// ============== Raw invoke (保留完整 envelope 以便演示) ==============

interface InvokeResult {
  ok: boolean;
  httpStatus: number;
  latencyMs: number;
  raw: string;
  json: any;
  networkError?: boolean;
}

async function rawInvoke(
  method: "GET" | "POST",
  path: string,
  bodyText: string,
): Promise<InvokeResult> {
  const baseUrl = useApp.getState().baseUrl.replace(/\/$/, "");
  const t0 = performance.now();
  let parsedBody: unknown = undefined;
  if (method === "POST" && bodyText.trim()) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      throw new Error("请求体不是合法 JSON");
    }
  }
  try {
    const resp = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body:
        method === "POST" && parsedBody != null
          ? JSON.stringify(parsedBody)
          : undefined,
    });
    const latencyMs = performance.now() - t0;
    const text = await resp.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }
    return {
      ok: resp.ok && json?.code === "0",
      httpStatus: resp.status,
      latencyMs,
      raw: text,
      json,
    };
  } catch (e) {
    return {
      ok: false,
      httpStatus: 0,
      latencyMs: performance.now() - t0,
      raw: (e as Error).message,
      json: null,
      networkError: true,
    };
  }
}

// ============== JSON syntax highlighter ==============

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightJson(json: any): string {
  const text = JSON.stringify(json, null, 2);
  return escapeHtml(text).replace(
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match, key, str, kw, num) => {
      if (key) return `<span style="color:oklch(0.55 0.22 295)">${match}</span>`; // 紫
      if (str) return `<span style="color:oklch(0.55 0.18 165)">${match}</span>`; // 翡翠
      if (kw) return `<span style="color:oklch(0.6 0.22 25)">${match}</span>`; // 红
      if (num) return `<span style="color:oklch(0.65 0.18 75)">${match}</span>`; // 琥珀
      return match;
    },
  );
}

// ============== Page ==============

interface HistoryEntry {
  ts: number;
  toolName: string;
  method: string;
  path: string;
  ok: boolean;
  httpStatus: number;
  latencyMs: number;
  bodyText: string;
  result: InvokeResult;
}

export default function McpPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);

  const toolsQuery = useQuery({
    queryKey: ["mcp-tools"],
    queryFn: () => mcpApi.tools({ silent: true }),
    retry: 0,
    staleTime: 5 * 60_000,
  });

  const tools = useMemo(() => toolsQuery.data ?? [], [toolsQuery.data]);

  const groupedTools = useMemo(() => {
    const map = new Map<CategoryKey, McpToolDescriptor[]>();
    for (const cat of CATEGORIES) map.set(cat.key, []);
    const others: McpToolDescriptor[] = [];
    for (const t of tools) {
      const slug = pathSlug(t.path);
      const meta = TOOL_META[slug];
      if (meta?.alias) continue; // 隐藏别名
      if (meta) map.get(meta.category)?.push(t);
      else others.push(t);
    }
    return { map, others };
  }, [tools]);

  const [search, setSearch] = useState("");
  const filteredCount = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tools.length;
    return tools.filter(
      (t) =>
        t.toolName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.path.toLowerCase().includes(q),
    ).length;
  }, [tools, search]);

  const [selected, setSelected] = useState<McpToolDescriptor | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [activeTab, setActiveTab] = useState("request");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // 默认选中第一个
  useEffect(() => {
    if (selected || tools.length === 0) return;
    const first = tools.find((t) => !TOOL_META[pathSlug(t.path)]?.alias);
    if (first) {
      setSelected(first);
      const meta = TOOL_META[pathSlug(first.path)];
      setBodyText(fillExample(meta?.example, currentProjectId));
    }
  }, [tools, selected, currentProjectId]);

  const onSelectTool = (t: McpToolDescriptor) => {
    setSelected(t);
    const meta = TOOL_META[pathSlug(t.path)];
    setBodyText(fillExample(meta?.example, currentProjectId));
    setResult(null);
    setActiveTab("request");
  };

  const onFillExample = () => {
    if (!selected) return;
    const meta = TOOL_META[pathSlug(selected.path)];
    setBodyText(fillExample(meta?.example, currentProjectId));
  };

  const onInvoke = async () => {
    if (!selected) return;
    setInvoking(true);
    try {
      const res = await rawInvoke(selected.method, selected.path, bodyText);
      setResult(res);
      setActiveTab("response");
      setHistory((prev) =>
        [
          {
            ts: Date.now(),
            toolName: selected.toolName,
            method: selected.method,
            path: selected.path,
            ok: res.ok,
            httpStatus: res.httpStatus,
            latencyMs: res.latencyMs,
            bodyText,
            result: res,
          },
          ...prev,
        ].slice(0, 8),
      );
      if (res.ok) {
        toast.success(`${selected.toolName} · ${res.latencyMs.toFixed(0)}ms`);
      } else if (res.networkError) {
        toast.error(`网络错误：${res.raw}`);
      } else {
        toast.error(
          `${res.json?.code ?? res.httpStatus}: ${res.json?.message ?? "调用失败"}`,
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <McpHero toolCount={tools.length} loading={toolsQuery.isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左：工具列表 */}
        <Card className="lg:col-span-4 h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" />
                MCP 工具
              </CardTitle>
              <Badge variant="outline" className="text-[10px] tabular-nums">
                {tools.length} 个
              </Badge>
            </div>
            <div className="relative pt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索工具名 / 描述…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            {search && (
              <div className="text-[10px] text-muted-foreground tabular-nums">
                匹配 {filteredCount} / {tools.length}
              </div>
            )}
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {toolsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : tools.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                后端未返回工具列表
              </div>
            ) : (
              <Accordion
                type="multiple"
                defaultValue={CATEGORIES.map((c) => c.key)}
                className="w-full"
              >
                {CATEGORIES.map((cat) => {
                  const items = (groupedTools.map.get(cat.key) ?? []).filter(
                    (t) => {
                      if (!search.trim()) return true;
                      const q = search.toLowerCase();
                      return (
                        t.toolName.toLowerCase().includes(q) ||
                        t.description.toLowerCase().includes(q) ||
                        t.path.toLowerCase().includes(q)
                      );
                    },
                  );
                  if (items.length === 0) return null;
                  const Icon = cat.icon;
                  return (
                    <AccordionItem key={cat.key} value={cat.key} className="border-b-0">
                      <AccordionTrigger className="px-2 py-1.5 hover:bg-accent/40 rounded-md hover:no-underline">
                        <div className="flex items-center gap-2 text-xs">
                          <Icon
                            className="h-3.5 w-3.5"
                            style={{ color: cat.accent }}
                          />
                          <span>{cat.label}</span>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {items.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <ul className="space-y-0.5 pl-1">
                          {items.map((t) => (
                            <li key={t.toolName}>
                              <ToolButton
                                tool={t}
                                isSelected={selected?.toolName === t.toolName}
                                onClick={() => onSelectTool(t)}
                              />
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
                {groupedTools.others.length > 0 && (
                  <AccordionItem value="others" className="border-b-0">
                    <AccordionTrigger className="px-2 py-1.5 rounded-md">
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>其他</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          {groupedTools.others.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <ul className="space-y-0.5 pl-1">
                        {groupedTools.others.map((t) => (
                          <li key={t.toolName}>
                            <ToolButton
                              tool={t}
                              isSelected={selected?.toolName === t.toolName}
                              onClick={() => onSelectTool(t)}
                            />
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* 右：调用面板 */}
        <div className="lg:col-span-8">
          {!selected ? (
            <Card>
              <CardContent className="py-24 text-center text-sm text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                从左侧选择一个工具开始调用
              </CardContent>
            </Card>
          ) : (
            <InvocationPanel
              tool={selected}
              bodyText={bodyText}
              onBodyChange={setBodyText}
              onFillExample={onFillExample}
              onInvoke={onInvoke}
              invoking={invoking}
              result={result}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              history={history}
              currentProjectId={currentProjectId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============== Hero ==============

function McpHero({
  toolCount,
  loading,
}: {
  toolCount: number;
  loading: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.13] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.22 295) 0%, oklch(0.6 0.16 200) 50%, transparent 100%)",
        }}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground tracking-wide uppercase">
            <Bot className="h-3.5 w-3.5" />
            Model Context Protocol
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            MCP 工具调试台
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            把 MetriScope 的核心能力以 MCP 工具暴露给 AI Agent。下面是后端注册的全部工具，可直接选中、填参、发请求、看响应——验证"度量 → 风险 → AI 重构 → 复测"闭环。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <Badge variant="outline" className="text-xs">
              {toolCount} 个工具已注册
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============== Tool button ==============

function ToolButton({
  tool,
  isSelected,
  onClick,
}: {
  tool: McpToolDescriptor;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded-md transition-colors group",
        isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/60",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <MethodBadge method={tool.method} />
        <span
          className={cn(
            "font-mono text-[11px] truncate",
            isSelected ? "text-primary font-medium" : "",
          )}
        >
          {tool.toolName}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 pl-[42px]">
        {tool.description}
      </div>
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const isPost = method === "POST";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono text-[9px] font-bold rounded px-1.5 py-0.5 shrink-0 tabular-nums w-9 tracking-wider",
        isPost
          ? "bg-[oklch(0.55_0.22_295)]/15 text-[oklch(0.45_0.22_295)]"
          : "bg-[oklch(0.6_0.16_200)]/15 text-[oklch(0.45_0.16_200)]",
      )}
    >
      {method}
    </span>
  );
}

// ============== Invocation panel ==============

function InvocationPanel({
  tool,
  bodyText,
  onBodyChange,
  onFillExample,
  onInvoke,
  invoking,
  result,
  activeTab,
  onTabChange,
  history,
  currentProjectId,
}: {
  tool: McpToolDescriptor;
  bodyText: string;
  onBodyChange: (v: string) => void;
  onFillExample: () => void;
  onInvoke: () => void;
  invoking: boolean;
  result: InvokeResult | null;
  activeTab: string;
  onTabChange: (v: string) => void;
  history: HistoryEntry[];
  currentProjectId: number | null;
}) {
  const meta = TOOL_META[pathSlug(tool.path)];
  const isPost = tool.method === "POST";

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full opacity-[0.1] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.22 295) 0%, transparent 70%)",
        }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="font-mono text-base flex items-center gap-2">
              {tool.toolName}
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs">
              {tool.description}
            </CardDescription>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <MethodBadge method={tool.method} />
              <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {tool.path}
              </code>
              {meta && (
                <Badge variant="outline" className="text-[9px]">
                  {CATEGORIES.find((c) => c.key === meta.category)?.label ?? "其他"}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(tool.path);
              toast.success("已复制路径");
            }}
            title="复制路径"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="request">
              <Send className="h-3 w-3" />
              请求
            </TabsTrigger>
            <TabsTrigger value="response">
              {result?.ok ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ) : result ? (
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              )}
              响应
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-3 w-3" />
              历史
              {history.length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
                  {history.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-3 mt-4">
            {!isPost ? (
              <Alert variant="info">
                <Plug className="h-4 w-4" />
                <AlertTitle>GET 请求</AlertTitle>
                <AlertDescription>
                  这个工具不需要请求体，直接点「发送」即可。
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium uppercase tracking-wider">
                    请求体（JSON）
                  </span>
                  {currentProjectId != null && (
                    <span className="text-muted-foreground tabular-nums">
                      当前 projectId = {currentProjectId}
                    </span>
                  )}
                </div>
                <Textarea
                  value={bodyText}
                  onChange={(e) => onBodyChange(e.target.value)}
                  rows={Math.max(8, bodyText.split("\n").length + 1)}
                  className="font-mono text-xs leading-relaxed resize-y"
                  spellCheck={false}
                />
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onInvoke} disabled={invoking}>
                {invoking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                发送
              </Button>
              {isPost && (
                <>
                  <Button variant="outline" size="default" onClick={onFillExample}>
                    <Sparkles className="h-3.5 w-3.5" />
                    填示例
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => onBodyChange("")}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    清空
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="response" className="mt-4 space-y-3">
            {!result ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Send className="h-7 w-7 mx-auto mb-2 opacity-30" />
                还没有发送请求
              </div>
            ) : (
              <ResponseView result={result} />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {history.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <History className="h-7 w-7 mx-auto mb-2 opacity-30" />
                没有调用记录
              </div>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li
                    key={h.ts}
                    className="flex items-center gap-3 text-xs px-2 py-2 rounded-md border border-border/60 hover:bg-accent/40 transition-colors"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        h.ok ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    />
                    <MethodBadge method={h.method} />
                    <span className="font-mono truncate flex-1 min-w-0">
                      {h.toolName}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {h.httpStatus || "—"}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0 w-14 text-right">
                      {h.latencyMs.toFixed(0)}ms
                    </span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {new Date(h.ts).toLocaleTimeString("zh-CN", {
                        hour12: false,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ResponseView({ result }: { result: InvokeResult }) {
  if (result.networkError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>网络错误</AlertTitle>
        <AlertDescription className="font-mono break-all">
          {result.raw}
        </AlertDescription>
      </Alert>
    );
  }

  const code = result.json?.code ?? "—";
  const message = result.json?.message ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <Badge
          variant={result.ok ? "success" : "danger"}
          className="font-mono"
        >
          {result.ok ? "OK" : "ERROR"}
        </Badge>
        <span className="font-mono text-muted-foreground">
          HTTP {result.httpStatus}
        </span>
        <span className="font-mono text-muted-foreground">
          code <span className="text-foreground">{code}</span>
        </span>
        {message && (
          <span className="text-muted-foreground italic">{message}</span>
        )}
        <span className="ml-auto tabular-nums text-muted-foreground">
          {result.latencyMs.toFixed(0)} ms
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            navigator.clipboard.writeText(result.raw);
            toast.success("已复制响应体");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre
        className="bg-muted/40 border border-border rounded-md p-3 text-[11px] leading-relaxed font-mono overflow-auto max-h-[480px]"
        dangerouslySetInnerHTML={{
          __html: result.json
            ? highlightJson(result.json)
            : escapeHtml(result.raw),
        }}
      />
    </div>
  );
}
