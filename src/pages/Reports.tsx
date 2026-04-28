import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marked } from "marked";
import {
  AlertCircle,
  Calculator,
  Copy,
  Download,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  estimateApi,
  exportsApi,
  reportsApi,
  snapshotsApi,
  type CocomoMode,
  type EstimateModel,
  type EstimateRequest,
  type EstimateResponse,
  type ExportRecordResponse,
  type ExportResponse,
  type SnapshotResponse,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

marked.setOptions({ gfm: true, breaks: true });

export default function ReportsPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  if (currentProjectId == null) return <NoProjectSelected />;
  return <ReportsInner projectId={currentProjectId} />;
}

function ReportsInner({ projectId }: { projectId: number }) {
  const snapshotsQuery = useQuery({
    queryKey: ["snapshots", projectId],
    queryFn: () => snapshotsApi.list(projectId, { silent: true }),
    retry: 0,
  });

  const latestSnapshot = useMemo(
    () =>
      [...(snapshotsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0],
    [snapshotsQuery.data],
  );

  if (snapshotsQuery.isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">报告中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            生成报告草稿、导出多格式快照、估算项目工作量与成本。
          </p>
        </div>
        {latestSnapshot && (
          <Badge variant="outline" className="gap-1.5">
            <FileText className="h-3 w-3" />
            最新快照 #{latestSnapshot.id} · {latestSnapshot.versionTag}
          </Badge>
        )}
      </header>

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">报告草稿</TabsTrigger>
          <TabsTrigger value="export" disabled={!latestSnapshot}>
            导出
          </TabsTrigger>
          <TabsTrigger value="estimate">项目估算</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <ReportSection projectId={projectId} />
        </TabsContent>

        <TabsContent value="export">
          {latestSnapshot ? (
            <ExportSection snapshot={latestSnapshot} projectId={projectId} />
          ) : (
            <NoSnapshotCard />
          )}
        </TabsContent>

        <TabsContent value="estimate">
          <EstimateSection projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportSection({ projectId }: { projectId: number }) {
  return (
    <Tabs defaultValue="standard">
      <Card>
        <CardHeader className="pb-0">
          <TabsList>
            <TabsTrigger value="standard">
              <FileText className="h-3.5 w-3.5" />
              普通草稿
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-3.5 w-3.5" />
              AI 草稿
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="pt-4">
          <TabsContent value="standard" className="mt-0">
            <StandardReport projectId={projectId} />
          </TabsContent>
          <TabsContent value="ai" className="mt-0">
            <AiReport projectId={projectId} />
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

function StandardReport({ projectId }: { projectId: number }) {
  const query = useQuery({
    queryKey: ["report-draft", projectId],
    queryFn: () => reportsApi.draft(projectId, { silent: true }),
    retry: 0,
  });

  if (query.isLoading) return <Skeleton className="h-72" />;
  if (query.isError) return <ReportError error={query.error} />;
  const data = query.data!;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-semibold">{data.title}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          快照 #{data.snapshotId} ·{" "}
          {new Date(data.generatedAt).toLocaleString("zh-CN", { hour12: false })}
        </span>
      </div>
      <MarkdownPreview source={data.markdown} />
    </div>
  );
}

function AiReport({ projectId }: { projectId: number }) {
  const query = useQuery({
    queryKey: ["report-draft-ai", projectId],
    queryFn: () => reportsApi.draftAi(projectId, { silent: true }),
    retry: 0,
  });

  if (query.isLoading) return <Skeleton className="h-72" />;
  if (query.isError) return <ReportError error={query.error} />;
  const data = query.data!;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {data.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{data.provider}</Badge>
          <Badge variant="outline">{data.model}</Badge>
          {data.fallbackUsed && <Badge variant="warning">fallback</Badge>}
        </div>
      </div>
      <MarkdownPreview source={data.markdown} />
    </div>
  );
}

function ReportError({ error }: { error: unknown }) {
  return (
    <div className="py-12 text-center space-y-2">
      <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40" />
      <div className="text-sm text-muted-foreground">
        {(error as Error)?.message ?? "无法生成报告，可能项目还没有快照。"}
      </div>
    </div>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  const html = useMemo(() => marked.parse(source) as string, [source]);
  return (
    <article
      className={cn(
        "max-w-none rounded-lg border border-border bg-muted/30 p-6 text-sm leading-relaxed",
        "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:mt-0 [&_h1]:mb-3",
        "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2",
        "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5",
        "[&_p]:my-2 [&_p]:text-foreground/85",
        "[&_ul]:my-2 [&_ul]:pl-6 [&_ul]:list-disc",
        "[&_ol]:my-2 [&_ol]:pl-6 [&_ol]:list-decimal",
        "[&_li]:my-0.5",
        "[&_code]:font-mono [&_code]:text-xs [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
        "[&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-3 [&_pre]:overflow-x-auto",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_table]:my-3 [&_table]:text-xs [&_table]:border-collapse",
        "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:my-3",
        "[&_hr]:border-border [&_hr]:my-4",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ExportSection({
  snapshot,
  projectId: _projectId,
}: {
  snapshot: SnapshotResponse;
  projectId: number;
}) {
  const qc = useQueryClient();
  const recordsQuery = useQuery({
    queryKey: ["exports", snapshot.id],
    queryFn: () => exportsApi.bySnapshot(snapshot.id, { silent: true }),
    retry: 0,
  });

  const onSuccess = (label: string) => (res: ExportResponse) => {
    toast.success(`${label} 导出完成`, {
      description: res.filePath,
      action: {
        label: "复制路径",
        onClick: () => navigator.clipboard.writeText(res.filePath),
      },
    });
    qc.invalidateQueries({ queryKey: ["exports", snapshot.id] });
  };

  const exportJson = useMutation({
    mutationFn: () => exportsApi.exportJson(snapshot.id),
    onSuccess: onSuccess("JSON"),
  });
  const exportCsv = useMutation({
    mutationFn: () => exportsApi.exportCsv(snapshot.id),
    onSuccess: onSuccess("CSV"),
  });
  const exportHtml = useMutation({
    mutationFn: () => exportsApi.exportHtml(snapshot.id),
    onSuccess: onSuccess("HTML"),
  });
  const exportPdf = useMutation({
    mutationFn: () => exportsApi.exportPdf(snapshot.id),
    onSuccess: onSuccess("PDF"),
  });
  const exportTypst = useMutation({
    mutationFn: () => exportsApi.exportPdfTypst(snapshot.id),
    onSuccess: onSuccess("Typst-PDF"),
  });

  const buttons: Array<{
    label: string;
    icon: typeof FileJson;
    mutation: typeof exportJson;
    hint?: string;
  }> = [
    { label: "JSON", icon: FileJson, mutation: exportJson },
    { label: "CSV", icon: FileSpreadsheet, mutation: exportCsv },
    { label: "HTML", icon: FileCode2, mutation: exportHtml },
    { label: "PDF", icon: FileText, mutation: exportPdf },
    {
      label: "Typst PDF",
      icon: FileText,
      mutation: exportTypst,
      hint: "本机有 typst 才能用真排版",
    },
  ];

  const records = recordsQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            导出快照 #{snapshot.id}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            版本 {snapshot.versionTag} · 类 {snapshot.summary.classCount} · 方法{" "}
            {snapshot.summary.methodCount}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {buttons.map((b) => {
              const Icon = b.icon;
              return (
                <Button
                  key={b.label}
                  variant="outline"
                  onClick={() => b.mutation.mutate()}
                  disabled={b.mutation.isPending}
                  className="justify-start h-auto py-2.5"
                >
                  {b.mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="flex-1 text-left">
                    <span className="block text-sm">{b.label}</span>
                    {b.hint && (
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        {b.hint}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            说明：后端返回的是<strong>本机文件路径</strong>，不是文件流。导出后到该路径手动打开。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>导出历史</CardTitle>
          <p className="text-xs text-muted-foreground">
            快照 #{snapshot.id} 的全部导出记录
          </p>
        </CardHeader>
        <CardContent className="px-0">
          {recordsQuery.isLoading ? (
            <div className="px-5 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
              暂无导出记录
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {records.map((r) => (
                <ExportRecordRow key={r.id} record={r} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportRecordRow({ record }: { record: ExportRecordResponse }) {
  return (
    <li className="px-5 py-3 flex items-start gap-3 text-sm">
      <Badge variant="outline">{record.exportType}</Badge>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] break-all leading-relaxed">
          {record.filePath}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
          {new Date(record.createdAt).toLocaleString("zh-CN", { hour12: false })}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(record.filePath);
          toast.success("已复制路径");
        }}
        title="复制路径"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

// ============== Estimate ==============

const COCOMO_MODES: { value: CocomoMode; label: string }[] = [
  { value: "ORGANIC", label: "ORGANIC（有机型）" },
  { value: "SEMI_DETACHED", label: "SEMI_DETACHED（半独立型）" },
  { value: "EMBEDDED", label: "EMBEDDED（嵌入型）" },
];

function EstimateSection({ projectId }: { projectId: number }) {
  const [model, setModel] = useState<EstimateModel>("COCOMO");
  const [form, setForm] = useState<Record<string, string>>({
    personMonthCost: "12000",
    cocomoMode: "ORGANIC",
  });
  const [result, setResult] = useState<EstimateResponse | null>(null);

  const setField = (k: string, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const numOrUndef = (k: string): number | undefined => {
    const raw = form[k];
    if (raw == null || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const submit = useMutation({
    mutationFn: () => {
      const body: EstimateRequest = {
        model,
        personMonthCost: numOrUndef("personMonthCost"),
      };
      if (model === "COCOMO") {
        body.kLoc = numOrUndef("kLoc");
        body.cocomoMode = (form.cocomoMode as CocomoMode) ?? "ORGANIC";
      } else if (model === "UCP") {
        body.actorSimpleCount = numOrUndef("actorSimpleCount");
        body.actorAverageCount = numOrUndef("actorAverageCount");
        body.actorComplexCount = numOrUndef("actorComplexCount");
        body.useCaseSimpleCount = numOrUndef("useCaseSimpleCount");
        body.useCaseAverageCount = numOrUndef("useCaseAverageCount");
        body.useCaseComplexCount = numOrUndef("useCaseComplexCount");
        body.technicalComplexityFactor = numOrUndef("technicalComplexityFactor");
        body.environmentalComplexityFactor = numOrUndef(
          "environmentalComplexityFactor",
        );
      } else if (model === "FP" || model === "FEATURE_POINT" || model === "FEP") {
        body.externalInputCount = numOrUndef("externalInputCount");
        body.externalOutputCount = numOrUndef("externalOutputCount");
        body.externalInquiryCount = numOrUndef("externalInquiryCount");
        body.internalLogicalFileCount = numOrUndef("internalLogicalFileCount");
        body.externalInterfaceFileCount = numOrUndef(
          "externalInterfaceFileCount",
        );
        body.valueAdjustmentSum = numOrUndef("valueAdjustmentSum");
        if (model === "FEATURE_POINT" || model === "FEP") {
          body.algorithmComplexityCount = numOrUndef("algorithmComplexityCount");
          body.algorithmWeight = numOrUndef("algorithmWeight");
          body.reuseAdjustmentFactor = numOrUndef("reuseAdjustmentFactor");
        }
      }
      return estimateApi.estimate(projectId, body);
    },
    onSuccess: (res) => {
      setResult(res);
      toast.success("估算完成");
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            估算参数
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="模型">
            <Select
              value={model}
              onValueChange={(v) => {
                setModel(v as EstimateModel);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COCOMO">COCOMO（基于 KLOC）</SelectItem>
                <SelectItem value="UCP">UCP（用例点）</SelectItem>
                <SelectItem value="FP">FP（功能点）</SelectItem>
                <SelectItem value="FEATURE_POINT">FEATURE_POINT（特征点）</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="人月成本（元）" hint="可空，仅影响成本估算">
            <Input
              type="number"
              value={form.personMonthCost ?? ""}
              onChange={(e) => setField("personMonthCost", e.target.value)}
              placeholder="12000"
            />
          </FormField>

          {model === "COCOMO" && (
            <>
              <FormField label="KLOC" hint="留空则用最新快照的 totalLoc/1000">
                <Input
                  type="number"
                  value={form.kLoc ?? ""}
                  onChange={(e) => setField("kLoc", e.target.value)}
                  placeholder="自动"
                />
              </FormField>
              <FormField label="COCOMO 模式">
                <Select
                  value={form.cocomoMode ?? "ORGANIC"}
                  onValueChange={(v) => setField("cocomoMode", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COCOMO_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </>
          )}

          {model === "UCP" && (
            <div className="grid grid-cols-2 gap-3">
              <NumField label="简单 Actor" k="actorSimpleCount" form={form} set={setField} />
              <NumField label="平均 Actor" k="actorAverageCount" form={form} set={setField} />
              <NumField label="复杂 Actor" k="actorComplexCount" form={form} set={setField} />
              <NumField label="简单用例" k="useCaseSimpleCount" form={form} set={setField} />
              <NumField label="平均用例" k="useCaseAverageCount" form={form} set={setField} />
              <NumField label="复杂用例" k="useCaseComplexCount" form={form} set={setField} />
              <NumField
                label="技术复杂因子 TCF"
                k="technicalComplexityFactor"
                form={form}
                set={setField}
                placeholder="1.05"
              />
              <NumField
                label="环境复杂因子 ECF"
                k="environmentalComplexityFactor"
                form={form}
                set={setField}
                placeholder="0.95"
              />
            </div>
          )}

          {(model === "FP" || model === "FEATURE_POINT" || model === "FEP") && (
            <div className="grid grid-cols-2 gap-3">
              <NumField label="外部输入 EI" k="externalInputCount" form={form} set={setField} />
              <NumField label="外部输出 EO" k="externalOutputCount" form={form} set={setField} />
              <NumField label="外部查询 EQ" k="externalInquiryCount" form={form} set={setField} />
              <NumField label="内部逻辑文件 ILF" k="internalLogicalFileCount" form={form} set={setField} />
              <NumField label="外部接口文件 EIF" k="externalInterfaceFileCount" form={form} set={setField} />
              <NumField label="值调整因子 VAF" k="valueAdjustmentSum" form={form} set={setField} placeholder="35" />
              {(model === "FEATURE_POINT" || model === "FEP") && (
                <>
                  <NumField label="算法数" k="algorithmComplexityCount" form={form} set={setField} />
                  <NumField label="算法权重" k="algorithmWeight" form={form} set={setField} placeholder="3.2" />
                  <NumField label="复用调整因子" k="reuseAdjustmentFactor" form={form} set={setField} placeholder="0.9" />
                </>
              )}
            </div>
          )}

          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="w-full"
          >
            {submit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            开始估算
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>估算结果</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Calculator className="h-8 w-8 mx-auto mb-2 opacity-40" />
              填好参数后点「开始估算」。
            </div>
          ) : (
            <EstimateResult res={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EstimateResult({ res }: { res: EstimateResponse }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultStat
          label="规模"
          value={`${res.estimatedSize.toFixed(2)} ${res.sizeUnit}`}
        />
        <ResultStat
          label="工作量"
          value={`${res.estimatedEffortPersonMonths.toFixed(2)} 人月`}
        />
        <ResultStat
          label="周期"
          value={`${res.estimatedScheduleMonths.toFixed(2)} 月`}
        />
        <ResultStat
          label="成本"
          value={`¥ ${res.estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          highlight
        />
      </div>

      <Separator />

      <div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          中间过程
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
          {Object.entries(res.details).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-border/50 py-1">
              <dt className="font-mono text-muted-foreground">{k}</dt>
              <dd className="tabular-nums font-medium">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">假设：</span>{" "}
        {res.assumptions}
      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-1",
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card",
      )}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumField({
  label,
  k,
  form,
  set,
  placeholder,
}: {
  label: string;
  k: string;
  form: Record<string, string>;
  set: (k: string, v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={form[k] ?? ""}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder ?? "0"}
        className="h-8 text-xs"
      />
    </div>
  );
}

function NoSnapshotCard() {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="font-semibold tracking-tight">还没有快照</h2>
        <p className="text-sm text-muted-foreground">
          先在「分析」页跑一次分析，生成快照后才能导出。
        </p>
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
            报告与导出基于当前项目，先去「项目」页选择一个。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
