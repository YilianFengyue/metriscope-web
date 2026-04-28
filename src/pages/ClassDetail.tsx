import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Inbox,
  Layers3,
  Network,
  Package,
  ShieldAlert,
  Sparkles,
  Sigma,
  TrendingUp,
} from "lucide-react";
import {
  metricsApi,
  type ClassMetricResponse,
  type DependencyEdgeResponse,
  type MethodMetricResponse,
  type RiskItemResponse,
  type RiskLevel,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// 配置常量
// ============================================================================

const RISK_RANK: Record<RiskLevel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RISK_BADGE: Record<
  RiskLevel,
  "success" | "warning" | "danger" | "info"
> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

const RISK_FILL: Record<RiskLevel, string> = {
  LOW: "oklch(0.7 0.14 165)",
  MEDIUM: "oklch(0.78 0.16 80)",
  HIGH: "oklch(0.62 0.2 35)",
  CRITICAL: "oklch(0.55 0.22 25)",
};

const RISK_LABEL_CN: Record<RiskLevel, string> = {
  LOW: "良好",
  MEDIUM: "需关注",
  HIGH: "高风险",
  CRITICAL: "严重",
};

const CK_AXES = [
  {
    key: "weightedMethodsPerClass" as const,
    label: "WMC",
    full: "Weighted Methods per Class",
    cn: "类方法复杂度总量",
    ceiling: 40,
    interpret: "类承担的总责任量",
  },
  {
    key: "responseForClass" as const,
    label: "RFC",
    full: "Response For a Class",
    cn: "可响应方法集",
    ceiling: 50,
    interpret: "对外接口扩散度",
  },
  {
    key: "couplingCount" as const,
    label: "CBO",
    full: "Coupling Between Objects",
    cn: "类间耦合",
    ceiling: 15,
    interpret: "依赖外部类的多少",
  },
  {
    key: "depthOfInheritanceTree" as const,
    label: "DIT",
    full: "Depth of Inheritance Tree",
    cn: "继承深度",
    ceiling: 5,
    interpret: "从根类向下的层数",
  },
  {
    key: "numberOfChildren" as const,
    label: "NOC",
    full: "Number of Children",
    cn: "子类数量",
    ceiling: 10,
    interpret: "直接子类的数量",
  },
  {
    key: "lackOfCohesionOfMethods" as const,
    label: "LCOM",
    full: "Lack of Cohesion of Methods",
    cn: "方法内聚缺失度",
    ceiling: 1,
    interpret: "类内方法关联强弱（高=差）",
  },
] as const;

const LK_CARDS = [
  {
    key: "classSize" as const,
    label: "CS",
    full: "Class Size",
    cn: "类规模",
    ceiling: 500,
    fmt: (v: number) => v.toFixed(0),
  },
  {
    key: "numberOfOperations" as const,
    label: "NOO",
    full: "Number of Operations",
    cn: "操作数",
    ceiling: 20,
    fmt: (v: number) => v.toFixed(0),
  },
  {
    key: "numberOfAttributes" as const,
    label: "NOA",
    full: "Number of Attributes",
    cn: "属性数",
    ceiling: 15,
    fmt: (v: number) => v.toFixed(0),
  },
  {
    key: "specializationIndex" as const,
    label: "SI",
    full: "Specialization Index",
    cn: "特化指数",
    ceiling: 2,
    fmt: (v: number) => v.toFixed(2),
  },
] as const;

// ============================================================================
// 主入口
// ============================================================================

export default function ClassDetailPage() {
  const { fqn = "" } = useParams<{ fqn: string }>();
  const decoded = decodeURIComponent(fqn);
  const projectId = useApp((s) => s.currentProjectId);

  if (projectId == null) return <NoProjectSelected />;
  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={300}>
      <ClassDetailInner projectId={projectId} fqn={decoded} />
    </TooltipProvider>
  );
}

function ClassDetailInner({
  projectId,
  fqn,
}: {
  projectId: number;
  fqn: string;
}) {
  const navigate = useNavigate();

  const classesQuery = useQuery({
    queryKey: ["classes", projectId],
    queryFn: () => metricsApi.classes(projectId, { silent: true }),
    retry: 0,
  });
  const methodsQuery = useQuery({
    queryKey: ["methods", projectId],
    queryFn: () => metricsApi.methods(projectId, { silent: true }),
    retry: 0,
  });
  const depsQuery = useQuery({
    queryKey: ["dependencies", projectId],
    queryFn: () => metricsApi.dependencies(projectId, { silent: true }),
    retry: 0,
  });
  const risksQuery = useQuery({
    queryKey: ["risks", projectId],
    queryFn: () => metricsApi.risks(projectId, { silent: true }),
    retry: 0,
  });

  const allClasses = classesQuery.data ?? [];
  const cls = useMemo(
    () => allClasses.find((c) => c.qualifiedName === fqn),
    [allClasses, fqn],
  );

  const methods = useMemo(
    () =>
      (methodsQuery.data ?? [])
        .filter((m) => m.classQualifiedName === fqn)
        .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity),
    [methodsQuery.data, fqn],
  );

  const allDeps = depsQuery.data ?? [];
  const fanOut = useMemo(
    () => allDeps.filter((d) => d.fromClass === fqn),
    [allDeps, fqn],
  );
  const fanIn = useMemo(
    () => allDeps.filter((d) => d.toClass === fqn),
    [allDeps, fqn],
  );

  const risks = useMemo(
    () =>
      (risksQuery.data ?? [])
        .filter(
          (r) =>
            r.targetName === fqn || r.targetName.startsWith(fqn + "."),
        )
        .sort(
          (a, b) =>
            RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
            b.metricValue - a.metricValue,
        ),
    [risksQuery.data, fqn],
  );

  if (
    classesQuery.isLoading ||
    methodsQuery.isLoading ||
    depsQuery.isLoading ||
    risksQuery.isLoading
  ) {
    return <LoadingSkeleton />;
  }

  if (!cls) {
    return <NotFound fqn={fqn} />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/metrics">指标总览</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-mono text-muted-foreground/80">
              {cls.packageName || "default"}
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{cls.className}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Hero cls={cls} methodCount={methods.length} risks={risks} />

      <KpiStrip cls={cls} methodCount={methods.length} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CkRadarCard cls={cls} allClasses={allClasses} />
        <LkProgressCard cls={cls} allClasses={allClasses} />
      </section>

      <MethodComplexityCard methods={methods} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DependenciesCard
          fqn={fqn}
          fanOut={fanOut}
          fanIn={fanIn}
          allClasses={allClasses}
          onNavigate={(target) =>
            navigate(`/metrics/class/${encodeURIComponent(target)}`)
          }
        />
        <RisksAndAdviceCard cls={cls} risks={risks} />
      </section>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/metrics">
            <ArrowLeft className="h-4 w-4" />
            返回总览
          </Link>
        </Button>
        <span className="text-[11px] text-muted-foreground">
          数据基于项目最新快照
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Hero 头部 — 类名、风险等级、自动洞察
// ============================================================================

function Hero({
  cls,
  methodCount,
  risks,
}: {
  cls: ClassMetricResponse;
  methodCount: number;
  risks: RiskItemResponse[];
}) {
  const insight = useMemo(() => generateInsight(cls, methodCount), [cls, methodCount]);

  return (
    <header className="relative overflow-hidden rounded-xl border border-border bg-card p-6 md:p-8">
      {/* 背景装饰光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-[0.08] blur-3xl"
        style={{
          background: `radial-gradient(circle, ${RISK_FILL[cls.riskLevel]} 0%, transparent 70%)`,
        }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={RISK_BADGE[cls.riskLevel]}
              className="text-[11px] gap-1.5 px-2.5 py-1"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: RISK_FILL[cls.riskLevel] }}
              />
              {cls.riskLevel} · {RISK_LABEL_CN[cls.riskLevel]}
            </Badge>
            {risks.length > 0 && (
              <Badge variant="outline" className="text-[11px]">
                <ShieldAlert className="h-3 w-3" />
                {risks.length} 项风险
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight font-mono break-all">
            {cls.className}
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Package className="h-3.5 w-3.5" />
            <span className="break-all">{cls.packageName || "(default package)"}</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl flex items-start gap-2 pt-1">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" />
            <span className="leading-relaxed">{insight}</span>
          </p>
        </div>
      </div>
    </header>
  );
}

function generateInsight(cls: ClassMetricResponse, methodCount: number): string {
  const issues: string[] = [];
  if (cls.weightedMethodsPerClass > 40) issues.push("职责过重");
  if (cls.couplingCount > 12) issues.push("外部耦合偏高");
  if (cls.responseForClass > 50) issues.push("对外接口扩散");
  if (cls.lackOfCohesionOfMethods > 0.8) issues.push("内聚度较弱");
  if (cls.maxComplexity > 15) issues.push("存在高复杂度方法");
  if (cls.depthOfInheritanceTree > 4) issues.push("继承链过深");
  if (cls.classSize > 500) issues.push("类规模偏大");

  if (issues.length === 0) {
    return `共 ${methodCount} 个方法、${cls.fieldCount} 个字段，CK / LK 各项均处于良好范围，可作为参考标杆。`;
  }
  const head =
    cls.riskLevel === "CRITICAL" || cls.riskLevel === "HIGH"
      ? "需要关注："
      : cls.riskLevel === "MEDIUM"
        ? "存在改进空间："
        : "整体良好，但有以下细节：";
  return `${head}${issues.join("、")}。`;
}

// ============================================================================
// KPI 条
// ============================================================================

function KpiStrip({
  cls,
  methodCount,
}: {
  cls: ClassMetricResponse;
  methodCount: number;
}) {
  const items = [
    { label: "代码行", value: cls.loc.toLocaleString(), unit: "LoC" },
    { label: "方法数", value: methodCount.toString() },
    { label: "字段数", value: cls.fieldCount.toString() },
    {
      label: "平均圈复杂度",
      value: cls.averageComplexity.toFixed(2),
      tone:
        cls.averageComplexity > 10
          ? "danger"
          : cls.averageComplexity > 5
            ? "warning"
            : "default",
    },
    {
      label: "最大圈复杂度",
      value: cls.maxComplexity.toFixed(0),
      tone:
        cls.maxComplexity > 20
          ? "danger"
          : cls.maxComplexity > 10
            ? "warning"
            : "default",
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="overflow-hidden">
          <CardContent className="p-4 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {it.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  "tone" in it && it.tone === "warning" && "text-amber-600",
                  "tone" in it && it.tone === "danger" && "text-rose-600",
                )}
              >
                {it.value}
              </span>
              {"unit" in it && it.unit && (
                <span className="text-xs text-muted-foreground">{it.unit}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

// ============================================================================
// CK 雷达 — 单类 vs 项目中位数
// ============================================================================

function CkRadarCard({
  cls,
  allClasses,
}: {
  cls: ClassMetricResponse;
  allClasses: ClassMetricResponse[];
}) {
  const data = useMemo(() => {
    const values = (key: (typeof CK_AXES)[number]["key"]) =>
      allClasses.map((c) => c[key]).sort((a, b) => a - b);
    const median = (arr: number[]) =>
      arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)];

    return CK_AXES.map((axis) => {
      const m = median(values(axis.key));
      const v = cls[axis.key];
      return {
        metric: axis.label,
        full: axis.full,
        cn: axis.cn,
        interpret: axis.interpret,
        thisClass: Math.min(100, (v / axis.ceiling) * 100),
        median: Math.min(100, (m / axis.ceiling) * 100),
        thisRaw: v,
        medianRaw: m,
        ceiling: axis.ceiling,
      };
    });
  }, [cls, allClasses]);

  return (
    <Card className="lg:col-span-2 relative overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sigma className="h-4 w-4 text-primary" />
              CK 度量画像
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              该类各项 CK 指标 vs 项目中位数；越接近外圈风险越高
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <LegendDot color="var(--color-primary)" label="此类" />
            <LegendDot color="oklch(0.65 0.04 260)" label="项目中位数" dashed />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={data}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis
              dataKey="metric"
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              stroke="var(--color-border)"
            />
            <Radar
              name="项目中位数"
              dataKey="median"
              stroke="oklch(0.65 0.04 260)"
              fill="oklch(0.65 0.04 260)"
              fillOpacity={0.08}
              strokeDasharray="3 3"
            />
            <Radar
              name="此类"
              dataKey="thisClass"
              stroke="var(--color-primary)"
              fill="var(--color-primary)"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md min-w-44">
                    <div className="font-medium mb-1">
                      {p.metric}
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        · {p.cn}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-1.5">
                      {p.interpret}
                    </div>
                    <div className="space-y-0.5 tabular-nums font-mono text-[11px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">此类</span>
                        <span className="text-primary font-medium">
                          {p.thisRaw.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">中位数</span>
                        <span>{p.medianRaw.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-border pt-0.5 mt-0.5">
                        <span className="text-muted-foreground">阈值</span>
                        <span>{p.ceiling}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-2 w-3 rounded-sm",
          dashed && "border border-dashed",
        )}
        style={
          dashed
            ? { borderColor: color, background: "transparent" }
            : { background: color }
        }
      />
      {label}
    </span>
  );
}

// ============================================================================
// LK 进度卡 — CS / NOO / NOA / SI 各自一张迷你卡
// ============================================================================

function LkProgressCard({
  cls,
  allClasses,
}: {
  cls: ClassMetricResponse;
  allClasses: ClassMetricResponse[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers3
            className="h-4 w-4"
            style={{ color: "oklch(0.55 0.22 295)" }}
          />
          LK 阈值剖面
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          类规模 / 操作 / 属性 / 特化指数对阈值的占比
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {LK_CARDS.map((axis) => {
          const v = cls[axis.key];
          const avg =
            allClasses.length === 0
              ? 0
              : allClasses.reduce((acc, c) => acc + c[axis.key], 0) /
                allClasses.length;
          const pct = Math.min(100, (v / axis.ceiling) * 100);
          const tone =
            pct > 80 ? "danger" : pct > 55 ? "warning" : "good";

          return (
            <Tooltip key={axis.key}>
              <TooltipTrigger asChild>
                <div className="space-y-1.5 cursor-default group">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span
                        className="text-xs font-semibold tracking-wider"
                        style={{ color: "oklch(0.55 0.22 295)" }}
                      >
                        {axis.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {axis.cn}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 tabular-nums">
                      <span
                        className={cn(
                          "text-base font-semibold font-mono",
                          tone === "warning" && "text-amber-600",
                          tone === "danger" && "text-rose-600",
                        )}
                      >
                        {axis.fmt(v)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        / {axis.ceiling}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5"
                    indicatorStyle={{
                      background:
                        tone === "danger"
                          ? "oklch(0.6 0.22 25)"
                          : tone === "warning"
                            ? "oklch(0.78 0.16 80)"
                            : "oklch(0.55 0.22 295)",
                    }}
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                    <span>项目均值 {axis.fmt(avg)}</span>
                    <span
                      className={cn(
                        v > avg ? "text-amber-600" : "text-emerald-600",
                      )}
                    >
                      {v > avg ? "↑" : "↓"} {Math.abs(v - avg).toFixed(2)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-0.5">
                  <div className="font-medium">{axis.full}</div>
                  <div className="text-muted-foreground">
                    阈值 {axis.ceiling} · 当前已达 {pct.toFixed(0)}%
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 方法复杂度分析
// ============================================================================

function MethodComplexityCard({ methods }: { methods: MethodMetricResponse[] }) {
  const top = useMemo(() => methods.slice(0, 12), [methods]);

  const chartData = useMemo(
    () =>
      [...top]
        .reverse()
        .map((m) => ({
          name:
            m.methodName.length > 24
              ? m.methodName.slice(0, 23) + "…"
              : m.methodName,
          fullName: m.methodName,
          cyclomaticComplexity: m.cyclomaticComplexity,
          loc: m.loc,
          paramCount: m.parameterCount,
          riskLevel: m.riskLevel,
          startLine: m.startLine,
          endLine: m.endLine,
        })),
    [top],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-500" />
              方法复杂度分析
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              共 {methods.length} 个方法，按 McCabe 圈复杂度降序
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
            该类没有方法
          </div>
        ) : (
          <Tabs defaultValue="chart">
            <TabsList>
              <TabsTrigger value="chart">复杂度排行 Top 12</TabsTrigger>
              <TabsTrigger value="table">完整方法列表 ({methods.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="pt-4">
              <ResponsiveContainer
                width="100%"
                height={Math.max(220, chartData.length * 30)}
              >
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                  barCategoryGap={6}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="var(--color-muted-foreground)"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    tick={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                    width={170}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    cursor={{
                      fill: "color-mix(in oklch, var(--color-muted) 60%, transparent)",
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof chartData)[number];
                      return (
                        <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <div className="font-mono font-medium mb-1.5">
                            {p.fullName}
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums font-mono text-[11px]">
                            <dt className="text-muted-foreground">圈复杂度</dt>
                            <dd className="font-medium">{p.cyclomaticComplexity}</dd>
                            <dt className="text-muted-foreground">代码行</dt>
                            <dd>{p.loc}</dd>
                            <dt className="text-muted-foreground">参数</dt>
                            <dd>{p.paramCount}</dd>
                            <dt className="text-muted-foreground">行号</dt>
                            <dd>
                              {p.startLine}-{p.endLine}
                            </dd>
                            <dt className="text-muted-foreground">风险</dt>
                            <dd>
                              <Badge
                                variant={RISK_BADGE[p.riskLevel]}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {p.riskLevel}
                              </Badge>
                            </dd>
                          </dl>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cyclomaticComplexity" radius={[0, 4, 4, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={RISK_FILL[d.riskLevel]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="table" className="pt-4 -mx-6 px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">方法名</TableHead>
                    <TableHead>返回类型</TableHead>
                    <TableHead className="text-right">参数</TableHead>
                    <TableHead className="text-right">LoC</TableHead>
                    <TableHead className="text-right">圈复杂度</TableHead>
                    <TableHead className="text-right">行号</TableHead>
                    <TableHead>风险</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.map((m, i) => (
                    <TableRow key={`${m.methodName}-${i}`}>
                      <TableCell className="pl-6 font-mono text-xs font-medium max-w-[280px] truncate">
                        {m.methodName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {m.returnType}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {m.parameterCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs">
                        {m.loc}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs font-medium">
                        {m.cyclomaticComplexity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-[11px] text-muted-foreground">
                        {m.startLine}-{m.endLine}
                      </TableCell>
                      <TableCell>
                        <Badge variant={RISK_BADGE[m.riskLevel]}>
                          {m.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 依赖关系
// ============================================================================

function DependenciesCard({
  fanOut,
  fanIn,
  allClasses,
  onNavigate,
}: {
  fqn: string;
  fanOut: DependencyEdgeResponse[];
  fanIn: DependencyEdgeResponse[];
  allClasses: ClassMetricResponse[];
  onNavigate: (qualifiedName: string) => void;
}) {
  const knownClassSet = useMemo(
    () => new Set(allClasses.map((c) => c.qualifiedName)),
    [allClasses],
  );
  const classRiskMap = useMemo(() => {
    const m = new Map<string, RiskLevel>();
    for (const c of allClasses) m.set(c.qualifiedName, c.riskLevel);
    return m;
  }, [allClasses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-4 w-4 text-sky-500" />
          依赖关系
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          点击类名跳转该类详情；带边框的为项目内类，灰底为外部依赖
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="out">
          <TabsList>
            <TabsTrigger value="out" className="gap-1.5">
              <ArrowUpRight className="h-3 w-3" />
              我依赖（{fanOut.length}）
            </TabsTrigger>
            <TabsTrigger value="in" className="gap-1.5">
              <ArrowRight className="h-3 w-3 rotate-180" />
              依赖我（{fanIn.length}）
            </TabsTrigger>
          </TabsList>
          <TabsContent value="out" className="pt-4">
            <DependencyChips
              edges={fanOut}
              direction="out"
              knownClassSet={knownClassSet}
              classRiskMap={classRiskMap}
              onNavigate={onNavigate}
            />
          </TabsContent>
          <TabsContent value="in" className="pt-4">
            <DependencyChips
              edges={fanIn}
              direction="in"
              knownClassSet={knownClassSet}
              classRiskMap={classRiskMap}
              onNavigate={onNavigate}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DependencyChips({
  edges,
  direction,
  knownClassSet,
  classRiskMap,
  onNavigate,
}: {
  edges: DependencyEdgeResponse[];
  direction: "in" | "out";
  knownClassSet: Set<string>;
  classRiskMap: Map<string, RiskLevel>;
  onNavigate: (q: string) => void;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, { types: Set<string>; count: number }>();
    for (const e of edges) {
      const target = direction === "out" ? e.toClass : e.fromClass;
      const cur = m.get(target) ?? { types: new Set(), count: 0 };
      cur.types.add(e.edgeType);
      cur.count += 1;
      m.set(target, cur);
    }
    return [...m.entries()]
      .map(([name, info]) => ({
        name,
        shortName: name.split(".").pop() ?? name,
        types: [...info.types],
        count: info.count,
        isInternal: knownClassSet.has(name),
        risk: classRiskMap.get(name),
      }))
      .sort((a, b) => Number(b.isInternal) - Number(a.isInternal) || b.count - a.count);
  }, [edges, direction, knownClassSet, classRiskMap]);

  if (grouped.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-muted-foreground">
        没有{direction === "out" ? "出向" : "入向"}依赖
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
      {grouped.map((g) => {
        const node = (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono transition-colors",
              g.isInternal
                ? "border-border bg-card hover:bg-accent cursor-pointer"
                : "border-transparent bg-muted text-muted-foreground cursor-default",
            )}
            onClick={() => g.isInternal && onNavigate(g.name)}
          >
            {g.isInternal && g.risk && (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: RISK_FILL[g.risk] }}
              />
            )}
            <span className="truncate max-w-[160px]">{g.shortName}</span>
            {g.count > 1 && (
              <span className="text-muted-foreground tabular-nums">
                ×{g.count}
              </span>
            )}
            {g.isInternal && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            )}
          </span>
        );

        return (
          <Tooltip key={g.name}>
            <TooltipTrigger asChild>{node}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <div className="space-y-0.5">
                <div className="font-mono font-medium break-all">{g.name}</div>
                <div className="text-muted-foreground">
                  {g.isInternal ? "项目内类（可点击）" : "外部依赖"}
                  {g.risk && ` · 风险 ${g.risk}`}
                </div>
                <div className="text-muted-foreground">
                  类型：{g.types.join(", ")}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ============================================================================
// 风险与建议
// ============================================================================

function RisksAndAdviceCard({
  cls,
  risks,
}: {
  cls: ClassMetricResponse;
  risks: RiskItemResponse[];
}) {
  const advice = useMemo(() => generateAdvice(cls, risks), [cls, risks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          风险与改进建议
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {risks.length === 0
            ? "未触发阈值规则"
            : `命中 ${risks.length} 项规则`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {risks.length > 0 ? (
          <ul className="space-y-2.5">
            {risks.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3"
              >
                <Badge
                  variant={RISK_BADGE[r.riskLevel]}
                  className="shrink-0 text-[10px]"
                >
                  {r.riskLevel}
                </Badge>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-mono text-muted-foreground break-all">
                    {r.targetName}
                  </div>
                  <div className="text-sm leading-relaxed">{r.message}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums font-mono">
                    {r.metricName}{" "}
                    <span className="text-foreground font-medium">
                      = {r.metricValue}
                    </span>{" "}
                    超过阈值 {r.thresholdValue}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800">
            <div className="font-medium mb-0.5">该类无风险项 🎉</div>
            <div className="text-xs text-emerald-700/80">
              CK / LK 各项均处于阈值内，复杂度可控
            </div>
          </div>
        )}

        {advice.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                改进建议
              </div>
              <ul className="space-y-1.5">
                {advice.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                  >
                    <span className="text-primary mt-1.5 shrink-0 h-1 w-1 rounded-full bg-primary" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function generateAdvice(
  cls: ClassMetricResponse,
  risks: RiskItemResponse[],
): string[] {
  const advice: string[] = [];
  if (cls.weightedMethodsPerClass > 40 || cls.responseForClass > 50) {
    advice.push(
      "类承担过多职责，建议按业务维度拆分为多个职责单一的类（提取服务 / 策略对象）。",
    );
  }
  if (cls.couplingCount > 12) {
    advice.push(
      "外部耦合过高，可引入接口或事件总线降低对具体类的直接依赖。",
    );
  }
  if (cls.lackOfCohesionOfMethods > 0.8) {
    advice.push(
      "类内方法关联弱，可能存在多个无关职责，建议按字段使用聚类分割成独立类。",
    );
  }
  if (cls.maxComplexity > 15) {
    const maxRisk = risks.find(
      (r) => r.targetType === "METHOD" && r.metricName.toLowerCase().includes("complex"),
    );
    advice.push(
      maxRisk
        ? `${maxRisk.targetName.split(".").pop()} 圈复杂度过高，建议提取子方法或卫语句简化分支。`
        : "存在高圈复杂度方法，建议拆分长函数、提前 return、抽取条件判断。",
    );
  }
  if (cls.depthOfInheritanceTree > 4) {
    advice.push("继承层次过深，可考虑组合替代继承，或引入抽象基类减少层数。");
  }
  if (cls.classSize > 500) {
    advice.push("类规模偏大，建议拆分为多个小类或将工具方法提取为静态工具类。");
  }
  return advice;
}

// ============================================================================
// 状态组件
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-72" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function NotFound({ fqn }: { fqn: string }) {
  return (
    <div className="p-12 max-w-xl mx-auto">
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-semibold tracking-tight">未找到该类</h2>
          <p className="text-sm text-muted-foreground break-all font-mono">
            {fqn || "(空)"}
          </p>
          <p className="text-xs text-muted-foreground">
            可能是当前项目未分析，或类名拼写错误。
          </p>
          <Button asChild>
            <Link to="/metrics">
              <ArrowLeft className="h-4 w-4" />
              返回指标总览
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

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
            类详情页基于当前项目的最新快照。
          </p>
          <Button asChild>
            <Link to="/projects">
              <ArrowLeft className="h-4 w-4" />
              选择项目
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
