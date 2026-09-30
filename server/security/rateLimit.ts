export function createLoginLimiter(now: () => number = Date.now) {
  const attempts = new Map<string, { count: number; until: number }>();
  return (key: string) => {
    const time = now();
    for (const [ip, entry] of attempts) if (entry.until <= time) attempts.delete(ip);
    const current = attempts.get(key);
    if (!current && attempts.size >= 5000) return false;
    const next = current ?? { count: 0, until: time + 15 * 60 * 1000 };
    next.count += 1;
    attempts.set(key, next);
    return next.count <= 10;
  };
}
