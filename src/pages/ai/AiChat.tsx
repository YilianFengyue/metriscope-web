import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Bot,
  Eraser,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  aiApi,
  type AiUsedTool,
  type SnapshotResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AI_TOOL_META, getToolMeta, isLiveProvider } from "./AiToolMeta";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** 仅 assistant 有 */
  usedTools?: AiUsedTool[];
  provider?: string;
  model?: string;
  /** loading 中显示动画 */
  pending?: boolean;
  /** 错误时变红 */
  error?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "这个项目最大的问题是什么？",
  "我应该先优化哪个类？",
  "圈复杂度和耦合哪个更严重？",
  "给我一个 30 秒的项目质量总结",
];

const TOOL_CALL_PHASES = [
  { tool: "latest_snapshot" as const, label: "调用 latest_snapshot..." },
  { tool: "risk_hotspots" as const, label: "调用 risk_hotspots..." },
  { tool: "code_smells" as const, label: "调用 code_smells..." },
  { tool: "mccall_quality" as const, label: "整合上下文..." },
];

export function AiChat({
  projectId,
  snapshots,
  defaultSnapshotId,
}: {
  projectId: number;
  snapshots: SnapshotResponse[];
  defaultSnapshotId: number | null;
}) {
  const [snapshotId, setSnapshotId] = useState<number | null>(defaultSnapshotId);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingPhaseIdx, setLoadingPhaseIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (snapshotId == null && defaultSnapshotId != null) {
      setSnapshotId(defaultSnapshotId);
    }
  }, [defaultSnapshotId, snapshotId]);

  // 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useMutation({
    mutationFn: (msg: string) =>
      aiApi.chat(
        projectId,
        {
          message: msg,
          snapshotId: snapshotId ?? undefined,
          includeTools: true,
        },
        { silent: true },
      ),
  });

  // 工具调用动画：mutation 进行中时循环切换 phase
  useEffect(() => {
    if (!send.isPending) return;
    setLoadingPhaseIdx(0);
    const t = setInterval(
      () => setLoadingPhaseIdx((i) => (i + 1) % TOOL_CALL_PHASES.length),
      900,
    );
    return () => clearInterval(t);
  }, [send.isPending]);

  const onSend = async (text?: string) => {
    const msg = (text ?? draft).trim();
    if (!msg || send.isPending) return;
    if (snapshotId == null) {
      toast.error("请先选择一个快照");
      return;
    }
    const ts = Date.now();
    const userMsg: ChatMessage = {
      id: `u-${ts}`,
      role: "user",
      content: msg,
      timestamp: ts,
    };
    const placeholder: ChatMessage = {
      id: `a-${ts}`,
      role: "assistant",
      content: "",
      timestamp: ts,
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setDraft("");

    try {
      const res = await send.mutateAsync(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                content: res.answer,
                usedTools: res.usedTools,
                provider: res.provider,
                model: res.model,
                pending: false,
              }
            : m,
        ),
      );
    } catch (e) {
      const msg = (e as Error).message ?? "AI 调用失败";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, content: msg, pending: false, error: true }
            : m,
        ),
      );
    }
  };

  const onClear = () => {
    setMessages([]);
  };

  return (
    <Card className="overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[560px]">
      {/* 顶栏 */}
      <CardHeader className="py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-medium">AI 项目对话</span>
            <span className="text-[11px] text-muted-foreground">
              · 每轮独立请求，前端不维护多轮上下文
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">使用快照</span>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={messages.length === 0}
              className="h-8"
            >
              <Eraser className="h-3.5 w-3.5" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* 消息流 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState onAsk={onSend} />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              loadingPhase={
                m.pending && send.isPending
                  ? TOOL_CALL_PHASES[loadingPhaseIdx]
                  : null
              }
            />
          ))
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-border bg-card/50 p-3 shrink-0">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSend(q)}
                disabled={send.isPending}
                className="text-[10px] px-2 py-0.5 rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="问 AI 任何关于项目的问题... (Enter 发送 · Shift+Enter 换行)"
            rows={2}
            className="resize-none text-sm"
            disabled={send.isPending}
          />
          <Button
            onClick={() => onSend()}
            disabled={!draft.trim() || send.isPending || snapshotId == null}
            className="shrink-0"
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            发送
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          AI 用 9 类后端工具实时查询度量数据；每条回答下方显示工具调用链
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4">
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.55 0.18 260) 0%, oklch(0.55 0.22 295) 50%, oklch(0.6 0.16 200) 100%)",
        }}
      >
        <Bot className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight mb-2">
        我是项目质量 Agent
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        我能调用后端 9 类度量工具帮你分析这个项目。试试问下面的问题，或自己写一个：
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="group rounded-md border border-border bg-card hover:bg-accent/60 hover:border-primary/40 transition-all px-4 py-3 text-left text-sm flex items-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
            <span className="flex-1">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  loadingPhase,
}: {
  message: ChatMessage;
  loadingPhase: { tool: AiUsedTool; label: string } | null;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex gap-2.5",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.55 0.22 295) 0%, oklch(0.6 0.16 200) 100%)",
          }}
        >
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[78%] rounded-lg px-4 py-2.5 text-sm space-y-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.error
              ? "bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-100"
              : "bg-muted/40 border border-border",
        )}
      >
        {message.pending && loadingPhase ? (
          <PendingContent label={loadingPhase.label} tool={loadingPhase.tool} />
        ) : (
          <>
            <div className="leading-relaxed whitespace-pre-wrap">
              {message.content || (
                <span className="text-muted-foreground italic">（空回复）</span>
              )}
            </div>
            {!isUser && message.usedTools && message.usedTools.length > 0 && (
              <UsedToolsRow
                tools={message.usedTools}
                provider={message.provider}
                model={message.model}
              />
            )}
          </>
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function PendingContent({
  label,
  tool,
}: {
  label: string;
  tool: AiUsedTool;
}) {
  const meta = getToolMeta(tool);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon
        className="h-3.5 w-3.5 animate-pulse"
        style={{ color: meta.color }}
      />
      <span className="font-mono text-muted-foreground">{label}</span>
      <span className="flex gap-0.5">
        <span
          className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-1 w-1 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  );
}

function UsedToolsRow({
  tools,
  provider,
  model,
}: {
  tools: AiUsedTool[];
  provider?: string;
  model?: string;
}) {
  const live = provider != null && isLiveProvider(provider);
  return (
    <div className="border-t border-border/40 pt-2 mt-2 flex flex-wrap items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
        used:
      </span>
      {tools.map((t) => {
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
      <span className="ml-auto flex items-center gap-1.5">
        {provider && (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1.5"
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
            {live ? "● live" : "● fallback"}
          </Badge>
        )}
        {model && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {model}
          </span>
        )}
      </span>
    </div>
  );
}

// 导出工具元数据中 AI_TOOL_META 用于其它地方共用
export { AI_TOOL_META };
