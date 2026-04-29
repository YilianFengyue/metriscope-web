import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { marked } from "marked";
import {
  ArrowDownToLine,
  Check,
  Clipboard,
  FileText,
  Hammer,
  Loader2,
  Megaphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  aiApi,
  type AiAnalyzeMode,
  type AiAnalyzeResponse,
  type SnapshotResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateAndDownloadPdf } from "@/lib/typst-pdf";
import {
  AI_PROVIDER_LABEL,
  getToolMeta,
  isLiveProvider,
} from "./AiToolMeta";

marked.setOptions({ gfm: true, breaks: true });

interface ModeMeta {
  key: AiAnalyzeMode;
  label: string;
  shortLabel: string;
  icon: typeof FileText;
  accent: string;
  desc: string;
}

const MODES: ModeMeta[] = [
  {
    key: "QUALITY_REVIEW",
    label: "质量分析",
    shortLabel: "⚖ 质量",
    icon: FileText,
    accent: "oklch(0.55 0.18 260)",
    desc: "项目体检报告：风险、复杂度、坏味道、McCall 综合评估",
  },
  {
    key: "REFACTOR_ADVICE",
    label: "重构建议",
    shortLabel: "🔧 重构",
    icon: Hammer,
    accent: "oklch(0.55 0.22 295)",
    desc: "可执行的重构动作清单，按优先级排序",
  },
  {
    key: "DEFENSE_SCRIPT",
    label: "答辩话术",
    shortLabel: "🎤 答辩",
    icon: Megaphone,
    accent: "oklch(0.62 0.18 165)",
    desc: "为答辩演示准备的 60 / 90 秒讲稿草稿",
  },
  {
    key: "TYPST_REPORT",
    label: "Typst PDF 报告",
    shortLabel: "📄 PDF",
    icon: WandSparkles,
    accent: "oklch(0.7 0.17 75)",
    desc: "AI 直接生成 Typst 源码 → 浏览器编译 PDF（含封面 / 目录 / 页眉）",
  },
];

export function AiAnalyze({
  projectId,
  snapshots,
  defaultSnapshotId,
  defaultMode,
  defaultFrom,
  defaultTo,
}: {
  projectId: number;
  snapshots: SnapshotResponse[];
  defaultSnapshotId: number | null;
  defaultMode?: string;
  defaultFrom?: number | null;
  defaultTo?: number | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [snapshotId, setSnapshotId] = useState<number | null>(defaultSnapshotId);
  const [mode, setMode] = useState<AiAnalyzeMode>(
    isValidMode(defaultMode) ? (defaultMode as AiAnalyzeMode) : "QUALITY_REVIEW",
  );
  const [useFromTo, setUseFromTo] = useState(
    defaultFrom != null && defaultTo != null,
  );
  const [fromId, setFromId] = useState<number | null>(defaultFrom ?? null);
  const [toId, setToId] = useState<number | null>(defaultTo ?? null);

  // 同步 snapshotId 默认值
  useEffect(() => {
    if (snapshotId == null && defaultSnapshotId != null)
      setSnapshotId(defaultSnapshotId);
  }, [defaultSnapshotId, snapshotId]);

  const [pdfBuilding, setPdfBuilding] = useState(false);
  const [pdfDone, setPdfDone] = useState<string | null>(null);

  const qc = useQueryClient();

  // 把每组参数（projectId/snapshotId/mode/from/to）作为缓存 key —— 切 Tab/页面时
  // 结果留在 QueryClient 全局缓存里，回来直接看到，不会重复请求。
  const queryKey = useMemo(
    () => [
      "ai-analyze",
      projectId,
      snapshotId,
      mode,
      useFromTo ? fromId : null,
      useFromTo ? toId : null,
    ] as const,
    [projectId, snapshotId, mode, useFromTo, fromId, toId],
  );

  const analyzeQuery = useQuery({
    queryKey,
    queryFn: () =>
      aiApi.analyze(
        projectId,
        {
          snapshotId: snapshotId ?? undefined,
          mode,
          fromSnapshotId: useFromTo && fromId != null ? fromId : undefined,
          toSnapshotId: useFromTo && toId != null ? toId : undefined,
        },
        { silent: true },
      ),
    enabled: false, // 仅手动触发；Query 仍会做缓存
    retry: 0,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  const data: AiAnalyzeResponse | null = analyzeQuery.data ?? null;
  const isGenerating = analyzeQuery.isFetching;

  const generate = async () => {
    try {
      const res = await analyzeQuery.refetch({ throwOnError: true });
      if (res.data) {
        // 写回 URL
        const params = new URLSearchParams(searchParams);
        params.set("tab", "analyze");
        params.set("mode", mode);
        if (useFromTo && fromId && toId) {
          params.set("from", String(fromId));
          params.set("to", String(toId));
        }
        setSearchParams(params, { replace: true });
      }
    } catch (e) {
      toast.error((e as Error).message ?? "AI 分析失败");
    }
  };

  // 当从 /history 跳过来 (?from=&to=&mode=) 且这组参数还没缓存时自动触发一次
  useEffect(() => {
    if (!defaultMode) return;
    if (defaultFrom == null && defaultSnapshotId == null) return;
    if (qc.getQueryData(queryKey)) return; // 已有缓存，无需重跑
    analyzeQuery.refetch().catch(() => {
      /* 错误已在 toast 里展示 */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCopyMarkdown = () => {
    if (!data?.markdown) return;
    navigator.clipboard.writeText(data.markdown);
    toast.success(
      mode === "TYPST_REPORT" ? "Typst 源码已复制" : "Markdown 已复制",
    );
  };

  const onDownloadMd = () => {
    if (!data?.markdown) return;
    const blob = new Blob([data.markdown], {
      type:
        mode === "TYPST_REPORT"
          ? "text/x-typst;charset=utf-8"
          : "text/markdown;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-${mode.toLowerCase()}-${Date.now()}.${mode === "TYPST_REPORT" ? "typ" : "md"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /** 核心：编译 Typst → PDF。如果当前 mode 不是 TYPST_REPORT，先额外发一次 TYPST 请求。 */
  const onCompilePdf = async () => {
    setPdfBuilding(true);
    setPdfDone(null);
    try {
      let typstResp = data;
      if (!typstResp || typstResp.mode !== "TYPST_REPORT") {
        // 额外请求一次 TYPST_REPORT
        typstResp = await aiApi.analyze(
          projectId,
          {
            snapshotId: snapshotId ?? undefined,
            mode: "TYPST_REPORT",
            fromSnapshotId: useFromTo && fromId != null ? fromId : undefined,
            toSnapshotId: useFromTo && toId != null ? toId : undefined,
          },
          { silent: true },
        );
      }
      const projectName =
        snapshots.find((s) => s.id === typstResp!.snapshotId)?.versionTag ??
        `project-${projectId}`;
      const { filename } = await generateAndDownloadPdf({
        content: typstResp.markdown,
        meta: {
          title: titleFromMode(typstResp.mode),
          projectName,
          snapshotId: typstResp.snapshotId,
          mode: typstResp.mode,
          provider: typstResp.provider,
          model: typstResp.model,
          generatedAt: typstResp.generatedAt,
          summary: typstResp.summary,
          suggestions: typstResp.suggestions,
        },
      });
      setPdfDone(filename);
      toast.success(`PDF 已生成 · ${filename}`);
    } catch (e) {
      toast.error(`PDF 编译失败: ${(e as Error).message}`);
    } finally {
      setPdfBuilding(false);
    }
  };

  // 渲染主体内容
  const html = useMemo(() => {
    if (!data) return "";
    if (data.mode === "TYPST_REPORT") return ""; // Typst 不在页面渲染，按下载流程处理
    return marked.parse(data.markdown) as string;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* 控制面板 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* mode 选择 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    active
                      ? "ring-2 ring-offset-2 ring-offset-background"
                      : "border-border hover:bg-accent/40",
                  )}
                  style={
                    active
                      ? ({
                          borderColor: m.accent,
                          background: `color-mix(in oklch, ${m.accent} 6%, transparent)`,
                          // @ts-ignore — ringColor via CSS var
                          "--tw-ring-color": m.accent,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: m.accent }}
                    />
                    <span className="text-sm font-medium">{m.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 范围 + 快照选择 + 生成按钮 */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">范围：</span>
              <button
                type="button"
                onClick={() => setUseFromTo(false)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  !useFromTo
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-accent",
                )}
              >
                单快照
              </button>
              <button
                type="button"
                onClick={() => setUseFromTo(true)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  useFromTo
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-accent",
                )}
              >
                重构对比 (from → to)
              </button>
            </div>

            {!useFromTo ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">快照</span>
                <div className="w-32">
                  <Select
                    value={snapshotId != null ? String(snapshotId) : undefined}
                    onValueChange={(v) => setSnapshotId(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选快照" />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          #{s.id} · {s.versionTag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <SnapshotPicker
                  label="from"
                  value={fromId}
                  onChange={setFromId}
                  snapshots={snapshots}
                />
                <span className="text-muted-foreground">→</span>
                <SnapshotPicker
                  label="to"
                  value={toId}
                  onChange={setToId}
                  snapshots={snapshots}
                />
              </div>
            )}

            <Button
              onClick={() => generate()}
              disabled={isGenerating || (useFromTo && (!fromId || !toId))}
              className="ml-auto"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              生成分析
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 结果 */}
      {isGenerating ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      ) : !data ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
            选好模式和快照范围后点〔生成分析〕
          </CardContent>
        </Card>
      ) : (
        <ResultView
          data={data}
          html={html}
          onCopy={onCopyMarkdown}
          onDownloadMd={onDownloadMd}
          onCompilePdf={onCompilePdf}
          pdfBuilding={pdfBuilding}
          pdfDone={pdfDone}
        />
      )}
    </div>
  );
}

function ResultView({
  data,
  html,
  onCopy,
  onDownloadMd,
  onCompilePdf,
  pdfBuilding,
  pdfDone,
}: {
  data: AiAnalyzeResponse;
  html: string;
  onCopy: () => void;
  onDownloadMd: () => void;
  onCompilePdf: () => void;
  pdfBuilding: boolean;
  pdfDone: string | null;
}) {
  const live = isLiveProvider(data.provider);
  const isTypst = data.mode === "TYPST_REPORT";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">
              {titleFromMode(data.mode)}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              {data.mode}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-mono"
              style={
                live
                  ? {
                      color: "oklch(0.62 0.18 165)",
                      borderColor: "oklch(0.62 0.18 165)",
                    }
                  : {
                      color: "oklch(0.7 0.17 75)",
                      borderColor: "oklch(0.7 0.17 75)",
                    }
              }
            >
              ● {live ? "live" : "fallback"} ·{" "}
              {AI_PROVIDER_LABEL[data.provider] ?? data.provider}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            snapshot #{data.snapshotId} ·{" "}
            {new Date(data.generatedAt).toLocaleString("zh-CN", {
              hour12: false,
            })}
          </span>
        </div>
        {/* used tools chips */}
        <div className="flex flex-wrap items-center gap-1 pt-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
            agent used:
          </span>
          {data.usedTools.map((t) => {
            const meta = getToolMeta(t);
            const Icon = meta.icon;
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{
                  background: `color-mix(in oklch, ${meta.color} 12%, transparent)`,
                  color: meta.color,
                }}
                title={meta.label}
              >
                <Icon className="h-2.5 w-2.5" />
                {meta.short}
              </span>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary 醒目卡 */}
        {data.summary && (
          <div
            className="rounded-lg p-4 text-sm leading-relaxed border"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.97 0.04 260) 0%, oklch(0.97 0.04 295) 100%)",
              borderColor: "oklch(0.85 0.04 270)",
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              摘要
            </div>
            <div className="text-foreground/90">{data.summary}</div>
          </div>
        )}

        {/* 主体：markdown 渲染 OR Typst 提示 */}
        {isTypst ? (
          <TypstReadyView source={data.markdown} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <article
              className={cn(
                "lg:col-span-8 max-h-[600px] overflow-y-auto rounded-md border border-border bg-muted/20 p-5 text-sm leading-relaxed",
                "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-0 [&_h1]:mb-3",
                "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
                "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5",
                "[&_p]:my-2",
                "[&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc",
                "[&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal",
                "[&_li]:my-0.5",
                "[&_code]:font-mono [&_code]:text-xs [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
                "[&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-3 [&_pre]:overflow-x-auto",
                "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:my-3",
                "[&_table]:my-3 [&_table]:text-xs [&_table]:border-collapse",
                "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted",
                "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
              )}
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* 改进建议 */}
            <Card className="lg:col-span-4 self-start bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  改进建议
                  <Badge variant="outline" className="text-[10px]">
                    {data.suggestions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.suggestions.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">
                    AI 未提供具体建议
                  </div>
                ) : (
                  <ol className="space-y-2.5">
                    {data.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                        <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold tabular-nums shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 操作行 */}
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Clipboard className="h-3.5 w-3.5" />
            复制 {isTypst ? "Typst 源码" : "Markdown"}
          </Button>
          <Button variant="outline" size="sm" onClick={onDownloadMd}>
            <ArrowDownToLine className="h-3.5 w-3.5" />
            下载 .{isTypst ? "typ" : "md"}
          </Button>
          <Button
            onClick={onCompilePdf}
            disabled={pdfBuilding}
            className="ml-auto"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.55 0.22 295))",
              color: "white",
            }}
          >
            {pdfBuilding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pdfDone ? (
              <Check className="h-4 w-4" />
            ) : (
              <WandSparkles className="h-4 w-4" />
            )}
            {pdfBuilding
              ? "编译 Typst → PDF…"
              : pdfDone
                ? "已下载，再来一份"
                : "AI + Typst → PDF"}
          </Button>
        </div>
        {pdfBuilding && (
          <div className="text-[11px] text-muted-foreground tabular-nums">
            首次会下载 Typst WASM 编译器（~10MB），之后秒级出 PDF...
          </div>
        )}
        {pdfDone && (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <Check className="h-3 w-3" />
            已生成: <span className="font-mono">{pdfDone}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TypstReadyView({ source }: { source: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <WandSparkles className="h-4 w-4 text-primary" />
        <span className="font-medium">Typst 源码已就绪</span>
        <Badge variant="outline" className="text-[10px] font-mono">
          {source.length.toLocaleString()} chars
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        点击下方〔AI + Typst → 漂亮 PDF〕用浏览器内置 WASM 编译器生成包含封面 / 目录 / 页眉 / 页码的正式 PDF 报告。
      </div>
      <pre className="max-h-[300px] overflow-y-auto bg-secondary p-3 rounded text-[11px] font-mono leading-relaxed">
        {source.slice(0, 1200)}
        {source.length > 1200 && "\n\n…（已截断预览，完整源码可复制 / 下载）"}
      </pre>
    </div>
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
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <div className="w-28">
        <Select
          value={value != null ? String(value) : undefined}
          onValueChange={(v) => onChange(Number(v))}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="选" />
          </SelectTrigger>
          <SelectContent>
            {snapshots.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                #{s.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function isValidMode(s?: string): boolean {
  return (
    s === "QUALITY_REVIEW" ||
    s === "REFACTOR_ADVICE" ||
    s === "DEFENSE_SCRIPT" ||
    s === "TYPST_REPORT"
  );
}

function titleFromMode(mode: AiAnalyzeMode): string {
  switch (mode) {
    case "QUALITY_REVIEW":
      return "项目质量分析报告";
    case "REFACTOR_ADVICE":
      return "项目重构建议";
    case "DEFENSE_SCRIPT":
      return "答辩话术草稿";
    case "TYPST_REPORT":
      return "MetriScope AI 质量报告";
  }
}
