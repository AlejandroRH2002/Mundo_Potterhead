export function deploymentOrigin(value, variable = '--url') {
  let url; try { url = new URL(value); } catch { throw new Error(variable + ' requiere un origen HTTPS.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error(variable + ' requiere un origen HTTPS sin credenciales ni ruta.');
  return url.origin;
}
export function loginCookieAttributes(header) {
  const parts = String(header ?? '').split(';').map(part => part.trim());
  return /^__Host-[^=]+=/.test(parts[0]) && parts.some(part => /^Secure$/i.test(part)) && parts.some(part => /^HttpOnly$/i.test(part)) && parts.some(part => /^Path=\/$/i.test(part)) && !parts.some(part => /^Domain=/i.test(part));
}
export async function runSmoke({ url, apiUrl }, request = fetch) {
  const frontend = deploymentOrigin(url), api = apiUrl ? deploymentOrigin(apiUrl, '--api-url') : frontend;
  const checks = [];
  async function get(base, path) { return request(base + path, { method: 'GET', redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(10_000) }); }
  async function check(name, operation) { try { checks.push({ name, status: await operation() ? 'pass' : 'fail' }); } catch { checks.push({ name, status:'fail' }); } }
  await check('API readiness', async () => { const response = await get(api,apiUrl ? '/health/ready' : '/api/health/ready'); return response.status===200 && response.headers.get('content-type')?.includes('application/json') && (await response.json()).status==='ok'; });
  await check('Frontend HTML 200', async () => { const response=await get(frontend,'/'); return response.status===200 && response.headers.get('content-type')?.includes('text/html'); });
  await check('API admin sin sesión', async () => [401,403].includes((await get(frontend,'/api/admin/users')).status));
  try {
    const response=await get(frontend,'/admin');
    const denied=[401,403].includes(response.status);
    const location=response.headers.get('location');
    let redirected=false;
    if ([301,302,303,307,308].includes(response.status) && location) { const target=new URL(location,frontend); redirected=target.origin===frontend && ['/','/login'].includes(target.pathname); }
    checks.push({ name:'Guard de /admin', status:denied || redirected ? 'pass' : response.status===200 && response.headers.get('content-type')?.includes('text/html') ? 'pending' : 'fail' });
  } catch { checks.push({ name:'Guard de /admin',status:'fail' }); }
  // A real login is a write (session + rate counter). Never manufacture a passing result.
  checks.push({ name:'Cookie de login Secure/HttpOnly/__Host-: requiere sesión de prueba manual', status:'pending' });
  return { checks, exitCode: checks.some(check=>check.status==='fail') ? 1 : checks.some(check=>check.status==='pending') ? 2 : 0 };
}
