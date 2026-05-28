import type { AuthStatus, AuthUser, RegisterPayload, WhitelistUser } from "../data/mockAuth";
import type { GeoLayerMeta } from "../types/platform";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");

export interface ApiResult<T = unknown> {
  ok: boolean;
  message: string;
  user?: T;
  status?: AuthStatus;
}

export interface AdminUser extends WhitelistUser {
  id: number;
  username?: string;
  contact?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminLayer extends GeoLayerMeta {
  enabled: boolean;
  sortOrder: number;
  note?: string;
}

export interface WhitelistImportResult {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  skipped: Array<{ row: number; reason: string }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = typeof data?.detail === "string" ? data.detail : "后端接口请求失败。";
    throw new Error(message);
  }
  return data as T;
}

async function uploadRequest<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body
  });

  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = typeof data?.detail === "string" ? data.detail : "后端接口请求失败。";
    throw new Error(message);
  }
  return data as T;
}

export function checkHealth() {
  return request<ApiResult>("/health");
}

export function getWhitelistUser(phone: string) {
  return request<ApiResult<AdminUser>>(`/auth/whitelist/${encodeURIComponent(phone)}`);
}

export function sendSmsCode(phone: string) {
  return request<ApiResult>("/auth/sms/send", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
}

export function loginBySms(phone: string, code: string) {
  return request<ApiResult<AuthUser>>("/auth/login/sms", {
    method: "POST",
    body: JSON.stringify({ phone, code })
  });
}

export function loginByPassword(username: string, password: string) {
  return request<ApiResult<AuthUser>>("/auth/login/password", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export function submitRegistration(payload: RegisterPayload) {
  return request<ApiResult>("/registrations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminUsers() {
  return request<AdminUser[]>("/admin/users");
}

export function createAdminUser(payload: Omit<AdminUser, "id" | "createdAt" | "updatedAt" | "username">) {
  return request<ApiResult<AdminUser> & { created: boolean }>("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function importAdminUsers(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return uploadRequest<WhitelistImportResult>("/admin/users/import", formData);
}

export function updateAdminUserStatus(id: number, status: AuthStatus) {
  return request<AdminUser>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function getAdminLayers(options?: { enabledOnly?: boolean }) {
  const query = options?.enabledOnly ? "?enabled_only=true" : "";
  return request<AdminLayer[]>(`/admin/layers${query}`);
}

export function updateAdminLayer(
  id: string,
  payload: Partial<Pick<AdminLayer, "name" | "categoryName" | "enabled" | "sortOrder" | "note">>
) {
  return request<AdminLayer>(`/admin/layers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
