/**
 * Simple in-memory TTL cache for API responses.
 * Prevents redundant network calls for slow-changing data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const TTL = {
  STANDINGS:   15 * 60_000,  // 15 min — rarely changes
  TEAMS:       30 * 60_000,  // 30 min — static roster data
  TEAM_DETAIL:  5 * 60_000,  // 5 min  — standings + form
  GOLF:         5 * 60_000,  // 5 min  — unless live, handled at call site
} as const;
