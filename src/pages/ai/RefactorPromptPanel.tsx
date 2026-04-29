import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { marked } from "marked";
import {
  ArrowRight,
  ChevronRight,
  Clipboard,
  Hash,
  Inbox,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { aiApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

marked.setOptions({ gfm: true, breaks: true });

export function RefactorPromptPanel({ projectId }: { projectId: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const promptQuery = useQuery({
    queryKey: ["refactor-prompt", projectId],
    queryFn: () => aiApi.refactorPrompt(projectId, { silent: true }),
    retry: 0,
    staleTime: 30_000,
  });

  const data = promptQuery.data;

  const promptHtml = useMemo(() => {
    if (!data?.prompt) return "";
    return marked.parse(data.prompt) as string;
  }, [data?.prompt]);

  const onCopy = () => {
    if (!data?.prompt) return;
    navigator.clipboard.writeText(data.prompt);
    toast.success("Prompt 已复制 · 粘到 Claude Code 即可使用");
  };

  const onRegenerate = () => {
    qc.invalidateQueries({ queryKey: ["refactor-prompt", projectId] });
    promptQuery.refetch();
  };

  const goCompare = () => navigate("/history");
  const goMcp = () => navigate("/mcp");
  const goClass = (fqn: string) =>
    navigate(`/metrics/class/${encodeURIComponent(fqn)}`);

  if (promptQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (promptQuery.isError) {
    const err = promptQuery.error as Error | ApiError;
    const code = err instanceof ApiError ? err.code : "";
    if (code === "PROJECT_NOT_ANALYZED") {
      return (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold tracking-tight">项目尚未分析</h3>
            <p className="text-sm text-muted-foreground">
              AI 重构 Prompt 需要至少一次分析快照作为输入。
            </p>
            <Button onClick={() => navigate("/analysis")} size="sm">
              去分析页 →
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <div className="font-mono">{(err as Error).message}</div>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const noRisks = data.riskCount === 0;
  const noTargets = data.targetClasses.length === 0;

  return (
    <div className="space-y-4">
      {/* 摘要行 */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <SummaryChip
          icon={Hash}
          label="snapshot"
          value={`#${data.snapshotId}`}
          accent="oklch(0.55 0.18 260)"
        />
        <SummaryChip
          icon={Sparkles}
          label="风险项"
          value={`${data.riskCount}`}
          accent={
            data.riskCount > 0
              ? "oklch(0.6 0.22 25)"
              : "oklch(0.62 0.18 165)"
          }
        />
        <SummaryChip
          icon={Target}
          label="目标类"
          value={`${data.targetClasses.length}`}
          accent="oklch(0.55 0.22 295)"
        />
        <span className="ml-auto text-muted-foreground tabular-nums">
          生成于{" "}
          {new Date(data.generatedAt).toLocaleString("zh-CN", { hour12: false })}
        </span>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5" />
          重新生成
        </Button>
        <Button onClick={onCopy} disabled={!data.prompt}>
          <Clipboard className="h-3.5 w-3.5" />
          复制 Prompt
        </Button>
      </div>

      {/* 空态：没风险 */}
      {noRisks && (
        <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="py-6 text-sm text-emerald-800 dark:text-emerald-100 flex items-center gap-3">
            <Sparkles className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-medium">项目质量良好，暂无重构必要 🎉</div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-200/80 mt-0.5">
                没有触发任何阈值规则——可以再跑一次分析或扩展度量维度。
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主体：目标类 + Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 目标类 */}
        <Card className="lg:col-span-4 self-start">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              目标类
              <Badge variant="outline" className="text-[10px]">
                {data.targetClasses.length}
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              点击跳转类详情页查看具体指标
            </p>
          </CardHeader>
          <CardContent>
            {noTargets ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                暂无明确目标类，可做小步清理
              </div>
            ) : (
              <ul className="space-y-1">
                {data.targetClasses.map((fqn) => (
                  <li key={fqn}>
                    <button
                      type="button"
                      onClick={() => goClass(fqn)}
                      className="group w-full text-left px-2 py-1.5 rounded-md font-mono text-[11px] hover:bg-accent/60 transition-colors flex items-center gap-1.5"
                    >
                      <span className="truncate min-w-0 flex-1">{fqn}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Prompt 预览 */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                重构 Prompt
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onCopy}
                title="复制"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!data.prompt ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Inbox className="h-7 w-7 mx-auto mb-2 opacity-40" />
                Prompt 为空
              </div>
            ) : (
              <article
                className={cn(
                  "max-h-[560px] overflow-y-auto rounded-md border border-border bg-muted/20 p-5 text-sm leading-relaxed",
                  "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-0 [&_h1]:mb-3",
                  "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2",
                  "[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-muted-foreground",
                  "[&_p]:my-2",
                  "[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc",
                  "[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal",
                  "[&_li]:my-0.5",
                  "[&_code]:font-mono [&_code]:text-xs [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
                  "[&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-3 [&_pre]:overflow-x-auto",
                )}
                dangerouslySetInnerHTML={{ __html: promptHtml }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 闭环 3 步引导 */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            闭环 3 步
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <LoopStep
              n={1}
              title="复制 Prompt"
              desc="粘贴到 Claude Code / Codex / Cursor"
              action={
                <Button size="sm" variant="outline" onClick={onCopy}>
                  <Clipboard className="h-3 w-3" />
                  复制
                </Button>
              }
            />
            <LoopStep
              n={2}
              title="AI 重构"
              desc={
                <>
                  改完 mvn test 通过 → 回项目重新分析<br />
                  生成新 snapshot
                </>
              }
              action={
                <Button size="sm" variant="ghost" onClick={goMcp}>
                  也可在 MCP 调试 →
                </Button>
              }
            />
            <LoopStep
              n={3}
              title="对比 Quality Gate"
              desc="选 from / to 快照看 verdict 是否 PASS"
              action={
                <Button size="sm" onClick={goCompare}>
                  去对比页
                  <ArrowRight className="h-3 w-3" />
                </Button>
              }
            />
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
      style={{
        borderColor: `color-mix(in oklch, ${accent} 30%, transparent)`,
      }}
    >
      <Icon className="h-3 w-3" style={{ color: accent }} />
      <span className="text-muted-foreground">{label}</span>
      <span
        className="font-mono font-semibold tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

function LoopStep({
  n,
  title,
  desc,
  action,
}: {
  n: number;
  title: string;
  desc: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="rounded-md border border-border bg-card p-3 space-y-2 relative">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tabular-nums">
          {n}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-[11px] text-muted-foreground leading-relaxed pl-7">
        {desc}
      </div>
      {action && <div className="pl-7">{action}</div>}
    </li>
  );
}
