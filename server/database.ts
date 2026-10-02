/** Prisma 5 Rust-engine connection parameters. Never log the returned URL. */
export function databaseUrl(env: NodeJS.ProcessEnv, migration = false): string {
  const production = env.NODE_ENV === 'production';
  const raw = migration ? env.DIRECT_DATABASE_URL || (!production ? env.DATABASE_URL : undefined) : env.DATABASE_URL;
  if (!raw) throw new Error(migration ? 'DIRECT_DATABASE_URL is required for production migrations.' : 'DATABASE_URL is required.');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error((migration ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL') + ' is invalid.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error((migration ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL') + ' requires PostgreSQL.');
  const parameters = url.searchParams;
  const positive = (name: string, value: string, max: number) => {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new Error('Invalid database parameter: ' + name);
    parameters.set(name, value);
  };
  positive('connection_limit', migration ? '1' : env.DB_POOL_SIZE ?? parameters.get('connection_limit') ?? '5', 100);
  positive('pool_timeout', env.DB_POOL_TIMEOUT_SECONDS ?? parameters.get('pool_timeout') ?? '5', 60);
  positive('connect_timeout', env.DB_CONNECT_TIMEOUT_SECONDS ?? parameters.get('connect_timeout') ?? (production ? '15' : '5'), 60);
  // Migration DDL can legitimately exceed the application query deadline.
  if (!migration) positive('socket_timeout', env.DB_QUERY_TIMEOUT_SECONDS ?? parameters.get('socket_timeout') ?? '10', 120);
  else { parameters.delete('socket_timeout'); parameters.delete('pgbouncer'); }
  const tls = env.DB_TLS_MODE ?? (production ? 'require' : parameters.get('sslmode') ?? 'disable');
  if (!['require', 'disable'].includes(tls)) throw new Error('DB_TLS_MODE must be require or disable.');
  if (production && tls === 'require' && (parameters.get('sslmode') === 'disable' || parameters.get('sslaccept') === 'accept_invalid_certs'))
    throw new Error((migration ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL') + ' conflicts with strict TLS.');
  parameters.set('sslmode', tls);
  if (tls === 'require') parameters.set('sslaccept', 'strict');
  if (env.DB_SSL_CERT_PATH) parameters.set('sslcert', env.DB_SSL_CERT_PATH);
  return url.toString();
}
