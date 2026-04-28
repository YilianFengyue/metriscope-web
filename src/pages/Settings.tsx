import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  GitBranch,
  Globe,
  Loader2,
  RotateCcw,
  Server,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface PingResult {
  ok: boolean;
  latencyMs: number;
  appName?: string;
  status?: string;
  error?: string;
}

export default function SettingsPage() {
  const baseUrl = useApp((s) => s.baseUrl);
  const setBaseUrl = useApp((s) => s.setBaseUrl);

  const [draft, setDraft] = useState(baseUrl);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  const dirty = draft !== baseUrl;

  const ping = useMutation({
    mutationFn: async () => {
      const t0 = performance.now();
      try {
        // Apply draft temporarily for the test by directly fetching
        const url = `${(draft || "").replace(/\/$/, "")}/api/v1/system/ping`;
        const resp = await fetch(url, {
          headers: { "Content-Type": "application/json" },
        });
        const json = await resp.json();
        const t1 = performance.now();
        if (json.code !== "0") {
          return {
            ok: false,
            latencyMs: t1 - t0,
            error: `${json.code}: ${json.message}`,
          } satisfies PingResult;
        }
        return {
          ok: true,
          latencyMs: t1 - t0,
          appName: json.data.appName,
          status: json.data.status,
        } satisfies PingResult;
      } catch (e) {
        return {
          ok: false,
          latencyMs: performance.now() - t0,
          error: (e as Error).message,
        } satisfies PingResult;
      }
    },
    onSuccess: (res) => {
      setPingResult(res);
      if (res.ok) toast.success(`连接成功 · ${res.latencyMs.toFixed(0)}ms`);
      else toast.error(`连接失败：${res.error ?? "unknown"}`);
    },
  });

  const save = () => {
    setBaseUrl(draft.trim());
    toast.success("已保存 baseUrl");
  };

  const resetToProxy = () => {
    setDraft("");
    setBaseUrl("");
    setPingResult(null);
    toast.success("已切回 dev proxy 模式（空 baseUrl）");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">
          配置后端连接与查看应用信息。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            后端连接
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            空字符串 = 走 Vite dev proxy（开发推荐）。打包成桌面 / 部署上线后再填真实地址。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="（留空走 dev proxy）"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              示例：<code className="font-mono">http://localhost:8080</code> ·{" "}
              <code className="font-mono">https://metriscope.example.com</code>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={!dirty}>
              保存
            </Button>
            <Button
              variant="outline"
              onClick={() => ping.mutate()}
              disabled={ping.isPending}
            >
              {ping.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              测试连接
            </Button>
            <Button variant="ghost" onClick={resetToProxy}>
              <RotateCcw className="h-4 w-4" />
              恢复默认（dev proxy）
            </Button>
          </div>

          {pingResult && (
            <>
              <Separator />
              <div
                className={cn(
                  "rounded-lg border p-4 text-sm space-y-1",
                  pingResult.ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50",
                )}
              >
                <div className="flex items-center gap-2">
                  {pingResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                  <span className="font-medium">
                    {pingResult.ok ? "在线" : "离线"}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {pingResult.latencyMs.toFixed(0)} ms
                  </Badge>
                </div>
                {pingResult.ok ? (
                  <div className="text-xs text-muted-foreground tabular-nums pl-6">
                    {pingResult.appName} · {pingResult.status}
                  </div>
                ) : (
                  <div className="text-xs text-rose-700 pl-6 break-all">
                    {pingResult.error}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            关于 MetriScope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow k="版本" v="0.1.0" />
          <InfoRow k="前端栈" v="Vite + React 18 + TypeScript + Tailwind v4 + shadcn/ui" />
          <InfoRow k="数据层" v="@tanstack/react-query + zustand" />
          <InfoRow k="图表" v="Recharts" />
          <InfoRow k="路由" v="React Router HashRouter" />
          <InfoRow k="后端" v="Spring Boot · /api/v1（dev 通过 Vite proxy 转发）" />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="text-muted-foreground w-20 shrink-0 text-xs uppercase tracking-wide">
        {k}
      </span>
      <span className="font-mono text-xs">{v}</span>
    </div>
  );
}
