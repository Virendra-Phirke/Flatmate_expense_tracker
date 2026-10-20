/**
 * Typed API Client for Flatmate Expense Manager Backend
 */

const TOKEN_KEY = 'flatmate_auth_token';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function getCurrentTokenPayload(): { userId?: string; householdId?: string; role?: string } | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getApiBase(): string {
  // Clear any previously saved custom URL from localStorage
  if (typeof window !== 'undefined' && localStorage.getItem('flatmate_backend_url')) {
    localStorage.removeItem('flatmate_backend_url');
  }

  // When deployed on Vercel, use same-origin proxy ('') so requests route through vercel rewrites
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return '';
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let url = envUrl.trim().replace(/\/$/, '');
    if (url.endsWith('/api')) url = url.slice(0, -4);
    return url;
  }

  return '';
}

import {
  getCachedData,
  setCachedData,
  getSyncCachedData,
  enqueueOfflineMutation,
  applyOptimisticOfflineMutation,
} from './idb';
import { refreshPendingCount } from './offlineQueue';

export interface ApiOptions {
  bypassOfflineQueue?: boolean;
}

export async function api<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any,
  options?: ApiOptions
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const opts: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }

  const apiBase = getApiBase();
  const cleanPath = path.startsWith('/api/') ? path.slice(4) : (path === '/api' ? '' : path);
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  const targetUrl = `${apiBase}/api${normalizedPath}`;

  // If completely offline and reading data (GET), serve directly from IndexedDB cache
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (isOffline && method === 'GET') {
    const cached = await getCachedData<T>(normalizedPath);
    if (cached !== null) {
      return cached;
    }
  }

  // If completely offline and mutating data, queue mutation for auto-sync and apply optimistically
  if (isOffline && method !== 'GET' && !options?.bypassOfflineQueue) {
    const payload = getCurrentTokenPayload();
    const tempId = await enqueueOfflineMutation({
      method,
      path: normalizedPath,
      body,
      userId: payload?.userId,
      householdId: payload?.householdId,
    });
    void applyOptimisticOfflineMutation({
      id: tempId,
      method,
      path: normalizedPath,
      body,
      userId: payload?.userId,
      householdId: payload?.householdId,
      createdAt: Date.now(),
    });
    void refreshPendingCount();
    return { ok: true, offlineQueued: true, id: tempId, ...(body || {}) } as T;
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, opts);
  } catch (netErr: any) {
    // If GET request failed due to network error, try serving from IndexedDB / sync cache
    if (method === 'GET') {
      const cached = getSyncCachedData<T>(normalizedPath) || (await getCachedData<T>(normalizedPath));
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    }

    // If mutation failed due to network drop, queue it for auto-sync
    if (method !== 'GET' && !options?.bypassOfflineQueue) {
      const payload = getCurrentTokenPayload();
      const tempId = await enqueueOfflineMutation({
        method,
        path: normalizedPath,
        body,
        userId: payload?.userId,
        householdId: payload?.householdId,
      });
      void applyOptimisticOfflineMutation({
        id: tempId,
        method,
        path: normalizedPath,
        body,
        userId: payload?.userId,
        householdId: payload?.householdId,
        createdAt: Date.now(),
      });
      void refreshPendingCount();
      return { ok: true, offlineQueued: true, id: tempId, ...(body || {}) } as T;
    }

    throw new Error(
      `Cannot connect to backend server. Make sure the backend is running.`
    );
  }

  const data = await res.json().catch(() => ({}));

  // Automatically save token if returned by any auth response
  if (data && typeof data.token === 'string') {
    setAuthToken(data.token);
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/me' && path !== '/auth/session') {
      // Clear token if server explicitly rejects it
      setAuthToken(null);
    }

    // If server responded with 5xx error on a GET request, fallback to local cache
    if (method === 'GET' && res.status >= 500) {
      const cached = getSyncCachedData<T>(normalizedPath) || (await getCachedData<T>(normalizedPath));
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    }

    // If server responded with 5xx error on a mutation, save offline so user does not lose work
    if (method !== 'GET' && res.status >= 500 && !options?.bypassOfflineQueue) {
      const payload = getCurrentTokenPayload();
      const tempId = await enqueueOfflineMutation({
        method,
        path: normalizedPath,
        body,
        userId: payload?.userId,
        householdId: payload?.householdId,
      });
      void applyOptimisticOfflineMutation({
        id: tempId,
        method,
        path: normalizedPath,
        body,
        userId: payload?.userId,
        householdId: payload?.householdId,
        createdAt: Date.now(),
      });
      void refreshPendingCount();
      return { ok: true, offlineQueued: true, id: tempId, ...(body || {}) } as T;
    }

    throw new Error(data.error || (res.status === 404 ? `API endpoint not found (404: ${path})` : `HTTP ${res.status}`));
  }

  // Save successful GET response into IndexedDB cache for instant 0ms offline startup
  if (method === 'GET' && data) {
    void setCachedData(normalizedPath, data);
  }

  return data as T;
}
