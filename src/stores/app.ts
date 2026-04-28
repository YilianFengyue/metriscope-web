import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  baseUrl: string;
  currentProjectId: number | null;
  setBaseUrl: (url: string) => void;
  setCurrentProjectId: (id: number | null) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      baseUrl: "",
      currentProjectId: null,
      setBaseUrl: (url) => set({ baseUrl: url }),
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
    }),
    { name: "metriscope", version: 1 },
  ),
);
