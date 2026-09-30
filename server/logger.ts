export type AuditEntry = {
  event: 'request' | 'failure' | 'startup' | 'shutdown' | 'warning' | 'maintenance';
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  code?: string;
  reason?: string;
  attempts?: number;
  retryMs?: number;
};
// Deliberate allowlist: never log request bodies, cookies, URLs, email or errors containing SQL.
export function audit(entry: AuditEntry): void {
  const record = JSON.stringify({ time: new Date().toISOString(), level: entry.event === 'warning' ? 'warn' : entry.event === 'failure' ? 'error' : 'info', ...entry });
  if (entry.event === 'warning') console.warn(record);
  else console.log(record);
}
