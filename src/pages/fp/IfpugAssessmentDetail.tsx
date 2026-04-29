import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Calendar, Coins, Hash, Inbox, Layers, Sigma } from "lucide-react";
import {
  type FpAssessmentResponse,
  type FpFunctionType,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FP_COMPLEXITY_COLOR,
  FP_TYPE_COLOR,
  FP_TYPE_LABEL,
  GSC_FACTORS,
  ORDERED_TYPES,
  gscScoreColor,
} from "./IfpugConstants";

export function IfpugAssessmentDetail({
  assessment: a,
}: {
  assessment: FpAssessmentResponse;
}) {
  const [filterType, setFilterType] = useState<"ALL" | FpFunctionType>("ALL");

  const filteredItems = useMemo(
    () =>
      filterType === "ALL"
        ? a.items
        : a.items.filter((it) => it.type === filterType),
    [a.items, filterType],
  );

  const pieData = useMemo(() => {
    return ORDERED_TYPES.map((t) => ({
      type: t,
      label: FP_TYPE_LABEL[t],
      count: a.itemsByType[t] ?? 0,
      color: FP_TYPE_COLOR[t],
    })).filter((d) => d.count > 0);
  }, [a.itemsByType]);

  const gscMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of a.gscRatings) m.set(r.factorCode, r.rating);
    return m;
  }, [a.gscRatings]);

  const date = new Date(a.createdAt).toLocaleString("zh-CN", {
    hour12: false,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg">{a.name}</CardTitle>
              {a.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {a.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground tabular-nums flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {date}
                </span>
                <span>·</span>
                <span>评估 #{a.id}</span>
                <span>·</span>
                <span>
                  生产率{" "}
                  <span className="text-foreground">
                    {a.productivityFpPerPersonMonth.toFixed(1)}
                  </span>{" "}
                  FP/人月
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI 行：UFP / GSC / VAF / AFP（4 张）+ 人月 / 周期 / 成本（3 张） */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="UFP"
          value={a.ufp.toFixed(0)}
          hint="未调整功能点"
          icon={Hash}
        />
        <KpiCard
          label="ΣGSC"
          value={a.valueAdjustmentSum.toString()}
          hint="14 因子总评分"
          icon={Sigma}
        />
        <KpiCard
          label="VAF"
          value={a.vaf.toFixed(2)}
          hint={`= 0.65 + 0.01 × ${a.valueAdjustmentSum}`}
          icon={Layers}
        />
        <KpiCard
          label="AFP"
          value={a.afp.toFixed(2)}
          hint="调整后功能点"
          icon={Sigma}
          highlight
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <CostCard
          label="估算人月"
          value={a.estimatedEffortPersonMonths.toFixed(2)}
          unit="PM"
          tone="primary"
        />
        <CostCard
          label="估算周期"
          value={a.estimatedScheduleMonths.toFixed(2)}
          unit="月"
          tone="emerald"
        />
        <CostCard
          label="估算成本"
          value={`¥ ${a.estimatedCost.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}`}
          tone="amber"
          icon={Coins}
        />
      </div>

      {/* 功能项明细 + 类型分布饼 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">功能项明细</CardTitle>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                共 {a.items.length} 项 · UFP = {a.ufp.toFixed(0)}
              </span>
            </div>
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <TabsList className="mt-2">
                <TabsTrigger value="ALL" className="text-xs">
                  综合
                  <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
                    {a.items.length}
                  </span>
                </TabsTrigger>
                {ORDERED_TYPES.map((t) => {
                  const c = a.itemsByType[t] ?? 0;
                  return (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="text-xs"
                      disabled={c === 0}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: FP_TYPE_COLOR[t] }}
                      />
                      {t}
                      <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
                        {c}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="px-0">
            {filteredItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
                无该类型功能项
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">名称</TableHead>
                    <TableHead className="w-20">类型</TableHead>
                    <TableHead className="text-right w-12">DET</TableHead>
                    <TableHead className="text-right w-12">FTR</TableHead>
                    <TableHead className="text-right w-12">RET</TableHead>
                    <TableHead className="w-24">复杂度</TableHead>
                    <TableHead className="text-right w-12">权重</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="pl-5 max-w-[260px]">
                        <div className="text-sm font-medium truncate">
                          {it.name}
                        </div>
                        {it.description && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {it.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono"
                          style={{
                            color: FP_TYPE_COLOR[it.type],
                            borderColor: FP_TYPE_COLOR[it.type],
                          }}
                        >
                          {it.type}
                        </Badge>
                      </TableCell>
                      <NumCell value={it.detCount} />
                      <NumCell value={it.ftrCount} />
                      <NumCell value={it.retCount} />
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            color: FP_COMPLEXITY_COLOR[it.complexity],
                            borderColor: FP_COMPLEXITY_COLOR[it.complexity],
                          }}
                        >
                          {it.complexity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-mono text-xs font-semibold">
                        {it.weight}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 类型分布饼 */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">类型分布</CardTitle>
            <p className="text-xs text-muted-foreground">
              按 5 类功能项个数占比
            </p>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                无功能项
              </div>
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        strokeWidth={1}
                        stroke="var(--color-card)"
                      >
                        {pieData.map((d) => (
                          <Cell key={d.type} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number, _: string, p: any) => [
                          `${v} 项`,
                          `${p.payload.type} · ${p.payload.label}`,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      AFP
                    </div>
                    <div
                      className="text-xl font-semibold tabular-nums"
                      style={{ color: "oklch(0.55 0.18 260)" }}
                    >
                      {a.afp.toFixed(2)}
                    </div>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-1.5 mt-3 text-[11px]">
                  {ORDERED_TYPES.map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: FP_TYPE_COLOR[t] }}
                      />
                      <span className="font-mono">{t}</span>
                      <span className="text-muted-foreground">
                        {FP_TYPE_LABEL[t]}
                      </span>
                      <span className="ml-auto tabular-nums font-medium">
                        {a.itemsByType[t] ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 14 GSC 矩阵 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">14 项通用系统特征 (GSC)</CardTitle>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              ΣGSC = {a.valueAdjustmentSum} · VAF ={" "}
              <span className="text-foreground font-medium">
                {a.vaf.toFixed(2)}
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            评分 0-5：影响越大评分越高；颜色深 = 评分高
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-2">
            {GSC_FACTORS.map((f) => {
              const rating = gscMap.get(f.code) ?? 0;
              const c = gscScoreColor(rating);
              return (
                <div
                  key={f.code}
                  className="rounded-md p-2.5 border transition-colors"
                  style={{
                    background: c.bg,
                    color: c.fg,
                    borderColor: c.border,
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider opacity-70 truncate"
                    title={f.label}
                  >
                    {f.label}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-semibold tabular-nums leading-none">
                      {rating}
                    </span>
                    <span className="text-[10px] opacity-60">/5</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Sub-components ==============

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Hash;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        highlight && "border-primary/40 bg-primary/[0.03]",
      )}
    >
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums",
            highlight && "text-primary",
          )}
        >
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground line-clamp-1">
          {hint}
        </div>
      </CardContent>
    </Card>
  );
}

function CostCard({
  label,
  value,
  unit,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "primary" | "emerald" | "amber";
  icon?: typeof Hash;
}) {
  const toneColor = {
    primary: "oklch(0.55 0.18 260)",
    emerald: "oklch(0.62 0.18 165)",
    amber: "oklch(0.7 0.17 75)",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-baseline gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {Icon && <Icon className="h-3 w-3" />}
            {label}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className="text-xl font-semibold tabular-nums"
              style={{ color: toneColor }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-xs text-muted-foreground">{unit}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NumCell({ value }: { value: number }) {
  return (
    <TableCell className="text-right tabular-nums font-mono text-xs">
      {value}
    </TableCell>
  );
}
