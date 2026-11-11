/**
 * Fixed-window in-memory rate limiter. Adequate for a single server process;
 * swap the Map for Redis when the app runs on more than one instance.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  windows.set(key, { ...current, count: current.count + 1 });
  return current.count + 1 > limit;
}
