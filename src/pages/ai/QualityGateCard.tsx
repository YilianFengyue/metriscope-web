import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  Loader2,
  Minus,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  qualityGateApi,
  type CheckDirection,
  type QualityGateResponse,
  type QualityGateVerdict,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const VERDICT_CONFIG: Record<
  QualityGateVerdict,
  { color: string; bg: string; icon: typeof ShieldCheck; cn: string }
> = {
  PASS: {
    color: "oklch(0.62 0.18 165)",
    bg: "oklch(0.97 0.04 165)",
    icon: ShieldCheck,
    cn: "通过",
  },
  WARN: {
    color: "oklch(0.7 0.17 75)",
    bg: "oklch(0.97 0.05 75)",
    icon: ShieldAlert,
    cn: "需关注",
  },
  BLOCK: {
    color: "oklch(0.6 0.22 25)",
    bg: "oklch(0.97 0.04 25)",
    icon: ShieldX,
    cn: "阻塞",
  },
};

const DIRECTION_CONFIG: Record<
  CheckDirection,
  { icon: typeof ArrowDown; color: string; label: string }
> = {
  BETTER: {
    icon: ArrowDown,
    color: "oklch(0.62 0.18 165)",
    label: "改善",
  },
  SAME: {
    icon: Minus,
    color: "oklch(0.55 0.02 260)",
    label: "持平",
  },
  WORSE: {
    icon: ArrowUp,
    color: "oklch(0.6 0.22 25)",
    label: "恶化",
  },
};

export function QualityGateCard({
  projectId,
  fromSnapshotId,
  toSnapshotId,
}: {
  projectId: number;
  fromSnapshotId: number | null;
  toSnapshotId: number | null;
}) {
  const navigate = useNavigate();
  const [data, setData] = useState<QualityGateResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const evaluate = useMutation({
    mutationFn: () =>
      qualityGateApi.evaluate(
        projectId,
        {
          fromSnapshotId: fromSnapshotId!,
          toSnapshotId: toSnapshotId!,
          source: "AI_PATCH",
        },
        { silent: true },
      ),
    onSuccess: (res) => {
      setData(res);
      setErrorMsg(null);
    },
    onError: (e: Error) => {
      setErrorMsg(e.message);
      setData(null);
    },
  });

  // 自动评估：from/to 变化且不同
  useEffect(() => {
    if (
      fromSnapshotId == null ||
      toSnapshotId == null ||
      fromSnapshotId === toSnapshotId
    ) {
      setData(null);
      setErrorMsg(null);
      return;
    }
    evaluate.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromSnapshotId, toSnapshotId]);

  const sameSnapshot =
    fromSnapshotId != null &&
    toSnapshotId != null &&
    fromSnapshotId === toSnapshotId;

  const goAiAnalyze = () => {
    if (!data) return;
    const params = new URLSearchParams({
      tab: "analyze",
      mode: "QUALITY_REVIEW",
      from: String(data.fromSnapshotId),
      to: String(data.toSnapshotId),
    });
    navigate(`/ai?${params.toString()}`);
  };

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full opacity-[0.1] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.18 260) 0%, oklch(0.55 0.22 295) 60%, transparent 100%)",
        }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Patch Quality Gate
            <Badge variant="outline" className="text-[10px] font-normal ml-1">
              source: AI_PATCH
            </Badge>
          </CardTitle>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            自动评估 from #{fromSnapshotId ?? "—"} → to #{toSnapshotId ?? "—"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {sameSnapshot ? (
          <EmptyState text="选两个不同的快照才能跑质量门禁评估。" />
        ) : evaluate.isPending ? (
          <LoadingState />
        ) : errorMsg ? (
          <ErrorState message={errorMsg} onRetry={() => evaluate.mutate()} />
        ) : !data ? (
          <EmptyState text="选择对比快照后将自动评估。" />
        ) : (
          <ResultView data={data} onAiInterpret={goAiAnalyze} />
        )}
      </CardContent>
    </Card>
  );
}

function ResultView({
  data,
  onAiInterpret,
}: {
  data: QualityGateResponse;
  onAiInterpret: () => void;
}) {
  const cfg = VERDICT_CONFIG[data.verdict];
  const VerdictIcon = cfg.icon;
  const passedCount = data.checks.filter((c) => c.passed).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 左：verdict Hero */}
      <div className="lg:col-span-5 space-y-4">
        <div
          className="rounded-lg border p-5 relative overflow-hidden"
          style={{
            borderColor: cfg.color,
            background: cfg.bg,
          }}
        >
          <div className="flex items-start gap-3">
            <VerdictIcon
              className="h-10 w-10 shrink-0"
              style={{ color: cfg.color }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="text-3xl font-bold tracking-tight"
                style={{ color: cfg.color }}
              >
                {data.verdict}
              </div>
              <div
                className="text-sm font-medium mt-0.5"
                style={{ color: cfg.color }}
              >
                {data.verdictLabel || cfg.cn}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className="text-3xl font-semibold tabular-nums leading-none"
                style={{ color: cfg.color }}
              >
                {data.totalScore}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                / 100 分
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 tabular-nums">
            {passedCount} / {data.checks.length} 项指标通过
          </div>
        </div>

        <div className="rounded-md bg-muted/30 p-3 text-xs leading-relaxed">
          <span className="font-medium text-foreground">建议：</span>{" "}
          <span className="text-muted-foreground">{data.suggestion}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onAiInterpret}
          className="w-full"
        >
          <Bot className="h-3.5 w-3.5" />
          🤖 让 AI 解读这次门禁
        </Button>
      </div>

      {/* 右：checks 列表 */}
      <div className="lg:col-span-7">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          指标明细 · 动态 {data.checks.length} 项
        </div>
        <ul className="space-y-2">
          {data.checks.map((c, i) => (
            <CheckRow key={i} check={c} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: import("@/lib/api").QualityGateCheck }) {
  const dir = DIRECTION_CONFIG[check.direction];
  const DirIcon = dir.icon;
  const deltaPct = useMemo(() => {
    if (check.fromValue === 0) return null;
    return ((check.delta / check.fromValue) * 100).toFixed(1);
  }, [check]);

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border p-3 text-sm",
        check.passed
          ? "border-border bg-card"
          : "border-rose-200/60 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/40",
      )}
    >
      {/* 方向图标 */}
      <div
        className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in oklch, ${dir.color} 14%, transparent)`,
          color: dir.color,
        }}
      >
        <DirIcon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{check.metricLabel}</span>
          <Badge
            variant="outline"
            className="text-[9px] font-mono"
            style={{ color: dir.color, borderColor: dir.color }}
          >
            {dir.label}
          </Badge>
          {check.passed ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              通过
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-700">
              <ShieldX className="h-3 w-3" />
              未通过
            </span>
          )}
          <span className="ml-auto tabular-nums font-mono text-[11px] text-muted-foreground shrink-0">
            <span>{check.fromValue}</span>
            <span className="mx-1">→</span>
            <span className="text-foreground font-medium">{check.toValue}</span>
            <span
              className="ml-2"
              style={{
                color: check.direction === "BETTER" ? dir.color : undefined,
              }}
            >
              {check.delta > 0 ? "+" : ""}
              {check.delta}
              {deltaPct != null && ` (${deltaPct}%)`}
            </span>
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-mono">
          {check.metric}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {check.message}
        </div>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <Skeleton className="h-40 lg:col-span-5" />
      <div className="lg:col-span-7 space-y-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="lg:col-span-12 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        正在评估质量门禁…
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <Sparkles className="h-7 w-7 mx-auto mb-2 opacity-30" />
      {text}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="py-8 text-center space-y-3">
      <ShieldX className="h-7 w-7 mx-auto text-rose-500/60" />
      <div className="text-sm text-rose-700">评估失败</div>
      <div className="text-[11px] text-muted-foreground font-mono">
        {message}
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}
