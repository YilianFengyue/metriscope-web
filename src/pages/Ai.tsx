import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  FileBarChart,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { snapshotsApi } from "@/lib/api";
import { useApp } from "@/stores/app";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AiChat } from "./ai/AiChat";
import { AiAnalyze } from "./ai/AiAnalyze";
import { RefactorPromptPanel } from "./ai/RefactorPromptPanel";

export default function AiPage() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  if (currentProjectId == null) return <NoProjectSelected />;
  return <AiInner projectId={currentProjectId} />;
}

function AiInner({ projectId }: { projectId: number }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") ?? "chat";
  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const snapshotsQuery = useQuery({
    queryKey: ["snapshots", projectId],
    queryFn: () => snapshotsApi.list(projectId, { silent: true }),
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

  const latestSnapshotId = snapshots[0]?.id ?? null;

  // URL ?snapshot= 优先；否则用最新；用户在子组件里可以再切换
  const urlSnapshot = searchParams.get("snapshot");
  const effectiveSnapshotId = urlSnapshot ? Number(urlSnapshot) : latestSnapshotId;

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const modeParam = searchParams.get("mode");

  // 默认 tab=chat 时如果带了 from/to 应该自动切到 analyze（兼容 /history 跳过来）
  useEffect(() => {
    if (!searchParams.get("tab") && (fromParam || toParam || modeParam)) {
      setTab("analyze");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 max-w-[1300px] mx-auto space-y-6">
      <Hero
        snapshotCount={snapshots.length}
        loading={snapshotsQuery.isLoading}
        latestSnapshotId={latestSnapshotId}
      />

      {snapshotsQuery.isLoading ? (
        <Skeleton className="h-96" />
      ) : snapshots.length === 0 ? (
        <NoSnapshots />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="chat">
              <MessageSquare className="h-3.5 w-3.5" />
              AI 对话
            </TabsTrigger>
            <TabsTrigger value="analyze">
              <FileBarChart className="h-3.5 w-3.5" />
              AI 分析报告
            </TabsTrigger>
            <TabsTrigger value="prompt">
              <Sparkles className="h-3.5 w-3.5" />
              重构 Prompt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <AiChat
              projectId={projectId}
              snapshots={snapshots}
              defaultSnapshotId={effectiveSnapshotId}
            />
          </TabsContent>

          <TabsContent value="analyze" className="mt-4">
            <AiAnalyze
              projectId={projectId}
              snapshots={snapshots}
              defaultSnapshotId={effectiveSnapshotId}
              defaultMode={modeParam || undefined}
              defaultFrom={fromParam ? Number(fromParam) : null}
              defaultTo={toParam ? Number(toParam) : null}
            />
          </TabsContent>

          <TabsContent value="prompt" className="mt-4">
            <RefactorPromptPanel projectId={projectId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Hero({
  snapshotCount,
  loading,
  latestSnapshotId,
}: {
  snapshotCount: number;
  loading: boolean;
  latestSnapshotId: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full opacity-[0.13] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.55 0.22 295) 0%, oklch(0.6 0.16 200) 50%, transparent 100%)",
        }}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground tracking-wide uppercase">
            <Bot className="h-3.5 w-3.5" />
            Software Quality Agent · 9 工具上下文
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            AI 项目助手
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            后端聚合 9 类度量工具（CK/LK/复杂度/认知/坏味道/McCall/IFPUG/趋势/门禁）→ LLM 解释 → 分析报告 / 对话 / Typst PDF。所有判定走规则，AI 只做翻译。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <>
              <Badge variant="outline" className="text-xs">
                {snapshotCount} 份快照
              </Badge>
              {latestSnapshotId != null && (
                <Badge variant="outline" className="text-xs font-mono">
                  最新 #{latestSnapshotId}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>
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
            AI 助手基于当前项目数据，先去「项目」页选择一个。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NoSnapshots() {
  return (
    <Card>
      <CardContent className="py-20 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="font-semibold tracking-tight">项目还没有任何快照</h2>
        <p className="text-sm text-muted-foreground">
          AI 助手依赖度量数据；先去「分析」页跑一次再回来。
        </p>
      </CardContent>
    </Card>
  );
}
