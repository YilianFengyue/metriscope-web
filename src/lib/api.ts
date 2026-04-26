export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T | null;
}

const DEFAULT_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8080";

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await resp.json()) as ApiResponse<T>;
  if (json.code !== "0") {
    throw new ApiError(json.code, json.message);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body == null ? undefined : JSON.stringify(body),
    }),
};

export function useProjectIdFromQuery(): number | null {
  const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const raw = params.get("projectId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
