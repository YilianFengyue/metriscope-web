import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  FileCode2,
  Files,
  Filter,
  Gauge,
  Inbox,
  Link2,
  Maximize2,
  Network,
  Search,
  Shrink,
  TrendingUp,
} from "lucide-react";
import {
  metricsApi,
  type ClassMetricResponse,
  type DependencyEdgeResponse,
  type MethodMetricResponse,
  type RiskItemResponse,
  type RiskLevel,
  type SnapshotSummary,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import { DependencyGraph } from "@/components/charts/DependencyGraph";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RISK_RANK: Record<RiskLevel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RISK_VARIANT: Record<
  RiskLevel,
  "success" | "warning" | "danger" | "info"
> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

const CK_AXES = [
  { key: "WMC", label: "WMC", ceiling: 40 },
  { key: "RFC", label: "RFC", ceiling: 50 },
  { key: "CBO", label: "CBO", ceiling: 15 },
  { key: "DIT", label: "DIT", ceiling: 5 },
  { key: "NOC", label: "NOC", ceiling: 10 },
  { key: "LCOM", label: "LCOM", ceiling: 1 },
] as const;

const LK_AXES = [
  { key: "CS", label: "CS · 规模", ceiling: 500 },
  { key: "NOO", label: "NOO · 操作", ceiling: 20 },
  { key: "NOA", label: "NOA · 属性", ceiling: 15 },
  { key: "SI", label: "SI · 特化", ceiling: 2 },
] as const;

const LK_COLORS = {
  avg: "oklch(0.62 0.18 165)",
  max: "oklch(0.55 0.22 295)",
  noa: "oklch(0.72 0.14 175)",
  noo: "oklch(0.55 0.2 290)",
} as const;

export default function MetricsPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  if (currentProjectId == null) return <NoProjectSelected />;
  return <MetricsInner projectId={currentProjectId} />;
}

function MetricsInner({ projectId }: { projectId: number }) {
  const overviewQuery = useQuery({
    queryKey: ["overview", projectId],
    queryFn: () => metricsApi.overview(projectId, { silent: true }),
    retry: 0,
  });

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

  const risksQuery = useQuery({
    queryKey: ["risks", projectId],
    queryFn: () => metricsApi.risks(projectId, { silent: true }),
    retry: 0,
  });

  const depsQuery = useQuery({
    queryKey: ["dependencies", projectId],
    queryFn: () => metricsApi.dependencies(projectId, { silent: true }),
    retry: 0,
  });

  const overview = overviewQuery.data;
  const isAnalyzed = (overview?.analysisCount ?? 0) > 0;
  const classes = classesQuery.data ?? [];
  const methods = methodsQuery.data ?? [];
  const risks = risksQuery.data ?? [];
  const deps = depsQuery.data ?? [];
  const latestSnapshot = overview?.latestSnapshot;

  const summary: SnapshotSummary = latestSnapshot?.summary || {
    totalLoc: 0,
    classCount: 0,
    methodCount: 0,
    averageComplexity: 0,
    highRiskCount: 0,
    javaFileCount: 0,
    blankLines: 0,
    commentLines: 0,
    commentRate: 0,
  };

  if (overviewQuery.isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!isAnalyzed) {
    return <NotAnalyzed projectName={overview?.projectName ?? `#${projectId}`} />;
  }

  const totalLoc = classes.reduce((acc, c) => acc + c.loc, 0);
  const avgComplexity =
    methods.length > 0
      ? methods.reduce((acc, m) => acc + m.cyclomaticComplexity, 0) /
        methods.length
      : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">质量总览</h1>
        <p className="text-sm text-muted-foreground mt-1">
          项目 <span className="font-medium text-foreground">{overview?.projectName}</span>
          ·{overview?.language} · 已分析 {overview?.analysisCount} 次
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="总代码行" value={totalLoc.toLocaleString()} unit="LoC" />
        <KpiCard label="Java 文件数" value={latestSnapshot?.summary.javaFileCount} unit="Files"
        />
        <KpiCard
            label="注释率"
            value={((latestSnapshot?.summary.commentRate ?? 0) * 100).toFixed(1)}
            unit="%"
        />
        <KpiCard label="类 / 接口" value={classes.length} />
        <KpiCard label="方法数" value={methods.length} />
        <KpiCard
          label="平均圈复杂度"
          value={avgComplexity.toFixed(2)}
          tone={
            avgComplexity > 10 ? "danger" : avgComplexity > 5 ? "warning" : "default"
          }
        />
        <QualityGradeCard
          grade={overview?.qualityGrade}
          highRiskCount={overview?.highRiskCount ?? 0}
        />
      </section>

      <CodeAnatomyCard summary={summary} totalLoc={totalLoc} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CkRadarCard classes={classes} />
        <ComplexityHistogramCard methods={methods} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LkRadarCard classes={classes} />
        <ClassAnatomyCard classes={classes} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskCenter risks={risks} classes={classes} methods={methods} />
        </div>
        <DependencySummaryCard deps={deps} classes={classes} />
      </section>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes">类指标 ({classes.length})</TabsTrigger>
          <TabsTrigger value="methods">方法指标 ({methods.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="classes">
          <ClassTable classes={classes} />
        </TabsContent>
        <TabsContent value="methods">
          <MethodTable methods={methods} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-2xl font-semibold tabular-nums",
              tone === "warning" && "text-amber-600",
              tone === "danger" && "text-rose-600",
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs text-muted-foreground">{unit}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QualityGradeCard({
  grade,
  highRiskCount,
}: {
  grade: string | null | undefined;
  highRiskCount: number;
}) {
  type GradeVariant = "success" | "info" | "warning" | "danger" | "secondary";
  const variant: Record<string, GradeVariant> = {
    A: "success",
    B: "info",
    C: "warning",
    D: "danger",
  };
  const v: GradeVariant = grade ? variant[grade] ?? "secondary" : "secondary";
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          质量等级
        </div>
        <div className="flex items-baseline gap-2">
          <Badge variant={v} className="px-2.5 py-1 text-base font-semibold">
            {grade ?? "?"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            高风险 {highRiskCount} 项
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CkRadarCard({ classes }: { classes: ClassMetricResponse[] }) {
  const data = useMemo(() => {
    if (classes.length === 0) return [];
    const sums = { WMC: 0, RFC: 0, CBO: 0, DIT: 0, NOC: 0, LCOM: 0 };
    let maxV = { WMC: 0, RFC: 0, CBO: 0, DIT: 0, NOC: 0, LCOM: 0 };
    for (const c of classes) {
      sums.WMC += c.weightedMethodsPerClass;
      sums.RFC += c.responseForClass;
      sums.CBO += c.couplingCount;
      sums.DIT += c.depthOfInheritanceTree;
      sums.NOC += c.numberOfChildren;
      sums.LCOM += c.lackOfCohesionOfMethods;
      maxV.WMC = Math.max(maxV.WMC, c.weightedMethodsPerClass);
      maxV.RFC = Math.max(maxV.RFC, c.responseForClass);
      maxV.CBO = Math.max(maxV.CBO, c.couplingCount);
      maxV.DIT = Math.max(maxV.DIT, c.depthOfInheritanceTree);
      maxV.NOC = Math.max(maxV.NOC, c.numberOfChildren);
      maxV.LCOM = Math.max(maxV.LCOM, c.lackOfCohesionOfMethods);
    }
    const n = classes.length;
    return CK_AXES.map((axis) => ({
      metric: axis.label,
      avg: Math.min(100, ((sums[axis.key] / n) / axis.ceiling) * 100),
      max: Math.min(100, (maxV[axis.key] / axis.ceiling) * 100),
      avgRaw: sums[axis.key] / n,
      maxRaw: maxV[axis.key],
    }));
  }, [classes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CK 度量雷达</CardTitle>
        <p className="text-xs text-muted-foreground">
          按各项指标"危险阈值"归一到 0-100；越接近外圈风险越高
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis
              dataKey="metric"
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 12 }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              stroke="var(--color-border)"
            />
            <Radar
              name="项目最大"
              dataKey="max"
              stroke="oklch(0.6 0.22 25)"
              fill="oklch(0.6 0.22 25)"
              fillOpacity={0.18}
            />
            <Radar
              name="项目平均"
              dataKey="avg"
              stroke="var(--color-primary)"
              fill="var(--color-primary)"
              fillOpacity={0.35}
            />
            <Tooltip
              formatter={(_v, _n, p) => [
                `${(p.payload as any)[`${p.dataKey === "avg" ? "avgRaw" : "maxRaw"}`].toFixed(2)}`,
                p.dataKey === "avg" ? "平均原值" : "最大原值",
              ]}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ComplexityHistogramCard({
  methods,
}: {
  methods: MethodMetricResponse[];
}) {
  const data = useMemo(() => {
    const buckets = [
      { range: "1-5", min: 1, max: 5, count: 0 },
      { range: "6-10", min: 6, max: 10, count: 0 },
      { range: "11-20", min: 11, max: 20, count: 0 },
      { range: "21+", min: 21, max: Infinity, count: 0 },
    ];
    for (const m of methods) {
      const b = buckets.find(
        (x) => m.cyclomaticComplexity >= x.min && m.cyclomaticComplexity <= x.max,
      );
      if (b) b.count += 1;
    }
    return buckets;
  }, [methods]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>圈复杂度分布</CardTitle>
        <p className="text-xs text-muted-foreground">
          {methods.length} 个方法的 McCabe 圈复杂度分桶
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="range"
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="count"
              name="方法数"
              fill="var(--color-primary)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function LkRadarCard({ classes }: { classes: ClassMetricResponse[] }) {
  const { data, summary } = useMemo(() => {
    if (classes.length === 0) {
      return { data: [], summary: { avgCs: 0, avgNoo: 0, avgNoa: 0, avgSi: 0 } };
    }
    const sums = { CS: 0, NOO: 0, NOA: 0, SI: 0 };
    const maxV = { CS: 0, NOO: 0, NOA: 0, SI: 0 };
    for (const c of classes) {
      sums.CS += c.classSize;
      sums.NOO += c.numberOfOperations;
      sums.NOA += c.numberOfAttributes;
      sums.SI += c.specializationIndex;
      maxV.CS = Math.max(maxV.CS, c.classSize);
      maxV.NOO = Math.max(maxV.NOO, c.numberOfOperations);
      maxV.NOA = Math.max(maxV.NOA, c.numberOfAttributes);
      maxV.SI = Math.max(maxV.SI, c.specializationIndex);
    }
    const n = classes.length;
    return {
      data: LK_AXES.map((axis) => ({
        metric: axis.label,
        avg: Math.min(100, ((sums[axis.key] / n) / axis.ceiling) * 100),
        max: Math.min(100, (maxV[axis.key] / axis.ceiling) * 100),
        avgRaw: sums[axis.key] / n,
        maxRaw: maxV[axis.key],
      })),
      summary: {
        avgCs: sums.CS / n,
        avgNoo: sums.NOO / n,
        avgNoa: sums.NOA / n,
        avgSi: sums.SI / n,
      },
    };
  }, [classes]);

  return (
    <Card className="relative overflow-hidden">
      {/* 翡翠 → 紫罗兰渐变光晕，标记 LK 视觉身份 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-[0.12] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.18 165) 0%, oklch(0.55 0.22 295) 70%, transparent 100%)",
        }}
      />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              LK 度量雷达
              <Badge variant="outline" className="text-[10px] font-normal">
                CS · NOO · NOA · SI
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              规模 / 操作 / 属性 / 特化指数；归一到 0-100，越接近外圈类越"胖"
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            暂无类数据
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={data}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="metric"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 11 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  stroke="var(--color-border)"
                />
                <Radar
                  name="项目最大"
                  dataKey="max"
                  stroke={LK_COLORS.max}
                  fill={LK_COLORS.max}
                  fillOpacity={0.18}
                />
                <Radar
                  name="项目平均"
                  dataKey="avg"
                  stroke={LK_COLORS.avg}
                  fill={LK_COLORS.avg}
                  fillOpacity={0.4}
                />
                <Tooltip
                  formatter={(_v, _n, p) => [
                    `${(p.payload as any)[`${p.dataKey === "avg" ? "avgRaw" : "maxRaw"}`].toFixed(2)}`,
                    p.dataKey === "avg" ? "平均原值" : "最大原值",
                  ]}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 mt-2">
              <LkStat label="CS" value={summary.avgCs.toFixed(0)} hint="平均规模" />
              <LkStat label="NOO" value={summary.avgNoo.toFixed(1)} hint="平均操作" />
              <LkStat label="NOA" value={summary.avgNoa.toFixed(1)} hint="平均属性" />
              <LkStat label="SI" value={summary.avgSi.toFixed(2)} hint="平均特化" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LkStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="space-y-0.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function ClassAnatomyCard({ classes }: { classes: ClassMetricResponse[] }) {
  const data = useMemo(() => {
    return [...classes]
      .map((c) => ({
        name: c.qualifiedName,
        shortName:
          c.className.length > 18 ? c.className.slice(0, 17) + "…" : c.className,
        noa: c.numberOfAttributes,
        noo: c.numberOfOperations,
        cs: c.classSize,
        si: c.specializationIndex,
        total: c.numberOfAttributes + c.numberOfOperations,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .reverse();
  }, [classes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          类剖面 Top 8
          <Badge variant="outline" className="text-[10px] font-normal">
            NOA + NOO
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          按"属性 + 操作"成员总数排行，看哪些类承担最多职责
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            暂无类数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={310}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              barCategoryGap={8}
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
                dataKey="shortName"
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
                width={120}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in oklch, var(--color-muted) 60%, transparent)" }}
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "8px 10px",
                }}
                labelFormatter={(_, items) => {
                  const p = items?.[0]?.payload as any;
                  if (!p) return "";
                  return `${p.name}  ·  CS=${p.cs}  ·  SI=${p.si.toFixed(2)}`;
                }}
                formatter={(v, n) => [`${v} 个`, n]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="noa"
                stackId="lk"
                name="属性 NOA"
                fill={LK_COLORS.noa}
                radius={[4, 0, 0, 4]}
              />
              <Bar
                dataKey="noo"
                stackId="lk"
                name="操作 NOO"
                fill={LK_COLORS.noo}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ============== F1 · CodeAnatomyCard ==============

function CodeAnatomyCard({
  summary,
  totalLoc,
}: {
  summary: SnapshotSummary;
  totalLoc: number;
}) {
  // 注：snapshot.totalLoc 后端口径可能含/不含注释空白，按 LK 设计这里把代码规模(totalLoc)与
  // 注释/空白合算总行数，避免比例失真
  const code = totalLoc;
  const comment = summary.commentLines;
  const blank = summary.blankLines;
  const sum = code + comment + blank || 1;
  const codePct = (code / sum) * 100;
  const commentPct = (comment / sum) * 100;
  const blankPct = (blank / sum) * 100;

  const commentRate = (summary.commentRate ?? 0) * 100;
  const rateColor =
    commentRate >= 15
      ? "oklch(0.62 0.18 165)" // emerald
      : commentRate >= 5
        ? "oklch(0.7 0.17 75)" // amber
        : "oklch(0.6 0.22 25)"; // rose
  const rateRingDash = (commentRate / 100) * 2 * Math.PI * 28; // r=28
  const rateRingTotal = 2 * Math.PI * 28;

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full opacity-[0.08] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
      />
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-primary" />
          代码构成
          <Badge variant="outline" className="text-[10px] font-normal ml-1">
            LoC Anatomy
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          物理行数 = 代码 + 注释 + 空白；注释率反映文档密度
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* 左：文件数 */}
          <div className="lg:col-span-2 flex lg:flex-col items-center lg:items-start gap-3 lg:gap-1">
            <div className="flex items-center gap-2">
              <Files className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Java 文件
              </span>
            </div>
            <div className="text-3xl font-semibold tabular-nums">
              {summary.javaFileCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground hidden lg:block">
              .java 源文件
            </div>
          </div>

          {/* 中：堆叠条 + 数字 */}
          <div className="lg:col-span-7 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <CodeSegmentLabel
                label="代码"
                count={code}
                pct={codePct}
                colorClass="bg-[oklch(0.55_0.18_260)]"
              />
              <CodeSegmentLabel
                label="注释"
                count={comment}
                pct={commentPct}
                colorClass="bg-[oklch(0.62_0.18_165)]"
              />
              <CodeSegmentLabel
                label="空白"
                count={blank}
                pct={blankPct}
                colorClass="bg-[oklch(0.78_0.01_260)]"
              />
            </div>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted ring-1 ring-border/60">
              <div
                className="h-full transition-all"
                style={{
                  width: `${codePct}%`,
                  background: "oklch(0.55 0.18 260)",
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${commentPct}%`,
                  background: "oklch(0.62 0.18 165)",
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${blankPct}%`,
                  background: "oklch(0.78 0.01 260)",
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>合计 {sum.toLocaleString()} 行</span>
              <span>{summary.javaFileCount > 0
                ? `平均每文件 ${Math.round(sum / summary.javaFileCount)} 行`
                : "—"}</span>
            </div>
          </div>

          {/* 右：注释率环 */}
          <div className="lg:col-span-3 flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={rateColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${rateRingDash} ${rateRingTotal}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-xl font-semibold tabular-nums"
                  style={{ color: rateColor }}
                >
                  {commentRate.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground tracking-wide">
                  注释率
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CodeSegmentLabel({
  label,
  count,
  pct,
  colorClass,
}: {
  label: string;
  count: number;
  pct: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className={cn("h-2 w-2 rounded-full shrink-0", colorClass)} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums truncate">
        {count.toLocaleString()}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
        ({pct.toFixed(1)}%)
      </span>
    </div>
  );
}

// ============== F5 · RiskCenter (5-tab) ==============

type RiskTabKey = "ALL" | "COMPLEX_METHOD" | "HIGH_CBO" | "LOW_LCOM" | "HIGH_RFC";

function RiskCenter({
  risks,
  classes,
  methods,
}: {
  risks: RiskItemResponse[];
  classes: ClassMetricResponse[];
  methods: MethodMetricResponse[];
}) {
  const navigate = useNavigate();

  const allRisks = useMemo(
    () =>
      [...risks]
        .sort(
          (a, b) =>
            RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
            b.metricValue - a.metricValue,
        )
        .slice(0, 10),
    [risks],
  );

  const topComplexMethods = useMemo(
    () =>
      [...methods]
        .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
        .slice(0, 10),
    [methods],
  );

  const topCoupledClasses = useMemo(
    () =>
      [...classes]
        .sort((a, b) => b.couplingCount - a.couplingCount)
        .slice(0, 10),
    [classes],
  );

  const topLowCohesionClasses = useMemo(
    () =>
      [...classes]
        .sort(
          (a, b) =>
            b.lackOfCohesionOfMethods - a.lackOfCohesionOfMethods,
        )
        .slice(0, 10),
    [classes],
  );

  const topRfcClasses = useMemo(
    () =>
      [...classes]
        .sort((a, b) => b.responseForClass - a.responseForClass)
        .slice(0, 10),
    [classes],
  );

  const goClass = (fqn: string) =>
    navigate(`/metrics/class/${encodeURIComponent(fqn)}`);

  const tabs: {
    key: RiskTabKey;
    label: string;
    icon: typeof Gauge;
    count: number;
    accent: string;
  }[] = [
    { key: "ALL", label: "综合", icon: AlertTriangle, count: allRisks.length, accent: "oklch(0.7 0.17 75)" },
    { key: "COMPLEX_METHOD", label: "复杂方法", icon: Gauge, count: topComplexMethods.length, accent: "oklch(0.6 0.22 25)" },
    { key: "HIGH_CBO", label: "高耦合", icon: Link2, count: topCoupledClasses.length, accent: "oklch(0.55 0.22 295)" },
    { key: "LOW_LCOM", label: "低内聚", icon: Shrink, count: topLowCohesionClasses.length, accent: "oklch(0.7 0.17 75)" },
    { key: "HIGH_RFC", label: "高 RFC", icon: Network, count: topRfcClasses.length, accent: "oklch(0.6 0.16 200)" },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            风险中心
          </CardTitle>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            共 {risks.length} 项识别风险 · 多视角排行
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="ALL">
          <TabsList className="grid grid-cols-5 mb-3 h-auto p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="flex flex-col gap-0.5 py-1.5 text-[11px] data-[state=active]:font-medium"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="leading-tight">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {t.count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="ALL">
            {allRisks.length === 0 ? (
              <RiskEmpty />
            ) : (
              <ol className="space-y-1">
                {allRisks.map((r, i) => (
                  <RiskRow
                    key={i}
                    rank={i + 1}
                    name={r.targetName}
                    badge={<Badge variant={RISK_VARIANT[r.riskLevel]}>{r.riskLevel}</Badge>}
                    metric={`${r.metricName} ${r.metricValue} / ${r.thresholdValue}`}
                    sub={r.message}
                    barValue={r.metricValue}
                    barMax={Math.max(r.thresholdValue, r.metricValue) * 1.2}
                    barColor="oklch(0.7 0.17 75)"
                    onClick={
                      r.targetType === "CLASS"
                        ? () => goClass(r.targetName)
                        : r.targetType === "METHOD"
                          ? () => {
                              // method.targetName 可能是 FQN 或 class.method 格式，简单截断
                              const dot = r.targetName.lastIndexOf(".");
                              const cls = dot > 0 ? r.targetName.slice(0, dot) : r.targetName;
                              goClass(cls);
                            }
                          : undefined
                    }
                  />
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="COMPLEX_METHOD">
            {topComplexMethods.length === 0 ? (
              <RiskEmpty />
            ) : (
              <ol className="space-y-1">
                {(() => {
                  const max = Math.max(...topComplexMethods.map((m) => m.cyclomaticComplexity), 1);
                  return topComplexMethods.map((m, i) => (
                    <RiskRow
                      key={i}
                      rank={i + 1}
                      name={
                        <>
                          <span className="text-muted-foreground">{m.classQualifiedName}.</span>
                          <span className="font-medium">{m.methodName}</span>
                        </>
                      }
                      badge={<Badge variant={RISK_VARIANT[m.riskLevel]}>{m.riskLevel}</Badge>}
                      metric={`Cx ${m.cyclomaticComplexity}`}
                      sub={`LoC ${m.loc} · 行 ${m.startLine}–${m.endLine}`}
                      barValue={m.cyclomaticComplexity}
                      barMax={max}
                      barColor="oklch(0.6 0.22 25)"
                      onClick={() => goClass(m.classQualifiedName)}
                    />
                  ));
                })()}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="HIGH_CBO">
            {topCoupledClasses.length === 0 ? (
              <RiskEmpty />
            ) : (
              <ol className="space-y-1">
                {(() => {
                  const max = Math.max(...topCoupledClasses.map((c) => c.couplingCount), 1);
                  return topCoupledClasses.map((c, i) => (
                    <RiskRow
                      key={i}
                      rank={i + 1}
                      name={c.qualifiedName}
                      badge={<Badge variant={RISK_VARIANT[c.riskLevel]}>{c.riskLevel}</Badge>}
                      metric={`CBO ${c.couplingCount}`}
                      sub={`WMC ${c.weightedMethodsPerClass} · RFC ${c.responseForClass}`}
                      barValue={c.couplingCount}
                      barMax={max}
                      barColor="oklch(0.55 0.22 295)"
                      onClick={() => goClass(c.qualifiedName)}
                    />
                  ));
                })()}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="LOW_LCOM">
            {topLowCohesionClasses.length === 0 ? (
              <RiskEmpty />
            ) : (
              <ol className="space-y-1">
                {(() => {
                  const max = Math.max(...topLowCohesionClasses.map((c) => c.lackOfCohesionOfMethods), 1);
                  return topLowCohesionClasses.map((c, i) => (
                    <RiskRow
                      key={i}
                      rank={i + 1}
                      name={c.qualifiedName}
                      badge={<Badge variant={RISK_VARIANT[c.riskLevel]}>{c.riskLevel}</Badge>}
                      metric={`LCOM ${c.lackOfCohesionOfMethods.toFixed(2)}`}
                      sub={`方法 ${c.methodCount} · 字段 ${c.fieldCount}`}
                      barValue={c.lackOfCohesionOfMethods}
                      barMax={max}
                      barColor="oklch(0.7 0.17 75)"
                      onClick={() => goClass(c.qualifiedName)}
                    />
                  ));
                })()}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="HIGH_RFC">
            {topRfcClasses.length === 0 ? (
              <RiskEmpty />
            ) : (
              <ol className="space-y-1">
                {(() => {
                  const max = Math.max(...topRfcClasses.map((c) => c.responseForClass), 1);
                  return topRfcClasses.map((c, i) => (
                    <RiskRow
                      key={i}
                      rank={i + 1}
                      name={c.qualifiedName}
                      badge={<Badge variant={RISK_VARIANT[c.riskLevel]}>{c.riskLevel}</Badge>}
                      metric={`RFC ${c.responseForClass}`}
                      sub={`WMC ${c.weightedMethodsPerClass} · CBO ${c.couplingCount}`}
                      barValue={c.responseForClass}
                      barMax={max}
                      barColor="oklch(0.6 0.16 200)"
                      onClick={() => goClass(c.qualifiedName)}
                    />
                  ));
                })()}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RiskEmpty() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
      暂无该类别的风险项
    </div>
  );
}

function RiskRow({
  rank,
  name,
  badge,
  metric,
  sub,
  barValue,
  barMax,
  barColor,
  onClick,
}: {
  rank: number;
  name: React.ReactNode;
  badge: React.ReactNode;
  metric: string;
  sub: string;
  barValue: number;
  barMax: number;
  barColor: string;
  onClick?: () => void;
}) {
  const pct = Math.min(100, (barValue / barMax) * 100);
  const interactive = !!onClick;
  return (
    <li
      className={cn(
        "group rounded-md px-2 py-2 text-sm transition-colors border-b border-border/40 last:border-0",
        interactive && "cursor-pointer hover:bg-accent/60",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className="font-mono text-[11px] text-muted-foreground w-6 tabular-nums shrink-0 mt-0.5">
          {rank.toString().padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs truncate min-w-0">{name}</span>
            {badge}
            <span className="text-[11px] text-muted-foreground ml-auto tabular-nums shrink-0">
              {metric}
            </span>
            {interactive && (
              <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
            {sub}
          </div>
        </div>
      </div>
    </li>
  );
}

function DependencySummaryCard({
  deps,
  classes,
}: {
  deps: DependencyEdgeResponse[];
  classes: ClassMetricResponse[];
}) {
  const [graphOpen, setGraphOpen] = useState(false);

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const fanOut = new Map<string, number>();
    for (const e of deps) {
      byType.set(e.edgeType, (byType.get(e.edgeType) ?? 0) + 1);
      fanOut.set(e.fromClass, (fanOut.get(e.fromClass) ?? 0) + 1);
    }
    return {
      byType: [...byType.entries()].sort((a, b) => b[1] - a[1]),
      hubs: [...fanOut.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [deps]);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-500" />
                依赖摘要
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                共 {deps.length} 条依赖边 · {classes.length} 个类
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGraphOpen(true)}
              disabled={classes.length === 0 || deps.length === 0}
              className="shrink-0"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              全屏图
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              按类型
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stats.byType.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                stats.byType.map(([type, count]) => (
                  <Badge key={type} variant="outline">
                    {type}
                    <span className="ml-1 text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              出度 Top 5（最依赖外部的类）
            </div>
            {stats.hubs.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <ul className="space-y-1.5">
                {stats.hubs.map(([name, count]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="font-mono truncate">{name}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {count} 条
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
        <DialogContent className="max-w-[min(1400px,95vw)] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4 text-primary" />
              类依赖关系图
              <Badge variant="outline" className="text-[10px] font-normal">
                {classes.length} 节点 · {deps.length} 边
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              节点颜色 = 风险等级 · 半径 = WMC · 滚轮缩放 · 拖拽节点 / 平移画布 · 悬停看详情
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-[oklch(0.99_0_0)] dark:bg-[oklch(0.18_0.02_260)]">
            {graphOpen && (
              <DependencyGraph classes={classes} deps={deps} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ClassTable({ classes }: { classes: ClassMetricResponse[] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<"ALL" | RiskLevel>("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes
      .filter((c) => (risk === "ALL" ? true : c.riskLevel === risk))
      .filter((c) =>
        q ? c.qualifiedName.toLowerCase().includes(q) : true,
      )
      .sort(
        (a, b) =>
          RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
          b.weightedMethodsPerClass - a.weightedMethodsPerClass,
      );
  }, [classes, search, risk]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>类级指标</CardTitle>
          <div className="flex items-center gap-2">
            <FilterRow
              search={search}
              onSearchChange={setSearch}
              risk={risk}
              onRiskChange={setRisk}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <EmptyRow icon={Inbox} text="无匹配结果" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">类</TableHead>
                <TableHead className="text-right">LoC</TableHead>
                <TableHead
                  className="text-right text-primary/70"
                  title="Weighted Methods per Class"
                >
                  WMC
                </TableHead>
                <TableHead
                  className="text-right text-primary/70"
                  title="Response For a Class"
                >
                  RFC
                </TableHead>
                <TableHead
                  className="text-right text-primary/70"
                  title="Coupling Between Objects"
                >
                  CBO
                </TableHead>
                <TableHead
                  className="text-right text-primary/70"
                  title="Depth of Inheritance Tree"
                >
                  DIT
                </TableHead>
                <TableHead
                  className="text-right text-primary/70"
                  title="Number of Children"
                >
                  NOC
                </TableHead>
                <TableHead
                  className="text-right text-primary/70"
                  title="Lack of Cohesion of Methods"
                >
                  LCOM
                </TableHead>
                <TableHead
                  className="text-right border-l border-border/60"
                  style={{ color: LK_COLORS.avg }}
                  title="Class Size · 类规模"
                >
                  CS
                </TableHead>
                <TableHead
                  className="text-right"
                  style={{ color: LK_COLORS.avg }}
                  title="Number of Operations · 操作数"
                >
                  NOO
                </TableHead>
                <TableHead
                  className="text-right"
                  style={{ color: LK_COLORS.avg }}
                  title="Number of Attributes · 属性数"
                >
                  NOA
                </TableHead>
                <TableHead
                  className="text-right"
                  style={{ color: LK_COLORS.avg }}
                  title="Specialization Index · 特化指数"
                >
                  SI
                </TableHead>
                <TableHead className="text-right border-l border-border/60">
                  AvgCx
                </TableHead>
                <TableHead className="text-right">MaxCx</TableHead>
                <TableHead>风险</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.qualifiedName}
                  className="cursor-pointer hover:bg-accent/40 transition-colors group"
                  onClick={() =>
                    navigate(
                      `/metrics/class/${encodeURIComponent(c.qualifiedName)}`,
                    )
                  }
                  title="点击查看类详情"
                >
                  <TableCell className="pl-5 max-w-[280px]">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="truncate">{c.qualifiedName}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </TableCell>
                  <NumCell value={c.loc} />
                  <NumCell value={c.weightedMethodsPerClass} />
                  <NumCell value={c.responseForClass} />
                  <NumCell value={c.couplingCount} />
                  <NumCell value={c.depthOfInheritanceTree} />
                  <NumCell value={c.numberOfChildren} />
                  <NumCell value={c.lackOfCohesionOfMethods.toFixed(2)} />
                  <NumCell value={c.classSize} accent borderLeft />
                  <NumCell value={c.numberOfOperations} accent />
                  <NumCell value={c.numberOfAttributes} accent />
                  <NumCell value={c.specializationIndex.toFixed(2)} accent />
                  <NumCell value={c.averageComplexity.toFixed(2)} borderLeft />
                  <NumCell value={c.maxComplexity} />
                  <TableCell>
                    <Badge variant={RISK_VARIANT[c.riskLevel]}>
                      {c.riskLevel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MethodTable({ methods }: { methods: MethodMetricResponse[] }) {
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<"ALL" | RiskLevel>("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return methods
      .filter((m) => (risk === "ALL" ? true : m.riskLevel === risk))
      .filter((m) => {
        if (!q) return true;
        return (
          m.methodName.toLowerCase().includes(q) ||
          m.classQualifiedName.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
          b.cyclomaticComplexity - a.cyclomaticComplexity,
      );
  }, [methods, search, risk]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>方法级指标</CardTitle>
          <FilterRow
            search={search}
            onSearchChange={setSearch}
            risk={risk}
            onRiskChange={setRisk}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <EmptyRow icon={Inbox} text="无匹配结果" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">方法</TableHead>
                <TableHead>返回类型</TableHead>
                <TableHead className="text-right">参数</TableHead>
                <TableHead className="text-right">LoC</TableHead>
                <TableHead className="text-right">圈复杂度</TableHead>
                <TableHead className="text-right">起止行</TableHead>
                <TableHead>风险</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m, i) => (
                <TableRow key={`${m.classQualifiedName}-${m.methodName}-${i}`}>
                  <TableCell className="pl-5 max-w-[360px]">
                    <div className="font-mono text-xs truncate">
                      <span className="text-muted-foreground">
                        {m.classQualifiedName}.
                      </span>
                      <span className="font-medium">{m.methodName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.returnType}</TableCell>
                  <NumCell value={m.parameterCount} />
                  <NumCell value={m.loc} />
                  <NumCell value={m.cyclomaticComplexity} />
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {m.startLine}–{m.endLine}
                  </TableCell>
                  <TableCell>
                    <Badge variant={RISK_VARIANT[m.riskLevel]}>
                      {m.riskLevel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function FilterRow({
  search,
  onSearchChange,
  risk,
  onRiskChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  risk: "ALL" | RiskLevel;
  onRiskChange: (v: "ALL" | RiskLevel) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索…"
          className="pl-8 h-8 w-44 text-xs"
        />
      </div>
      <div className="w-32">
        <Select
          value={risk}
          onValueChange={(v) => onRiskChange(v as "ALL" | RiskLevel)}
        >
          <SelectTrigger className="h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部风险</SelectItem>
            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
            <SelectItem value="HIGH">HIGH</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function NumCell({
  value,
  accent,
  borderLeft,
}: {
  value: number | string;
  accent?: boolean;
  borderLeft?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        "text-right tabular-nums font-mono text-xs",
        borderLeft && "border-l border-border/60",
      )}
      style={accent ? { color: LK_COLORS.avg } : undefined}
    >
      {value}
    </TableCell>
  );
}

function EmptyRow({
  icon: Icon,
  text,
}: {
  icon: typeof Inbox;
  text: string;
}) {
  return (
    <div className="px-5 py-12 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />
      {text}
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
            指标页基于当前项目最新快照展示。先去「项目」页选择一个项目。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NotAnalyzed({ projectName }: { projectName: string }) {
  const navigate = useNavigate();
  return (
    <div className="p-12 max-w-xl mx-auto">
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold tracking-tight">项目尚未分析</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{projectName}</span> 还没有快照，先去分析页跑一次。
            </p>
          </div>
          <Button onClick={() => navigate("/analysis")}>去分析页</Button>
        </CardContent>
      </Card>
    </div>
  );
}
