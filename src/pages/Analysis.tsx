import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  Play,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  analysisApi,
  type AnalysisTaskResponse,
  type AnalysisTaskStatus,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusVariant: Record<
  AnalysisTaskStatus,
  "info" | "success" | "warning" | "danger" | "secondary"
> = {
  RUNNING: "info",
  FINISHED: "success",
  FAILED: "danger",
  CANCELED: "secondary",
  TIMEOUT: "warning",
};

export default function AnalysisPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  if (currentProjectId == null) return <NoProjectSelected />;
  return <AnalysisInner projectId={currentProjectId} />;
}

function AnalysisInner({ projectId }: { projectId: number }) {
  const qc = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => analysisApi.tasks(projectId),
    refetchInterval: (q) => {
      const data = q.state.data as AnalysisTaskResponse[] | undefined;
      return data?.some((t) => t.status === "RUNNING") ? 1500 : false;
    },
  });

  const queueQuery = useQuery({
    queryKey: ["analysis-queue"],
    queryFn: analysisApi.queue,
    refetchInterval: 2_500,
  });

  const tasks = tasksQuery.data ?? [];
  const hasRunning = tasks.some((t) => t.status === "RUNNING");

  const analyzeAsync = useMutation({
    mutationFn: () => analysisApi.analyzeAsync(projectId),
    onSuccess: (t) => {
      toast.success(`异步任务 #${t.id} 已入队`);
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const analyzeSync = useMutation({
    mutationFn: () => analysisApi.analyze(projectId),
    onSuccess: (t) => {
      toast.success(
        `同步分析完成 #${t.id}`,
        t.snapshotId ? { description: `生成快照 #${t.snapshotId}` } : undefined,
      );
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">分析任务</h1>
        <p className="text-sm text-muted-foreground mt-1">
          为当前项目（#{projectId}）启动 / 监控分析任务，每次成功生成一个快照。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>启动分析</CardTitle>
            <CardDescription>
              同步会阻塞直到完成；异步立即返回任务 ID 由前端轮询。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => analyzeAsync.mutate()}
                disabled={analyzeAsync.isPending}
              >
                {analyzeAsync.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                异步分析（推荐）
              </Button>
              <Button
                variant="outline"
                onClick={() => analyzeSync.mutate()}
                disabled={analyzeSync.isPending}
              >
                {analyzeSync.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                同步分析
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              提示：分析依赖<strong>已上传源码</strong>。如果项目源码路径为空，先回「项目」页上传。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>异步队列</CardTitle>
            <CardDescription>后端线程池实时状态</CardDescription>
          </CardHeader>
          <CardContent>
            {queueQuery.data ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <KV label="活跃" value={queueQuery.data.activeCount} />
                <KV label="排队" value={queueQuery.data.queueSize} />
                <KV
                  label="池容量"
                  value={`${queueQuery.data.corePoolSize}/${queueQuery.data.maxPoolSize}`}
                />
                <KV label="超时" value={`${queueQuery.data.timeoutSeconds}s`} />
                <KV label="累计" value={queueQuery.data.totalTaskCount} />
                <KV label="完成" value={queueQuery.data.completedTaskCount} />
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>历史任务</CardTitle>
              <CardDescription className="flex items-center gap-2">
                共 {tasks.length} 个任务
                {hasRunning && (
                  <span className="inline-flex items-center gap-1 text-sky-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    轮询中
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tasksQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              还没有任务，点上面的「异步分析」开始。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead className="w-28">状态</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>结束时间</TableHead>
                  <TableHead className="text-right">错误</TableHead>
                  <TableHead className="text-right">快照</TableHead>
                  <TableHead className="text-right w-28">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} projectId={projectId} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskRow({
  task,
  projectId,
}: {
  task: AnalysisTaskResponse;
  projectId: number;
}) {
  const qc = useQueryClient();

  const cancel = useMutation({
    mutationFn: () => analysisApi.cancel(projectId, task.id),
    onSuccess: () => {
      toast.success(`任务 #${task.id} 已取消`);
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const retry = useMutation({
    mutationFn: () => analysisApi.retry(projectId, task.id),
    onSuccess: (t) => {
      toast.success(`已发起重试，新任务 #${t.id}`);
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleString("zh-CN", { hour12: false }) : "—";

  const duration = useMemo(() => {
    if (!task.finishedAt) return null;
    const ms =
      new Date(task.finishedAt).getTime() - new Date(task.startedAt).getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  }, [task.startedAt, task.finishedAt]);

  const canRetry =
    task.status === "FAILED" ||
    task.status === "TIMEOUT" ||
    task.status === "CANCELED";

  return (
    <TableRow>
      <TableCell className="tabular-nums font-mono text-xs">#{task.id}</TableCell>
      <TableCell>
        <Badge variant={statusVariant[task.status]}>
          {task.status === "RUNNING" && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {task.status}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {fmt(task.startedAt)}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {fmt(task.finishedAt)}
        {duration && (
          <span className="ml-2 text-muted-foreground">({duration})</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {task.errorCount > 0 ? (
          <span className="text-rose-600 font-medium">
            {task.errorCount}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums font-mono text-xs">
        {task.snapshotId != null ? `#${task.snapshotId}` : "—"}
      </TableCell>
      <TableCell className="text-right">
        {task.status === "RUNNING" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            取消
          </Button>
        ) : canRetry ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
          >
            {retry.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            重试
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase tracking-wide text-[10px]">
        {label}
      </div>
      <div className="font-medium tabular-nums text-sm">{value}</div>
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
            分析任务必须在某个项目下运行。先去「项目」页创建或选择一个项目。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
