import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  fpAssessmentsApi,
  type CreateFpAssessmentRequest,
  type FpAssessmentResponse,
  type FpComplexity,
  type FpFunctionType,
  type GscFactorCode,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FP_TYPE_COLOR,
  FP_TYPE_LABEL,
  FP_WEIGHTS,
  GSC_FACTORS,
  ORDERED_TYPES,
  autoComplexity,
  gscScoreColor,
} from "./IfpugConstants";

// ============== local form state ==============

type ComplexityChoice = "AUTO" | FpComplexity;

interface ItemDraft {
  uid: string;
  name: string;
  type: FpFunctionType;
  complexity: ComplexityChoice;
  detCount: string;
  ftrCount: string;
  retCount: string;
  description: string;
}

function emptyItem(type: FpFunctionType = "EI"): ItemDraft {
  return {
    uid: Math.random().toString(36).slice(2),
    name: "",
    type,
    complexity: "AUTO",
    detCount: "",
    ftrCount: "",
    retCount: "",
    description: "",
  };
}

function parseInt0(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function effectiveComplexity(d: ItemDraft): FpComplexity {
  if (d.complexity !== "AUTO") return d.complexity;
  return autoComplexity(
    d.type,
    parseInt0(d.detCount),
    parseInt0(d.ftrCount),
    parseInt0(d.retCount),
  );
}

function itemWeight(d: ItemDraft): number {
  return FP_WEIGHTS[d.type][effectiveComplexity(d)];
}

// ============== Form Dialog ==============

export function IfpugAssessmentForm({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  onCreated: (a: FpAssessmentResponse) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productivity, setProductivity] = useState("12");
  const [costPerPM, setCostPerPM] = useState("12000");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem("EI")]);
  const [gsc, setGsc] = useState<Record<GscFactorCode, number>>(
    () =>
      GSC_FACTORS.reduce(
        (acc, f) => {
          acc[f.code] = 0;
          return acc;
        },
        {} as Record<GscFactorCode, number>,
      ),
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setProductivity("12");
      setCostPerPM("12000");
      setItems([emptyItem("EI")]);
      setGsc(
        GSC_FACTORS.reduce(
          (acc, f) => {
            acc[f.code] = 0;
            return acc;
          },
          {} as Record<GscFactorCode, number>,
        ),
      );
    }
  }, [open]);

  // Live preview
  const ufp = useMemo(
    () => items.reduce((s, it) => s + (it.name.trim() ? itemWeight(it) : 0), 0),
    [items],
  );
  const sumGsc = useMemo(
    () => GSC_FACTORS.reduce((s, f) => s + (gsc[f.code] ?? 0), 0),
    [gsc],
  );
  const vaf = useMemo(() => 0.65 + 0.01 * sumGsc, [sumGsc]);
  const afp = useMemo(() => ufp * vaf, [ufp, vaf]);

  const productivityNum = useMemo(() => {
    const n = parseFloat(productivity);
    return Number.isFinite(n) && n > 0 ? n : 12;
  }, [productivity]);
  const costNum = useMemo(() => {
    const n = parseFloat(costPerPM);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [costPerPM]);
  const effort = afp / productivityNum;
  const cost = effort * costNum;

  // Validation
  const namedItems = items.filter((it) => it.name.trim());
  const formValid = name.trim().length > 0 && namedItems.length > 0;

  const createMutation = useMutation({
    mutationFn: (body: CreateFpAssessmentRequest) =>
      fpAssessmentsApi.create(projectId, body),
    onSuccess: (created) => onCreated(created),
  });

  const onSubmit = () => {
    if (!formValid) {
      if (!name.trim()) toast.error("请填写评估名称");
      else if (namedItems.length === 0) toast.error("至少添加 1 个有效功能项");
      return;
    }

    const body: CreateFpAssessmentRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      productivityFpPerPersonMonth: productivityNum,
      personMonthCost: costNum,
      items: namedItems.map((d) => {
        const it: any = {
          name: d.name.trim(),
          type: d.type,
          detCount: parseInt0(d.detCount),
          ftrCount: parseInt0(d.ftrCount),
          retCount: parseInt0(d.retCount),
        };
        if (d.complexity !== "AUTO") it.complexity = d.complexity;
        if (d.description.trim()) it.description = d.description.trim();
        return it;
      }),
      gscRatings: GSC_FACTORS.filter((f) => (gsc[f.code] ?? 0) > 0).map(
        (f) => ({
          factorCode: f.code,
          rating: gsc[f.code],
        }),
      ),
    };

    createMutation.mutate(body);
  };

  // Item CRUD
  const addItem = () => setItems((prev) => [...prev, emptyItem("EI")]);
  const removeItem = (uid: string) =>
    setItems((prev) =>
      prev.length === 1 ? [emptyItem("EI")] : prev.filter((i) => i.uid !== uid),
    );
  const patchItem = (uid: string, patch: Partial<ItemDraft>) =>
    setItems((prev) =>
      prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)),
    );

  // GSC quick actions
  const setAllGsc = (v: number) =>
    setGsc(
      GSC_FACTORS.reduce(
        (acc, f) => {
          acc[f.code] = v;
          return acc;
        },
        {} as Record<GscFactorCode, number>,
      ),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            新建 IFPUG 功能点评估
          </DialogTitle>
          <DialogDescription className="text-xs">
            填写功能项明细 + 14 项 GSC 评分；客户端实时预览，保存时调后端 IFPUG 引擎落库。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* A · 基本信息 */}
          <section className="space-y-3">
            <SectionTitle index={1} title="基本信息" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7 space-y-1.5">
                <Label htmlFor="fp-name">
                  评估名称 <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="fp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：订单系统 IFPUG v1.0"
                  autoFocus
                />
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label htmlFor="fp-prod">
                  生产率
                  <span className="text-[10px] text-muted-foreground ml-1">
                    FP/人月
                  </span>
                </Label>
                <Input
                  id="fp-prod"
                  type="number"
                  inputMode="decimal"
                  value={productivity}
                  onChange={(e) => setProductivity(e.target.value)}
                  placeholder="12"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="fp-cost">
                  人月成本
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ¥
                  </span>
                </Label>
                <Input
                  id="fp-cost"
                  type="number"
                  inputMode="decimal"
                  value={costPerPM}
                  onChange={(e) => setCostPerPM(e.target.value)}
                  placeholder="12000"
                />
              </div>
              <div className="md:col-span-12 space-y-1.5">
                <Label htmlFor="fp-desc">说明（可选）</Label>
                <Textarea
                  id="fp-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="为本次评估留个简介，用于答辩时回看"
                  className="resize-none"
                />
              </div>
            </div>
          </section>

          {/* B · 功能项 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle
                index={2}
                title="功能项明细"
                hint="每项填名称 / 类型 / DET / FTR / RET；不指定复杂度时按 IFPUG 简化矩阵自动推导"
              />
              <Badge variant="outline" className="text-[11px] tabular-nums">
                共 {namedItems.length} 项 · 预览 UFP = {ufp}
              </Badge>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[minmax(180px,2fr)_120px_64px_64px_64px_140px_56px_36px] gap-2 px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <span>名称 *</span>
                <span>类型</span>
                <span className="text-right">DET</span>
                <span className="text-right">FTR</span>
                <span className="text-right">RET</span>
                <span>复杂度</span>
                <span className="text-right">权重</span>
                <span></span>
              </div>
              <ul className="divide-y divide-border/60">
                {items.map((it) => {
                  const eff = effectiveComplexity(it);
                  const w = itemWeight(it);
                  const isAuto = it.complexity === "AUTO";
                  return (
                    <li
                      key={it.uid}
                      className="grid grid-cols-[minmax(180px,2fr)_120px_64px_64px_64px_140px_56px_36px] gap-2 px-3 py-2 items-center"
                    >
                      <div>
                        <Input
                          value={it.name}
                          onChange={(e) =>
                            patchItem(it.uid, { name: e.target.value })
                          }
                          placeholder="功能项名称"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={it.description}
                          onChange={(e) =>
                            patchItem(it.uid, { description: e.target.value })
                          }
                          placeholder="说明（可选）"
                          className="h-7 text-[11px] mt-1 text-muted-foreground"
                        />
                      </div>
                      <Select
                        value={it.type}
                        onValueChange={(v) =>
                          patchItem(it.uid, { type: v as FpFunctionType })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDERED_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              <span className="font-mono mr-1.5">{t}</span>
                              <span className="text-muted-foreground text-xs">
                                {FP_TYPE_LABEL[t]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <NumInput
                        value={it.detCount}
                        onChange={(v) => patchItem(it.uid, { detCount: v })}
                      />
                      <NumInput
                        value={it.ftrCount}
                        onChange={(v) => patchItem(it.uid, { ftrCount: v })}
                        disabled={it.type === "ILF" || it.type === "EIF"}
                      />
                      <NumInput
                        value={it.retCount}
                        onChange={(v) => patchItem(it.uid, { retCount: v })}
                        disabled={it.type !== "ILF" && it.type !== "EIF"}
                      />
                      <Select
                        value={it.complexity}
                        onValueChange={(v) =>
                          patchItem(it.uid, {
                            complexity: v as ComplexityChoice,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUTO">
                            自动 ({eff})
                          </SelectItem>
                          <SelectItem value="LOW">LOW</SelectItem>
                          <SelectItem value="AVERAGE">AVERAGE</SelectItem>
                          <SelectItem value="HIGH">HIGH</SelectItem>
                        </SelectContent>
                      </Select>
                      <div
                        className={cn(
                          "text-right tabular-nums font-mono text-sm font-semibold",
                          isAuto && "text-muted-foreground/80",
                        )}
                        title={isAuto ? "由 DET/FTR/RET 自动推导" : undefined}
                        style={{
                          color: it.name.trim()
                            ? FP_TYPE_COLOR[it.type]
                            : undefined,
                        }}
                      >
                        {w}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.uid)}
                        className="h-7 w-7 rounded inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="删除该项"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-3 py-2 border-t border-border/60 bg-muted/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addItem}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3" />
                  添加功能项
                </Button>
              </div>
            </div>
          </section>

          {/* C · 14 GSC */}
          <section className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SectionTitle
                index={3}
                title="通用系统特征 (GSC) 评分"
                hint="14 项各自评 0-5；ΣGSC 影响 VAF（VAF = 0.65 + 0.01 × Σ）"
              />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground tabular-nums">
                  ΣGSC = <span className="text-foreground font-medium">{sumGsc}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setAllGsc(0)}
                >
                  全部清零
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setAllGsc(3)}
                >
                  全部置 3
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {GSC_FACTORS.map((f) => {
                const v = gsc[f.code] ?? 0;
                const c = gscScoreColor(v);
                return (
                  <div
                    key={f.code}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold tabular-nums shrink-0 border"
                      style={{
                        background: c.bg,
                        color: c.fg,
                        borderColor: c.border,
                      }}
                    >
                      {v}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">
                        {f.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {f.code}
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <Slider
                        value={[v]}
                        min={0}
                        max={5}
                        step={1}
                        onValueChange={(arr) =>
                          setGsc((prev) => ({ ...prev, [f.code]: arr[0] }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sticky 预览 + 操作 */}
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-6 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5 text-xs">
              <PreviewStat label="UFP" value={ufp.toFixed(0)} />
              <PreviewSep />
              <PreviewStat label="ΣGSC" value={sumGsc.toString()} />
              <PreviewSep />
              <PreviewStat label="VAF" value={vaf.toFixed(2)} />
              <PreviewSep />
              <PreviewStat
                label="AFP"
                value={afp.toFixed(2)}
                accent
              />
              <PreviewSep />
              <PreviewStat
                label="人月"
                value={effort.toFixed(2)}
              />
              <PreviewSep />
              <PreviewStat
                label="成本"
                value={`¥${cost.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                取消
              </Button>
              <Button
                onClick={onSubmit}
                disabled={!formValid || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存评估
              </Button>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5">
            预览值客户端按 IFPUG 公式即时计算；保存后以后端真实结果为准。
            {!formValid && (
              <span className="text-amber-600 ml-2">
                ⚠ 请填写评估名称与至少一个有效功能项
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============== Sub-components ==============

function SectionTitle({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
          {index}
        </span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-0.5 ml-7">{hint}</p>
      )}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      disabled={disabled}
      className={cn(
        "h-8 text-xs tabular-nums text-right font-mono",
        disabled && "bg-muted/40",
      )}
    />
  );
}

function PreviewStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-mono font-semibold",
          accent ? "text-primary text-base" : "text-sm",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PreviewSep() {
  return <span className="h-3 w-px bg-border" />;
}
