import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  Filter,
  Inbox,
  Search,
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

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CkRadarCard classes={classes} />
        <ComplexityHistogramCard methods={methods} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RisksCard risks={risks} />
        <DependencySummaryCard deps={deps} />
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

function RisksCard({ risks }: { risks: RiskItemResponse[] }) {
  const top = useMemo(() => {
    return [...risks]
      .sort(
        (a, b) =>
          RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] ||
          b.metricValue - a.metricValue,
      )
      .slice(0, 10);
  }, [risks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          风险榜 Top 10
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          共 {risks.length} 项风险，按等级与指标值排序
        </p>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            未发现风险项 🎉
          </div>
        ) : (
          <ol className="space-y-2">
            {top.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm py-1.5 border-b border-border last:border-0"
              >
                <span className="font-mono text-xs text-muted-foreground w-5 tabular-nums">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs truncate">
                      {r.targetName}
                    </span>
                    <Badge variant={RISK_VARIANT[r.riskLevel]}>
                      {r.riskLevel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.metricName} ={" "}
                      <span className="text-foreground tabular-nums">
                        {r.metricValue}
                      </span>{" "}
                      / {r.thresholdValue}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {r.message}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function DependencySummaryCard({ deps }: { deps: DependencyEdgeResponse[] }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-sky-500" />
          依赖摘要
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          共 {deps.length} 条依赖边
        </p>
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
  );
}

function ClassTable({ classes }: { classes: ClassMetricResponse[] }) {
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
                <TableHead className="text-right">WMC</TableHead>
                <TableHead className="text-right">RFC</TableHead>
                <TableHead className="text-right">CBO</TableHead>
                <TableHead className="text-right">DIT</TableHead>
                <TableHead className="text-right">NOC</TableHead>
                <TableHead className="text-right">LCOM</TableHead>
                <TableHead className="text-right">AvgCx</TableHead>
                <TableHead className="text-right">MaxCx</TableHead>
                <TableHead>风险</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.qualifiedName}>
                  <TableCell className="pl-5 max-w-[280px]">
                    <div className="font-mono text-xs truncate">
                      {c.qualifiedName}
                    </div>
                  </TableCell>
                  <NumCell value={c.loc} />
                  <NumCell value={c.weightedMethodsPerClass} />
                  <NumCell value={c.responseForClass} />
                  <NumCell value={c.couplingCount} />
                  <NumCell value={c.depthOfInheritanceTree} />
                  <NumCell value={c.numberOfChildren} />
                  <NumCell value={c.lackOfCohesionOfMethods.toFixed(2)} />
                  <NumCell value={c.averageComplexity.toFixed(2)} />
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

function NumCell({ value }: { value: number | string }) {
  return (
    <TableCell className="text-right tabular-nums font-mono text-xs">
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
