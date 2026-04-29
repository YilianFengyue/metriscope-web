import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiUsedTool } from "@/lib/api";

/**
 * AI 聊天消息（包含 user / assistant 两种角色）。
 * pending 表示这条 assistant 消息还在等后端返回。
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  usedTools?: AiUsedTool[];
  provider?: string;
  model?: string;
  pending?: boolean;
  error?: boolean;
}

interface AiChatState {
  /** 按 projectId 分桶存历史；切项目互不干扰 */
  histories: Record<number, ChatMessage[]>;

  /** 添加一条消息（user 或 assistant placeholder） */
  appendMessage: (projectId: number, msg: ChatMessage) => void;
  /** 部分更新某条 assistant 消息（请求结束时回填） */
  patchMessage: (
    projectId: number,
    id: string,
    patch: Partial<ChatMessage>,
  ) => void;
  /** 清空某项目的对话 */
  clearChat: (projectId: number) => void;
}

export const useAiChat = create<AiChatState>()(
  persist(
    (set) => ({
      histories: {},

      appendMessage: (projectId, msg) =>
        set((s) => ({
          histories: {
            ...s.histories,
            [projectId]: [...(s.histories[projectId] ?? []), msg],
          },
        })),

      patchMessage: (projectId, id, patch) =>
        set((s) => {
          const list = s.histories[projectId] ?? [];
          return {
            histories: {
              ...s.histories,
              [projectId]: list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
            },
          };
        }),

      clearChat: (projectId) =>
        set((s) => ({
          histories: { ...s.histories, [projectId]: [] },
        })),
    }),
    {
      name: "metriscope-ai-chat",
      // 刷新页面时把"还在 pending"的 assistant 消息标记为中断（避免假装还在转）
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        for (const pid of Object.keys(state.histories)) {
          const list = state.histories[Number(pid)] ?? [];
          for (const m of list) {
            if (m.pending) {
              m.pending = false;
              m.error = true;
              if (!m.content) m.content = "（页面刷新前请求中断，请重新发送）";
            }
          }
        }
      },
    },
  ),
);
