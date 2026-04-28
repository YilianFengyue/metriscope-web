import { useEffect, useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock,
  GitCommitVertical,
  Inbox,
  Minus,
} from "lucide-react";
import {
  snapshotsApi,
  type SnapshotCompareResponse,
  type SnapshotResponse,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HistoryPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  if (currentProjectId == null) return <NoProjectSelected />;
  return <HistoryInner projectId={currentProjectId} />;
}

function HistoryInner({ projectId }: { projectId: number }) {
  const snapshotsQuery = useQuery({
    queryKey: ["snapshots", projectId],
    queryFn: () => snapshotsApi.list(projectId, { silent: true }),
    retry: 0,
  });

  const trendQuery = useQuery({
    queryKey: ["trend", projectId],
    queryFn: () => snapshotsApi.trend(projectId, { silent: true }),
    retry: 0,
  });

  const snapshots = useMemo(
    () =>
      [...(snapshotsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [snapshotsQuery.data],
  );

  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);

  useEffect(() => {
    if (snapshots.length >= 2) {
      setFromId(snapshots[snapshots.length - 1].id);
      setToId(snapshots[0].id);
    } else if (snapshots.length === 1) {
      setFromId(snapshots[0].id);
      setToId(snapshots[0].id);
    }
  }, [snapshots]);

  const compareQuery = useQuery({
    queryKey: ["compare", fromId, toId],
    queryFn: () =>
      snapshotsApi.compare(fromId as number, toId as number, { silent: true }),
    enabled: fromId != null && toId != null && fromId !== toId,
    retry: 0,
  });

  if (snapshotsQuery.isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return <NoSnapshots />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">历史快照</h1>
        <p className="text-sm text-muted-foreground mt-1">
          已生成 {snapshots.length} 个快照 · 选择两个对比演进，或观察整体趋势。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SnapshotTimelineCard
          snapshots={snapshots}
          fromId={fromId}
          toId={toId}
          onSelect={(id) => {
            // click toggles: first click sets toId, second click sets fromId
            if (toId === id || fromId === id) return;
            // shift role: keep most-recent of (fromId, toId) as new "to"
            setFromId(toId);
            setToId(id);
          }}
        />

        <div className="lg:col-span-2 space-y-4">
          <CompareCard
            snapshots={snapshots}
            fromId={fromId}
            toId={toId}
            setFromId={setFromId}
            setToId={setToId}
            compareQuery={compareQuery}
          />
          <TrendCard
            isLoading={trendQuery.isLoading}
            points={trendQuery.data?.points ?? []}
          />
        </div>
      </div>
    </div>
  );
}

function SnapshotTimelineCard({
  snapshots,
  fromId,
  toId,
  onSelect,
}: {
  snapshots: SnapshotResponse[];
  fromId: number | null;
  toId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <Card className="lg:row-span-2">
      <CardHeader>
        <CardTitle>时间线</CardTitle>
        <p className="text-xs text-muted-foreground">点击选中快照（自动滚到对比对象）</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ol className="relative">
          {snapshots.map((s) => {
            const role =
              s.id === toId ? "to" : s.id === fromId ? "from" : "none";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "w-full text-left px-5 py-3 flex items-start gap-3 border-l-2 transition-colors hover:bg-accent/40",
                    role === "to" && "bg-primary/5 border-l-primary",
                    role === "from" && "bg-accent/40 border-l-accent-foreground/40",
                    role === "none" && "border-l-transparent",
                  )}
                >
                  <GitCommitVertical
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      role === "to" ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs tabular-nums">
                        #{s.id}
                      </span>
                      {role === "to" && <Badge variant="info">TO</Badge>}
                      {role === "from" && <Badge variant="outline">FROM</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {s.versionTag}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {new Date(s.createdAt).toLocaleString("zh-CN", {
                        hour12: false,
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
                      <span>
                        LoC{" "}
                        <span className="text-foreground tabular-nums">
                          {s.summary.totalLoc}
                        </span>
                      </span>
                      <span>
                        类{" "}
                        <span className="text-foreground tabular-nums">
                          {s.summary.classCount}
                        </span>
                      </span>
                      <span>
                        风险{" "}
                        <span className="text-foreground tabular-nums">
                          {s.summary.highRiskCount}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function CompareCard({
  snapshots,
  fromId,
  toId,
  setFromId,
  setToId,
  compareQuery,
}: {
  snapshots: SnapshotResponse[];
  fromId: number | null;
  toId: number | null;
  setFromId: (id: number) => void;
  setToId: (id: number) => void;
  compareQuery: UseQueryResult<SnapshotCompareResponse, Error>;
}) {
  const sameSnapshot = fromId != null && toId != null && fromId === toId;
  const diff = compareQuery.data?.diff;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>对比</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <SnapshotPicker
              label="From"
              value={fromId}
              onChange={setFromId}
              snapshots={snapshots}
            />
            <span className="text-muted-foreground">→</span>
            <SnapshotPicker
              label="To"
              value={toId}
              onChange={setToId}
              snapshots={snapshots}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sameSnapshot ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            选两个不同的快照才能对比。
          </div>
        ) : compareQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !diff ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            无对比数据。
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <DeltaCard label="LoC" value={diff.totalLocDelta} positiveIsBad={true} />
            <DeltaCard label="类数" value={diff.classCountDelta} positiveIsBad={false} />
            <DeltaCard label="方法数" value={diff.methodCountDelta} positiveIsBad={false} />
            <DeltaCard
              label="平均复杂度"
              value={diff.averageComplexityDelta}
              positiveIsBad={true}
              fixed={2}
            />
            <DeltaCard label="高风险数" value={diff.highRiskCountDelta} positiveIsBad={true} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotPicker({
  label,
  value,
  onChange,
  snapshots,
}: {
  label: string;
  value: number | null;
  onChange: (id: number) => void;
  snapshots: SnapshotResponse[];
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="w-32">
        <Select
          value={value != null ? String(value) : undefined}
          onValueChange={(v) => onChange(Number(v))}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="选择快照" />
          </SelectTrigger>
          <SelectContent>
            {snapshots.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                #{s.id} ·{" "}
                {new Date(s.createdAt).toLocaleDateString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  value,
  positiveIsBad,
  fixed = 0,
}: {
  label: string;
  value: number;
  positiveIsBad: boolean;
  fixed?: number;
}) {
  const display = fixed > 0 ? value.toFixed(fixed) : value.toString();
  const sign = value > 0 ? "+" : "";
  const tone =
    value === 0
      ? "neutral"
      : (value > 0) === positiveIsBad
        ? "bad"
        : "good";

  const Icon = value === 0 ? Minus : value > 0 ? ArrowUp : ArrowDown;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Δ {label}
      </div>
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "good" && "text-emerald-600",
            tone === "bad" && "text-rose-600",
            tone === "neutral" && "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            tone === "good" && "text-emerald-700",
            tone === "bad" && "text-rose-700",
          )}
        >
          {sign}
          {display}
        </span>
      </div>
    </div>
  );
}

function TrendCard({
  isLoading,
  points,
}: {
  isLoading: boolean;
  points: { snapshotId: number; createdAt: string; totalLoc: number; classCount: number; methodCount: number; averageComplexity: number; highRiskCount: number }[];
}) {
  const data = useMemo(
    () =>
      points
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((p) => ({
          ...p,
          tag: `#${p.snapshotId}`,
        })),
    [points],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-500" />
          质量趋势
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          各项指标随快照演进
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72" />
        ) : data.length < 2 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            至少需要 2 个快照才能画趋势线。
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="tag"
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--color-muted-foreground)"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalLoc"
                name="LoC"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="methodCount"
                name="方法"
                stroke="oklch(0.6 0.16 200)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageComplexity"
                name="平均复杂度"
                stroke="oklch(0.65 0.2 60)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="highRiskCount"
                name="高风险"
                stroke="oklch(0.6 0.22 25)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
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
            历史快照对比基于当前项目，先去「项目」页选择一个。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NoSnapshots() {
  return (
    <div className="p-12 max-w-xl mx-auto">
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-semibold tracking-tight">还没有快照</h2>
          <p className="text-sm text-muted-foreground">
            每次成功分析会生成一个快照。先到「分析」页跑两次以上，对比才有意义。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
