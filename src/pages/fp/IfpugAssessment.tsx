import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calculator,
  Inbox,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fpAssessmentsApi,
  type FpAssessmentResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IfpugAssessmentDetail } from "./IfpugAssessmentDetail";
import { IfpugAssessmentForm } from "./IfpugAssessmentForm";

export function IfpugAssessmentPanel({ projectId }: { projectId: number }) {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["fp-assessments", projectId],
    queryFn: () => fpAssessmentsApi.list(projectId, { silent: true }),
    retry: 0,
  });

  const list = useMemo(
    () =>
      [...(listQuery.data ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [listQuery.data],
  );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // 默认选中第一条
  useEffect(() => {
    if (selectedId == null && list.length > 0) {
      setSelectedId(list[0].id);
    } else if (selectedId != null && !list.find((a) => a.id === selectedId)) {
      setSelectedId(list[0]?.id ?? null);
    }
  }, [list, selectedId]);

  const selected = useMemo(
    () => list.find((a) => a.id === selectedId) ?? null,
    [list, selectedId],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fpAssessmentsApi.delete(id),
    onSuccess: () => {
      toast.success("评估已删除");
      qc.invalidateQueries({ queryKey: ["fp-assessments", projectId] });
      setConfirmDelete(null);
    },
  });

  const onCreated = (created: FpAssessmentResponse) => {
    toast.success(`评估「${created.name}」已保存`);
    qc.invalidateQueries({ queryKey: ["fp-assessments", projectId] });
    setSelectedId(created.id);
    setFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <Header
        count={list.length}
        onNew={() => setFormOpen(true)}
        loading={listQuery.isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左：评估历史 */}
        <Card className="lg:col-span-4 lg:sticky lg:top-4 self-start">
          <CardContent className="p-3">
            {listQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <EmptyHistory onNew={() => setFormOpen(true)} />
            ) : (
              <ul className="space-y-1.5">
                {list.map((a) => (
                  <li key={a.id}>
                    <AssessmentRow
                      assessment={a}
                      isSelected={a.id === selectedId}
                      onClick={() => setSelectedId(a.id)}
                      onDelete={() => setConfirmDelete(a.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 右：详情 */}
        <div className="lg:col-span-8">
          {!selected ? (
            <Card>
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                <Calculator className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                {list.length === 0
                  ? "尚无评估记录，点右上角新建一份 IFPUG 功能点评估"
                  : "请从左侧选择一个评估查看详情"}
              </CardContent>
            </Card>
          ) : (
            <IfpugAssessmentDetail assessment={selected} />
          )}
        </div>
      </div>

      <IfpugAssessmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={projectId}
        onCreated={onCreated}
      />

      <Dialog
        open={confirmDelete != null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              删除评估？
            </DialogTitle>
            <DialogDescription>
              将永久删除该评估及其全部功能项与 GSC 评分。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDelete != null && deleteMutation.mutate(confirmDelete)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({
  count,
  onNew,
  loading,
}: {
  count: number;
  onNew: () => void;
  loading: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-[0.1] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.18 260) 0%, oklch(0.62 0.18 165) 60%, transparent 100%)",
        }}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            IFPUG Function Point Analysis
          </div>
          <h2 className="text-xl font-semibold tracking-tight mt-1">
            完整 IFPUG 功能点评估
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            按 5 类功能项（EI / EO / EQ / ILF / EIF）+ 14 项通用系统特征建立可追溯的功能规模评估，每次评估完整持久化。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-7 w-20" />
          ) : (
            <Badge variant="outline" className="text-xs tabular-nums">
              {count} 份评估
            </Badge>
          )}
          <Button onClick={onNew} size="sm">
            <Plus className="h-3.5 w-3.5" />
            新建评估
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyHistory({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-14 text-center space-y-3 px-2">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <Inbox className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-xs text-muted-foreground">还没有评估记录</div>
      <Button size="sm" variant="outline" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" />
        新建第一份
      </Button>
    </div>
  );
}

function AssessmentRow({
  assessment: a,
  isSelected,
  onClick,
  onDelete,
}: {
  assessment: FpAssessmentResponse;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const date = new Date(a.createdAt).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left px-3 py-2.5 rounded-md transition-colors border",
        isSelected
          ? "bg-primary/5 ring-2 ring-primary/40 border-primary/30"
          : "border-transparent hover:bg-accent/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{a.name}</div>
          {a.description && (
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              {a.description}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "h-6 w-6 rounded inline-flex items-center justify-center shrink-0 transition-opacity",
            isSelected
              ? "opacity-60 hover:opacity-100"
              : "opacity-0 group-hover:opacity-60 hover:!opacity-100",
            "text-muted-foreground hover:text-rose-600",
          )}
          title="删除"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-3 mt-2 text-[11px] tabular-nums">
        <span>
          <span className="text-muted-foreground">UFP </span>
          <span className="font-mono">{a.ufp.toFixed(0)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">AFP </span>
          <span
            className="font-mono font-medium"
            style={{ color: "oklch(0.55 0.18 260)" }}
          >
            {a.afp.toFixed(2)}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">人月 </span>
          <span className="font-mono">
            {a.estimatedEffortPersonMonths.toFixed(2)}
          </span>
        </span>
        <span className="ml-auto text-muted-foreground">{date}</span>
      </div>
    </button>
  );
}
