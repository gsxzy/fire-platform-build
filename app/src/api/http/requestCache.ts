/**
 * 短期 GET 请求去重 — 相同 method+url 在飞行中只发一次，减少列表页重复请求
 */
const inflight = new Map<string, Promise<unknown>>();

export function dedupeGet<T>(key: string, factory: () => Promise<T>, ttlMs = 0): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = factory().finally(() => {
    if (ttlMs <= 0) {
      inflight.delete(key);
    } else {
      setTimeout(() => inflight.delete(key), ttlMs);
    }
  });

  inflight.set(key, promise);
  return promise;
}

export function clearRequestCache(prefix?: string) {
  if (!prefix) {
    inflight.clear();
    return;
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}
