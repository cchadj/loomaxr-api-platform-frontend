"use client";

import { clearAccessTokenCookie, syncAccessTokenCookie } from "@/lib/client-auth-cookies";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ApiRequestError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

// Single in-flight refresh promise to deduplicate concurrent 401s
let refreshPromise: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) throw new AuthError();

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new AuthError();

  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  syncAccessTokenCookie(data.access_token, data.expires_in_seconds);
  return data.access_token;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const devMode = localStorage.getItem("dev_mode") === "true";
  if (devMode) {
    const userId = localStorage.getItem("dev_user_id") || "1";
    const roles = localStorage.getItem("dev_roles") || "ADMIN";
    return {
      "X-User-Id": userId,
      "X-User-Roles": roles,
    };
  }

  const token = localStorage.getItem("access_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...getAuthHeaders(),
  };

  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;

      // Retry with new token
      const retryHeaders = {
        ...(options.headers as Record<string, string>),
        ...getAuthHeaders(),
      };
      if (!(options.body instanceof FormData) && options.body) {
        retryHeaders["Content-Type"] = "application/json";
      }
      const retryRes = await fetch(url, { ...options, headers: retryHeaders });
      if (retryRes.status === 401) {
        window.dispatchEvent(new CustomEvent("auth:logout"));
        throw new AuthError();
      }
      return retryRes;
    } catch {
      clearAccessTokenCookie();
      window.dispatchEvent(new CustomEvent("auth:logout"));
      throw new AuthError();
    }
  }

  return res;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = { detail: res.statusText };
    }
    const message =
      typeof (data as { detail?: string }).detail === "string"
        ? (data as { detail: string }).detail
        : `HTTP ${res.status}`;
    throw new ApiRequestError(message, res.status, data);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parseResponse<T>(await apiFetch(path, { method: "GET" }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return parseResponse<T>(
    await apiFetch(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  );
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return parseResponse<T>(
    await apiFetch(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  );
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return parseResponse<T>(
    await apiFetch(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return parseResponse<T>(await apiFetch(path, { method: "DELETE" }));
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  return parseResponse<T>(
    await apiFetch(path, {
      method: "POST",
      body: formData,
    })
  );
}
