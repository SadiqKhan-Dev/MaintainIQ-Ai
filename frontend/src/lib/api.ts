export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import { clerkGetToken } from "@/lib/clerk";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const token = typeof window !== "undefined" ? await clerkGetToken() : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function apiFetchPublic(path: string) {
  return apiFetch(path);
}
