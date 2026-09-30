/** Coalesce probes so a slow database never creates an unbounded queue of SELECTs. */
export function createReadiness(check: () => Promise<unknown>, { timeoutMs = 1500, cacheMs = 1000 } = {}) {
  let pending: Promise<boolean> | undefined;
  let checkedAt = 0;
  let healthy = false;
  let draining = false;
  return {
    drain() { draining = true; },
    async ready(): Promise<void> {
      if (draining) throw new Error('DRAINING');
      if (!pending && Date.now() - checkedAt > cacheMs) {
        pending = Promise.resolve().then(check).then(() => true, () => false).then(result => {
          healthy = result; checkedAt = Date.now(); pending = undefined; return result;
        });
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const result = pending ? await Promise.race([pending, new Promise<boolean>(resolve => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      })]).finally(() => { if (timer) clearTimeout(timer); }) : healthy;
      if (!result || draining) throw new Error('NOT_READY');
    },
  };
}
