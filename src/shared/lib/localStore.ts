export function createLocalStore<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  let snapshot = fallback;
  const listeners = new Set<() => void>();
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      const value: unknown = raw ? JSON.parse(raw) : null;
      return validate(value) ? value : fallback;
    } catch { return fallback; }
  };
  snapshot = read();
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      snapshot = read();
      listeners.forEach(listener => listener());
    }
  });
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set: (value: T) => {
      // Persist first: callers receive an error if storage is unavailable or full.
      localStorage.setItem(key, JSON.stringify(value));
      snapshot = value;
      listeners.forEach(listener => listener());
    },
  };
}
