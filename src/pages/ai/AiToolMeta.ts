import {
  Box,
  Brain,
  Code2,
  Database,
  Diamond,
  FileBarChart,
  Flame,
  Gauge,
  GitMerge,
  Network,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { AiUsedTool } from "@/lib/api";

/**
 * AI 后端 9 类工具 + Quality Gate 工具的展示元数据。
 * 这是答辩亮点：每条 AI 回答后挂 chip 让评委一眼看到 AI 调了什么真实数据。
 */
export const AI_TOOL_META: Record<
  string,
  { label: string; short: string; icon: LucideIcon; color: string }
> = {
  latest_snapshot: {
    label: "最新快照",
    short: "snapshot",
    icon: Box,
    color: "oklch(0.55 0.18 260)",
  },
  risk_hotspots: {
    label: "风险热点",
    short: "risks",
    icon: Flame,
    color: "oklch(0.6 0.22 25)",
  },
  class_metrics: {
    label: "CK / LK 类指标",
    short: "classes",
    icon: Gauge,
    color: "oklch(0.55 0.22 295)",
  },
  method_metrics: {
    label: "方法复杂度",
    short: "methods",
    icon: Brain,
    color: "oklch(0.6 0.16 200)",
  },
  dependencies: {
    label: "依赖关系",
    short: "deps",
    icon: Network,
    color: "oklch(0.6 0.18 220)",
  },
  quality_trend: {
    label: "质量趋势",
    short: "trend",
    icon: Workflow,
    color: "oklch(0.62 0.18 165)",
  },
  code_smells: {
    label: "代码坏味道",
    short: "smells",
    icon: Database,
    color: "oklch(0.7 0.17 75)",
  },
  mccall_quality: {
    label: "McCall 评分",
    short: "mccall",
    icon: FileBarChart,
    color: "oklch(0.72 0.16 90)",
  },
  ifpug_function_point: {
    label: "IFPUG 功能点",
    short: "ifpug",
    icon: Diamond,
    color: "oklch(0.55 0.18 260)",
  },
  quality_gate: {
    label: "质量门禁",
    short: "gate",
    icon: GitMerge,
    color: "oklch(0.55 0.22 295)",
  },
};

export function getToolMeta(name: AiUsedTool) {
  return (
    AI_TOOL_META[name] ?? {
      label: name,
      short: name,
      icon: Code2,
      color: "oklch(0.55 0.02 260)",
    }
  );
}

export const AI_PROVIDER_LABEL: Record<string, string> = {
  DEEPSEEK_COMPATIBLE: "DeepSeek-compatible",
  DEEPSEEK: "DeepSeek",
  OPENAI: "OpenAI",
  LOCAL_FALLBACK: "本地 fallback",
};

export function isLiveProvider(provider: string): boolean {
  return provider !== "LOCAL_FALLBACK" && provider !== "rule-based";
}

export const FALLBACK_ICON = Sparkles;
