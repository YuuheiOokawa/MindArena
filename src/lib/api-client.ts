import type { ApiResponse } from "@/types/api";

export class ApiClientError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) throw new ApiClientError(body.error.code, body.error.message);
  return body.data;
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(path, { method: "GET" });
    return unwrap<T>(res);
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return unwrap<T>(res);
  },
  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return unwrap<T>(res);
  },
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(path, { method: "DELETE" });
    return unwrap<T>(res);
  },
};
