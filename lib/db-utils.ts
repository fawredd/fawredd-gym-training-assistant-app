// Lightweight retry wrapper for transient DB errors (ETIMEDOUT, network blips)
export async function runDbQueryWithRetries(fn: () => Promise<any>, opts?: { retries?: number; baseDelayMs?: number; }) {
  const retries = opts?.retries ?? 3;
  const base = opts?.baseDelayMs ?? 300;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;

      // Simple transient detection — tune patterns as needed
      const msg = String(err?.message ?? err);
      const isTransient = /ETIMEDOUT|timeout|ECONNRESET|ECONNREFUSED|pooler/i.test(msg);

      if (!isTransient || attempt > retries) {
        throw err;
      }

      const delay = base * Math.pow(2, attempt - 1);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
