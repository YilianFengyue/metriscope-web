import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileX2,
  GitCompare,
  Inbox,
  Lightbulb,
  Link2,
  Link2Off,
  Network,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import {
  diagramsApi,
  type DiagramConsistencyResponse,
  type DiagramInsightItem,
  type DiagramInsightsResponse,
  type DiagramSummaryResponse,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DiagramsPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  if (currentProjectId == null) return <NoProjectSelected />;
  return <DiagramsInner projectId={currentProjectId} />;
}

function DiagramsInner({ projectId }: { projectId: number }) {
  const consistencyQuery = useQuery({
    queryKey: ["diagram-consistency", projectId],
    queryFn: () => diagramsApi.consistency(projectId, { silent: true }),
    retry: 0,
  });
  const insightsQuery = useQuery({
    queryKey: ["diagram-insights", projectId],
    queryFn: () => diagramsApi.insights(projectId, { silent: true }),
    retry: 0,
  });
  const summaryQuery = useQuery({
    queryKey: ["diagram-summary", projectId],
    queryFn: () => diagramsApi.summary(projectId, { silent: true }),
    retry: 0,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-primary" />
          设计图分析
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          检查类图与代码的一致性，洞察各图的结构特征，按类型汇总图导入情况。
        </p>
      </header>

      <Tabs defaultValue="consistency">
        <TabsList>
          <TabsTrigger value="consistency">
            <ShieldCheck className="h-3.5 w-3.5" />
            一致性检查
          </TabsTrigger>
          <TabsTrigger value="insights">
            <ScanSearch className="h-3.5 w-3.5" />
            图洞察
          </TabsTrigger>
          <TabsTrigger value="summary">
            <Network className="h-3.5 w-3.5" />
            图摘要
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consistency" className="mt-4">
          <ConsistencyTab
            data={consistencyQuery.data}
            loading={consistencyQuery.isLoading}
            error={consistencyQuery.error as Error | null}
          />
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          <InsightsTab
            data={insightsQuery.data}
            loading={insightsQuery.isLoading}
            error={insightsQuery.error as Error | null}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <SummaryTab
            data={summaryQuery.data}
            loading={summaryQuery.isLoading}
            error={summaryQuery.error as Error | null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============== Consistency Tab ==============

function ConsistencyTab({
  data,
  loading,
  error,
}: {
  data?: DiagramConsistencyResponse;
  loading: boolean;
  error: Error | null;
}) {
  if (loading) return <Skeleton className="h-96" />;
  if (error || !data) return <DiagramErrorCard error={error} hint="未上传类图或解析失败" />;

  const score = data.consistencyScore;
  const scoreColor =
    score >= 90
      ? "oklch(0.62 0.18 165)" // emerald
      : score >= 70
        ? "oklch(0.7 0.17 75)" // amber
        : "oklch(0.6 0.22 25)"; // rose
  const scoreLabel = score >= 90 ? "优" : score >= 70 ? "良" : score >= 50 ? "中" : "差";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* 大圆环 */}
      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle className="text-base">一致性分数</CardTitle>
          <CardDescription className="text-xs font-mono break-all">
            {data.diagramType} · {data.diagramPath}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-2">
          <ConsistencyRing score={score} color={scoreColor} />
          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant="outline"
              style={{ color: scoreColor, borderColor: scoreColor }}
              className="text-base px-2.5 py-0.5 font-semibold"
            >
              {scoreLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              图 {data.diagramClassCount} 类 · 代码 {data.codeClassCount} 类
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4 个 KPI */}
      <div className="lg:col-span-7 grid grid-cols-2 gap-3">
        <ConsistencyKpi
          icon={CheckCircle2}
          label="匹配类"
          value={data.matchedClassCount}
          tone="emerald"
          hint="图与代码都存在"
        />
        <ConsistencyKpi
          icon={FileX2}
          label="代码缺失"
          value={data.missingInCodeClassCount}
          tone="rose"
          hint="图里有，代码没有"
        />
        <ConsistencyKpi
          icon={FileX2}
          label="图缺失"
          value={data.missingInDiagramClassCount}
          tone="amber"
          hint="代码有，图里没画"
        />
        <ConsistencyKpi
          icon={Link2Off}
          label="关系差异"
          value={
            data.missingRelationsInCodeCount + data.missingRelationsInDiagramCount
          }
          tone="violet"
          hint={`代码缺 ${data.missingRelationsInCodeCount} · 图缺 ${data.missingRelationsInDiagramCount}`}
        />
      </div>

      {/* 缺失类列表 */}
      <Card className="lg:col-span-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileX2 className="h-4 w-4 text-rose-500" />
            代码中缺失的类（图里画了但代码里没有）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.missingInCodeClasses.length === 0 ? (
            <EmptyHint icon={CheckCircle2} text="无缺失，全部一致" />
          ) : (
            <ul className="space-y-1">
              {data.missingInCodeClasses.map((name) => (
                <ClassChip key={name} name={name} tone="rose" />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileX2 className="h-4 w-4 text-amber-500" />
            图中缺失的类（代码有但图没画）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.missingInDiagramClasses.length === 0 ? (
            <EmptyHint icon={CheckCircle2} text="无缺失，全部一致" />
          ) : (
            <ul className="space-y-1">
              {data.missingInDiagramClasses.map((name) => (
                <ClassChip key={name} name={name} tone="amber" />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 关系差异 */}
      <Card className="lg:col-span-12">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4 text-violet-500" />
            关系差异
          </CardTitle>
          <CardDescription className="text-xs">
            代码中缺 {data.missingRelationsInCodeCount} 条 · 图中缺{" "}
            {data.missingRelationsInDiagramCount} 条
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                代码缺这些关系
              </div>
              {data.missingRelationsInCode.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <ul className="space-y-1">
                  {data.missingRelationsInCode.map((r, i) => (
                    <RelationRow key={i} text={r} tone="rose" />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                图缺这些关系
              </div>
              {data.missingRelationsInDiagram.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <ul className="space-y-1">
                  {data.missingRelationsInDiagram.map((r, i) => (
                    <RelationRow key={i} text={r} tone="amber" />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 建议 */}
      {data.suggestions.length > 0 && (
        <Card className="lg:col-span-12">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.suggestions.map((s, i) => (
              <Alert key={i} variant="info">
                <Lightbulb className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">建议 {i + 1}</AlertTitle>
                <AlertDescription className="text-xs">{s}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConsistencyRing({ score, color }: { score: number; color: string }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative w-48 h-48">
      <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="10"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-semibold tabular-nums"
          style={{ color }}
        >
          {score.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground tracking-wider mt-1">
          一致性分数 / 100
        </span>
      </div>
    </div>
  );
}

function ConsistencyKpi({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "violet";
  hint: string;
}) {
  const toneClass = {
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </span>
        </div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function ClassChip({ name, tone }: { name: string; tone: "rose" | "amber" }) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50/60 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-100"
      : "border-amber-200 bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100";
  return (
    <li
      className={cn(
        "px-2 py-1 rounded-md font-mono text-[11px] border",
        toneClass,
      )}
    >
      {name}
    </li>
  );
}

function RelationRow({
  text,
  tone,
}: {
  text: string;
  tone: "rose" | "amber";
}) {
  const dotColor = tone === "rose" ? "bg-rose-500" : "bg-amber-500";
  return (
    <li className="flex items-center gap-2 text-xs px-2 py-1 rounded-md hover:bg-accent/40 transition-colors">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      <span className="font-mono truncate">{text}</span>
    </li>
  );
}

// ============== Insights Tab ==============

function InsightsTab({
  data,
  loading,
  error,
}: {
  data?: DiagramInsightsResponse;
  loading: boolean;
  error: Error | null;
}) {
  if (loading) return <Skeleton className="h-96" />;
  if (error || !data) return <DiagramErrorCard error={error} hint="尚未导入设计图" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryStat label="总图数" value={data.totalDiagrams} tone="primary" />
        <SummaryStat label="解析成功" value={data.parsedDiagrams} tone="emerald" />
        <SummaryStat
          label="解析失败"
          value={data.failedDiagrams}
          tone={data.failedDiagrams > 0 ? "rose" : "muted"}
        />
      </div>

      {data.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-7 w-7 mx-auto mb-2 opacity-40" />
            尚无图记录
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.items.map((item) => (
            <InsightItemCard key={item.importId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightItemCard({ item }: { item: DiagramInsightItem }) {
  const isClass = item.diagramType === "CLASS";
  const isUseCase = item.diagramType === "USE_CASE";
  const isActivity = item.diagramType === "ACTIVITY";
  const ok = item.status === "PARSED";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {item.diagramType}
              </Badge>
              <span className="font-mono text-xs truncate">
                #{item.importId}
              </span>
            </CardTitle>
            <CardDescription className="text-[10px] font-mono break-all mt-1">
              {item.diagramPath}
            </CardDescription>
          </div>
          <Badge
            variant={ok ? "success" : "danger"}
            className="text-[9px] shrink-0"
          >
            {item.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MiniStat label="节点" value={item.nodeCount} />
          <MiniStat label="关系" value={item.relationCount} />
          <MiniStat
            label="孤立"
            value={item.isolatedNodeCount}
            warn={item.isolatedNodeCount > 0}
          />
        </div>

        {/* 类图特有 */}
        {isClass && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MiniStat label="继承" value={item.inheritanceCount} />
            <MiniStat label="依赖" value={item.dependencyCount} />
            <MiniStat label="聚合" value={item.aggregationCount} />
          </div>
        )}
        {/* 用例图 */}
        {isUseCase && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MiniStat label="参与者" value={item.actorCount} />
            <MiniStat label="用例" value={item.useCaseCount} />
          </div>
        )}
        {/* 活动图 */}
        {isActivity && (
          <div className="grid grid-cols-4 gap-2 text-xs">
            <MiniStat label="动作" value={item.actionCount} />
            <MiniStat label="判断" value={item.decisionCount} />
            <MiniStat label="开始" value={item.startCount} />
            <MiniStat label="终止" value={item.stopCount} />
          </div>
        )}
        {/* flowCount 在通用图里也有意义 */}
        {item.flowCount > 0 && (
          <div className="text-[11px] text-muted-foreground">
            流转关系：<span className="text-foreground tabular-nums">{item.flowCount}</span>
          </div>
        )}

        {item.warnings.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs">告警 {item.warnings.length} 项</AlertTitle>
            <AlertDescription className="space-y-0.5 mt-1">
              {item.warnings.map((w, i) => (
                <div key={i} className="text-[11px]">· {w}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {item.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs">解析失败</AlertTitle>
            <AlertDescription className="text-[11px] font-mono break-all">
              {item.errorMessage}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-muted/30 p-2 text-center",
        warn && "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          warn && "text-amber-600",
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ============== Summary Tab ==============

function SummaryTab({
  data,
  loading,
  error,
}: {
  data?: DiagramSummaryResponse;
  loading: boolean;
  error: Error | null;
}) {
  const generated = useMemo(() => {
    if (!data?.generatedAt) return null;
    try {
      return new Date(data.generatedAt).toLocaleString("zh-CN", {
        hour12: false,
      });
    } catch {
      return data.generatedAt;
    }
  }, [data?.generatedAt]);

  if (loading) return <Skeleton className="h-96" />;
  if (error || !data) return <DiagramErrorCard error={error} hint="尚未导入设计图" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryStat label="总图数" value={data.totalDiagrams} tone="primary" />
        <SummaryStat label="解析成功" value={data.parsedDiagrams} tone="emerald" />
        <SummaryStat
          label="解析失败"
          value={data.failedDiagrams}
          tone={data.failedDiagrams > 0 ? "rose" : "muted"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm">按图类型聚合</CardTitle>
            {generated && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                生成于 {generated}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <EmptyHint icon={Inbox} text="无图记录" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.items.map((item) => (
                <Card key={item.diagramType} className="bg-muted/30">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {item.diagramType}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        总 {item.totalCount}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <MiniStat label="解析" value={item.parsedCount} />
                      <MiniStat
                        label="失败"
                        value={item.failedCount}
                        warn={item.failedCount > 0}
                      />
                      <MiniStat label="实体" value={item.entityCount} />
                      <MiniStat label="关系" value={item.relationCount} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "emerald" | "rose" | "muted";
}) {
  const toneClass = {
    primary: "text-primary",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn("text-2xl font-semibold tabular-nums", toneClass)}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== Common helpers ==============

function NoProjectSelected() {
  return (
    <div className="p-12 max-w-xl mx-auto">
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="font-semibold tracking-tight">请先选择项目</h2>
          <p className="text-sm text-muted-foreground">
            图分析基于当前项目，先去「项目」页选择一个。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DiagramErrorCard({
  error,
  hint,
}: {
  error: Error | null;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="font-semibold tracking-tight">{hint}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error
            ? error.message
            : "请先在「项目」页上传 PlantUML / Mermaid 设计图，再回来查看。"}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyHint({
  icon: Icon,
  text,
}: {
  icon: typeof Inbox;
  text: string;
}) {
  return (
    <div className="py-6 text-center text-sm text-muted-foreground">
      <Icon className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
      {text}
    </div>
  );
}
